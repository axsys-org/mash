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
import {
  readNotebook,
  subscribeNotebook,
  ensureDocuments,
  documentBlockText,
  writeNotebook,
} from "./documents-store.js";
import {
  createDocument,
  createBlock,
  parseNotebook,
  type DocumentBlock,
} from "./documents-model.js";
import type { StudyCollection } from "./study-model.js";
import type { IssueState } from "./issues-model.js";
import { workspaceNavigation, workspaceHref } from "./workspace-navigation.js";
import { navigateWorkspace, requestDesktopAction } from "./desktop-bridge.js";
import "./launcher.css";

const key = "mash-story-command-center-v1";
type Result = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  kind: string;
  keywords?: string;
  href?: string;
  document?: string;
  block?: string;
  content?: string;
  context?: string;
};
const icon = (name: string) => `<ui-icon name="${name}" aria-hidden="true"></ui-icon>`;
const commands: Result[] = [
  {
    id: "new-note",
    title: "Create document",
    subtitle: "Capture an idea in editable blocks",
    icon: "object.document",
    kind: "Command",
  },
  {
    id: "new-snippet",
    title: "Create snippet",
    subtitle: "Reusable text, ready to copy",
    icon: "object.keyboard",
    kind: "Command",
  },
  {
    id: "new-link",
    title: "Save quicklink",
    subtitle: "A shortcut to a useful page",
    icon: "action.launch",
    kind: "Command",
  },
  {
    id: "paste",
    title: "Save clipboard text",
    subtitle: "Read your clipboard once",
    icon: "action.duplicate",
    kind: "Command",
  },
  {
    id: "calculator",
    title: "Calculator & conversions",
    subtitle: "Try (24 + 18) * 3 or 12 km to mi",
    icon: "object.table",
    kind: "Command",
  },
  {
    id: "world-clock",
    title: "World clock",
    subtitle: "Try time in Tokyo",
    icon: "action.refresh",
    kind: "Command",
  },
  {
    id: "export",
    title: "Export collection",
    subtitle: "Save notes, snippets, and links",
    icon: "action.download",
    kind: "Command",
  },
  {
    id: "import",
    title: "Import collection",
    subtitle: "Restore a collection export",
    icon: "action.upload",
    kind: "Command",
  },
  {
    id: "settings",
    title: "Preferences",
    subtitle: "Appearance and layout",
    icon: "action.settings",
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
  let notebook = readNotebook();
  let study: StudyCollection | undefined, issues: IssueState | undefined;
  function connectNotes() {
    const pending = state.items.filter((item) => item.kind === "note" && !item.document);
    const connected = ensureDocuments(
      pending.map((item) => ({
        id: `capture-${item.id}`,
        title: item.title,
        text: item.content,
      })),
    );
    pending.forEach((item, index) => {
      item.document = connected[index]!.id;
    });
    notebook = readNotebook();
  }
  function exportCollection() {
    const documents = notebook.documents.filter((doc) =>
      state.items.some((item) => item.document === doc.id),
    );
    return {
      ...state,
      items: state.items.map((item) => {
        const doc = documents.find((source) => source.id === item.document);
        return doc
          ? { ...item, title: doc.title, content: doc.blocks.map(documentBlockText).join("\n\n") }
          : item;
      }),
      documents,
    };
  }
  function importCollection(next: typeof state, snapshots: unknown) {
    const imported =
      snapshots === undefined || (Array.isArray(snapshots) && !snapshots.length)
        ? []
        : parseNotebook(JSON.stringify({ version: 1, documents: snapshots })).documents;
    const before = readNotebook(),
      merged = structuredClone(before);
    const mapped = new Map<string, string>();
    const contentOf = (doc: (typeof before.documents)[number]) =>
      JSON.stringify({ title: doc.title, blocks: doc.blocks, connections: doc.connections });
    let copies = 0;
    for (const item of next.items) {
      if (item.kind !== "note") continue;
      const id = item.document ?? `capture-${item.id}`;
      if (mapped.has(id)) {
        item.document = mapped.get(id);
        continue;
      }
      const snapshot = imported.find((doc) => doc.id === id);
      const existing = before.documents.find((doc) => doc.id === id);
      const unchanged =
        existing &&
        (snapshot
          ? contentOf(existing) === contentOf(snapshot)
          : existing.title === item.title &&
            existing.blocks.map(documentBlockText).join("\n\n") === item.content);
      if (unchanged) {
        item.document = id;
        mapped.set(id, id);
        continue;
      }
      const doc = snapshot ? structuredClone(snapshot) : createDocument(item.title);
      if (!snapshot)
        doc.blocks = item.content.split(/\n\s*\n/).map((text) => createBlock("paragraph", text));
      doc.id = existing ? crypto.randomUUID() : id;
      doc.parent = null;
      if (existing) copies++;
      merged.documents.push(doc);
      item.document = doc.id;
      mapped.set(id, doc.id);
    }
    // Validate and persist all source copies before replacing collection references.
    notebook = writeNotebook(merged, before);
    state = next;
    return copies;
  }
  connectNotes();
  writeState(key, state);
  let undo: typeof state | undefined, noticeTimer: ReturnType<typeof setTimeout> | undefined;
  root.classList.add("launcher-app");
  root.dataset.mashCatalogue = "mash";
  root.innerHTML = `<div class="launcher-desktop"><div class="launcher-workspace-nav">${workspaceNavigation("command-center")}</div><ui-button class="launcher-reopen" hidden>Open search <ui-kbd shortcut="Primary+K"></ui-kbd></ui-button><section class="launcher-window" aria-label="Workspace search"><div class="launcher-window-top"><nav class="launcher-categories" aria-label="Search scope">${[
    ["all", "All"],
    ["document", "Documents"],
    ["block", "Blocks"],
    ["issue", "Issues"],
    ["card", "Cards"],
    ["saved", "Saved"],
  ]
    .map(
      ([value, label]) =>
        `<ui-button data-category="${value}" size="small" variant="ghost" ${value === "all" ? "selected" : ""}>${label}</ui-button>`,
    )
    .join(
      "",
    )}</nav><div class="launcher-window-tools"><ui-button data-action="settings" variant="ghost" size="small" aria-label="Preferences">${icon("action.settings")}</ui-button><ui-button data-action="close" variant="ghost" size="small" aria-label="Close search">${icon("action.dismiss")}</ui-button></div></div><div class="launcher-body"><ui-command id="launcher-command" label="Search workspace" placeholder="Search documents, blocks, or actions…"><ui-icon slot="search-prefix" name="action.search"></ui-icon><span slot="footer"><ui-kbd>↑</ui-kbd><ui-kbd>↓</ui-kbd> Navigate <ui-kbd>↵</ui-kbd> Open</span></ui-command><aside class="launcher-detail" id="launcher-detail" aria-label="Selected result"></aside></div><footer class="launcher-footer"><span id="launcher-result-count"></span><ui-button data-action="new" variant="ghost" size="small"><ui-icon slot="prefix" name="action.add"></ui-icon>New</ui-button><ui-menu id="launcher-actions" label="Result actions"><ui-button slot="trigger" variant="ghost" size="small">Actions<ui-kbd slot="suffix" shortcut="Primary+Enter"></ui-kbd></ui-button><ui-menu-item value="open">Open</ui-menu-item><ui-menu-item value="copy">Copy</ui-menu-item><ui-menu-item value="pin">Pin / unpin</ui-menu-item><ui-menu-item value="edit">Edit</ui-menu-item><ui-menu-item value="delete" tone="critical">Delete</ui-menu-item></ui-menu></footer><div id="launcher-notice" role="status" hidden><span></span><ui-button data-action="undo" size="small" variant="ghost">Undo</ui-button></div></section><p class="launcher-desktop-hint"><ui-kbd shortcut="Primary+K"></ui-kbd> Search across your work <span>·</span> Try <button data-action="calculator">24 × 18</button> or <button data-action="world-clock">time in Tokyo</button></p></div><ui-dialog id="launcher-edit" label="Capture"><strong id="launcher-edit-title" slot="title">New item</strong><ui-form id="launcher-form"><ui-select name="kind" label="Item type" value="note"><ui-option value="note">Document</ui-option><ui-option value="snippet">Snippet</ui-option><ui-option value="link">Quicklink</ui-option></ui-select><ui-input name="title" label="Title" required></ui-input><ui-textarea name="content" label="Content" rows="8" required></ui-textarea><p class="launcher-form-help">Documents open as editable blocks. Snippets support {date} and {time}.</p><ui-button type="submit" variant="primary">Save</ui-button></ui-form></ui-dialog><ui-dialog id="launcher-preferences" label="Preferences"><strong slot="title">Preferences</strong><ui-switch id="launcher-compact">Compact results</ui-switch><ui-button data-action="theme">Switch color theme</ui-button><ui-button data-action="export">Export collection</ui-button><ui-button data-action="clear-history">Clear recent commands</ui-button><p>Clipboard text is read only when requested. Your collection stays in this browser.</p></ui-dialog><input id="launcher-import" type="file" accept="application/json,.json" hidden><ui-gesture-binding gesture="key" shortcut="Primary+K" command="launcher.toggle" prevent-default="always"></ui-gesture-binding><ui-gesture-binding gesture="key" shortcut="Primary+Enter" command="launcher.actions" prevent-default="always"></ui-gesture-binding>`;
  const find = <K extends keyof HTMLElementTagNameMap>(selector: string) =>
    root.querySelector(selector) as HTMLElementTagNameMap[K];
  const command = find<"ui-command">("#launcher-command"),
    detail = find<"aside">("#launcher-detail");
  function notice(message: string) {
    const target = find<"div">("#launcher-notice");
    target.hidden = false;
    target.querySelector("span")!.textContent = message;
    target.querySelector<HTMLElementTagNameMap["ui-button"]>("[data-action=undo]")!.hidden = !undo;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (target.hidden = true), 4200);
  }
  function save() {
    if (!writeState(key, state)) notice("Saved in memory. Export a copy to keep your collection.");
  }
  function change(message: string, fn: () => void, undoable = true) {
    undo = undoable ? structuredClone(state) : undefined;
    fn();
    save();
    render();
    notice(message);
  }
  function itemResult(item: CollectionItem): Result {
    const source = notebook.documents.find((doc) => doc.id === item.document);
    const content = source?.blocks.map(documentBlockText).join("\n\n") ?? item.content;
    return {
      id: item.id,
      title: source?.title ?? item.title,
      subtitle: item.kind === "link" ? content : content.replaceAll("\n", " ").slice(0, 75),
      kind: item.kind,
      icon:
        item.kind === "note"
          ? "object.document"
          : item.kind === "link"
            ? "action.launch"
            : item.kind === "snippet"
              ? "object.keyboard"
              : "action.duplicate",
      keywords: content,
      content,
      document: source?.id,
      href: source ? workspaceHref("documents", { document: source.id }) : undefined,
    };
  }
  function workspaceResults(): Result[] {
    const sources: Result[] = [];
    for (const doc of notebook.documents) {
      const text = doc.blocks.map(documentBlockText).filter(Boolean).join("\n\n");
      sources.push({
        id: `document:${doc.id}`,
        title: doc.title,
        subtitle: `${doc.blocks.length} blocks`,
        icon: "object.document",
        kind: "document",
        keywords: text,
        content: text,
        document: doc.id,
        href: workspaceHref("documents", { document: doc.id }),
      });
      for (const block of doc.blocks) {
        if (!block.text.trim() && !block.rows?.length) continue;
        sources.push({
          id: `block:${doc.id}:${block.id}`,
          title: block.text.split("\n")[0]?.slice(0, 110) || "Table",
          subtitle: doc.title,
          icon: block.kind === "table" ? "object.table" : "action.text",
          kind: "block",
          keywords: `${documentBlockText(block)} ${block.kind}`,
          content: documentBlockText(block),
          document: doc.id,
          block: block.id,
          context: block.kind,
          href: workspaceHref("documents", { document: doc.id, block: block.id }),
        });
      }
    }
    for (const issue of issues?.issues ?? []) {
      if (issue.archived) continue;
      const doc = notebook.documents.find((entry) => entry.id === issue.document);
      const title = doc?.title ?? issue.title;
      const content = doc?.blocks.map(documentBlockText).join("\n\n") ?? issue.description;
      const project = issues?.projects.find((entry) => entry.id === issue.project)?.name ?? "";
      sources.push({
        id: `issue:${issue.id}`,
        title,
        subtitle: `ENG-${issue.id} · ${issue.status}`,
        icon: "action.confirm",
        kind: "issue",
        context: project,
        keywords: `${content} ${issue.assignee} ${issue.labels.join(" ")}`,
        content,
        document: issue.document,
        href: workspaceHref("projects", { issue: String(issue.id) }),
      });
    }
    for (const note of study?.notes ?? []) {
      const doc = notebook.documents.find((entry) => entry.id === note.source?.document);
      const block = doc?.blocks.find((entry) => entry.id === note.source?.block);
      const deck = study?.decks.find((entry) => entry.id === note.deck)?.name ?? "Cards";
      const content = block?.text ?? note.back;
      sources.push({
        id: `card:${note.id}`,
        title: note.front.replace(/\{\{c\d+::(.*?)\}\}/g, "$1").slice(0, 110),
        subtitle: deck,
        icon: "object.layers",
        kind: "card",
        keywords: `${content} ${note.tags.join(" ")}`,
        content,
        context: doc?.title,
        document: doc?.id,
        block: block?.id,
        href: workspaceHref("study", { note: note.id }),
      });
    }
    return sources;
  }
  function render() {
    const query = command.query.trim(),
      answer = quickAnswer(query);
    const queryChanged = query !== lastQuery;
    lastQuery = query;
    const items = state.items
      .filter((item) => filter === "saved" || (filter === "all" && !item.document))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated)
      .map(itemResult);
    const recent = state.recent
      .map((id) => commands.find((item) => item.id === id))
      .filter((item): item is Result => !!item);
    const sources = workspaceResults().filter((item) => filter === "all" || item.kind === filter);
    const all =
      filter === "all"
        ? [
            ...sources.filter(
              (item) =>
                (item.kind !== "block" || query.length > 1) &&
                !(
                  item.kind === "document" &&
                  issues?.issues.some((issue) => issue.document === item.document)
                ),
            ),
            ...items,
            ...recent,
            ...commands.filter((item) => !recent.some((candidate) => candidate.id === item.id)),
          ]
        : [...sources, ...items];
    const terms = query.toLowerCase().split(/\s+/);
    results = all.filter((item) =>
      terms.every((term) =>
        `${item.title} ${item.subtitle} ${item.keywords ?? ""}`.toLowerCase().includes(term),
      ),
    );
    if (query)
      results.sort(
        (a, b) =>
          Number(b.title.toLowerCase().startsWith(query.toLowerCase())) -
          Number(a.title.toLowerCase().startsWith(query.toLowerCase())),
      );
    const resultCount = results.length;
    results = results.slice(0, 80);
    if (answer)
      results.unshift({
        id: "answer",
        title: answer.result,
        subtitle: answer.detail,
        icon: "object.table",
        kind: "Answer",
        keywords: query,
      });
    for (const child of command.querySelectorAll(":scope > :not([slot])")) child.remove();
    const nodes = results.map((result) => {
      const item = document.createElement("ui-command-item");
      item.value = result.id;
      item.keywords = `${query} ${result.keywords ?? result.subtitle}`;
      item.innerHTML = `<span slot="icon" class="launcher-result-icon" data-kind="${escape(result.kind)}">${icon(result.icon)}</span><span class="launcher-result-title">${escape(result.title)}</span><span slot="description">${escape(result.subtitle)}</span><span slot="shortcut">${escape(result.kind === "Command" ? "Action" : result.kind)}</span>`;
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
      `${answer ? resultCount + 1 : resultCount} results${resultCount > 80 ? " · first 80 shown" : ""}`;
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
            ? !item && !answer && !result?.content
            : menuAction.value === "edit"
              ? !item && !result?.document
              : !item;
    }
    if (answer) {
      detail.innerHTML = `<div class="launcher-answer"><span>${escape(answer.title)}</span><strong>${escape(answer.result)}</strong><p>${escape(answer.detail)}</p><ui-button data-action="copy" size="small">Copy result</ui-button></div>`;
      return;
    }
    if (result?.href && (result.document || result.kind === "issue" || result.kind === "card")) {
      const doc = notebook.documents.find((entry) => entry.id === result.document);
      const blocks = result.block
        ? doc?.blocks.filter((block) => block.id === result.block)
        : doc?.blocks;
      const label =
        result.kind === "issue"
          ? "Open issue"
          : result.kind === "card"
            ? "Open card"
            : "Open document";
      detail.innerHTML = `<header><span class="launcher-result-icon" data-kind="${escape(result.kind)}">${icon(result.icon)}</span><span>${escape(result.kind === "note" ? "Document" : result.kind)}</span><span class="launcher-source-indicator">Live source</span></header><h2>${escape(result.title)}</h2><p class="launcher-source-context">${escape(result.context || (result.block ? doc?.title : result.subtitle))}</p><div class="launcher-document-preview">${
        blocks?.length
          ? blocks
              .slice(0, result.block ? 1 : 8)
              .map(previewBlock)
              .join("")
          : `<p>${escape(result.content)}</p>`
      }${!result.block && (doc?.blocks.length ?? 0) > 8 ? `<span class="launcher-preview-more">${doc!.blocks.length - 8} more blocks</span>` : ""}</div><div class="launcher-detail-actions"><ui-button data-action="open" size="small" variant="primary">${label}<ui-icon slot="suffix" name="navigation.forward"></ui-icon></ui-button>${doc && result.kind !== "document" && result.kind !== "block" && result.kind !== "note" ? `<ui-button data-action="source" size="small" variant="ghost">Source</ui-button>` : ""}${doc && result.kind !== "card" ? `<ui-button data-action="study-source" size="small" variant="ghost">Make card</ui-button>` : ""}</div><div class="launcher-source-foot">${icon("action.connect")} ${doc ? "Edits follow the source across your workspace." : "Open to continue working."}</div>`;
      return;
    }
    if (item) {
      detail.innerHTML = `<header><span class="launcher-result-icon" data-kind="${item.kind}">${icon(result?.icon ?? "object.document")}</span><span>${item.kind}</span><ui-button data-action="pin" variant="ghost" size="small" aria-label="${item.pinned ? "Unpin item" : "Pin item"}">${item.pinned ? "★" : "☆"}</ui-button></header><h2>${escape(item.title)}</h2>${item.kind === "link" ? `<p class="launcher-link-address">${escape(item.content)}</p><ui-button data-action="open" variant="primary" size="small">Open link ${icon("action.launch")}</ui-button>` : `<div class="launcher-item-content">${escape(item.content)}</div><div class="launcher-detail-actions"><ui-button data-action="copy" size="small" variant="primary">${item.kind === "snippet" ? "Copy expanded snippet" : "Copy text"}</ui-button><ui-button data-action="edit" size="small" variant="ghost">Edit</ui-button></div>`}<dl><dt>Collection</dt><dd>${item.kind}</dd><dt>Pinned</dt><dd>${item.pinned ? "Yes" : "No"}</dd></dl>`;
      return;
    }
    if (result) {
      detail.innerHTML = `<div class="launcher-command-preview"><span>${icon(result.icon)}</span><h2>${escape(result.title)}</h2><p>${escape(result.subtitle)}</p><ui-button data-action="open" variant="primary" size="small">Run action <ui-kbd>↵</ui-kbd></ui-button></div>`;
      return;
    }
    detail.innerHTML = `<div class="launcher-command-preview"><span>${icon("action.search")}</span><h2>No results</h2><p>Search by title, block content, project, or card.</p><ui-button data-action="new" size="small">Create a document</ui-button></div>`;
  }
  function previewBlock(block: DocumentBlock): string {
    const text = escape(block.text);
    if (block.kind === "divider") return "<hr>";
    if (block.kind === "heading" || block.kind === "subheading") return `<h3>${text}</h3>`;
    if (block.kind === "quote" || block.kind === "callout")
      return `<blockquote>${text}</blockquote>`;
    if (block.kind === "code") return `<pre>${text}</pre>`;
    if (block.kind === "table")
      return `<div class="launcher-preview-table">${(block.rows ?? [])
        .slice(0, 5)
        .map(
          (row) =>
            `<div><span>${escape(row.title)}</span><small>${escape(row.status)}</small></div>`,
        )
        .join("")}</div>`;
    if (block.kind === "todo")
      return `<p class="launcher-preview-todo" data-checked="${block.checked}">${icon(block.checked ? "action.confirm" : "action.select")}<span>${text}</span></p>`;
    if (block.kind === "bullet" || block.kind === "numbered")
      return `<p class="launcher-preview-bullet">${block.kind === "bullet" ? "•" : "1."}<span>${text}</span></p>`;
    return `<p>${text}</p>`;
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
    find<"strong">("#launcher-edit-title").textContent = item
      ? "Edit " + item.kind
      : "New " + (kind === "note" ? "document" : kind);
    find<"ui-dialog">("#launcher-edit").show();
  }
  function toggle(open?: boolean) {
    const panel = find<"section">(".launcher-window");
    const shouldOpen = open ?? panel.hidden;
    if (!shouldOpen && requestDesktopAction({ action: "close" })) return;
    panel.hidden = !shouldOpen;
    find<"ui-button">(".launcher-reopen").hidden = !panel.hidden;
    if (!panel.hidden) {
      const input = command.shadowRoot?.querySelector<HTMLInputElement>('[part="search"]');
      input?.focus({ preventScroll: true });
    } else {
      find<"ui-button">(".launcher-reopen").focus({ preventScroll: true });
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
    let text =
      results.find((result) => result.id === current)?.content ??
      item?.content ??
      quickAnswer(command.query)?.result;
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
    const result = results.find((entry) => entry.id === id);
    if (result?.href) {
      navigateWorkspace(result.href);
      return;
    }
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
      download("collection.json", JSON.stringify(exportCollection(), null, 2), "application/json");
    else if (id === "import") find<"input">("#launcher-import").click();
    else if (id === "settings") find<"ui-dialog">("#launcher-preferences").show();
  }
  async function action(name: string) {
    const item = state.items.find((candidate) => candidate.id === current);
    const result = results.find((candidate) => candidate.id === current);
    if (name === "open") await run(current);
    else if (name === "copy") await copy();
    else if (
      (name === "edit" || name === "source" || name === "study-source") &&
      result?.document
    ) {
      const doc = notebook.documents.find((entry) => entry.id === result.document);
      const block = result.block ?? doc?.blocks.find((entry) => entry.text.trim())?.id;
      navigateWorkspace(
        workspaceHref(name === "study-source" ? "study" : "documents", {
          document: result.document,
          ...(block ? { block } : {}),
        }),
      );
    } else if (name === "edit" && item) edit(item.kind, item);
    else if (name === "pin" && item)
      change(item.pinned ? "Unpinned item" : "Pinned item", () => (item.pinned = !item.pinned));
    else if (name === "delete" && item)
      change(
        item.document ? "Removed from saved items. The document is kept." : "Deleted item",
        () => (state.items = state.items.filter((candidate) => candidate.id !== item.id)),
      );
    else if (name === "new") edit("note");
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
  find<"ui-button">(".launcher-reopen").addEventListener("click", () => toggle(true), { signal });
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
      change(
        kind === "note" ? "Document saved. Open it to keep writing in blocks." : "Saved " + kind,
        () => {
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
          connectNotes();
          if (kind === "note") {
            const captured = state.items.find((entry) => entry.id === current);
            if (captured?.document) current = `document:${captured.document}`;
            filter = "document";
            command.query = "";
            lastQuery = "";
          }
        },
        kind !== "note",
      );
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
        if (!signal.aborted) {
          const copies = importCollection(next, (next as { documents?: unknown }).documents);
          undo = undefined;
          save();
          render();
          notice(
            copies
              ? `Collection imported · ${copies} changed sources kept as separate copies`
              : "Collection imported",
          );
        }
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
  let refreshPending = false;
  function refreshSources() {
    if (refreshPending || signal.aborted) return;
    refreshPending = true;
    queueMicrotask(() => {
      refreshPending = false;
      if (signal.aborted) return;
      notebook = readNotebook();
      render();
    });
  }
  subscribeNotebook(refreshSources, { signal });
  async function loadConnections() {
    const [studyModel, issueModel] = await Promise.all([
      import("./study-model.js"),
      import("./issues-model.js"),
    ]);
    if (signal.aborted) return;
    try {
      const saved = localStorage.getItem(studyModel.studyKey);
      // Seed note IDs are generated on first use; only index durable cards.
      study = saved ? studyModel.parseStudy(saved) : undefined;
    } catch {
      study = undefined;
    }
    issues = issueModel.readIssueState();
    refreshSources();
  }
  window.addEventListener(
    "storage",
    (event) => {
      if (
        event.key === "mash-study-v1" ||
        event.key === "mash-story-projects-v1" ||
        event.key === null
      )
        void loadConnections();
    },
    { signal },
  );
  void loadConnections();
  render();
  await command.updateComplete;
  if (!signal.aborted) toggle(true);
  return () => {
    abort.abort();
    activeObserver.disconnect();
    clearTimeout(noticeTimer);
    root.classList.remove("launcher-app", "launcher-compact");
  };
}
