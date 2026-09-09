import "@mash/ui/command-palette";
import "@mash/ui/button";
import "@mash/ui/menu";
import "@mash/ui/icon";
import "@mash/ui/kbd";
import "@mash/ui/input";
import "@mash/ui/textarea";
import "@mash/ui/dialog";
import "@mash/ui/form";
import "@mash/ui/select";
import "@mash/ui/switch";
import "@mash/ui/gesture-binding";
import {
  initialLauncherState,
  isLauncherState,
  quickAnswer,
  type CollectionItem,
} from "./launcher-model.js";
import { escape, readState, writeState, download } from "./shared.js";
import "./launcher.css";

const key = "mash-story-command-center-v1";
type Result = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  kind: string;
  keywords?: string;
};
const commands: Result[] = [
  {
    id: "new-note",
    title: "Create Quick Note",
    subtitle: "Capture an idea",
    icon: "▤",
    kind: "Command",
  },
  {
    id: "new-snippet",
    title: "Create Snippet",
    subtitle: "Reusable text, ready to copy",
    icon: "⌘",
    kind: "Command",
  },
  {
    id: "new-link",
    title: "Save Quicklink",
    subtitle: "A shortcut to a useful page",
    icon: "↗",
    kind: "Command",
  },
  {
    id: "paste",
    title: "Save Clipboard Text",
    subtitle: "Read your clipboard once",
    icon: "▣",
    kind: "Command",
  },
  {
    id: "calculator",
    title: "Calculator & Conversions",
    subtitle: "Try (24 + 18) * 3 or 12 km to mi",
    icon: "＝",
    kind: "Command",
  },
  {
    id: "world-clock",
    title: "World Clock",
    subtitle: "Try time in Tokyo",
    icon: "◷",
    kind: "Command",
  },
  {
    id: "export",
    title: "Export Collection",
    subtitle: "Save notes, snippets, and links",
    icon: "↓",
    kind: "Command",
  },
  {
    id: "import",
    title: "Import Collection",
    subtitle: "Restore a collection export",
    icon: "↑",
    kind: "Command",
  },
  {
    id: "settings",
    title: "Preferences",
    subtitle: "Appearance and layout",
    icon: "⚙",
    kind: "Command",
  },
];

export async function mount(root: HTMLElement): Promise<() => void> {
  const abort = new AbortController(),
    { signal } = abort;
  let state = readState(key, initialLauncherState, isLauncherState),
    filter = "all",
    current = "",
    lastQuery = "",
    editing: string | undefined;
  let results: Result[] = [];
  let undo: typeof state | undefined, noticeTimer: ReturnType<typeof setTimeout> | undefined;
  root.classList.add("launcher-app");
  root.dataset.mashCatalogue = "mash";
  root.innerHTML = `<div class="launcher-desktop"><header class="launcher-desktop-bar"><strong>Command Center</strong><span id="launcher-clock"></span></header><button class="launcher-reopen" hidden>Open Command Center <ui-kbd shortcut="Primary+K"></ui-kbd></button><section class="launcher-window" aria-label="Command Center"><header class="launcher-window-top"><span class="launcher-symbol">⌘</span><span>Command Center</span><div><ui-button data-action="settings" variant="ghost" size="small" aria-label="Preferences">⚙</ui-button><ui-button data-action="close" variant="ghost" size="small" aria-label="Close Command Center">×</ui-button></div></header><nav class="launcher-categories" aria-label="Collection categories">${[
    ["all", "All"],
    ["note", "Notes"],
    ["snippet", "Snippets"],
    ["link", "Links"],
    ["clipboard", "Clipboard"],
  ]
    .map(
      ([value, label]) =>
        `<ui-button data-category="${value}" size="small" variant="ghost" ${value === "all" ? "selected" : ""}>${label}</ui-button>`,
    )
    .join(
      "",
    )}</nav><div class="launcher-body"><ui-command id="launcher-command" label="Search commands and collection" placeholder="Search anything, or type a calculation…"><span slot="search-prefix" class="launcher-search-icon">⌕</span><span slot="footer"><ui-kbd>↑</ui-kbd><ui-kbd>↓</ui-kbd> Navigate <ui-kbd>↵</ui-kbd> Open</span></ui-command><aside class="launcher-detail" id="launcher-detail" aria-label="Selected result"></aside></div><footer class="launcher-footer"><span id="launcher-result-count"></span><ui-button data-action="new" variant="ghost" size="small"><ui-icon slot="prefix" name="action.add"></ui-icon>New</ui-button><ui-menu id="launcher-actions" label="Result actions"><ui-button slot="trigger" variant="ghost" size="small">Actions<ui-kbd slot="suffix" shortcut="Primary+Enter"></ui-kbd></ui-button><ui-menu-item value="open">Open</ui-menu-item><ui-menu-item value="copy">Copy</ui-menu-item><ui-menu-item value="pin">Pin / unpin</ui-menu-item><ui-menu-item value="edit">Edit</ui-menu-item><ui-menu-item value="delete" tone="critical">Delete</ui-menu-item></ui-menu></footer><div id="launcher-notice" role="status" hidden><span></span><ui-button data-action="undo" size="small" variant="ghost">Undo</ui-button></div></section><p class="launcher-desktop-hint">Your notes, shortcuts, and next action. <ui-kbd shortcut="Primary+K"></ui-kbd> to open.</p></div><ui-dialog id="launcher-edit" label="Edit collection item"><strong id="launcher-edit-title" slot="title">New item</strong><ui-form id="launcher-form"><ui-select name="kind" label="Item type" value="note"><ui-option value="note">Note</ui-option><ui-option value="snippet">Snippet</ui-option><ui-option value="link">Quicklink</ui-option></ui-select><ui-input name="title" label="Title" required></ui-input><ui-textarea name="content" label="Content" rows="8" required></ui-textarea><p class="launcher-form-help">Snippet placeholders: {date}, {time}. Quicklinks accept https://, http://, or a local path.</p><ui-button type="submit" variant="primary">Save</ui-button></ui-form></ui-dialog><ui-dialog id="launcher-preferences" label="Preferences"><strong slot="title">Preferences</strong><ui-switch id="launcher-compact">Compact results</ui-switch><ui-button data-action="theme">Switch color theme</ui-button><ui-button data-action="export">Export collection</ui-button><ui-button data-action="clear-history">Clear recent commands</ui-button><p>Clipboard text is read only when you choose Save Clipboard Text. Everything here is stored in this browser.</p></ui-dialog><input id="launcher-import" type="file" accept="application/json,.json" hidden><ui-gesture-binding gesture="key" shortcut="Primary+K" command="launcher.toggle" prevent-default="always"></ui-gesture-binding><ui-gesture-binding gesture="key" shortcut="Primary+Enter" command="launcher.actions" prevent-default="always"></ui-gesture-binding>`;
  const find = <K extends keyof HTMLElementTagNameMap>(selector: string) =>
    root.querySelector(selector) as HTMLElementTagNameMap[K];
  const command = find<"ui-command">("#launcher-command"),
    detail = find<"aside">("#launcher-detail");
  function notice(message: string) {
    const target = find<"div">("#launcher-notice");
    target.hidden = false;
    target.querySelector("span")!.textContent = message;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (target.hidden = true), 4200);
  }
  function save() {
    if (!writeState(key, state)) notice("Saved in memory. Export a copy to keep your collection.");
  }
  function change(message: string, fn: () => void) {
    undo = structuredClone(state);
    fn();
    save();
    render();
    notice(message);
  }
  function itemResult(item: CollectionItem): Result {
    return {
      id: item.id,
      title: item.title,
      subtitle:
        item.kind === "link" ? item.content : item.content.replaceAll("\n", " ").slice(0, 75),
      kind: item.kind,
      icon:
        item.kind === "note"
          ? "▤"
          : item.kind === "link"
            ? "↗"
            : item.kind === "snippet"
              ? "⌘"
              : "▣",
      keywords: item.content,
    };
  }
  function render() {
    const query = command.query.trim(),
      answer = quickAnswer(query);
    const queryChanged = query !== lastQuery;
    lastQuery = query;
    const items = state.items
      .filter((item) => filter === "all" || item.kind === filter)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated)
      .map(itemResult);
    const recent = state.recent
      .map((id) => commands.find((item) => item.id === id))
      .filter((item): item is Result => !!item);
    const all =
      filter === "all"
        ? [
            ...items,
            ...recent,
            ...commands.filter((item) => !recent.some((candidate) => candidate.id === item.id)),
          ]
        : items;
    const terms = query.toLowerCase().split(/\s+/);
    results = all.filter((item) =>
      terms.every((term) =>
        `${item.title} ${item.subtitle} ${item.keywords ?? ""}`.toLowerCase().includes(term),
      ),
    );
    if (answer)
      results.unshift({
        id: "answer",
        title: answer.result,
        subtitle: answer.detail,
        icon: "＝",
        kind: "Answer",
        keywords: query,
      });
    for (const child of command.querySelectorAll(":scope > :not([slot])")) child.remove();
    const nodes = results.map((result) => {
      const item = document.createElement("ui-command-item");
      item.value = result.id;
      item.keywords = `${query} ${result.keywords ?? result.subtitle}`;
      item.innerHTML = `<span slot="icon" class="launcher-result-icon" data-kind="${escape(result.kind)}">${result.icon}</span><span class="launcher-result-title">${escape(result.title)}</span><span slot="description">${escape(result.subtitle)}</span><span slot="shortcut">${state.items.find((candidate) => candidate.id === result.id)?.pinned ? "⌁" : result.kind === "Command" ? "Command" : ""}</span>`;
      return item;
    });
    command.append(...nodes);
    current =
      !queryChanged && results.some((item) => item.id === current)
        ? current
        : (results[0]?.id ?? "");
    root.classList.toggle("launcher-compact", state.compact);
    find<"ui-switch">("#launcher-compact").checked = state.compact;
    root
      .querySelectorAll<HTMLElementTagNameMap["ui-button"]>("[data-category]")
      .forEach((button) => (button.selected = button.dataset.category === filter));
    find<"span">("#launcher-result-count").textContent =
      `${results.length} ${results.length === 1 ? "result" : "results"}`;
    void command.updateComplete.then(() => {
      if (!signal.aborted && current) command.highlight(current);
    });
    renderDetail();
  }
  function renderDetail() {
    const item = state.items.find((candidate) => candidate.id === current),
      result = results.find((candidate) => candidate.id === current),
      answer = current === "answer" ? quickAnswer(command.query) : null;
    for (const menuAction of root.querySelectorAll<HTMLElementTagNameMap["ui-menu-item"]>(
      "#launcher-actions ui-menu-item",
    )) {
      menuAction.disabled =
        menuAction.value === "open"
          ? !current
          : menuAction.value === "copy"
            ? !item && !answer
            : !item;
    }
    if (answer) {
      detail.innerHTML = `<div class="launcher-answer"><span>${escape(answer.title)}</span><strong>${escape(answer.result)}</strong><p>${escape(answer.detail)}</p><ui-button data-action="copy" size="small">Copy result</ui-button></div>`;
      return;
    }
    if (item) {
      detail.innerHTML = `<header><span class="launcher-result-icon" data-kind="${item.kind}">${result?.icon ?? "▤"}</span><span>${item.kind}</span><ui-button data-action="pin" variant="ghost" size="small" aria-label="${item.pinned ? "Unpin item" : "Pin item"}">${item.pinned ? "★" : "☆"}</ui-button></header><h2>${escape(item.title)}</h2>${item.kind === "link" ? `<p class="launcher-link-address">${escape(item.content)}</p><ui-button data-action="open" variant="primary" size="small">Open link ↗</ui-button>` : `<div class="launcher-item-content">${escape(item.content)}</div><div class="launcher-detail-actions"><ui-button data-action="copy" size="small" variant="primary">${item.kind === "snippet" ? "Copy expanded snippet" : "Copy text"}</ui-button><ui-button data-action="edit" size="small" variant="ghost">Edit</ui-button></div>`}<dl><dt>Collection</dt><dd>${item.kind}</dd><dt>Pinned</dt><dd>${item.pinned ? "Yes" : "No"}</dd></dl>`;
      return;
    }
    if (result) {
      detail.innerHTML = `<div class="launcher-command-preview"><span>${result.icon}</span><h2>${escape(result.title)}</h2><p>${escape(result.subtitle)}</p><ui-button data-action="open" variant="primary" size="small">Open command <ui-kbd>↵</ui-kbd></ui-button></div>`;
      return;
    }
    detail.innerHTML = `<div class="launcher-command-preview"><span>⌕</span><h2>No results</h2><p>Try a title, a word from a note, or a calculation.</p><ui-button data-action="new" size="small">Create something new</ui-button></div>`;
  }
  function edit(kind: CollectionItem["kind"] = "note", item?: CollectionItem) {
    editing = item?.id;
    const form = find<"ui-form">("#launcher-form");
    form.reset();
    form.querySelector<HTMLElementTagNameMap["ui-select"]>("[name=kind]")!.value =
      kind === "clipboard" ? "note" : kind;
    form.querySelector<HTMLElementTagNameMap["ui-input"]>("[name=title]")!.value =
      item?.title ?? "";
    form.querySelector<HTMLElementTagNameMap["ui-textarea"]>("[name=content]")!.value =
      item?.content ?? "";
    find<"strong">("#launcher-edit-title").textContent = item ? "Edit " + item.kind : "New " + kind;
    find<"ui-dialog">("#launcher-edit").show();
  }
  function toggle(open?: boolean) {
    const panel = find<"section">(".launcher-window");
    panel.hidden = open === undefined ? !panel.hidden : !open;
    find<"button">(".launcher-reopen").hidden = !panel.hidden;
    if (!panel.hidden) {
      const input = command.shadowRoot?.querySelector<HTMLInputElement>('[part="search"]');
      input?.focus({ preventScroll: true });
    } else {
      find<"button">(".launcher-reopen").focus({ preventScroll: true });
    }
  }
  function safeLink(value: string): string | null {
    if (!/^(?:https?:\/\/|\/)/i.test(value)) return null;
    try {
      const url = new URL(value, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }
  async function copy() {
    const item = state.items.find((candidate) => candidate.id === current);
    let text = item?.content ?? quickAnswer(command.query)?.result;
    if (!text) return;
    if (item?.kind === "snippet")
      text = text
        .replaceAll("{date}", new Date().toLocaleDateString())
        .replaceAll(
          "{time}",
          new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        );
    try {
      await navigator.clipboard.writeText(text);
      if (!signal.aborted) notice("Copied to clipboard");
    } catch {
      notice("Clipboard unavailable. Select the text to copy it.");
    }
  }
  async function run(id: string) {
    if (commands.some((item) => item.id === id)) {
      state.recent = [id, ...state.recent.filter((value) => value !== id)].slice(0, 8);
      save();
    }
    if (id === "answer") {
      await copy();
      return;
    }
    const item = state.items.find((candidate) => candidate.id === id);
    if (item) {
      current = id;
      if (item.kind === "link") {
        const url = safeLink(item.content);
        if (url) {
          const link = document.createElement("a");
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.click();
        } else notice("This link needs an http or https address.");
      } else edit(item.kind, item);
      return;
    }
    if (id === "new-note" || id === "new-snippet" || id === "new-link")
      edit(id.slice(4) as CollectionItem["kind"]);
    else if (id === "calculator") {
      command.query = "(24 + 18) * 3";
      render();
    } else if (id === "world-clock") {
      command.query = "time in Tokyo";
      render();
    } else if (id === "paste") {
      try {
        const content = await navigator.clipboard.readText();
        if (signal.aborted) return;
        if (!content.trim()) {
          notice("Clipboard has no text.");
          return;
        }
        change("Clipboard text saved", () =>
          state.items.unshift({
            id: crypto.randomUUID(),
            kind: "clipboard",
            title: content.split("\n")[0]!.slice(0, 60) || "Clipboard text",
            content,
            pinned: false,
            updated: Date.now(),
          }),
        );
      } catch {
        notice("Clipboard access was unavailable. Paste into a new note instead.");
      }
    } else if (id === "export")
      download("command-center.json", JSON.stringify(state, null, 2), "application/json");
    else if (id === "import") find<"input">("#launcher-import").click();
    else if (id === "settings") find<"ui-dialog">("#launcher-preferences").show();
  }
  async function action(name: string) {
    const item = state.items.find((candidate) => candidate.id === current);
    if (name === "open") await run(current);
    else if (name === "copy") await copy();
    else if (name === "edit" && item) edit(item.kind, item);
    else if (name === "pin" && item)
      change(item.pinned ? "Unpinned item" : "Pinned item", () => (item.pinned = !item.pinned));
    else if (name === "delete" && item)
      change(
        "Deleted item",
        () => (state.items = state.items.filter((candidate) => candidate.id !== item.id)),
      );
    else if (name === "new")
      edit(
        filter === "all" || filter === "clipboard" ? "note" : (filter as CollectionItem["kind"]),
      );
    else if (name === "undo" && undo) {
      state = undo;
      undo = undefined;
      save();
      render();
      notice("Change undone");
    } else if (name === "close") toggle(false);
    else if (name === "theme") {
      document.querySelector<HTMLButtonElement>(".site-header .theme-toggle")?.click();
    } else if (name === "clear-history")
      change("Recent commands cleared", () => (state.recent = []));
    else await run(name);
  }
  command.addEventListener(
    "input",
    () =>
      queueMicrotask(() => {
        if (!signal.aborted && command.query !== lastQuery) render();
      }),
    { signal },
  );
  command.addEventListener(
    "ui-command-select",
    (event) => void run((event as CustomEvent<{ value: string }>).detail.value),
    { signal },
  );
  command.addEventListener(
    "pointermove",
    (event) => {
      const item = event
        .composedPath()
        .find(
          (node): node is HTMLElementTagNameMap["ui-command-item"] =>
            node instanceof HTMLElement && node.localName === "ui-command-item",
        );
      if (item && item.value !== current) {
        current = item.value;
        renderDetail();
      }
    },
    { signal },
  );
  const activeObserver = new MutationObserver(() => {
    const item = command.querySelector<HTMLElementTagNameMap["ui-command-item"]>(
      "ui-command-item[selected]",
    );
    if (item && item.value !== current) {
      current = item.value;
      renderDetail();
    }
  });
  activeObserver.observe(command, {
    attributes: true,
    subtree: true,
    attributeFilter: ["selected"],
  });
  root.addEventListener(
    "click",
    (event) => {
      const element = event
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement && !!(node.dataset.action || node.dataset.category),
        );
      if (element?.dataset.action) void action(element.dataset.action);
      if (element?.dataset.category) {
        filter = element.dataset.category;
        command.query = "";
        render();
      }
    },
    { signal },
  );
  find<"ui-menu">("#launcher-actions").addEventListener(
    "ui-menu-select",
    (event) => void action((event as CustomEvent<{ value: string }>).detail.value),
    { signal },
  );
  find<"button">(".launcher-reopen").addEventListener("click", () => toggle(true), { signal });
  root.addEventListener(
    "mash-command",
    (event) => {
      const data = (event as CustomEvent<{ command: string; phase: string }>).detail;
      if (data.phase !== "ended") return;
      if (data.command === "launcher.toggle") toggle();
      else find<"ui-menu">("#launcher-actions").show();
    },
    { signal },
  );
  find<"ui-switch">("#launcher-compact").addEventListener(
    "ui-switch-change",
    (event) => {
      state.compact = (event as CustomEvent<{ checked: boolean }>).detail.checked;
      save();
      render();
    },
    { signal },
  );
  find<"ui-form">("#launcher-form").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const values = new FormData(find<"ui-form">("#launcher-form").form!);
      const title = String(values.get("title") ?? "").trim(),
        content = String(values.get("content") ?? ""),
        kind = String(values.get("kind")) as CollectionItem["kind"];
      if (!title || !content.trim()) return;
      if (kind === "link" && !safeLink(content)) {
        notice("Use an http, https, or local page address.");
        return;
      }
      change("Saved " + kind, () => {
        const item = state.items.find((candidate) => candidate.id === editing);
        if (item) {
          Object.assign(item, { title, content, kind, updated: Date.now() });
          current = item.id;
        } else {
          current = crypto.randomUUID();
          state.items.unshift({
            id: current,
            title,
            content,
            kind,
            pinned: false,
            updated: Date.now(),
          });
        }
      });
      find<"ui-dialog">("#launcher-edit").dismiss();
    },
    { signal },
  );
  find<"input">("#launcher-import").addEventListener(
    "change",
    async (event) => {
      const input = event.target as HTMLInputElement,
        file = input.files?.[0];
      if (!file) return;
      try {
        const next: unknown = JSON.parse(await file.text());
        if (!isLauncherState(next)) throw Error();
        if (!signal.aborted) change("Collection imported", () => (state = next));
      } catch {
        notice("This file is not a collection export.");
      }
      input.value = "";
    },
    { signal },
  );
  root.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        root.querySelector("ui-dialog[open],ui-menu[open]")
      )
        return;
      if (command.query) {
        command.query = "";
        render();
      } else toggle(false);
    },
    { signal },
  );
  const clock = () =>
    (find<"span">("#launcher-clock").textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date()));
  clock();
  const interval = setInterval(clock, 30_000);
  render();
  await command.updateComplete;
  if (!signal.aborted) toggle(true);
  return () => {
    abort.abort();
    activeObserver.disconnect();
    clearInterval(interval);
    clearTimeout(noticeTimer);
    root.classList.remove("launcher-app", "launcher-compact");
  };
}
