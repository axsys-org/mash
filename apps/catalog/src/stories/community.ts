import "@mash/ui/button";
import "@mash/ui/icon";
import "@mash/ui/input";
import "@mash/ui/textarea";
import "@mash/ui/avatar";
import "@mash/ui/badge";
import "@mash/ui/menu";
import "@mash/ui/message";
import "@mash/ui/bubble";
import "@mash/ui/message-scroller";
import "@mash/ui/attachment";
import "@mash/ui/resizable";
import "@mash/ui/dialog";
import "@mash/ui/select";
import "@mash/ui/switch";
import "@mash/ui/checkbox";
import "@mash/ui/command-palette";
import "@mash/ui/separator";
import type { UIDialog } from "@mash/ui/dialog";
import type { UIInput } from "@mash/ui/input";
import type { UITextarea } from "@mash/ui/textarea";
import type { UISelect } from "@mash/ui/select";
import type { UISwitch } from "@mash/ui/switch";
import type { UICheckbox } from "@mash/ui/checkbox";
import type { UIMessageScroller } from "@mash/ui/message-scroller";
import type { UIResizablePanel } from "@mash/ui/resizable";
import {
  CommunityModel,
  newId,
  restoreCommunity,
  type Channel,
  type ChannelKind,
  type Message,
} from "./community-state.js";
import { mountComposer } from "./community-composer.js";
import "./community.css";

const roomIcons = {
  pin: "m16 3 5 5-4 2-3 5-1 4-3-3-6 6 6-6-3-3 4-1 5-3z",
  reply: "m9 5-6 6 6 6M3 11h10a8 8 0 0 1 8 8",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  panel: "M3 4h18v16H3zM15 4v16",
};
const roomIcon = (name: keyof typeof roomIcons) =>
  `<ui-icon><svg slot="primary" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${roomIcons[name]}"></path></svg></ui-icon>`;

const storageKey = "mash.story.community.v1";
const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const symbol = (channel: Channel) =>
  ({
    chat: "#",
    gallery: '<ui-icon name="object.image"></ui-icon>',
    notebook: '<ui-icon name="object.document"></ui-icon>',
    dm: "@",
  })[channel.kind];
const sizeLabel = (size: number) =>
  size < 1024
    ? `${size} B`
    : size < 1024 * 1024
      ? `${Math.round(size / 1024)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;

/** Mounts a complete local community; returned cleanup owns all side effects. */
export async function mount(root: HTMLElement): Promise<() => void> {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch {
    /* Memory still works when storage is unavailable. */
  }
  const model = new CommunityModel(restoreCommunity(stored));
  const state = model.state;
  const lifetime = new AbortController();
  const blobs = new Map<string, Blob>();
  const urls = new Map<string, string>();
  const scrollPositions = new Map<string, number>();
  const frames = new Set<number>();
  const afterLayout = (run: () => void, remaining = 2): void => {
    const frame = requestAnimationFrame(() => {
      frames.delete(frame);
      if (disposed) return;
      if (remaining > 1) afterLayout(run, remaining - 1);
      else run();
    });
    frames.add(frame);
  };
  let disposed = false,
    saveTimer: ReturnType<typeof setTimeout> | undefined,
    toastTimer: ReturnType<typeof setTimeout> | undefined;
  let threadId: string | undefined;
  let inspectorMode: "members" | "thread" | "pins" | "saved" = "members";
  let mainComposer: ReturnType<typeof mountComposer> | undefined,
    threadComposer: ReturnType<typeof mountComposer> | undefined;
  let modalCleanup: (() => void) | undefined;
  let dragChannel: string | undefined;
  const app = document.createElement("div");
  app.className = "community-app";
  app.dataset.mashCatalogue = "mash";
  app.innerHTML = `<div class="community-topbar"><ui-button variant="ghost" size="small" data-action="sidebar" aria-label="Toggle channel sidebar"><ui-icon name="navigation.menu"></ui-icon></ui-button><span class="community-workspace-mark">f</span><strong data-workspace></strong><span class="community-topbar-divider">/</span><span class="community-topbar-context">Community</span><div class="community-flex"></div><ui-button class="community-search-button" variant="ghost" size="small" data-action="search"><ui-icon name="action.search"></ui-icon><span>Search this space</span><kbd>⌘ K</kbd></ui-button><ui-button variant="ghost" size="small" data-action="settings" aria-label="Community settings"><ui-icon name="action.settings"></ui-icon></ui-button></div><ui-resizable class="community-panels" label="Community workspace"><ui-resizable-panel class="community-sidebar-panel" size="232" min="184" max="340"><aside class="community-sidebar" aria-label="Channels and direct messages"></aside></ui-resizable-panel><ui-resizable-handle class="community-sidebar-handle" label="Resize channel sidebar"></ui-resizable-handle><ui-resizable-panel class="community-main-panel" min="260"><main class="community-main"><header class="community-channel-header"></header><div class="community-conversation"></div><div class="community-main-composer"></div></main></ui-resizable-panel><ui-resizable-handle class="community-inspector-handle" label="Resize conversation details"></ui-resizable-handle><ui-resizable-panel class="community-inspector-panel" size="302" min="250" max="460"><aside class="community-inspector" aria-label="Conversation details"></aside></ui-resizable-panel></ui-resizable><div class="community-toast" role="status" aria-live="polite" hidden></div><ui-dialog class="community-dialog" label="Community action"></ui-dialog>`;
  root.replaceChildren(app);
  const query = <T extends Element = HTMLElement>(selector: string) =>
    app.querySelector<T>(selector)!;
  const dialog = query<UIDialog>(".community-dialog");
  const on = (target: EventTarget, type: string, listener: EventListener) =>
    target.addEventListener(type, listener, { signal: lifetime.signal });
  const announce = (text: string) => {
    if (disposed) return;
    const toast = query(".community-toast");
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3500);
  };
  const save = () => {
    clearTimeout(saveTimer);
    if (disposed) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      announce("Your changes are kept for this visit. Browser storage is unavailable.");
    }
  };
  const queueSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 250);
  };
  on(window, "pagehide", save);
  const memberName = (id: string) =>
    state.members.find((m) => m.id === id)?.name ?? "Former member";
  const attachment = (id: string) => state.attachments.find((a) => a.id === id);
  function urlFor(id: string): string | undefined {
    if (urls.has(id)) return urls.get(id);
    const item = attachment(id);
    if (!item) return;
    let blob = blobs.get(id);
    if (!blob && item.content !== undefined) {
      blob = new Blob([item.content], { type: item.type });
      blobs.set(id, blob);
    }
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    urls.set(id, url);
    return url;
  }
  function readViewport(scroller: UIMessageScroller | null): HTMLElement | null {
    return scroller?.shadowRoot?.querySelector<HTMLElement>('[part="viewport"]') ?? null;
  }
  const current = () => model.channel();
  function syncAppearance(): void {
    app.toggleAttribute("data-compact", state.settings.compact);
    app.toggleAttribute("data-no-avatars", !state.settings.showAvatars);
    app.toggleAttribute("data-sidebar", state.settings.sidebar);
    app.toggleAttribute("data-inspector", state.settings.inspector);
    query<UIResizablePanel>(".community-sidebar-panel").visible = state.settings.sidebar;
    query<UIResizablePanel>(".community-sidebar-panel").hidden = !state.settings.sidebar;
    query<UIResizablePanel>(".community-inspector-panel").visible = state.settings.inspector;
    query<UIResizablePanel>(".community-inspector-panel").hidden = !state.settings.inspector;
    query("[data-workspace]").textContent = state.workspace;
    mainComposer?.refresh();
    threadComposer?.refresh();
  }
  function channelRow(channel: Channel): string {
    const unread = model.unread(channel);
    return `<div class="community-channel-row" draggable="true" data-channel-drag="${channel.id}"><ui-button variant="ghost" size="small" data-action="channel:${channel.id}" ${current().id === channel.id ? 'aria-current="page"' : ""}><span class="community-channel-symbol">${symbol(channel)}</span><span class="community-channel-name">${escape(channel.name)}</span>${unread ? `<span class="community-unread" aria-label="${unread} unread messages">${unread}</span>` : ""}${channel.notifications === "off" ? '<span aria-label="Muted">◌</span>' : ""}</ui-button><ui-menu label="Room actions"><ui-button slot="trigger" variant="ghost" size="xsmall" aria-label="Actions for ${escape(channel.name)}"><ui-icon name="navigation.more.horizontal"></ui-icon></ui-button>${menuItem(`${channel.pinned ? "Unpin" : "Pin"} room`, `pin-channel:${channel.id}`)}${menuItem("Mark unread", `unread:${channel.id}`)}${menuItem("Move up", `move-up:${channel.id}`)}${menuItem("Move down", `move-down:${channel.id}`)}${menuItem("Room settings", `channel-settings:${channel.id}`)}</ui-menu></div>`;
  }
  function menuItem(label: string, command: string): string {
    return `<ui-menu-item value="${command}">${escape(label)}</ui-menu-item>`;
  }
  function renderSidebar(): void {
    const channels = state.channels.filter((c) => !c.archived);
    const pinned = channels.filter((c) => c.pinned);
    const sections = [
      ...new Set(channels.filter((c) => c.kind !== "dm" && !c.pinned).map((c) => c.section)),
    ];
    const self = state.members.find((m) => m.id === state.selfId)!;
    query(".community-sidebar").innerHTML =
      `<div class="community-sidebar-heading"><span>YOUR SPACE</span><ui-button variant="ghost" size="xsmall" data-action="new-channel" aria-label="Create room"><ui-icon name="action.add"></ui-icon></ui-button></div><div class="community-sidebar-scroll">${pinned.length ? `<section><h3>Pinned</h3>${pinned.map(channelRow).join("")}</section>` : ""}${sections
        .map(
          (section) =>
            `<section data-channel-section="${escape(section)}"><h3>${escape(section)}</h3>${channels
              .filter((c) => !c.pinned && c.kind !== "dm" && c.section === section)
              .map(channelRow)
              .join("")}</section>`,
        )
        .join(
          "",
        )}<section><h3>Direct messages<ui-button variant="ghost" size="xsmall" data-action="new-dm" aria-label="New direct message"><ui-icon name="action.add"></ui-icon></ui-button></h3>${channels
        .filter((c) => c.kind === "dm" && !c.pinned)
        .map(channelRow)
        .join(
          "",
        )}</section><ui-button class="community-archive-link" variant="ghost" size="small" data-action="archive-list">Archived rooms${state.channels.some((c) => c.archived) ? ` · ${state.channels.filter((c) => c.archived).length}` : ""}</ui-button></div><footer><ui-button variant="ghost" data-action="profile:${self.id}" aria-label="Your profile"><ui-avatar size="small" alt="${escape(self.name)}">${escape(self.initials)}</ui-avatar><span><strong>${escape(self.name)}</strong><small>${escape(self.role)}</small></span></ui-button><ui-button variant="ghost" size="small" data-action="settings" aria-label="Preferences"><ui-icon name="action.settings"></ui-icon></ui-button></footer>`;
  }
  function renderHeader(): void {
    const channel = current();
    query(".community-channel-header").innerHTML =
      `<span class="community-channel-icon">${symbol(channel)}</span><ui-button variant="ghost" data-action="channel-settings:${channel.id}" class="community-channel-title"><strong>${escape(channel.name)}</strong><small>${escape(channel.description || "Make this space your own")}</small></ui-button><div class="community-flex"></div><ui-button variant="ghost" size="small" data-action="pins" aria-label="Pinned messages">${roomIcon("pin")}</ui-button><ui-button variant="ghost" size="small" data-action="members" aria-label="Show members">${channel.members.length} people</ui-button><ui-button variant="ghost" size="small" data-action="inspector" aria-label="Toggle details panel">${roomIcon("panel")}</ui-button><ui-menu label="Conversation actions"><ui-button slot="trigger" variant="ghost" size="small" aria-label="Conversation actions"><ui-icon name="navigation.more.horizontal"></ui-icon></ui-button>${menuItem("Find in conversation", "channel-search")}${menuItem("Saved messages", "saved")}${menuItem("Mark all read", "mark-read")}${menuItem(channel.notifications === "off" ? "Unmute conversation" : "Mute conversation", `mute:${channel.id}`)}${menuItem("Room settings", `channel-settings:${channel.id}`)}</ui-menu>`;
  }
  function attachmentMarkup(id: string): string {
    const item = attachment(id);
    if (!item) return "";
    const url = urlFor(id);
    const image = url && item.type.startsWith("image/");
    return `<div class="community-file">${image ? `<button type="button" class="community-image-button" data-action="preview:${id}" aria-label="Open ${escape(item.name)}"><img src="${url}" alt="${escape(item.name)}" loading="lazy"></button>` : ""}<ui-attachment><span slot="media" aria-hidden="true">▤</span><strong slot="title">${escape(item.name)}</strong><span slot="description">${sizeLabel(item.size)}${url ? "" : " · Reattach to open after reload"}</span><ui-button slot="actions" variant="ghost" size="xsmall" data-action="preview:${id}" ${url ? "" : "disabled"}>Open</ui-button><ui-button slot="actions" variant="ghost" size="xsmall" data-action="download:${id}" aria-label="Download ${escape(item.name)}" ${url ? "" : "disabled"}><ui-icon name="action.download"></ui-icon></ui-button></ui-attachment></div>`;
  }
  function messageNode(message: Message, compact = false): HTMLElement {
    const row = document.createElement("ui-message");
    row.id = `community-message-${message.id}`;
    row.dataset.messageId = message.id;
    const author = state.members.find((m) => m.id === message.authorId);
    const time = new Date(message.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const replies = state.messages.filter((m) => m.parentId === message.id).length;
    const quote = state.messages.find((m) => m.id === message.quoteId);
    row.innerHTML = `${author ? `<ui-button slot="avatar" variant="ghost" size="small" data-action="profile:${author.id}" aria-label="View ${escape(author.name)} profile"><ui-avatar size="medium" alt="${escape(author.name)}">${escape(author.initials)}</ui-avatar></ui-button>` : ""}<div slot="header" class="community-message-meta"><ui-button variant="ghost" size="xsmall" data-action="profile:${message.authorId}">${escape(memberName(message.authorId))}</ui-button><time datetime="${new Date(message.createdAt).toISOString()}">${time}</time>${message.editedAt ? "<span>edited</span>" : ""}${message.pinned ? '<span title="Pinned message">⌖</span>' : ""}</div>${message.forwardedFrom ? '<small class="community-forwarded">Forwarded message</small>' : ""}${quote ? `<button class="community-quote-link" type="button" data-action="jump:${quote.id}">${escape(memberName(quote.authorId))}: ${escape(quote.text.slice(0, 100))}</button>` : ""}<ui-bubble variant="ghost"><div class="community-message-text">${escape(message.text)}</div></ui-bubble>${message.attachmentIds.map(attachmentMarkup).join("")}<div slot="footer" class="community-message-footer">${Object.entries(
      message.reactions,
    )
      .map(
        ([emoji, people]) =>
          `<ui-button variant="ghost" size="xsmall" data-action="react:${message.id}:${emoji}" aria-label="${escape(emoji)} reaction, ${people.length} people" aria-pressed="${people.includes(state.selfId)}">${escape(emoji)} ${people.length}</ui-button>`,
      )
      .join(
        "",
      )}${replies && !compact ? `<ui-button variant="ghost" size="xsmall" data-action="thread:${message.id}">${replies} ${replies === 1 ? "reply" : "replies"} ↗</ui-button>` : ""}</div><div slot="footer" class="community-message-actions"><ui-button variant="ghost" size="xsmall" data-action="react:${message.id}:♡" aria-label="React to message">${roomIcon("heart")}</ui-button><ui-button variant="ghost" size="xsmall" data-action="thread:${message.parentId ?? message.id}" aria-label="Reply in thread">${roomIcon("reply")}</ui-button><ui-menu label="Message actions"><ui-button slot="trigger" variant="ghost" size="xsmall" aria-label="More message actions"><ui-icon name="navigation.more.horizontal"></ui-icon></ui-button>${menuItem("Quote reply", `quote:${message.id}`)}${menuItem("Forward", `forward:${message.id}`)}${menuItem(message.saved ? "Remove from saved" : "Save message", `save-message:${message.id}`)}${menuItem(message.pinned ? "Unpin message" : "Pin message", `pin-message:${message.id}`)}${menuItem("Copy text", `copy:${message.id}`)}${message.authorId === state.selfId ? menuItem("Edit message", `edit:${message.id}`) + menuItem("Delete message", `delete:${message.id}`) : ""}</ui-menu></div>`;
    return row;
  }
  function renderTimeline(): void {
    const channel = current();
    const messages = model.messages(channel.id);
    const scroller = query<UIMessageScroller>(".community-timeline");
    if (scroller) {
      scroller.items = messages.map((m) => ({ ...m }));
      return;
    }
    const feed = query(".community-channel-feed");
    if (!feed) return;
    feed.replaceChildren(
      ...messages.map((message) => {
        const card = document.createElement("article");
        card.className =
          channel.kind === "gallery" ? "community-gallery-card" : "community-note-card";
        if (channel.kind === "gallery")
          card.innerHTML = message.attachmentIds.map(attachmentMarkup).join("");
        const content = messageNode(
          channel.kind === "gallery" ? { ...message, attachmentIds: [] } : message,
        );
        card.append(content);
        return card;
      }),
    );
    if (!messages.length)
      feed.innerHTML =
        '<div class="community-empty"><strong>A little room for something new</strong><p>Share a note or add a file to get started.</p></div>';
  }
  function refreshContent(): void {
    renderTimeline();
    renderSidebar();
    if (inspectorMode === "thread") renderThreadMessages();
    else renderInspector();
    queueSave();
  }
  function attachFiles(files: File[], channelId: string, parentId?: string): void {
    const draft = model.draft(channelId, parentId);
    for (const file of files) {
      const id = newId();
      blobs.set(id, file);
      state.attachments.push({
        id,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
      });
      draft.attachmentIds.push(id);
    }
    queueSave();
    announce(`${files.length} ${files.length === 1 ? "file" : "files"} attached`);
  }
  function composer(
    container: HTMLElement,
    channelId: string,
    parentId?: string,
  ): ReturnType<typeof mountComposer> {
    return mountComposer(container, {
      label: parentId
        ? "Write a reply…"
        : current().kind === "notebook"
          ? "Write a note. Start with a title…"
          : `Message ${model.channel(channelId).name}…`,
      getDraft: () => model.draft(channelId, parentId),
      changed: queueSave,
      send: () => {
        const sent = model.send(channelId, parentId);
        if (!sent) return;
        refreshContent();
        const target = parentId
          ? query<UIMessageScroller>(".community-thread-scroller")
          : query<UIMessageScroller>(".community-timeline");
        void target?.updateComplete.then(() => afterLayout(() => target.scrollToLatest()));
        announce(parentId ? "Reply added" : "Message added");
      },
      attach: (files) => attachFiles(files, channelId, parentId),
      attachmentName: (id) => attachment(id)?.name ?? "Attachment",
      enterSends: () => state.settings.enterSends,
      quoteLabel: (id) => {
        const message = state.messages.find((m) => m.id === id);
        return message
          ? `${memberName(message.authorId)}: ${message.text.slice(0, 90)}`
          : "Quoted message removed";
      },
    });
  }
  function openChannel(id: string, targetId?: string): void {
    const channel = state.channels.find((c) => c.id === id);
    if (!channel || channel.archived) return;
    const previous = query<UIMessageScroller>(".community-timeline");
    const viewport = readViewport(previous);
    if (viewport) scrollPositions.set(current().id, viewport.scrollTop);
    mainComposer?.dispose();
    threadComposer?.dispose();
    threadComposer = undefined;
    threadId = undefined;
    inspectorMode = "members";
    state.activeChannelId = id;
    const body = query(".community-conversation");
    body.innerHTML =
      channel.kind === "chat" || channel.kind === "dm"
        ? `<ui-message-scroller class="community-timeline" label="${escape(channel.name)} messages"><div slot="empty" class="community-empty"><strong>This is the start of ${escape(channel.name)}</strong><p>Say hello or share something useful.</p></div><span slot="latest">Latest messages ↓</span></ui-message-scroller>`
        : `<div class="community-feed-heading"><span>${channel.kind === "gallery" ? "THE SHARED SHELF" : "NOTES FROM THE COMMUNITY"}</span><strong>${escape(channel.description)}</strong></div><div class="community-channel-feed ${channel.kind === "gallery" ? "community-gallery" : "community-notebook"}"></div>`;
    const scroller = query<UIMessageScroller>(".community-timeline");
    if (scroller) scroller.renderMessage = (record) => messageNode(record as unknown as Message);
    renderHeader();
    renderTimeline();
    renderSidebar();
    renderInspector();
    mainComposer = composer(query(".community-main-composer"), id);
    model.markRead(id);
    queueSave();
    if (scroller)
      void scroller.updateComplete.then(() =>
        afterLayout(() => {
          if (disposed || current().id !== id) return;
          const position = scrollPositions.get(id);
          if (targetId) scroller.scrollToMessage(targetId);
          else if (position !== undefined) {
            const view = readViewport(scroller);
            if (view) view.scrollTop = position;
          } else scroller.scrollToLatest();
          renderSidebar();
        }),
      );
    if (matchMedia("(max-width: 680px)").matches) {
      state.settings.sidebar = false;
      state.settings.inspector = false;
      syncAppearance();
    }
  }
  function openThread(id: string): void {
    const message = state.messages.find((m) => m.id === id);
    if (!message) return;
    if (message.channelId !== current().id) openChannel(message.channelId);
    threadId = message.parentId ?? message.id;
    inspectorMode = "thread";
    state.settings.inspector = true;
    syncAppearance();
    renderInspector();
    threadComposer?.focus();
  }
  function renderThreadMessages(): void {
    const scroller = query<UIMessageScroller>(".community-thread-scroller");
    if (!scroller || !threadId) return;
    scroller.items = model.messages(current().id, threadId).map((m) => ({ ...m }));
    const parent = state.messages.find((m) => m.id === threadId);
    const context = query(".community-thread-context");
    if (parent && context) context.replaceChildren(messageNode(parent, true));
    const count = query(".community-thread-count");
    if (count) count.textContent = `${model.messages(current().id, threadId).length} replies`;
  }
  function renderInspector(): void {
    threadComposer?.dispose();
    threadComposer = undefined;
    const panel = query(".community-inspector");
    const channel = current();
    if (inspectorMode === "thread" && threadId) {
      panel.innerHTML = `<header><strong>Thread</strong><span class="community-thread-count"></span><ui-button variant="ghost" size="small" data-action="close-thread" aria-label="Close thread"><ui-icon name="action.dismiss"></ui-icon></ui-button></header><div class="community-thread-context"></div><ui-message-scroller class="community-thread-scroller" label="Thread replies"><span slot="empty" class="community-empty">Be the first to reply.</span></ui-message-scroller><div class="community-thread-composer"></div>`;
      query<UIMessageScroller>(".community-thread-scroller").renderMessage = (record) =>
        messageNode(record as unknown as Message, true);
      renderThreadMessages();
      threadComposer = composer(query(".community-thread-composer"), channel.id, threadId);
      return;
    }
    if (inspectorMode === "pins" || inspectorMode === "saved") {
      const messages = state.messages.filter((m) =>
        inspectorMode === "saved" ? m.saved : m.channelId === channel.id && m.pinned,
      );
      panel.innerHTML = `<header><strong>${inspectorMode === "saved" ? "Saved messages" : "Pinned messages"}</strong><ui-button variant="ghost" size="small" data-action="members" aria-label="Back to members"><ui-icon name="action.dismiss"></ui-icon></ui-button></header><div class="community-inspector-scroll">${messages.map((m) => `<button type="button" class="community-result" data-action="jump:${m.id}"><strong>${escape(memberName(m.authorId))}</strong><span>${escape(m.text.slice(0, 180))}</span><small>${escape(model.channel(m.channelId).name)}</small></button>`).join("") || '<div class="community-empty">Keep useful messages close. Open a message menu to add one here.</div>'}</div>`;
      return;
    }
    panel.innerHTML = `<header><strong>About this room</strong><ui-button variant="ghost" size="small" data-action="inspector" aria-label="Close details"><ui-icon name="action.dismiss"></ui-icon></ui-button></header><div class="community-inspector-scroll"><div class="community-room-summary"><span class="community-room-mark">${symbol(channel)}</span><h2>${escape(channel.name)}</h2><p>${escape(channel.description)}</p><ui-button size="small" variant="ghost" data-action="channel-settings:${channel.id}">Edit room details ↗</ui-button></div><div class="community-members-heading"><h3>People <span>${channel.members.length}</span></h3><ui-button variant="ghost" size="xsmall" data-action="manage-members:${channel.id}" aria-label="Manage room members"><ui-icon name="action.add"></ui-icon></ui-button></div>${channel.members
      .map((id) => {
        const member = state.members.find((m) => m.id === id);
        return member
          ? `<ui-button class="community-member" variant="ghost" data-action="profile:${id}"><ui-avatar size="small" alt="${escape(member.name)}">${escape(member.initials)}</ui-avatar><span><strong>${escape(member.name)}</strong><small>${escape(member.role)}</small></span>${id === state.selfId ? "<small>You</small>" : ""}</ui-button>`
          : "";
      })
      .join(
        "",
      )}<div class="community-local-note"><strong>A space you can make your own</strong><p>Conversations and preferences stay in this browser. Files you add remain available for this visit.</p></div></div>`;
  }
  function closeModal(): void {
    dialog.dismiss();
    modalCleanup?.();
    modalCleanup = undefined;
  }
  function showModal(
    title: string,
    content: string,
    setup?: (body: UIDialog, signal: AbortSignal) => void,
  ): void {
    modalCleanup?.();
    const scope = new AbortController();
    modalCleanup = () => scope.abort();
    dialog.label = title;
    dialog.innerHTML = `<strong slot="title">${escape(title)}</strong>${content}<ui-button slot="close" type="button" variant="ghost" size="small" aria-label="Close dialog">Close</ui-button>`;
    setup?.(dialog, scope.signal);
    dialog.show();
    void dialog.updateComplete.then(() => {
      if (!scope.signal.aborted) dialog.querySelector<UIInput>("ui-input")?.focus();
    });
  }
  function openSearch(channelId = ""): void {
    showModal(
      channelId ? `Search ${model.channel(channelId).name}` : "Find something",
      `<ui-input class="community-search-input" label="Search messages" type="search" placeholder="Search people, messages or rooms…"></ui-input><div class="community-search-meta"></div><div class="community-search-results"></div><ui-separator></ui-separator><ui-command label="Quick actions" placeholder="Find a command…"><ui-command-item value="new-channel">Create a room<span slot="description">Chat, gallery or notebook</span></ui-command-item><ui-command-item value="new-dm">New direct message</ui-command-item><ui-command-item value="settings">Open preferences</ui-command-item><ui-command-item value="saved">View saved messages</ui-command-item><span slot="footer">↑ ↓ to move · Enter to open</span></ui-command>`,
      (body, signal) => {
        const input = body.querySelector<UIInput>("ui-input")!;
        const renderResults = () => {
          const matches = model.search(input.value, channelId).slice(0, 60);
          body.querySelector(".community-search-meta")!.textContent =
            `${matches.length} ${matches.length === 1 ? "message" : "messages"}${input.value ? ` matching “${input.value}”` : " · recent first"}`;
          body.querySelector(".community-search-results")!.innerHTML =
            matches
              .map(
                (m) =>
                  `<button type="button" class="community-result" data-action="jump:${m.id}"><span class="community-result-meta">${escape(model.channel(m.channelId).name)}${m.parentId ? " · Thread" : ""} · ${escape(memberName(m.authorId))}</span><span>${escape(m.text || m.attachmentIds.map((id) => attachment(id)?.name ?? "File").join(", "))}</span></button>`,
              )
              .join("") ||
            '<div class="community-empty">No messages match. Try another word or a person’s name.</div>';
        };
        input.addEventListener("input", renderResults, { signal });
        renderResults();
      },
    );
  }
  function newChannel(): void {
    showModal(
      "Create a room",
      `<form class="community-form"><label>Name<ui-input name="name" label="Room name" required placeholder="A name for the conversation"></ui-input></label><label>Kind<ui-select name="kind" label="Room kind" value="chat"><ui-option value="chat">Chat</ui-option><ui-option value="gallery">Gallery</ui-option><ui-option value="notebook">Notebook</ui-option></ui-select></label><label>Section<ui-input name="section" label="Room section" value="Make"></ui-input></label><ui-button type="submit" variant="primary">Create room</ui-button><output aria-live="polite"></output></form>`,
      (body, signal) => {
        body.querySelector("form")!.addEventListener(
          "submit",
          (event) => {
            event.preventDefault();
            const name = body.querySelector<UIInput>('[name="name"]')!.value;
            const kind = body.querySelector<UISelect>('[name="kind"]')!.value as ChannelKind;
            const section = body.querySelector<UIInput>('[name="section"]')!.value;
            const channel = model.createChannel(name, kind, section);
            if (!channel) {
              body.querySelector("output")!.textContent = "Give the room a name.";
              return;
            }
            closeModal();
            openChannel(channel.id);
            announce(`${channel.name} created`);
          },
          { signal },
        );
      },
    );
  }
  function peoplePicker(): void {
    showModal(
      "Start a conversation",
      `<ui-input label="Find a person" type="search" placeholder="Find someone in this space…"></ui-input><div class="community-people-list">${state.members
        .filter((m) => m.id !== state.selfId)
        .map(
          (m) =>
            `<ui-button class="community-member" variant="ghost" data-person="${escape(m.name.toLocaleLowerCase())}" data-action="dm:${m.id}"><ui-avatar alt="${escape(m.name)}" size="small">${escape(m.initials)}</ui-avatar><span><strong>${escape(m.name)}</strong><small>${escape(m.role)}</small></span><span>↗</span></ui-button>`,
        )
        .join(
          "",
        )}</div><output class="community-people-empty" hidden>No people match your search.</output>`,
      (body, signal) => {
        const input = body.querySelector<UIInput>("ui-input")!;
        input.addEventListener(
          "input",
          () => {
            let count = 0;
            for (const row of body.querySelectorAll<HTMLElement>("[data-person]")) {
              row.hidden = !row.dataset.person!.includes(input.value.toLocaleLowerCase());
              if (!row.hidden) count++;
            }
            body.querySelector<HTMLElement>(".community-people-empty")!.hidden = count > 0;
          },
          { signal },
        );
      },
    );
  }
  function profile(id: string): void {
    const member = state.members.find((m) => m.id === id);
    if (!member) return;
    showModal(
      member.name,
      `<div class="community-profile"><ui-avatar size="large" alt="${escape(member.name)}">${escape(member.initials)}</ui-avatar><strong>${escape(member.name)}</strong><span>${escape(member.role)} · ${escape(state.workspace)}</span><p>${escape(member.bio)}</p></div>${id === state.selfId ? '<ui-button variant="primary" data-action="settings">Edit your profile</ui-button>' : `<ui-button variant="primary" data-action="dm:${id}">Send a message</ui-button>`}<h3>Shared rooms</h3><div class="community-shared-rooms">${state.channels
        .filter((c) => !c.archived && c.kind !== "dm" && c.members.includes(id))
        .map(
          (c) =>
            `<ui-button variant="ghost" data-action="channel:${c.id}">${symbol(c)} ${escape(c.name)}</ui-button>`,
        )
        .join("")}</div>`,
    );
  }
  function channelSettings(id: string): void {
    const channel = model.channel(id);
    showModal(
      "Room settings",
      `<form class="community-form"><label>Name<ui-input name="name" label="Room name" value="${escape(channel.name)}" required></ui-input></label><label>About<ui-textarea name="description" label="Room description" value="${escape(channel.description)}" rows="3"></ui-textarea></label><label>Section<ui-input name="section" label="Room section" value="${escape(channel.section)}"></ui-input></label><label>Notifications<ui-select name="notifications" label="Room notifications" value="${channel.notifications}"><ui-option value="all">All messages</ui-option><ui-option value="mentions">Mentions only</ui-option><ui-option value="off">Muted</ui-option></ui-select></label><ui-button type="button" variant="ghost" data-action="manage-members:${id}">Manage ${channel.members.length} members</ui-button><div class="community-form-actions"><ui-button type="submit" variant="primary">Save changes</ui-button><ui-button type="button" variant="ghost" data-action="archive:${id}">${channel.kind === "dm" ? "Close conversation" : "Archive room"}</ui-button></div><output aria-live="polite"></output></form>`,
      (body, signal) => {
        body.querySelector("form")!.addEventListener(
          "submit",
          (event) => {
            event.preventDefault();
            const name = body.querySelector<UIInput>('[name="name"]')!.value.trim();
            if (!name) {
              body.querySelector("output")!.textContent = "A room name is required.";
              return;
            }
            channel.name = name;
            channel.description = body.querySelector<UITextarea>('[name="description"]')!.value;
            channel.section =
              body.querySelector<UIInput>('[name="section"]')!.value.trim() || "Rooms";
            channel.notifications = body.querySelector<UISelect>('[name="notifications"]')!
              .value as Channel["notifications"];
            closeModal();
            renderHeader();
            renderSidebar();
            renderInspector();
            queueSave();
            announce("Room settings saved");
          },
          { signal },
        );
      },
    );
  }
  function manageMembers(id: string): void {
    const channel = model.channel(id);
    showModal(
      "Room members",
      `<form class="community-form">${state.members.map((member) => `<ui-checkbox value="${member.id}" ${channel.members.includes(member.id) ? "checked" : ""} ${member.id === state.selfId ? "disabled" : ""}>${escape(member.name)}${member.id === state.selfId ? " (you)" : ""}</ui-checkbox>`).join("")}<ui-button type="submit" variant="primary">Save members</ui-button></form>`,
      (body, signal) => {
        body.querySelector("form")!.addEventListener(
          "submit",
          (event) => {
            event.preventDefault();
            channel.members = [...body.querySelectorAll<UICheckbox>("ui-checkbox")]
              .filter((c) => c.checked)
              .map((c) => c.value);
            closeModal();
            renderHeader();
            renderInspector();
            queueSave();
            announce("Room members updated");
          },
          { signal },
        );
      },
    );
  }
  function preferences(): void {
    const self = state.members.find((m) => m.id === state.selfId)!;
    showModal(
      "Your preferences",
      `<form class="community-form"><div class="community-form-grid"><label>Your name<ui-input name="person" label="Your name" value="${escape(self.name)}" required></ui-input></label><label>Space name<ui-input name="workspace" label="Space name" value="${escape(state.workspace)}" required></ui-input></label></div><label>A few words about you<ui-textarea name="bio" label="Your bio" value="${escape(self.bio)}" rows="3"></ui-textarea></label><ui-separator></ui-separator><ui-switch name="compact" ${state.settings.compact ? "checked" : ""}>Compact messages</ui-switch><ui-switch name="avatars" ${state.settings.showAvatars ? "checked" : ""}>Show avatars</ui-switch><ui-switch name="enter" ${state.settings.enterSends ? "checked" : ""}>Enter sends a message</ui-switch><small>Theme follows the site’s appearance setting. Conversations are saved only in this browser.</small><div class="community-form-actions"><ui-button type="submit" variant="primary">Save preferences</ui-button><ui-button type="button" variant="ghost" data-action="export">Export conversations</ui-button></div><output aria-live="polite"></output></form>`,
      (body, signal) => {
        body.querySelector("form")!.addEventListener(
          "submit",
          (event) => {
            event.preventDefault();
            const name = body.querySelector<UIInput>('[name="person"]')!.value.trim(),
              workspace = body.querySelector<UIInput>('[name="workspace"]')!.value.trim();
            if (!name || !workspace) {
              body.querySelector("output")!.textContent = "Your name and space name are required.";
              return;
            }
            self.name = name;
            self.initials = name
              .split(/\s+/)
              .slice(0, 2)
              .map((word) => word[0])
              .join("")
              .toUpperCase();
            self.bio = body.querySelector<UITextarea>('[name="bio"]')!.value;
            state.workspace = workspace;
            state.settings.compact = body.querySelector<UISwitch>('[name="compact"]')!.checked;
            state.settings.showAvatars = body.querySelector<UISwitch>('[name="avatars"]')!.checked;
            state.settings.enterSends = body.querySelector<UISwitch>('[name="enter"]')!.checked;
            closeModal();
            syncAppearance();
            refreshContent();
            announce("Preferences saved");
          },
          { signal },
        );
      },
    );
  }
  function editMessage(id: string): void {
    const message = state.messages.find((m) => m.id === id);
    if (!message || message.authorId !== state.selfId) return;
    showModal(
      "Edit message",
      `<form class="community-form"><ui-textarea label="Edit message text" rows="6" value="${escape(message.text)}"></ui-textarea><ui-button type="submit" variant="primary">Save message</ui-button><output aria-live="polite"></output></form>`,
      (body, signal) => {
        body.querySelector("form")!.addEventListener(
          "submit",
          (event) => {
            event.preventDefault();
            if (!model.edit(id, body.querySelector<UITextarea>("ui-textarea")!.value)) {
              body.querySelector("output")!.textContent = "Write a message or keep an attachment.";
              return;
            }
            closeModal();
            refreshContent();
            announce("Message updated");
          },
          { signal },
        );
      },
    );
  }
  function deleteMessage(id: string): void {
    const message = state.messages.find((m) => m.id === id);
    if (!message || message.authorId !== state.selfId) return;
    const replies = state.messages.filter((m) => m.parentId === id).length;
    showModal(
      "Delete message?",
      `<p>This removes your message${replies ? ` and its ${replies} replies` : ""} from this local conversation.</p><ui-button variant="primary" data-confirm-delete>Delete message</ui-button>`,
      (body, signal) => {
        body.querySelector("[data-confirm-delete]")!.addEventListener(
          "click",
          () => {
            model.deleteMessage(id);
            if (threadId === id) {
              threadId = undefined;
              inspectorMode = "members";
              renderInspector();
            }
            closeModal();
            refreshContent();
            announce("Message deleted");
          },
          { signal },
        );
      },
    );
  }
  function forward(id: string): void {
    showModal(
      "Forward to a room",
      `<div class="community-shared-rooms">${state.channels
        .filter((c) => !c.archived)
        .map(
          (c) =>
            `<ui-button variant="ghost" data-forward-channel="${c.id}">${symbol(c)} ${escape(c.name)}</ui-button>`,
        )
        .join("")}</div>`,
      (body, signal) => {
        body.addEventListener(
          "click",
          (event) => {
            const target = (event.target as Element).closest<HTMLElement>("[data-forward-channel]");
            if (!target) return;
            const channelId = target.dataset.forwardChannel!;
            if (!model.forward(id, channelId)) return;
            closeModal();
            refreshContent();
            announce(`Forwarded to ${model.channel(channelId).name}`);
          },
          { signal },
        );
      },
    );
  }
  function archive(id: string): void {
    const channel = model.channel(id);
    showModal(
      "Archive this room?",
      `<p>${escape(channel.name)} will move to Archived rooms. Its messages and drafts stay intact.</p><ui-button variant="primary" data-confirm-archive>Archive room</ui-button>`,
      (body, signal) => {
        body.querySelector("[data-confirm-archive]")!.addEventListener(
          "click",
          () => {
            channel.archived = true;
            closeModal();
            if (current().id === id) {
              const next =
                state.channels.find((c) => !c.archived) ??
                model.createChannel("The commons", "chat", "Gather")!;
              openChannel(next.id);
            } else renderSidebar();
            queueSave();
            announce("Room archived");
          },
          { signal },
        );
      },
    );
  }
  function archiveList(): void {
    showModal(
      "Archived rooms",
      `<div class="community-shared-rooms">${
        state.channels
          .filter((c) => c.archived)
          .map(
            (c) =>
              `<div class="community-archive-row"><span>${symbol(c)} ${escape(c.name)}</span><ui-button size="small" variant="ghost" data-action="restore:${c.id}">Restore</ui-button></div>`,
          )
          .join("") || '<p class="community-empty">No archived rooms.</p>'
      }</div>`,
    );
  }
  async function preview(id: string): Promise<void> {
    const item = attachment(id),
      url = urlFor(id);
    if (!item || !url) {
      announce("This file is no longer in memory. Reattach the original to open it.");
      return;
    }
    const content = item.type.startsWith("image/")
      ? `<img class="community-file-preview" src="${url}" alt="${escape(item.name)}">`
      : item.type.startsWith("audio/")
        ? `<audio controls src="${url}"></audio>`
        : item.type.startsWith("video/")
          ? `<video class="community-file-preview" controls src="${url}"></video>`
          : '<pre class="community-text-preview">Loading local file…</pre>';
    showModal(
      item.name,
      content +
        `<div class="community-preview-footer"><span>${sizeLabel(item.size)}</span><ui-button variant="primary" data-action="download:${id}">Download file</ui-button></div>`,
    );
    if (
      item.type.startsWith("image/") ||
      item.type.startsWith("audio/") ||
      item.type.startsWith("video/")
    )
      return;
    const target = dialog.querySelector("pre")!;
    const blob = blobs.get(id)!;
    if (
      !item.type.startsWith("text/") &&
      !/\.(md|txt|json|csv|js|ts|css|html|svg|log)$/i.test(item.name)
    ) {
      target.textContent =
        "A preview is not available for this file type. Download the original to open it.";
      return;
    }
    const text = await blob.slice(0, 128000).text();
    if (disposed || !target.isConnected || !dialog.contains(target)) return;
    target.textContent =
      text + (blob.size > 128000 ? "\n\nPreview limited to the first 128 KB." : "");
  }
  function download(id: string): void {
    const item = attachment(id),
      url = urlFor(id);
    if (!item || !url) {
      announce("Reattach the original file to download it.");
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = item.name;
    app.append(link);
    link.click();
    link.remove();
  }
  function exportConversations(): void {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const id = newId();
    blobs.set(id, blob);
    state.attachments.push({
      id,
      name: "community-conversations.json",
      type: "application/json",
      size: blob.size,
    });
    download(id);
    // Export links are temporary and never become conversation attachments.
    state.attachments = state.attachments.filter((a) => a.id !== id);
    // Keep the object URL until cleanup so the browser can finish the download.
    blobs.delete(id);
  }
  function jump(id: string): void {
    const message = state.messages.find((m) => m.id === id);
    if (!message) {
      announce("That message has been removed.");
      return;
    }
    const channel = model.channel(message.channelId);
    if (channel.archived) {
      announce("Restore this room from Archived rooms to open its messages.");
      return;
    }
    closeModal();
    openChannel(message.channelId, message.parentId ?? id);
    if (message.parentId) {
      openThread(message.parentId);
      const scroller = query<UIMessageScroller>(".community-thread-scroller");
      void scroller?.updateComplete.then(() => scroller.scrollToMessage(id));
    } else if (channel.kind !== "chat" && channel.kind !== "dm")
      query(`[data-message-id="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    announce(`Opened message in ${channel.name}`);
  }
  function moveChannel(id: string, delta: number): void {
    const index = state.channels.findIndex((c) => c.id === id),
      target = index + delta;
    if (index < 0 || target < 0 || target >= state.channels.length) return;
    const [channel] = state.channels.splice(index, 1);
    state.channels.splice(target, 0, channel!);
    renderSidebar();
    queueSave();
    announce("Room order updated");
  }
  function action(value: string): void {
    const [name, id, detail] = value.split(":");
    switch (name) {
      case "channel":
        closeModal();
        if (id) openChannel(id);
        break;
      case "sidebar":
        state.settings.sidebar = !state.settings.sidebar;
        syncAppearance();
        queueSave();
        break;
      case "inspector":
        state.settings.inspector = !state.settings.inspector;
        syncAppearance();
        queueSave();
        break;
      case "members":
        inspectorMode = "members";
        threadId = undefined;
        state.settings.inspector = true;
        syncAppearance();
        renderInspector();
        break;
      case "close-thread":
        inspectorMode = "members";
        threadId = undefined;
        renderInspector();
        break;
      case "pins":
      case "saved":
        closeModal();
        inspectorMode = name;
        state.settings.inspector = true;
        syncAppearance();
        renderInspector();
        break;
      case "search":
        openSearch();
        break;
      case "channel-search":
        openSearch(current().id);
        break;
      case "new-channel":
        newChannel();
        break;
      case "new-dm":
        peoplePicker();
        break;
      case "dm": {
        const channel = id ? model.directMessage(id) : undefined;
        if (channel) {
          closeModal();
          openChannel(channel.id);
        }
        break;
      }
      case "profile":
        if (id) profile(id);
        break;
      case "settings":
        preferences();
        break;
      case "channel-settings":
        if (id) channelSettings(id);
        break;
      case "manage-members":
        if (id) manageMembers(id);
        break;
      case "archive":
        if (id) archive(id);
        break;
      case "archive-list":
        archiveList();
        break;
      case "restore": {
        const channel = state.channels.find((c) => c.id === id);
        if (channel) {
          channel.archived = false;
          closeModal();
          openChannel(channel.id);
          announce("Room restored");
        }
        break;
      }
      case "pin-channel": {
        const channel = state.channels.find((c) => c.id === id);
        if (channel) {
          channel.pinned = !channel.pinned;
          renderSidebar();
          queueSave();
        }
        break;
      }
      case "unread":
        if (id) {
          state.readAt[id] = 0;
          renderSidebar();
          queueSave();
          announce("Marked unread");
        }
        break;
      case "mark-read":
        model.markRead(current().id);
        renderSidebar();
        queueSave();
        announce("Conversation marked read");
        break;
      case "mute": {
        const channel = state.channels.find((c) => c.id === id);
        if (channel) {
          channel.notifications = channel.notifications === "off" ? "all" : "off";
          renderHeader();
          renderSidebar();
          queueSave();
          announce(channel.notifications === "off" ? "Conversation muted" : "Conversation unmuted");
        }
        break;
      }
      case "move-up":
        if (id) moveChannel(id, -1);
        break;
      case "move-down":
        if (id) moveChannel(id, 1);
        break;
      case "thread":
        if (id) openThread(id);
        break;
      case "jump":
        if (id) jump(id);
        break;
      case "quote": {
        const message = state.messages.find((m) => m.id === id);
        if (message) {
          if (message.parentId) {
            openThread(message.parentId);
            model.draft(message.channelId, message.parentId).quoteId = id;
            threadComposer?.refresh();
            threadComposer?.focus();
          } else {
            model.draft(message.channelId).quoteId = id;
            mainComposer?.refresh();
            mainComposer?.focus();
          }
          queueSave();
        }
        break;
      }
      case "react":
        if (id && detail) {
          model.react(id, detail);
          refreshContent();
        }
        break;
      case "pin-message":
      case "save-message": {
        const message = state.messages.find((m) => m.id === id);
        if (message) {
          if (name === "pin-message") message.pinned = !message.pinned;
          else message.saved = !message.saved;
          refreshContent();
        }
        break;
      }
      case "edit":
        if (id) editMessage(id);
        break;
      case "delete":
        if (id) deleteMessage(id);
        break;
      case "forward":
        if (id) forward(id);
        break;
      case "copy": {
        const message = state.messages.find((m) => m.id === id);
        if (message)
          void navigator.clipboard.writeText(message.text).then(
            () => announce("Message copied"),
            () => announce("Copy unavailable. Select the message text to copy it."),
          );
        break;
      }
      case "preview":
        if (id) void preview(id);
        break;
      case "download":
        if (id) download(id);
        break;
      case "export":
        exportConversations();
        break;
    }
  }
  on(app, "click", (event) => {
    const control = (event.target as Element).closest<HTMLElement>("[data-action]");
    if (control && !control.hasAttribute("disabled")) action(control.dataset.action!);
  });
  on(app, "ui-menu-select", (event) => {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    action(value);
  });
  on(app, "ui-command-select", (event) => {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    action(value);
  });
  on(dialog, "ui-dialog-open-change", (event) => {
    if (!(event as CustomEvent<{ open: boolean }>).detail.open) {
      modalCleanup?.();
      modalCleanup = undefined;
    }
  });
  on(root.ownerDocument, "keydown", (event) => {
    const key = event as KeyboardEvent;
    if ((key.metaKey || key.ctrlKey) && key.key.toLocaleLowerCase() === "k") {
      key.preventDefault();
      openSearch();
    }
  });
  on(app, "dragstart", (event) => {
    const drag = event as DragEvent;
    const row = (event.target as Element).closest<HTMLElement>("[data-channel-drag]");
    if (!row) return;
    dragChannel = row.dataset.channelDrag;
    drag.dataTransfer?.setData("text/plain", dragChannel!);
    if (drag.dataTransfer) drag.dataTransfer.effectAllowed = "move";
  });
  on(app, "dragover", (event) => {
    if (!dragChannel) return;
    const target = (event.target as Element).closest<HTMLElement>(
      "[data-channel-drag], [data-channel-section]",
    );
    if (!target) return;
    event.preventDefault();
    app
      .querySelectorAll("[data-drop-target]")
      .forEach((n) => n.removeAttribute("data-drop-target"));
    target.setAttribute("data-drop-target", "");
  });
  on(app, "drop", (event) => {
    if (!dragChannel) return;
    const target = (event.target as Element).closest<HTMLElement>(
      "[data-channel-drag], [data-channel-section]",
    );
    if (!target) return;
    event.preventDefault();
    const channel = state.channels.find((c) => c.id === dragChannel);
    if (!channel) return;
    const section = target.closest<HTMLElement>("[data-channel-section]")?.dataset.channelSection;
    if (section && channel.kind !== "dm") {
      channel.section = section;
      channel.pinned = false;
    }
    const targetId = target.dataset.channelDrag;
    if (targetId && targetId !== channel.id) {
      state.channels = state.channels.filter((c) => c.id !== channel.id);
      const index = state.channels.findIndex((c) => c.id === targetId);
      state.channels.splice(index < 0 ? state.channels.length : index, 0, channel);
    }
    dragChannel = undefined;
    renderSidebar();
    queueSave();
    announce("Room order updated");
  });
  on(app, "dragend", () => {
    dragChannel = undefined;
    app
      .querySelectorAll("[data-drop-target]")
      .forEach((n) => n.removeAttribute("data-drop-target"));
  });
  // A stale async preview can never update a new dialog or resurrect an unmounted app.
  const initial =
    state.channels.find((c) => c.id === state.activeChannelId && !c.archived) ??
    state.channels.find((c) => !c.archived) ??
    model.createChannel("The commons", "chat", "Gather")!;
  syncAppearance();
  openChannel(initial.id);
  await Promise.all(
    [...app.querySelectorAll("ui-resizable, ui-resizable-panel")].map(
      (element) => (element as UIResizablePanel).updateComplete,
    ),
  );
  return () => {
    if (disposed) return;
    clearTimeout(saveTimer);
    clearTimeout(toastTimer);
    for (const frame of frames) cancelAnimationFrame(frame);
    frames.clear();
    save();
    disposed = true;
    lifetime.abort();
    modalCleanup?.();
    mainComposer?.dispose();
    threadComposer?.dispose();
    dialog.open = false;
    for (const url of urls.values()) URL.revokeObjectURL(url);
    urls.clear();
    blobs.clear();
    app.remove();
  };
}
