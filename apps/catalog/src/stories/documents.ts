import "@mash/ui/button";
import "@mash/ui/icon";
import "@mash/ui/input";
import "@mash/ui/textarea";
import "@mash/ui/menu";
import "@mash/ui/menu-item";
import "@mash/ui/checkbox";
import "@mash/ui/select";
import "@mash/ui/option";
import "@mash/ui/tree";
import "@mash/ui/tabs";
import "@mash/ui/resizable";
import "@mash/ui/toolbar";
import "@mash/ui/dialog";
import "@mash/ui/command-palette";
import "@mash/ui/kbd";
import type { UIInput } from "@mash/ui/input";
import type { UIDialog } from "@mash/ui/dialog";
import type { UITabs } from "@mash/ui/tabs";
import type { UICommand } from "@mash/ui/command-palette";
import {
  NotebookHistory,
  seedNotebook,
  parseNotebook,
  createDocument,
  createBlock,
  duplicateBlock,
  removeBlock,
  removeDocument,
  replaceText,
  toggleMark,
  identifier,
  blockKinds,
  safeImage,
  safeLink,
  markdown,
  bounds,
  type Notebook,
  type NotebookDocument,
  type DocumentBlock,
  type BlockKind,
  type MarkKind,
} from "./documents-model.js";
import { DocumentCanvas } from "./documents-canvas.js";
import {
  element,
  button,
  richText,
  textOffsets,
  selectText,
  renderCollection,
  type CollectionView,
} from "./documents-render.js";
import "./documents.css";
import {
  readNotebook,
  writeNotebook,
  subscribeNotebook,
  mergeNotebooks,
  notebooksEqual,
} from "./documents-store.js";
import { workspaceNavigation, workspaceHref } from "./workspace-navigation.js";
import { beforeWorkspaceNavigation, navigateWorkspace } from "./desktop-bridge.js";

export async function mount(
  root: HTMLElement,
  options: {
    activeDocument?: string;
    activeBlock?: string;
    embedded?: boolean;
    onChange?: (notebook: Notebook) => void;
  } = {},
): Promise<(() => void) & { flush: () => void }> {
  const controller = new AbortController();
  const signal = controller.signal;
  let initial = seedNotebook(),
    loadError = "";
  try {
    initial = readNotebook();
  } catch {
    loadError =
      "Saved data could not be read. A fresh notebook is open; import an exported copy to restore it.";
  }
  const route = new URL(location.href).searchParams;
  const activeDocument =
    options.activeDocument ?? (!options.embedded ? route.get("document") : null);
  const activeBlock = options.activeBlock ?? (!options.embedded ? route.get("block") : null);
  let baseline = structuredClone(initial);
  if (activeDocument && initial.documents.some((doc) => doc.id === activeDocument))
    initial.active = activeDocument;
  let writing = false;
  const history = new NotebookHistory(initial);
  let mode: "document" | "canvas" = "document",
    selected: string | null = null,
    query = "",
    saveTimer = 0,
    saveError = false,
    paletteMode: "insert" | "workspace" = "insert";
  let insertAfter: string | null = null;
  let textSelection: { id: string; start: number; end: number } | null = null;
  let askSubmit: ((value: string) => void) | null = null;
  let deletedSelection: string[] = [];
  let dragBlock: string | null = null;
  const collapsed = new Set<string>(),
    collectionViews = new Map<string, CollectionView>();
  let cleaned = false;
  root.classList.add("documents-app");
  root.classList.toggle("documents-embedded", !!options.embedded);
  root.dataset.mashCatalogue = "mash";
  root.dataset.mashSize = "small";
  root.innerHTML = `<ui-resizable class="documents-layout" label="Document workspace">
  <ui-resizable-panel class="documents-sidebar-panel" size="232" min="175" max="330"><aside class="documents-sidebar">${options.embedded ? "" : workspaceNavigation("documents")}<div class="documents-sidebar-tools"><ui-button class="documents-search-button" data-action="search" variant="ghost"><ui-icon slot="prefix" name="action.search"></ui-icon>Search pages<ui-kbd slot="suffix" shortcut="Primary+K"></ui-kbd></ui-button><ui-button class="documents-close-sidebar" data-action="close-sidebar" size="small" variant="ghost" aria-label="Close page navigation"><ui-icon name="action.dismiss"></ui-icon></ui-button><ui-button data-action="new-document" size="small" variant="ghost" aria-label="New document"><ui-icon name="action.add"></ui-icon></ui-button></div><ui-input id="documents-filter" type="search" label="Filter documents" placeholder="Find a page…" size="small" clean-on-escape></ui-input><div class="documents-rail-heading"><span>Pages</span></div><nav id="documents-tree" aria-label="Notebook pages"></nav><div class="documents-sidebar-bottom"><ui-button data-action="import" variant="ghost"><ui-icon slot="prefix" name="action.upload"></ui-icon>Import notebook</ui-button><span id="documents-storage">Saved in this browser</span></div></aside></ui-resizable-panel>
  <ui-resizable-handle label="Resize document navigation"></ui-resizable-handle>
  <ui-resizable-panel class="documents-main-panel" min="320"><section class="documents-main"><header class="documents-topbar"><ui-button data-action="sidebar" variant="ghost" size="small" aria-label="Toggle page navigation"><ui-icon name="navigation.menu"></ui-icon></ui-button><span id="documents-breadcrumb"></span><ui-button id="documents-favorite" data-action="favorite" variant="ghost" size="small" aria-label="Favorite document">☆</ui-button><div class="documents-topbar-spacer"></div><ui-tabs id="documents-mode" value="document" variant="segmented" size="small" label="Document view"><ui-tab slot="tab" value="document">Page</ui-tab><ui-tab slot="tab" value="canvas">Canvas</ui-tab></ui-tabs><ui-button data-action="inspector" variant="ghost" size="small" aria-label="Toggle document details"><ui-icon name="navigation.more.horizontal"></ui-icon></ui-button><ui-menu label="Document actions" density="compact"><ui-button slot="trigger" variant="ghost" size="small" aria-label="Document actions"><ui-icon name="navigation.more.vertical"></ui-icon></ui-button><ui-menu-item value="rename-document">Rename</ui-menu-item><ui-menu-item value="duplicate-document">Duplicate document</ui-menu-item><ui-menu-item value="new-child">New child page</ui-menu-item><ui-menu-item value="export-json">Export notebook</ui-menu-item><ui-menu-item value="export-markdown">Export page as Markdown</ui-menu-item><ui-menu-item value="delete-document" tone="critical">Delete document</ui-menu-item></ui-menu></header>
  <ui-toolbar class="documents-formatbar" label="Editing tools"><ui-button id="documents-undo" data-action="undo" variant="ghost" size="small" aria-label="Undo"><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M7 4L3 8l4 4M3 8h8a5 5 0 0 1 0 10"/></svg></ui-button><ui-button id="documents-redo" data-action="redo" variant="ghost" size="small" aria-label="Redo"><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M13 4l4 4-4 4m4-4H9a5 5 0 0 0 0 10"/></svg></ui-button><span class="documents-tool-rule"></span><ui-button data-action="insert" variant="ghost" size="small"><ui-icon slot="prefix" name="action.add"></ui-icon>Insert</ui-button><span class="documents-tool-rule"></span><ui-button data-action="format-bold" variant="ghost" size="small" aria-label="Bold"><strong>B</strong></ui-button><ui-button data-action="format-italic" variant="ghost" size="small" aria-label="Italic"><em>I</em></ui-button><ui-button data-action="format-underline" variant="ghost" size="small" aria-label="Underline"><u>U</u></ui-button><ui-button data-action="format-code" variant="ghost" size="small" aria-label="Inline code">&lt;/&gt;</ui-button><ui-button data-action="format-link" variant="ghost" size="small">Link</ui-button><span class="documents-toolbar-spacer"></span><ui-button data-action="comment" variant="ghost" size="small">Comment</ui-button></ui-toolbar>
  <div id="documents-page" class="documents-page-scroll"><article class="documents-page"><input id="documents-title" aria-label="Document title" placeholder="Untitled" maxlength="200"><p class="documents-page-meta"><span id="documents-word-count"></span><a id="documents-study-link">Study this page</a></p><div id="documents-blocks"></div><ui-button class="documents-add-block" data-action="insert" variant="ghost"><ui-icon slot="prefix" name="action.add"></ui-icon>Add a block <span class="documents-muted">or type /</span></ui-button></article></div>
  <div id="documents-canvas-wrap" class="documents-canvas-wrap" hidden><div id="documents-canvas"></div><ui-toolbar class="documents-canvas-tools" label="Canvas tools"><ui-button data-action="tool-select" selected variant="ghost" size="small">Select</ui-button><ui-button data-action="tool-hand" variant="ghost" size="small">Pan</ui-button><ui-button data-action="tool-connect" variant="ghost" size="small">Connect</ui-button><span class="documents-tool-rule"></span><ui-button data-action="group" variant="ghost" size="small">Group</ui-button><ui-button data-action="ungroup" variant="ghost" size="small">Ungroup</ui-button><ui-button data-action="canvas-delete" variant="ghost" size="small" aria-label="Delete selected blocks"><ui-icon name="action.dismiss"></ui-icon></ui-button><span class="documents-tool-rule"></span><ui-button data-action="zoom-out" variant="ghost" size="small" aria-label="Zoom out">−</ui-button><output id="documents-zoom">75%</output><ui-button data-action="zoom-in" variant="ghost" size="small" aria-label="Zoom in">+</ui-button><ui-button data-action="fit" variant="ghost" size="small">Fit</ui-button></ui-toolbar></div><footer class="documents-statusbar"><output id="documents-status" role="status" aria-live="polite">Ready to write</output><span id="documents-block-count"></span></footer></section></ui-resizable-panel>
  <ui-resizable-handle class="documents-inspector-handle" label="Resize document details"></ui-resizable-handle><ui-resizable-panel class="documents-inspector-panel" size="252" min="200" max="360"><aside class="documents-inspector"><header><strong>On this page</strong><ui-button data-action="inspector" size="small" variant="ghost" aria-label="Close document details"><ui-icon name="action.dismiss"></ui-icon></ui-button></header><nav id="documents-outline" aria-label="Document outline"></nav><div id="documents-properties"></div><section class="documents-comments"><div class="documents-section-heading"><strong>Comments</strong><span id="documents-comment-count"></span></div><div id="documents-comments"></div><ui-textarea id="documents-comment" label="New comment" rows="3" placeholder="Leave a note on this block…"></ui-textarea><ui-button data-action="add-comment" size="small" variant="secondary">Add comment</ui-button></section></aside></ui-resizable-panel></ui-resizable>
  <ui-dialog id="documents-palette" label="Workspace commands"><ui-command id="documents-command" label="Find a command" placeholder="Search…"></ui-command></ui-dialog><ui-dialog id="documents-prompt" label="Edit document"><strong slot="title" id="documents-prompt-title"></strong><p id="documents-prompt-description"></p><ui-input id="documents-prompt-value" label="Value"></ui-input><div slot="actions" class="documents-dialog-actions"><ui-button data-action="cancel-prompt" variant="ghost">Cancel</ui-button><ui-button data-action="submit-prompt" variant="primary">Continue</ui-button></div></ui-dialog><input id="documents-import-file" type="file" accept="application/json,.json" hidden><input id="documents-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>`;
  const $ = <T extends Element = HTMLElement>(selector: string): T =>
    root.querySelector<T>(selector)!;
  if (options.embedded) {
    for (const item of root.querySelectorAll(
      'ui-menu-item[value="duplicate-document"], ui-menu-item[value="new-child"], ui-menu-item[value="delete-document"]',
    ))
      item.remove();
  }
  const doc = (): NotebookDocument =>
    history.state.documents.find((d) => d.id === history.state.active)!;
  const block = (id: string | null = selected): DocumentBlock | undefined =>
    doc().blocks.find((b) => b.id === id);
  function retainFocus(): () => void {
    const focused = document.activeElement as HTMLElement | null;
    const editing = focused?.closest<HTMLElement>("[data-editable]");
    const offsets = editing && root.contains(editing) ? textOffsets(editing) : null;
    const titleFocused = focused === $("#documents-title");
    const titlePosition = titleFocused
      ? $<HTMLInputElement>("#documents-title").selectionStart
      : null;
    return () => {
      if (editing && offsets && block(editing.dataset.editable)) {
        const fresh = root.querySelector<HTMLElement>(
          `[data-editable="${CSS.escape(editing.dataset.editable!)}"]`,
        );
        if (fresh) selectText(fresh, offsets.start, offsets.end);
      } else if (titleFocused) {
        const title = $<HTMLInputElement>("#documents-title");
        title.focus();
        title.setSelectionRange(titlePosition, titlePosition);
      }
    };
  }
  const announce = (text: string): void => {
    $("#documents-status").textContent = text;
  };
  const flush = (): void => {
    clearTimeout(saveTimer);
    try {
      const previous = structuredClone(history.state);
      writing = true;
      const submitted = options.embedded ? { ...previous, active: baseline.active } : previous;
      const saved = writeNotebook(submitted, baseline);
      const editorState = { ...saved, active: previous.active };
      if (!notebooksEqual(editorState, previous)) {
        const restore = retainFocus();
        history.rebase((snapshot) => mergeNotebooks(editorState, previous, snapshot));
        renderDocument();
        restore();
      }
      baseline = structuredClone(saved);
      options.onChange?.(saved);
      saveError = false;
      $("#documents-storage").textContent = "Saved in this browser";
    } catch {
      saveError = true;
      $("#documents-storage").textContent = "Storage full · export to keep changes";
      announce("Your changes remain open. Export the notebook to keep a copy.");
    } finally {
      writing = false;
      saveTimer = 0;
    }
  };
  const persist = (): void => {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(flush, 180);
  };
  window.addEventListener("pagehide", flush, { signal });
  window.addEventListener("beforeunload", flush, { signal });
  window.addEventListener(beforeWorkspaceNavigation, flush, { signal });
  const refreshControls = (): void => {
    const undo = $<HTMLElement & { disabled: boolean }>("#documents-undo"),
      redo = $<HTMLElement & { disabled: boolean }>("#documents-redo");
    undo.disabled = !history.canUndo;
    redo.disabled = !history.canRedo;
    const blocks = doc().blocks.length;
    const words = doc().blocks.reduce(
      (n, b) => n + (b.text.trim() ? b.text.trim().split(/\s+/).length : 0),
      0,
    );
    $("#documents-block-count").textContent = `${blocks} ${blocks === 1 ? "block" : "blocks"}`;
    $("#documents-word-count").textContent = `${words} ${words === 1 ? "word" : "words"}`;
  };
  const commit = (
    label: string,
    edit: (document: NotebookDocument) => void,
    render = true,
    key = "",
  ): void => {
    history.transact(() => edit(doc()), key);
    persist();
    if (render) renderDocument();
    else {
      refreshControls();
      renderOutline();
    }
    announce(label);
  };
  const canvas = new DocumentCanvas($("#documents-canvas"), {
    document: doc,
    commit: (label, edit) => commit(label, edit),
    select: (ids) => {
      selected = ids[0] ?? null;
      renderInspector();
    },
    edit: (id) => {
      selected = id;
      setMode("document");
      focusBlock(id);
    },
    announce,
  });
  function setMode(next: "document" | "canvas"): void {
    mode = next;
    $<UITabs>("#documents-mode").value = next;
    $("#documents-page").hidden = next === "canvas";
    $("#documents-canvas-wrap").hidden = next !== "canvas";
    root.dataset.view = next;
    if (next === "canvas") {
      canvas.render();
      canvas.select(selected ? [selected] : []);
    }
    renderInspector();
  }
  function navigate(id: string): void {
    if (!history.state.documents.some((d) => d.id === id)) return;
    history.state.active = id;
    root.classList.remove("show-sidebar");
    selected = null;
    textSelection = null;
    canvas.select([]);
    persist();
    renderDocument();
    if (mode === "canvas") requestAnimationFrame(() => canvas.fit());
    $("#documents-page").scrollTop = 0;
  }
  function renderNavigation(): void {
    if (options.embedded) return;
    const host = $("#documents-tree");
    host.replaceChildren();
    const docs = history.state.documents;
    const tree = element("ui-tree");
    tree.setAttribute("label", "Notebook pages");
    tree.selectionFollowsFocus = false;
    const matches = (d: NotebookDocument) =>
      !query ||
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      d.blocks.some((b) => b.text.toLowerCase().includes(query.toLowerCase()));
    const children = (parent: string | null): HTMLElement[] =>
      docs
        .filter((d) => d.parent === parent)
        .map((d) => {
          const item = element("ui-tree-item");
          item.setAttribute("value", d.id);
          item.setAttribute("title", (d.favorite ? "★ " : "") + d.title);
          item.setAttribute(
            "kind",
            docs.some((child) => child.parent === d.id) ? "folder" : "file",
          );
          item.toggleAttribute("selected", d.id === doc().id);
          item.toggleAttribute("expanded", !collapsed.has(d.id));
          const descendants = children(d.id);
          for (const child of descendants) {
            child.slot = "children";
            item.append(child);
          }
          item.hidden = !matches(d) && !descendants.some((child) => !child.hidden);
          return item;
        });
    tree.append(...children(null));
    host.append(tree);
    if (!docs.some(matches))
      host.append(element("p", "documents-empty", "No pages match your search."));
  }
  function renderOutline(): void {
    const outline = $("#documents-outline");
    outline.replaceChildren();
    for (const b of doc().blocks.filter(
      (candidate) => candidate.kind === "heading" || candidate.kind === "subheading",
    )) {
      const link = element(
        "button",
        b.kind === "subheading" ? "is-subheading" : "",
        b.text || "Untitled heading",
      );
      link.type = "button";
      link.addEventListener(
        "click",
        () => {
          selected = b.id;
          if (mode === "canvas") {
            canvas.select([b.id]);
            announce("Selected " + b.text);
          } else focusBlock(b.id);
          renderInspector();
        },
        { signal },
      );
      outline.append(link);
    }
    if (!outline.childElementCount)
      outline.append(element("p", "documents-empty", "Headings appear here as you write."));
  }
  function renderDocument(): void {
    const title = $<HTMLInputElement>("#documents-title");
    title.value = doc().title;
    $<HTMLAnchorElement>("#documents-study-link").href = workspaceHref("study", {
      document: doc().id,
    });
    $("#documents-breadcrumb").textContent =
      (doc().parent
        ? history.state.documents.find((d) => d.id === doc().parent)?.title + " / "
        : "") + doc().title;
    $("#documents-favorite").textContent = doc().favorite ? "★" : "☆";
    const blocks = $("#documents-blocks");
    blocks.replaceChildren(...doc().blocks.map(renderBlock));
    renderNavigation();
    renderOutline();
    renderInspector();
    canvas.render();
    refreshControls();
  }
  function renderBlock(b: DocumentBlock, index: number): HTMLElement {
    const row = element("section", "documents-block");
    row.dataset.block = b.id;
    row.dataset.kind = b.kind;
    row.dataset.color = b.color;
    row.classList.toggle("is-active", selected === b.id);
    const gutter = element("div", "documents-block-gutter");
    const grip = button("Move block", "block-menu", "action.drag");
    grip.draggable = true;
    grip.setAttribute("title", "Drag to move. Use the block menu for keyboard actions.");
    gutter.append(grip);
    const menu = element("ui-menu");
    menu.setAttribute("label", "Block actions");
    menu.setAttribute("density", "compact");
    const trigger = button("Block actions", "", "navigation.more.horizontal");
    trigger.slot = "trigger";
    menu.append(trigger);
    for (const [value, label] of [
      ["insert-after", "Insert below"],
      ["move-up", "Move up"],
      ["move-down", "Move down"],
      ["duplicate-block", "Duplicate"],
      ["convert-block", "Turn into…"],
      ["comment", "Add comment"],
      ["study-block", "Make a study card"],
      ["copy-block-link", "Copy link to block"],
      ["delete-block", "Delete"],
    ]) {
      const item = element("ui-menu-item", "", label);
      item.setAttribute("value", value!);
      if (value === "delete-block") item.setAttribute("tone", "critical");
      menu.append(item);
    }
    gutter.append(menu);
    row.append(gutter);
    if (b.kind === "divider") {
      row.append(element("hr"));
      return row;
    }
    if (b.kind === "todo") {
      const check = element("ui-checkbox");
      check.setAttribute("aria-label", "Complete " + (b.text || "task"));
      check.checked = b.checked;
      check.addEventListener(
        "ui-checkbox-change",
        () =>
          commit("Updated task", () => {
            b.checked = check.checked;
          }),
        { signal },
      );
      row.append(check);
    }
    if (b.kind === "bullet" || b.kind === "numbered")
      row.append(
        element(
          "span",
          "documents-list-marker",
          b.kind === "bullet" ? "•" : String(index + 1) + ".",
        ),
      );
    const tag =
      b.kind === "heading"
        ? "h1"
        : b.kind === "subheading"
          ? "h2"
          : b.kind === "quote"
            ? "blockquote"
            : b.kind === "code"
              ? "pre"
              : "p";
    const editable = element(tag, "documents-editable");
    editable.contentEditable = "true";
    editable.spellcheck = b.kind !== "code";
    editable.dataset.editable = b.id;
    editable.setAttribute("role", "textbox");
    editable.setAttribute("aria-multiline", "true");
    editable.setAttribute(
      "aria-label",
      blockKinds.find((k) => k.kind === b.kind)?.label + " block",
    );
    editable.dataset.placeholder =
      b.kind === "table"
        ? "Collection title"
        : b.kind === "image"
          ? "Image caption"
          : "Write something, or type /";
    richText(editable, b.text, b.marks);
    row.append(editable);
    if (b.kind === "table") {
      const view = collectionViews.get(b.id) ?? {
        query: "",
        status: "",
        sort: "title",
        descending: false,
        view: "table",
      };
      collectionViews.set(b.id, view);
      row.append(
        renderCollection(
          b,
          view,
          (edit, label) => commit(label, () => edit(b)),
          () => renderDocument(),
        ),
      );
    }
    if (b.kind === "image") {
      const media = element("div", "documents-image");
      if (b.source) {
        const img = element("img");
        img.src = b.source;
        img.alt = b.text || "Notebook image";
        img.addEventListener(
          "error",
          () => {
            media.append(
              element(
                "p",
                "documents-empty",
                "Image unavailable. Replace the source in the block menu below.",
              ),
            );
          },
          { once: true, signal },
        );
        media.append(img);
      } else
        media.append(
          element("p", "documents-empty", "Add an image from your device or an image URL."),
        );
      const actions = element("div", "documents-image-actions");
      const upload = button("Upload image", "upload-image", "action.upload"),
        url = button("Image URL", "image-url");
      actions.append(upload, url);
      media.append(actions);
      row.append(media);
    }
    const comments = b.comments.filter((c) => !c.resolved).length;
    if (comments) {
      const count = button(comments + " comments", "comment");
      count.className = "documents-comment-badge";
      row.append(count);
    }
    return row;
  }
  function renderInspector(): void {
    const properties = $("#documents-properties");
    properties.replaceChildren();
    const b = block();
    const title = element(
      "h4",
      "documents-inspector-heading",
      b ? "Block details" : "Page details",
    );
    properties.append(title);
    if (!b) {
      properties.append(
        element("p", "documents-muted", "Select a block to view its properties and comments."),
      );
      const parent = element("ui-select");
      parent.label = "Parent document";
      parent.size = "small";
      const validParent = (candidate: NotebookDocument) => {
        let current: NotebookDocument | undefined = candidate;
        while (current) {
          if (current.id === doc().id) return false;
          current = history.state.documents.find((d) => d.id === current?.parent);
        }
        return true;
      };
      const top = element("ui-option", "", "Workspace");
      top.value = "";
      parent.append(top);
      for (const candidate of history.state.documents.filter(validParent)) {
        const option = element("ui-option", "", candidate.title);
        option.value = candidate.id;
        parent.append(option);
      }
      parent.value = doc().parent ?? "";
      parent.addEventListener(
        "ui-select-change",
        () =>
          commit("Moved page", (d) => {
            d.parent = parent.value || null;
          }),
        { signal },
      );
      properties.append(element("label", "documents-property-label", "Location"), parent);
    } else {
      const kind = element("ui-select");
      kind.label = "Block type";
      kind.size = "small";
      for (const entry of blockKinds) {
        const option = element("ui-option", "", entry.label);
        option.value = entry.kind;
        kind.append(option);
      }
      kind.value = b.kind;
      kind.addEventListener("ui-select-change", () => convertBlock(b, kind.value as BlockKind), {
        signal,
      });
      properties.append(kind);
      const color = element("ui-select");
      color.label = "Block color";
      color.size = "small";
      for (const value of ["plain", "amber", "blue", "green"]) {
        const option = element("ui-option", "", value.charAt(0).toUpperCase() + value.slice(1));
        option.value = value;
        color.append(option);
      }
      color.value = b.color;
      color.addEventListener(
        "ui-select-change",
        () =>
          commit("Changed block color", () => {
            b.color = color.value as DocumentBlock["color"];
          }),
        { signal },
      );
      properties.append(element("label", "documents-property-label", "Color"), color);
      if (mode === "canvas") {
        properties.append(
          element(
            "p",
            "documents-muted",
            canvas.selected.length + " selected" + (b.group ? " · grouped" : ""),
          ),
        );
        const grid = element("div", "documents-geometry");
        for (const key of ["x", "y", "width", "height"] as const) {
          const label = element("label", "", key);
          const input = element("input");
          input.type = "number";
          input.value = String(Math.round(b.frame[key]));
          input.required = true;
          input.setAttribute("aria-label", "Canvas " + key);
          if (key === "width") input.min = "160";
          if (key === "height") input.min = "100";
          input.addEventListener(
            "change",
            () => {
              if (!input.checkValidity() || !Number.isFinite(input.valueAsNumber)) {
                input.reportValidity();
                return;
              }
              commit("Updated card geometry", () => {
                b.frame[key] = input.valueAsNumber;
              });
            },
            { signal },
          );
          label.append(input);
          grid.append(label);
        }
        properties.append(grid);
        for (const connection of doc().connections.filter(
          (c) => c.from === b.id || c.to === b.id,
        )) {
          const wrap = element("div", "documents-connection-row");
          const input = element("input");
          input.value = connection.label;
          input.placeholder = "Connection label";
          input.setAttribute("aria-label", "Connection label");
          input.addEventListener(
            "change",
            () =>
              commit("Updated connector", () => {
                connection.label = input.value;
              }),
            { signal },
          );
          const remove = button("Remove connection", "");
          remove.textContent = "×";
          remove.addEventListener(
            "click",
            () =>
              commit("Removed connector", (d) => {
                d.connections = d.connections.filter((c) => c.id !== connection.id);
              }),
            { signal },
          );
          wrap.append(input, remove);
          properties.append(wrap);
        }
      }
    }
    const comments = $("#documents-comments");
    comments.replaceChildren();
    const entries = b?.comments ?? [];
    $("#documents-comment-count").textContent = String(entries.filter((c) => !c.resolved).length);
    for (const comment of entries) {
      const item = element(
        "article",
        "documents-comment" + (comment.resolved ? " is-resolved" : ""),
      );
      const heading = element("div", "documents-comment-heading");
      heading.append(
        element("strong", "", "You"),
        element(
          "time",
          "",
          new Date(comment.created).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
        ),
      );
      item.append(heading, element("p", "", comment.text));
      const actions = element("div");
      const resolve = button(comment.resolved ? "Reopen" : "Resolve", ""),
        remove = button("Delete comment", "");
      remove.textContent = "Delete";
      resolve.addEventListener(
        "click",
        () =>
          commit(comment.resolved ? "Reopened comment" : "Resolved comment", () => {
            comment.resolved = !comment.resolved;
          }),
        { signal },
      );
      remove.addEventListener(
        "click",
        () =>
          commit("Deleted comment", () => {
            b!.comments = b!.comments.filter((c) => c.id !== comment.id);
          }),
        { signal },
      );
      actions.append(resolve, remove);
      item.append(actions);
      comments.append(item);
    }
    if (!entries.length)
      comments.append(
        element(
          "p",
          "documents-empty",
          b
            ? "No comments yet. Start a conversation with your future self."
            : "Select a block to leave a note.",
        ),
      );
  }
  function focusBlock(id: string, offset?: number): void {
    const target = $<HTMLElement>(`[data-editable="${CSS.escape(id)}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    selectText(target, offset ?? target.textContent?.length ?? 0);
    selected = id;
    renderInspector();
  }
  function convertBlock(b: DocumentBlock, kind: BlockKind): void {
    commit("Changed block type", () => {
      b.kind = kind;
      if (kind === "table" && !b.rows) b.rows = [];
    });
    focusBlock(b.id);
  }
  function addBlock(kind: BlockKind, after = selected): void {
    const fresh = createBlock(kind, "", doc().blocks.length);
    const occupied = bounds(doc().blocks.map((entry) => entry.frame));
    fresh.frame.x = occupied.x;
    fresh.frame.y = occupied.y + occupied.height + 40;
    commit("Inserted " + (blockKinds.find((k) => k.kind === kind)?.label ?? kind), (d) => {
      const index = after ? d.blocks.findIndex((b) => b.id === after) : -1;
      d.blocks.splice(index >= 0 ? index + 1 : d.blocks.length, 0, fresh);
    });
    selected = fresh.id;
    if (mode === "canvas") canvas.select([fresh.id]);
    else focusBlock(fresh.id);
  }
  function prompt(
    title: string,
    value: string,
    submit: (value: string) => void,
    description = "",
  ): void {
    askSubmit = submit;
    $("#documents-prompt-title").textContent = title;
    $("#documents-prompt-description").textContent = description;
    const field = $<UIInput>("#documents-prompt-value");
    field.value = value;
    field.hidden = title.startsWith("Delete");
    field.label = title;
    $<UIDialog>("#documents-prompt").show();
    if (!field.hidden) void field.updateComplete.then(() => field.focus());
  }
  function palette(kind: "insert" | "workspace", convert = false): void {
    paletteMode = kind;
    insertAfter = selected;
    const command = $<UICommand>("#documents-command");
    command.replaceChildren();
    command.label = kind === "insert" ? "Insert a block" : "Search notebook";
    command.placeholder = kind === "insert" ? "Find a block type…" : "Find a page or action…";
    command.query = "";
    command.dataset.convert = String(convert);
    if (kind === "insert")
      for (const entry of blockKinds) {
        const item = element("ui-command-item");
        item.setAttribute("value", entry.kind);
        item.setAttribute("keywords", entry.label + " " + entry.hint);
        const text = element("span");
        text.append(element("strong", "", entry.label), element("small", "", entry.hint));
        item.append(text);
        command.append(item);
      }
    else {
      for (const page of history.state.documents.filter(
        (candidate) => !options.embedded || candidate.id === activeDocument,
      )) {
        const item = element("ui-command-item");
        item.setAttribute("value", "page:" + page.id);
        item.setAttribute("keywords", page.blocks.map((b) => b.text).join(" "));
        item.textContent = page.title;
        command.append(item);
      }
      for (const [id, label] of [
        ["new-document", "Create a new page"],
        ["insert", "Insert block"],
        ["export-json", "Export notebook"],
        ["undo", "Undo last change"],
        ["redo", "Redo last change"],
        ["fit", "Fit canvas"],
      ]) {
        if (options.embedded && id === "new-document") continue;
        const item = element("ui-command-item", "", label);
        item.setAttribute("value", "action:" + id);
        command.append(item);
      }
    }
    const empty = element("p", "documents-empty", "No matching pages or commands.");
    empty.slot = "empty";
    command.append(empty);
    $<UIDialog>("#documents-palette").show();
  }
  function format(kind: MarkKind): void {
    if (!textSelection || textSelection.start === textSelection.end) {
      announce("Select a passage of text first.");
      return;
    }
    const selection = { ...textSelection };
    const b = block(selection.id);
    if (!b) return;
    const apply = (href?: string) => {
      commit("Applied " + kind, () => toggleMark(b, kind, selection.start, selection.end, href));
      const editable = $<HTMLElement>(`[data-editable="${b.id}"]`);
      selectText(editable, selection.start, selection.end);
    };
    if (kind === "link")
      prompt("Link address", "https://", (value) => {
        if (!safeLink(value)) {
          announce("Use an https, http, or mailto link.");
          return;
        }
        apply(value);
      });
    else apply();
  }
  function exportFile(name: string, contents: string, type: string): void {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = element("a");
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce("Exported " + name);
  }
  function action(name: string, target?: HTMLElement): void {
    const row = target?.closest<HTMLElement>("[data-block]");
    if (name === "study-block" || name === "copy-block-link") {
      const id = row?.dataset.block ?? selected;
      if (!id) return;
      if (name === "study-block") {
        flush();
        navigateWorkspace(workspaceHref("study", { document: doc().id, block: id }));
      } else {
        const href = new URL(
          workspaceHref("documents", { document: doc().id, block: id }),
          location.origin,
        ).href;
        void navigator.clipboard.writeText(href).then(
          () => announce("Block link copied"),
          () => announce("Clipboard unavailable"),
        );
      }
      return;
    }
    if (row) selected = row.dataset.block!;
    const b = block();
    if (name.startsWith("format-")) {
      format(name.slice(7) as MarkKind);
      return;
    }
    if (name === "undo" || name === "redo") {
      const changed = name === "undo" ? history.undo() : history.redo();
      if (changed) {
        selected = null;
        persist();
        renderDocument();
        announce(name === "undo" ? "Undid the last change" : "Redid the last change");
      }
      return;
    }
    switch (name) {
      case "new-document":
      case "new-child": {
        const fresh = createDocument("Untitled", name === "new-child" ? doc().id : null);
        history.transact((state) => {
          state.documents.push(fresh);
          state.active = fresh.id;
        });
        persist();
        renderDocument();
        $<HTMLInputElement>("#documents-title").focus();
        $<HTMLInputElement>("#documents-title").select();
        break;
      }
      case "rename-document":
        prompt("Rename document", doc().title, (value) =>
          commit("Renamed document", (d) => {
            d.title = value.trim() || "Untitled";
          }),
        );
        break;
      case "duplicate-document": {
        const copied = structuredClone(doc());
        copied.id = identifier();
        copied.title += " copy";
        const map = new Map(copied.blocks.map((entry) => [entry.id, identifier()]));
        for (const entry of copied.blocks) {
          entry.id = map.get(entry.id)!;
          entry.comments = entry.comments.map((c) => ({ ...c, id: identifier() }));
        }
        copied.connections = copied.connections.map((c) => ({
          ...c,
          id: identifier(),
          from: map.get(c.from)!,
          to: map.get(c.to)!,
        }));
        history.transact((state) => {
          state.documents.push(copied);
          state.active = copied.id;
        });
        persist();
        renderDocument();
        announce("Duplicated document");
        break;
      }
      case "delete-document":
        prompt(
          "Delete document",
          "",
          () => {
            history.transact((state) => removeDocument(state, doc().id));
            selected = null;
            persist();
            renderDocument();
            announce("Deleted document. Undo restores it.");
          },
          "This also removes its child pages. You can restore them with Undo.",
        );
        break;
      case "favorite":
        commit(doc().favorite ? "Removed favorite" : "Added favorite", (d) => {
          d.favorite = !d.favorite;
        });
        break;
      case "search":
        palette("workspace");
        break;
      case "insert":
      case "insert-after":
        palette("insert");
        break;
      case "convert-block":
        if (b) palette("insert", true);
        break;
      case "block-menu":
        row?.querySelector<HTMLElement & { show(): void }>("ui-menu")?.show();
        break;
      case "move-up":
      case "move-down":
        if (b)
          commit("Moved block", (d) => {
            const from = d.blocks.indexOf(b),
              to = Math.max(0, Math.min(d.blocks.length - 1, from + (name === "move-up" ? -1 : 1)));
            d.blocks.splice(from, 1);
            d.blocks.splice(to, 0, b);
          });
        break;
      case "duplicate-block":
        if (b) {
          let copied: DocumentBlock | undefined;
          commit("Duplicated block", (d) => {
            copied = duplicateBlock(d, b.id);
          });
          if (copied) focusBlock(copied.id);
        }
        break;
      case "delete-block":
        if (b) {
          const index = doc().blocks.indexOf(b);
          commit("Deleted block", (d) => removeBlock(d, b.id));
          selected = doc().blocks[Math.min(index, doc().blocks.length - 1)]?.id ?? null;
          if (selected) focusBlock(selected);
        }
        break;
      case "comment":
        if (!selected && doc().blocks[0]) selected = doc().blocks[0]!.id;
        root.classList.remove("hide-inspector");
        if (options.embedded || matchMedia("(max-width:1100px)").matches)
          root.classList.add("show-inspector");
        renderInspector();
        $<HTMLElement>("#documents-comment").focus();
        break;
      case "add-comment": {
        const field = $<HTMLElement & { value: string }>("#documents-comment");
        const text = field.value.trim();
        if (!text) {
          announce("Write a comment first.");
          break;
        }
        if (!b) {
          announce("Select a block for this comment.");
          break;
        }
        commit("Added comment", () =>
          b.comments.push({
            id: identifier(),
            text,
            created: new Date().toISOString(),
            resolved: false,
          }),
        );
        field.value = "";
        break;
      }
      case "close-sidebar":
        root.classList.remove("show-sidebar");
        break;
      case "sidebar":
        root.classList.toggle(
          matchMedia("(max-width:720px)").matches ? "show-sidebar" : "hide-sidebar",
        );
        break;
      case "inspector":
        root.classList.toggle(
          options.embedded || matchMedia("(max-width:1100px)").matches
            ? "show-inspector"
            : "hide-inspector",
        );
        break;
      case "tool-select":
      case "tool-hand":
      case "tool-connect":
        canvas.tool(name.slice(5));
        root
          .querySelectorAll('[data-action^="tool-"]')
          .forEach((node) =>
            node.toggleAttribute("selected", node.getAttribute("data-action") === name),
          );
        announce(
          name === "tool-connect"
            ? "Choose two cards to connect."
            : name === "tool-hand"
              ? "Drag to pan the canvas."
              : "Drag cards or select an area.",
        );
        break;
      case "zoom-in":
        canvas.zoomBy(1.2);
        break;
      case "zoom-out":
        canvas.zoomBy(1 / 1.2);
        break;
      case "fit":
        if (mode !== "canvas") {
          setMode("canvas");
          requestAnimationFrame(() => canvas.fit());
        } else canvas.fit();
        break;
      case "group":
        if (canvas.selected.length > 1) {
          const group = identifier();
          commit("Grouped selected cards", (d) => {
            for (const entry of d.blocks)
              if (canvas.selected.includes(entry.id)) entry.group = group;
          });
        } else announce("Select at least two cards to group.");
        break;
      case "ungroup":
        commit("Ungrouped cards", (d) => {
          for (const entry of d.blocks) if (canvas.selected.includes(entry.id)) delete entry.group;
        });
        break;
      case "canvas-delete": {
        deletedSelection = canvas.selected;
        if (deletedSelection.length)
          commit("Deleted selected blocks", (d) => {
            for (const id of deletedSelection) removeBlock(d, id);
          });
        selected = null;
        break;
      }
      case "import":
        $<HTMLInputElement>("#documents-import-file").click();
        break;
      case "export-json":
        exportFile("notebook.json", JSON.stringify(history.state, null, 2), "application/json");
        break;
      case "export-markdown":
        exportFile(
          doc()
            .title.replace(/[^\w\s-]/g, "")
            .trim() + ".md",
          markdown(doc()),
          "text/markdown",
        );
        break;
      case "image-url":
        if (b)
          prompt("Image address", b.source ?? "", (value) => {
            if (!safeImage(value)) {
              announce("Use an http or https image URL.");
              return;
            }
            commit("Updated image", () => {
              b.source = value;
            });
          });
        break;
      case "upload-image":
        if (b) $<HTMLInputElement>("#documents-image-file").click();
        break;
      case "cancel-prompt":
        askSubmit = null;
        $<UIDialog>("#documents-prompt").dismiss();
        break;
      case "submit-prompt": {
        const callback = askSubmit;
        askSubmit = null;
        $<UIDialog>("#documents-prompt").dismiss();
        callback?.($<UIInput>("#documents-prompt-value").value);
        break;
      }
    }
  }
  root.addEventListener(
    "click",
    (event) => {
      const target = event
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement && node.hasAttribute("data-action"),
        );
      if (target) action(target.dataset.action!, target);
    },
    { signal },
  );
  root.addEventListener(
    "pointerdown",
    (event) => {
      const target = (event.target as Element).closest<HTMLElement>('[data-action^="format-"]');
      if (target) event.preventDefault();
    },
    { signal },
  );
  root.addEventListener(
    "ui-menu-select",
    (event) => {
      const target = event.target as HTMLElement;
      action((event as CustomEvent<{ value: string }>).detail.value, target);
    },
    { signal },
  );
  $("#documents-tree").addEventListener(
    "ui-tree-select",
    (event) => navigate((event as CustomEvent<{ value: string }>).detail.value),
    { signal },
  );
  $("#documents-tree").addEventListener(
    "ui-tree-toggle",
    (event) => {
      const detail = (event as CustomEvent<{ value: string; expanded: boolean }>).detail;
      if (detail.expanded) collapsed.delete(detail.value);
      else collapsed.add(detail.value);
    },
    { signal },
  );
  $("#documents-mode").addEventListener(
    "ui-tabs-change",
    (event) => {
      setMode((event as CustomEvent<{ value: "document" | "canvas" }>).detail.value);
      if (mode === "canvas") requestAnimationFrame(() => canvas.fit());
    },
    { signal },
  );
  $("#documents-canvas").addEventListener(
    "documents-zoom",
    (event) => {
      $("#documents-zoom").textContent =
        Math.round((event as CustomEvent<number>).detail * 100) + "%";
    },
    { signal },
  );
  $("#documents-filter").addEventListener(
    "input",
    () => {
      query = $<UIInput>("#documents-filter").value;
      renderNavigation();
    },
    { signal },
  );
  $("#documents-title").addEventListener(
    "input",
    () => {
      commit(
        "Editing title",
        (d) => {
          d.title = $<HTMLInputElement>("#documents-title").value || "Untitled";
        },
        false,
        "title:" + doc().id,
      );
      $("#documents-breadcrumb").textContent = doc().title;
      renderNavigation();
    },
    { signal },
  );
  $("#documents-blocks").addEventListener(
    "focusin",
    (event) => {
      const row = (event.target as Element).closest<HTMLElement>("[data-block]");
      if (row && selected !== row.dataset.block) {
        selected = row.dataset.block!;
        root
          .querySelectorAll("[data-block]")
          .forEach((node) =>
            node.classList.toggle("is-active", (node as HTMLElement).dataset.block === selected),
          );
        renderInspector();
      }
    },
    { signal },
  );
  document.addEventListener(
    "selectionchange",
    () => {
      const selection = getSelection();
      const anchorElement =
        selection?.anchorNode instanceof Element
          ? selection.anchorNode
          : selection?.anchorNode?.parentElement;
      const editable = anchorElement?.closest<HTMLElement>("[data-editable]");
      if (!editable || !root.contains(editable)) return;
      const offsets = textOffsets(editable);
      if (offsets) textSelection = { id: editable.dataset.editable!, ...offsets };
    },
    { signal },
  );
  $("#documents-blocks").addEventListener(
    "input",
    (event) => {
      const editable = (event.target as Element).closest<HTMLElement>("[data-editable]");
      if (!editable) return;
      const b = block(editable.dataset.editable!);
      if (!b) return;
      commit(
        "Editing · saved locally",
        () => replaceText(b, editable.textContent ?? ""),
        false,
        "text:" + b.id,
      );
    },
    { signal },
  );
  const replaceSelection = (editable: HTMLElement, text: string): void => {
    const b = block(editable.dataset.editable!);
    if (!b) return;
    const selection = textOffsets(editable) ?? { start: b.text.length, end: b.text.length };
    const next = b.text.slice(0, selection.start) + text + b.text.slice(selection.end);
    commit("Edited text", () => replaceText(b, next), false, "text:" + b.id);
    richText(editable, b.text, b.marks);
    selectText(editable, selection.start + text.length);
  };
  $("#documents-blocks").addEventListener(
    "paste",
    (event) => {
      const editable = (event.target as Element).closest<HTMLElement>("[data-editable]");
      if (!editable) return;
      event.preventDefault();
      replaceSelection(
        editable,
        (event as ClipboardEvent).clipboardData?.getData("text/plain") ?? "",
      );
    },
    { signal },
  );
  $("#documents-blocks").addEventListener(
    "beforeinput",
    (event) => {
      const input = event as InputEvent;
      const editable = (event.target as Element).closest<HTMLElement>("[data-editable]");
      if (!editable) return;
      if (
        input.inputType === "formatBold" ||
        input.inputType === "formatItalic" ||
        input.inputType === "formatUnderline"
      ) {
        event.preventDefault();
        format(
          input.inputType === "formatBold"
            ? "bold"
            : input.inputType === "formatItalic"
              ? "italic"
              : "underline",
        );
      }
      if (input.inputType === "insertLineBreak") {
        event.preventDefault();
        replaceSelection(editable, "\n");
      }
    },
    { signal },
  );
  root.addEventListener(
    "keydown",
    (event) => {
      const insideDialog = event
        .composedPath()
        .some((node) => node instanceof HTMLElement && node.localName === "ui-dialog");
      if (insideDialog) return;
      if (event.key === "Escape") {
        root.classList.remove("show-sidebar", "show-inspector");
      }
      const primary = event.metaKey || event.ctrlKey;
      const editable = (event.target as Element).closest<HTMLElement>("[data-editable]");
      if (primary && event.key.toLowerCase() === "k") {
        event.preventDefault();
        palette("workspace");
        return;
      }
      if (primary && event.key.toLowerCase() === "z") {
        event.preventDefault();
        action(event.shiftKey ? "redo" : "undo");
        return;
      }
      if (primary && event.key.toLowerCase() === "y") {
        event.preventDefault();
        action("redo");
        return;
      }
      if (primary && event.key.toLowerCase() === "s") {
        event.preventDefault();
        persist();
        announce(saveError ? "Export a copy to keep your changes." : "Saved in this browser");
        return;
      }
      if (editable) {
        const b = block(editable.dataset.editable!);
        if (!b) return;
        selected = b.id;
        const selection = textOffsets(editable) ?? { start: b.text.length, end: b.text.length };
        if (primary && ["b", "i", "u"].includes(event.key.toLowerCase())) {
          event.preventDefault();
          textSelection = { id: b.id, ...selection };
          format(
            event.key.toLowerCase() === "b"
              ? "bold"
              : event.key.toLowerCase() === "i"
                ? "italic"
                : "underline",
          );
          return;
        }
        if (event.key === "/" && !b.text.trim()) {
          event.preventDefault();
          palette("insert", true);
          return;
        }
        if (
          event.altKey &&
          event.shiftKey &&
          (event.key === "ArrowUp" || event.key === "ArrowDown")
        ) {
          event.preventDefault();
          action(event.key === "ArrowUp" ? "move-up" : "move-down");
          focusBlock(b.id, selection.start);
          return;
        }
        if (event.key === "Tab" && b.kind === "code") {
          event.preventDefault();
          replaceSelection(editable, "  ");
          return;
        }
        if (event.key === "Enter" && !event.shiftKey && b.kind !== "code") {
          event.preventDefault();
          const fresh = createBlock(
            ["bullet", "numbered", "todo"].includes(b.kind) ? b.kind : "paragraph",
            b.text.slice(selection.end),
            doc().blocks.length,
          );
          fresh.marks = b.marks
            .filter((m) => m.end > selection.end)
            .map((m) => ({
              ...m,
              start: Math.max(0, m.start - selection.end),
              end: m.end - selection.end,
            }));
          commit("Split block", (d) => {
            replaceText(b, b.text.slice(0, selection.start));
            d.blocks.splice(d.blocks.indexOf(b) + 1, 0, fresh);
          });
          selected = fresh.id;
          focusBlock(fresh.id, 0);
          return;
        }
        if (event.key === "Enter" && b.kind === "code") {
          event.preventDefault();
          replaceSelection(editable, "\n");
          return;
        }
        if (event.key === "Backspace" && selection.start === 0 && selection.end === 0) {
          if (b.kind === "table" || b.kind === "image") return;
          const index = doc().blocks.indexOf(b),
            previous = doc().blocks[index - 1];
          if (previous?.kind === "divider") {
            event.preventDefault();
            commit("Removed divider", (d) => removeBlock(d, previous.id));
            focusBlock(b.id, 0);
            return;
          }
          if (previous && previous.kind !== "table" && previous.kind !== "image") {
            event.preventDefault();
            const offset = previous.text.length;
            commit("Joined blocks", (d) => {
              previous.text += b.text;
              previous.marks.push(
                ...b.marks.map((m) => ({ ...m, start: m.start + offset, end: m.end + offset })),
              );
              removeBlock(d, b.id);
            });
            selected = previous.id;
            focusBlock(previous.id, offset);
          }
          return;
        }
      } else if (
        mode === "canvas" &&
        (event.key === "Delete" || event.key === "Backspace") &&
        event.composedPath().some((node) => node === $("#documents-canvas"))
      ) {
        event.preventDefault();
        action("canvas-delete");
      }
    },
    { signal },
  );
  $("#documents-blocks").addEventListener(
    "dragstart",
    (event) => {
      const drag = event as DragEvent;
      const handle = (event.target as Element).closest<HTMLElement>('[draggable="true"]');
      const row = handle?.closest<HTMLElement>("[data-block]");
      if (!row) return;
      dragBlock = row.dataset.block!;
      drag.dataTransfer?.setData("application/x-documents-block", dragBlock);
      if (drag.dataTransfer) drag.dataTransfer.effectAllowed = "move";
      row.classList.add("is-dragging");
    },
    { signal },
  );
  $("#documents-blocks").addEventListener(
    "dragover",
    (event) => {
      if (!dragBlock) return;
      event.preventDefault();
      const row = (event.target as Element).closest<HTMLElement>("[data-block]");
      root
        .querySelectorAll(".documents-block.is-drop-target")
        .forEach((node) => node.classList.remove("is-drop-target"));
      row?.classList.add("is-drop-target");
    },
    { signal },
  );
  $("#documents-blocks").addEventListener(
    "drop",
    (event) => {
      if (!dragBlock) return;
      event.preventDefault();
      const row = (event.target as Element).closest<HTMLElement>("[data-block]");
      const moving = dragBlock;
      dragBlock = null;
      if (!row || row.dataset.block === moving) return;
      const rect = row.getBoundingClientRect();
      const after = (event as DragEvent).clientY > rect.top + rect.height / 2;
      commit("Moved block", (d) => {
        const item = d.blocks.find((b) => b.id === moving);
        if (!item) return;
        d.blocks = d.blocks.filter((b) => b !== item);
        const index = d.blocks.findIndex((b) => b.id === row.dataset.block);
        d.blocks.splice(index + (after ? 1 : 0), 0, item);
      });
    },
    { signal },
  );
  $("#documents-blocks").addEventListener(
    "dragend",
    () => {
      dragBlock = null;
      root
        .querySelectorAll(".is-dragging,.is-drop-target")
        .forEach((node) => node.classList.remove("is-dragging", "is-drop-target"));
    },
    { signal },
  );
  $("#documents-command").addEventListener(
    "ui-command-select",
    (event) => {
      const value = (event as CustomEvent<{ value: string }>).detail.value;
      $<UIDialog>("#documents-palette").dismiss();
      if (paletteMode === "insert") {
        const entry = blockKinds.find((k) => k.kind === value);
        if (entry) {
          const b = block(insertAfter);
          if ($<UICommand>("#documents-command").dataset.convert === "true" && b)
            convertBlock(b, entry.kind);
          else addBlock(entry.kind, insertAfter);
        }
      } else if (value.startsWith("page:")) navigate(value.slice(5));
      else if (value.startsWith("action:")) action(value.slice(7));
    },
    { signal },
  );
  $("#documents-prompt-value").addEventListener("ui-input-enter", () => action("submit-prompt"), {
    signal,
  });
  $("#documents-import-file").addEventListener(
    "change",
    async () => {
      const input = $<HTMLInputElement>("#documents-import-file"),
        file = input.files?.[0];
      input.value = "";
      if (!file) return;
      try {
        const imported = parseNotebook(await file.text());
        if (cleaned) return;
        prompt(
          "Replace notebook",
          "",
          () => {
            history.transact((state) => {
              state.documents = imported.documents;
              state.active = imported.active;
            });
            selected = null;
            persist();
            renderDocument();
            announce("Imported notebook. Undo restores the previous workspace.");
          },
          `Import ${imported.documents.length} pages from ${file.name}? Your current notebook can be restored with Undo.`,
        );
        $<UIInput>("#documents-prompt-value").hidden = true;
      } catch (error) {
        announce(error instanceof Error ? error.message : "This notebook could not be imported.");
      }
    },
    { signal },
  );
  $("#documents-image-file").addEventListener(
    "change",
    async () => {
      const input = $<HTMLInputElement>("#documents-image-file"),
        file = input.files?.[0],
        id = selected;
      input.value = "";
      if (!file || !id) return;
      if (file.size > 1_000_000) {
        announce("Choose an image smaller than 1 MB, or use an image URL.");
        return;
      }
      const reader = new FileReader();
      reader.addEventListener(
        "load",
        () => {
          if (cleaned) return;
          const b = block(id),
            source = String(reader.result);
          if (b && safeImage(source))
            commit("Added image", () => {
              b.source = source;
            });
          else announce("Choose a PNG, JPEG, WebP, or GIF image.");
        },
        { once: true },
      );
      reader.readAsDataURL(file);
    },
    { signal },
  );
  subscribeNotebook(
    (incoming) => {
      if (writing || cleaned) return;
      const active = history.state.active;
      const restore = retainFocus();
      const previous = structuredClone(history.state);
      const merged = mergeNotebooks(previous, baseline, incoming);
      history.rebase((snapshot) => {
        const rebased = mergeNotebooks(merged, previous, snapshot);
        if (rebased.documents.some((page) => page.id === active)) rebased.active = active;
        return rebased;
      });
      baseline = structuredClone(incoming);
      const missing =
        options.embedded && !incoming.documents.some((page) => page.id === activeDocument);
      $(".documents-layout").hidden = !!missing;
      root.querySelector(".documents-missing")?.remove();
      if (missing) {
        const message = element(
          "p",
          "documents-missing",
          "This source document was removed. Your issue still keeps its last saved summary.",
        );
        root.append(message);
        return;
      }
      if (options.embedded && activeDocument) history.state.active = activeDocument;
      renderDocument();
      restore();
    },
    { signal },
  );
  renderDocument();
  setMode("document");
  if (activeBlock && block(activeBlock)) {
    selected = activeBlock;
    renderDocument();
    requestAnimationFrame(() => {
      if (!cleaned) focusBlock(activeBlock);
    });
  }
  if (loadError) announce(loadError);
  const dispose = (): void => {
    if (cleaned) return;
    cleaned = true;
    controller.abort();
    clearTimeout(saveTimer);
    flush();
    canvas.destroy();
    root.replaceChildren();
    root.classList.remove(
      "documents-app",
      "documents-embedded",
      "hide-inspector",
      "hide-sidebar",
      "show-inspector",
      "show-sidebar",
    );
    delete root.dataset.view;
  };
  return Object.assign(dispose, { flush });
}
