import { CommandRegistry, type CommandDefinition } from "@mash/ui/command";
import type { UIDock, DockLayout, DockNode, DockTabs } from "@mash/ui/dock";
import type { UIDockPanel } from "@mash/ui/dock-panel";
import type { UIEditor } from "@mash/ui/editor";
import type { UIInput } from "@mash/ui/input";
import type { UIDialog } from "@mash/ui/dialog";
import type { UITabs } from "@mash/ui/tabs";
import type { UICommand } from "@mash/ui/command-palette";
import type { UITreeItem } from "@mash/ui/tree-item";
import type { UIResizablePanel } from "@mash/ui/resizable";
import type { UIButton } from "@mash/ui/button";
import "@mash/ui/dock";
import "@mash/ui/dock-panel";
import "@mash/ui/editor";
import "@mash/ui/tree";
import "@mash/ui/tabs";
import "@mash/ui/command-palette";
import "@mash/ui/menu";
import "@mash/ui/resizable";
import "@mash/ui/button";
import "@mash/ui/input";
import "@mash/ui/dialog";
import "@mash/ui/gesture-binding";
import "@mash/ui/toast";
import "@mash/ui/toast-stack";
import "@mash/ui/kbd";
import "@mash/ui/icon";
import "@mash/ui/switch";
import { type UISelect } from "@mash/ui/select";
import "@mash/ui/select";
import "./studio.css";
import {
  StudioModel,
  basename,
  parentPath,
  language,
  dirty,
  searchFiles,
  diffLines,
  readProject,
  type StudioEntry,
  type StudioSnapshot,
  type SearchHit,
} from "./studio-model.js";
import { seedStudio } from "./studio-seed.js";
import { createRunner, previewDocument, type RuntimeMessage } from "./studio-runtime.js";

const storageKey = "mash-story-studio-v1";
const icon = (name: string, slot = "") =>
  `<ui-icon name="${name}"${slot ? ` slot="${slot}"` : ""} label=""></ui-icon>`;
const action = (command: string, label: string, glyph?: string) =>
  `<ui-button size="small" variant="ghost" data-command="${command}" aria-label="${label}" title="${label}">${glyph ? icon(glyph) : label}</ui-button>`;
const groups = (node: DockNode | null): DockTabs[] =>
  node ? (node.type === "tabs" ? [node] : node.children.flatMap(groups)) : [];
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
function loadState(): StudioSnapshot {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? readProject(JSON.parse(saved)) : seedStudio();
  } catch {
    return seedStudio();
  }
}

/** Mount an independent local coding workspace; leaving the Story releases every owned resource. */
export async function mount(root: HTMLElement): Promise<() => void> {
  const studio = new Studio(root);
  await studio.start();
  return () => studio.destroy();
}
class Studio {
  readonly root: HTMLElement;
  readonly surface = element("section", "studio");
  readonly model = new StudioModel(loadState());
  readonly abort = new AbortController();
  readonly commands = new CommandRegistry<Studio>();
  readonly editors = new Map<string, UIEditor>();
  readonly panels = new Map<string, UIDockPanel>();
  readonly treeNodes = new Map<string, UITreeItem>();
  readonly expanded = new Set<string>();
  readonly closed: string[] = [];
  readonly urls = new Set<string>();
  readonly timers = new Set<ReturnType<typeof setTimeout>>();
  cleanups: (() => void)[] = [];
  selected = "";
  hits: SearchHit[] = [];
  disposed = false;
  syncing = false;
  running = false;
  saveTimer?: ReturnType<typeof setTimeout>;
  searchTimer?: ReturnType<typeof setTimeout>;
  treeTimer?: ReturnType<typeof setTimeout>;
  previewTimer?: ReturnType<typeof setTimeout>;
  modalAction?: (value: string) => void | Promise<void>;
  runner!: ReturnType<typeof createRunner>;
  constructor(root: HTMLElement) {
    this.root = root;
  }
  get state() {
    return this.model.state;
  }
  get dock() {
    return this.query<UIDock>("[data-dock]");
  }
  get current() {
    return this.state.entries.find(
      (entry) => entry.id === this.state.active && entry.kind === "file",
    );
  }
  query<T extends Element = HTMLElement>(selector: string): T {
    return this.surface.querySelector<T>(selector)!;
  }
  on(target: EventTarget, name: string, listener: EventListener) {
    target.addEventListener(name, listener, { signal: this.abort.signal });
  }
  later(callback: () => void, ms: number) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (!this.disposed) callback();
    }, ms);
    this.timers.add(timer);
    return timer;
  }
  async start() {
    this.surface.id = "studio-" + crypto.randomUUID();
    this.surface.dataset.mashCatalogue = "mash";
    this.surface.dataset.mashSize = "small";
    this.surface.setAttribute("aria-label", "Studio coding workspace");
    this.surface.tabIndex = -1;
    this.surface.innerHTML = `
      <header class="studio-titlebar"><span class="studio-emblem" aria-hidden="true">⌘</span><strong>Studio</strong><span class="studio-title-divider"></span><div class="studio-menus" data-menus></div><button class="studio-command-trigger" data-command="commands"><span>${icon("action.search")} Local workspace</span><ui-kbd shortcut="Primary+Shift+P" appearance="plain"></ui-kbd></button><div class="studio-title-actions">${action("sidebar", "Toggle sidebar", "navigation.menu")}${action("panel", "Toggle bottom panel", "object.document")}${action("preferences", "Preferences", "action.settings")}</div></header>
      <div class="studio-body"><nav class="studio-activity" aria-label="Workspace views">${action("files", "Explorer", "object.document")}${action("search", "Search files", "action.search")}${action("changes", "Changes", "object.layers")}<span class="studio-activity-space"></span>${action("commands", "Commands", "action.add")}</nav>
      <ui-resizable class="studio-split" label="Workspace columns"><ui-resizable-panel data-sidebar min="170" max="420" size="230"><div class="studio-sidebar-inner"><div class="studio-pane-title"><strong data-sidebar-title>EXPLORER</strong><div>${action("new-file", "New file", "action.add")}${action("new-folder", "New folder", "object.folder")}${action("file-actions", "File actions", "navigation.more.horizontal")}</div></div>
        <div data-view="files" class="studio-sidebar-content"><div class="studio-project-name">LOCAL WORKSPACE<span data-file-count></span></div><ui-tree data-tree label="Workspace files"></ui-tree><div class="studio-explorer-note">On this device<br><span>Export a project to keep a portable copy.</span></div></div>
        <div data-view="search" class="studio-sidebar-content" hidden><div class="studio-search-fields"><ui-input data-search label="Search files" placeholder="Search text"></ui-input><div class="studio-search-options"><ui-switch data-case>Match case</ui-switch><span data-search-count></span></div><ui-input data-replacement label="Replace with" placeholder="Replacement"></ui-input><div class="studio-search-options">${action("replace-all", "Replace all")}${action("undo-workspace", "Undo workspace edit")}</div></div><div data-results class="studio-search-results"></div></div>
        <div data-view="changes" class="studio-sidebar-content" hidden><p class="studio-sidebar-hint">Working text compared with your last saved baseline.</p><div class="studio-search-options">${action("save-all", "Save all")}${action("undo-workspace", "Undo workspace edit")}</div><div data-changes></div></div>
      </div></ui-resizable-panel><ui-resizable-handle label="Resize sidebar"></ui-resizable-handle><ui-resizable-panel data-main min="240"><ui-resizable class="studio-vertical" orientation="vertical" label="Editor and tools"><ui-resizable-panel data-editor-panel min="140"><div class="studio-editor-region"><div class="studio-breadcrumb"><span data-path>Welcome</span><div>${action("save", "Save file", "action.confirm")}${action("split", "Split editor", "action.add")}${action("reopen", "Reopen closed file", "action.reset")}<ui-button data-command="run" size="small" variant="ghost">${icon("action.play", "prefix")}Run</ui-button></div></div><ui-dock data-dock label="Open files"></ui-dock><div data-empty class="studio-empty" hidden><div class="studio-empty-mark">⌘</div><h2>A little room to build.</h2><p>Open a file, or start with something new.</p><div>${action("new-file", "New file")}${action("quick-open", "Open file")}</div><span>Drag tabs to split · Close without losing your draft</span></div></div></ui-resizable-panel><ui-resizable-handle label="Resize tools panel"></ui-resizable-handle><ui-resizable-panel data-bottom min="100" max="700" size="245"><ui-tabs data-tools variant="underline" size="small" value="output" label="Workspace tools"><ui-tab slot="tab" value="output">Output <span data-output-count></span></ui-tab><ui-tab slot="tab" value="preview">Preview</ui-tab><ui-tab slot="tab" value="diff">Diff</ui-tab><div slot="suffix" class="studio-tools-actions">${action("panel", "Hide tools panel", "action.dismiss")}</div>
          <ui-tab-panel slot="panel" value="output"><div class="studio-tool-toolbar"><span data-runtime-state>Standalone JavaScript · isolated worker</span><div>${action("run", "Run file")}${action("stop", "Stop execution")}${action("clear-output", "Clear output")}</div></div><div data-output class="studio-output" role="log" aria-label="Execution output"><p class="studio-output-empty">Run demo.js to see real output. No server or terminal is connected.</p></div></ui-tab-panel>
          <ui-tab-panel slot="panel" value="preview"><div class="studio-tool-toolbar"><span data-preview-title>index.html</span><div><ui-switch data-live-preview checked size="small">Live</ui-switch><ui-select data-preview-width label="Preview device" value="100%" size="small"><ui-option value="100%">Responsive</ui-option><ui-option value="390px">390px</ui-option><ui-option value="768px">768px</ui-option></ui-select>${action("preview", "Refresh preview")}</div></div><div class="studio-preview-wrap"><iframe data-preview title="Local HTML preview" sandbox="allow-scripts"></iframe></div></ui-tab-panel>
          <ui-tab-panel slot="panel" value="diff"><div class="studio-tool-toolbar"><span data-diff-title>Saved ↔ Working</span><div>${action("revert", "Revert file")}${action("save", "Save file")}</div></div><div data-diff class="studio-diff" aria-label="File changes"></div></ui-tab-panel>
        </ui-tabs></ui-resizable-panel></ui-resizable></ui-resizable-panel></ui-resizable></div>
      <footer class="studio-status"><span class="studio-local-indicator"></span><span data-persistence>Local workspace</span><button data-command="changes" data-dirty-count>All saved</button><span class="studio-status-space"></span><span data-position>Ln 1, Col 1</span><button data-command="preferences" data-language>Text</button><span>UTF-8</span></footer>
      <ui-dialog data-palette-dialog label="Workspace commands" class="studio-palette-dialog"><ui-command data-palette label="Workspace commands" placeholder="Search commands and files…"></ui-command></ui-dialog>
      <ui-dialog data-file-dialog label="Workspace action" class="studio-file-dialog"><strong slot="title" data-modal-title></strong><p data-modal-description></p><form data-modal-form><label class="studio-field"><span data-modal-label>Path</span><input data-modal-input autocomplete="off" spellcheck="false" required></label><p data-modal-error role="alert" class="studio-form-error"></p><div class="studio-modal-actions"><ui-button data-modal-cancel type="button" variant="ghost">Cancel</ui-button><ui-button data-modal-submit type="submit" variant="primary">Create</ui-button></div></form></ui-dialog>
      <ui-dialog data-preferences label="Editor preferences" class="studio-preferences"><strong slot="title">Editor preferences</strong><p class="studio-muted">Shared by your open files. Saved on this device.</p><div class="studio-preference-row"><span>Font size</span><ui-select data-font label="Editor font size" size="small">${[11, 12, 13, 14, 16, 18, 20].map((size) => `<ui-option value="${size}">${size}px</ui-option>`).join("")}</ui-select></div><ui-switch data-wrap>Wrap long lines</ui-switch><ui-switch data-whitespace>Show whitespace</ui-switch><ui-button slot="close" variant="primary">Done</ui-button></ui-dialog>
      <input type="file" data-import multiple hidden><input type="file" data-project-import accept=".json,application/json" hidden><ui-toast-stack data-notices placement="bottom-end" limit="2" label="Workspace notifications"></ui-toast-stack>`;
    this.root.replaceChildren(this.surface);
    this.selected = this.state.active;
    for (const folder of this.state.entries.filter((entry) => entry.kind === "folder"))
      this.expanded.add(folder.id);
    this.registerCommands();
    this.bindEvents();
    this.runner = createRunner(this.surface, (message) => this.reportOutput(message));
    await this.syncWorkspace(true);
    if (this.disposed) return;
    this.setView("files");
    this.applyPreferences();
    this.refreshPreview(false);
    this.surface.focus({ preventScroll: true });
  }
  registerCommands() {
    const commands: CommandDefinition<Studio>[] = [
      {
        id: "new-file",
        label: "New file",
        group: "File",
        shortcut: "Primary+Alt+N",
        run: (s) => s.pathDialog("file"),
      },
      { id: "new-folder", label: "New folder", group: "File", run: (s) => s.pathDialog("folder") },
      {
        id: "rename",
        label: "Rename or move",
        group: "File",
        disabled: (s) => !s.selectedEntry,
        run: (s) => s.renameDialog(),
      },
      {
        id: "delete",
        label: "Delete selected",
        group: "File",
        disabled: (s) => !s.selectedEntry,
        run: (s) => s.deleteDialog(),
      },
      {
        id: "save",
        label: "Save file",
        group: "File",
        shortcut: "Primary+S",
        disabled: (s) => !s.current,
        run: (s) => s.saveCurrent(),
      },
      {
        id: "save-all",
        label: "Save all",
        group: "File",
        shortcut: "Primary+Shift+S",
        run: (s) => s.saveAll(),
      },
      {
        id: "import",
        label: "Import files",
        group: "File",
        run: (s) => {
          s.query<HTMLInputElement>("[data-import]").click();
        },
      },
      {
        id: "import-project",
        label: "Import project",
        group: "File",
        run: (s) => {
          s.query<HTMLInputElement>("[data-project-import]").click();
        },
      },
      {
        id: "export-file",
        label: "Download file",
        group: "File",
        disabled: (s) => !s.current,
        run: (s) => s.download(s.current!.content, basename(s.current!.path), "text/plain"),
      },
      {
        id: "export-project",
        label: "Export project",
        group: "File",
        run: (s) => s.exportProject(),
      },
      {
        id: "quick-open",
        label: "Open file",
        group: "File",
        shortcut: "Primary+P",
        run: (s) => s.openPalette(true),
      },
      {
        id: "search",
        label: "Search files",
        group: "Edit",
        shortcut: "Primary+Shift+F",
        run: (s) => s.setView("search"),
      },
      {
        id: "replace-all",
        label: "Replace all in files",
        group: "Edit",
        disabled: (s) => !s.hits.length,
        run: (s) => s.replaceAll(),
      },
      {
        id: "undo-workspace",
        label: "Undo workspace edit",
        group: "Edit",
        disabled: (s) => !s.model.history.length,
        run: async (s) => {
          if (s.model.undo()) {
            await s.syncWorkspace(true);
            s.notify("Workspace edit undone");
          }
        },
      },
      {
        id: "revert",
        label: "Revert file to saved",
        group: "Edit",
        disabled: (s) => !s.current || !dirty(s.current),
        run: (s) => s.revertDialog(),
      },
      { id: "files", label: "Explorer", group: "View", run: (s) => s.setView("files") },
      { id: "changes", label: "Changes", group: "View", run: (s) => s.setView("changes") },
      {
        id: "sidebar",
        label: "Toggle sidebar",
        group: "View",
        shortcut: "Primary+B",
        run: (s) => {
          s.state.preferences.sidebar = !s.state.preferences.sidebar;
          s.applyPreferences();
        },
      },
      {
        id: "panel",
        label: "Toggle tools panel",
        group: "View",
        shortcut: "Primary+J",
        run: (s) => {
          s.state.preferences.panel = !s.state.preferences.panel;
          s.applyPreferences();
        },
      },
      {
        id: "split",
        label: "Split editor",
        group: "View",
        disabled: (s) => s.state.open.length < 2,
        run: (s) => s.splitEditor(),
      },
      {
        id: "reopen",
        label: "Reopen closed file",
        group: "View",
        shortcut: "Primary+Shift+T",
        disabled: (s) => !s.closed.length,
        run: async (s) => {
          const id = s.closed.pop();
          if (id) await s.openFile(id);
        },
      },
      {
        id: "preferences",
        label: "Preferences",
        group: "View",
        run: (s) => {
          s.query<UIDialog>("[data-preferences]").show();
        },
      },
      {
        id: "run",
        label: "Run JavaScript file",
        group: "Run",
        shortcut: "Primary+Enter",
        disabled: (s) => !s.current || !/\.(m?js)$/.test(s.current.path),
        run: (s) => s.run(),
      },
      {
        id: "stop",
        label: "Stop execution",
        group: "Run",
        disabled: (s) => !s.running,
        run: (s) => s.stop(),
      },
      {
        id: "preview",
        label: "Refresh HTML preview",
        group: "Run",
        run: (s) => s.refreshPreview(true),
      },
      {
        id: "clear-output",
        label: "Clear output",
        group: "Run",
        run: (s) => {
          s.query("[data-output]").replaceChildren();
          s.query("[data-output-count]").textContent = "";
        },
      },
      {
        id: "commands",
        label: "Show commands",
        shortcut: "Primary+Shift+P",
        run: (s) => s.openPalette(false),
      },
      { id: "file-actions", label: "File actions", run: (s) => s.openPalette(false) },
    ];
    const registration = this.commands.register({ id: "studio", scope: "studio", commands });
    const connection = this.commands.connect(this.surface, {
      context: () => this,
      scopes: () => ["studio"],
      onError: (error) => this.notify(String(error), true),
    });
    this.cleanups.push(
      () => registration.destroy(),
      () => connection.destroy(),
    );
    for (const command of commands) {
      if (!command.shortcut) continue;
      const binding = document.createElement("ui-gesture-binding");
      binding.setAttribute("for", this.surface.id);
      binding.setAttribute("gesture", "key");
      binding.setAttribute("command", command.id);
      binding.setAttribute("shortcut", command.shortcut);
      this.surface.append(binding);
    }
    for (const group of ["File", "Edit", "View", "Run"]) {
      const menu = document.createElement("ui-menu");
      menu.label = group;
      const trigger = element("ui-button", "", group);
      trigger.slot = "trigger";
      trigger.size = "small";
      trigger.variant = "ghost";
      menu.append(trigger);
      for (const command of commands.filter((item) => item.group === group)) {
        const item = document.createElement("ui-menu-item");
        item.value = command.id;
        item.textContent = command.label!;
        if (command.shortcut) {
          const key = document.createElement("ui-kbd");
          key.slot = "shortcut";
          key.shortcut = command.shortcut;
          key.appearance = "plain";
          item.append(key);
        }
        menu.append(item);
      }
      this.query("[data-menus]").append(menu);
    }
  }
  get selectedEntry() {
    return this.state.entries.find((entry) => entry.id === this.selected) ?? this.current;
  }
  execute(id: string) {
    void this.commands
      .execute(id, ["studio"], this)
      .then(() => this.updateCommandStates())
      .catch((error) => this.notify(error instanceof Error ? error.message : String(error), true));
  }
  updateCommandStates() {
    for (const command of this.commands.resolve(["studio"], this)) {
      for (const button of this.surface.querySelectorAll<UIButton>(
        `ui-button[data-command="${command.id}"]`,
      ))
        button.disabled = command.disabled;
      for (const item of this.surface.querySelectorAll<HTMLElement>(
        `ui-menu-item[value="${command.id}"]`,
      ))
        item.toggleAttribute("disabled", command.disabled);
    }
  }
  bindEvents() {
    this.on(this.surface, "click", (event) => {
      const button = event
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement && node.hasAttribute("data-command"),
        );
      if (button) {
        this.execute(button.dataset.command!);
        return;
      }
    });
    this.on(this.surface, "ui-menu-select", (event) =>
      this.execute((event as CustomEvent<{ value: string }>).detail.value),
    );
    this.on(this.query("[data-tree]"), "ui-tree-select", (event) => {
      const id = (event as CustomEvent<{ value: string }>).detail.value;
      this.selected = id;
      const entry = this.state.entries.find((item) => item.id === id);
      if (entry?.kind === "file") void this.openFile(id);
      else {
        this.renderTree();
        this.updateCommandStates();
      }
    });
    this.on(this.query("[data-tree]"), "ui-tree-toggle", (event) => {
      const { value, expanded } = (event as CustomEvent<{ value: string; expanded: boolean }>)
        .detail;
      if (expanded) this.expanded.add(value);
      else this.expanded.delete(value);
    });
    this.on(this.dock, "ui-dock-change", (event) => {
      if (this.syncing) return;
      const layout = (event as CustomEvent<DockLayout>).detail;
      const open = groups(layout.root).flatMap((group) => group.panels);
      for (const id of this.state.open)
        if (!open.includes(id) && this.state.entries.some((entry) => entry.id === id)) {
          this.closed.push(id);
          if (this.closed.length > 30) this.closed.shift();
        }
      this.state.open = open;
      const previousGroups = this.state.layout
        ? groups((this.state.layout as DockLayout).root)
        : [];
      const activated = groups(layout.root).find((group) => {
        const previous = previousGroups.find((candidate) => candidate.id === group.id);
        return previous && previous.active !== group.active;
      });
      if (activated) this.state.active = activated.active;
      else if (!open.includes(this.state.active))
        this.state.active = groups(layout.root)[0]?.active ?? "";
      this.selected = this.state.active;
      this.state.layout = layout;
      this.syncStatus();
      this.renderTree();
      this.renderChanges();
      this.scheduleSave();
    });
    this.on(this.dock, "focusin", (event) => {
      const panel = event
        .composedPath()
        .find(
          (node): node is UIDockPanel =>
            node instanceof HTMLElement && node.localName === "ui-dock-panel",
        );
      if (panel && this.state.active !== panel.name) {
        this.state.active = panel.name;
        this.selected = panel.name;
        this.syncStatus();
        this.renderTree();
        this.renderDiff();
        this.scheduleSave();
      }
    });
    const activateFocusedTab = (event: Event) => {
      const tab = event
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement &&
            node.getAttribute("role") === "tab" &&
            node.hasAttribute("data-panel"),
        );
      if (!tab) return;
      const id = tab.dataset.panel!;
      if (!this.state.entries.some((entry) => entry.id === id)) return;
      this.state.active = id;
      this.selected = id;
      this.syncStatus();
      this.renderTree();
      this.renderDiff();
      this.scheduleSave();
    };
    this.on(this.dock, "click", activateFocusedTab);
    this.on(this.dock, "focusin", activateFocusedTab);
    for (const selector of ["[data-search]", "[data-replacement]"])
      this.on(this.query(selector), "input", () => {
        clearTimeout(this.searchTimer);
        this.searchTimer = this.later(() => this.renderSearch(), 100);
      });
    this.on(this.query("[data-case]"), "ui-switch-change", () => this.renderSearch());
    this.on(this.query("[data-palette]"), "ui-command-select", (event) => {
      const value = (event as CustomEvent<{ value: string }>).detail.value;
      this.query<UIDialog>("[data-palette-dialog]").dismiss();
      if (value.startsWith("file:")) void this.openFile(value.slice(5));
      else this.execute(value);
    });
    this.on(this.query("[data-modal-form]"), "submit", (event) => {
      event.preventDefault();
      void this.submitModal();
    });
    this.on(this.query("[data-modal-cancel]"), "click", () => {
      this.query<UIDialog>("[data-file-dialog]").dismiss();
      this.modalAction = undefined;
    });
    this.on(this.query("[data-wrap]"), "ui-switch-change", (event) => {
      this.state.preferences.wrap = (event as CustomEvent<{ checked: boolean }>).detail.checked;
      this.applyPreferences();
    });
    this.on(this.query("[data-whitespace]"), "ui-switch-change", (event) => {
      this.state.preferences.whitespace = (
        event as CustomEvent<{ checked: boolean }>
      ).detail.checked;
      this.applyPreferences();
    });
    this.on(this.query("[data-font]"), "ui-select-change", (event) => {
      this.state.preferences.fontSize = Number(
        (event as CustomEvent<{ value: string }>).detail.value,
      );
      this.applyPreferences();
    });
    this.on(this.query("[data-preview-width]"), "ui-select-change", (event) => {
      this.query<HTMLIFrameElement>("[data-preview]").style.width = (
        event as CustomEvent<{ value: string }>
      ).detail.value;
    });
    this.on(this.query("[data-live-preview]"), "ui-switch-change", (event) => {
      clearTimeout(this.previewTimer);
      if ((event as CustomEvent<{ checked: boolean }>).detail.checked) this.refreshPreview(false);
    });
    this.on(this.query("[data-import]"), "change", (event) => {
      const input = event.target as HTMLInputElement;
      void this.importFiles([...(input.files ?? [])]);
      input.value = "";
    });
    this.on(this.query("[data-project-import]"), "change", (event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (file) void this.importProject(file);
      input.value = "";
    });
    this.on(window, "pagehide", () => this.persist());
  }
  async syncWorkspace(restore = false) {
    if (this.disposed) return;
    this.syncing = true;
    const ids = new Set(
      this.state.entries.filter((entry) => entry.kind === "file").map((entry) => entry.id),
    );
    for (const [id, panel] of this.panels)
      if (!ids.has(id)) {
        panel.remove();
        this.panels.delete(id);
        this.editors.delete(id);
      }
    for (const id of this.state.open) {
      const file = this.state.entries.find((entry) => entry.id === id);
      if (file) this.ensureEditor(file);
    }
    for (const [id, editor] of this.editors) {
      const file = this.state.entries.find((entry) => entry.id === id);
      if (file) {
        if (editor.value !== file.content) editor.value = file.content;
        this.panels.get(id)!.label = basename(file.path) + (dirty(file) ? " •" : "");
        editor.label = file.path;
        editor.language = language(file.path);
      }
    }
    await this.dock.updateComplete;
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    if (this.disposed) return;
    if (restore) {
      const layout = this.state.layout;
      if (!layout || !this.dock.restoreLayout(layout))
        this.dock.restoreLayout({
          version: 1,
          root: this.state.open.length
            ? {
                type: "tabs",
                id: "main",
                panels: [...this.state.open],
                active: this.state.open.includes(this.state.active)
                  ? this.state.active
                  : this.state.open[0],
              }
            : null,
        });
    }
    this.syncing = false;
    this.state.layout = this.dock.getLayout();
    this.state.open = groups(this.dock.layout.root).flatMap((group) => group.panels);
    this.renderTree();
    this.renderChanges();
    this.renderSearch();
    this.syncStatus();
    this.applyPreferences();
    this.scheduleSave();
  }
  ensureEditor(file: StudioEntry): UIEditor {
    const existing = this.editors.get(file.id);
    if (existing) return existing;
    const panel = document.createElement("ui-dock-panel");
    panel.name = file.id;
    panel.label = basename(file.path) + (dirty(file) ? " •" : "");
    panel.closable = true;
    const editor = document.createElement("ui-editor");
    editor.label = file.path;
    editor.language = language(file.path);
    editor.value = file.content;
    editor.className = "studio-source";
    this.on(editor, "input", () => {
      const current = this.state.entries.find((entry) => entry.id === file.id);
      if (!current) return;
      current.content = editor.value;
      this.state.active = file.id;
      this.selected = file.id;
      panel.label = basename(current.path) + (dirty(current) ? " •" : "");
      this.syncStatus();
      this.scheduleSave();
      clearTimeout(this.treeTimer);
      this.treeTimer = this.later(() => {
        this.renderTree();
        this.renderChanges();
        this.renderSearch();
        this.renderDiff();
      }, 160);
      clearTimeout(this.previewTimer);
      if (this.query<HTMLElement & { checked: boolean }>("[data-live-preview]").checked)
        this.previewTimer = this.later(() => this.refreshPreview(false), 600);
    });
    this.on(editor, "ui-editor-selection-change", (event) => {
      const detail = (event as CustomEvent<{ startLine: number; startColumn: number }>).detail;
      this.query("[data-position]").textContent =
        `Ln ${detail.startLine}, Col ${detail.startColumn + 1}`;
    });
    this.on(editor, "ui-editor-command", (event) => {
      const command = (event as CustomEvent<{ command: string }>).detail.command;
      if (command === "find") {
        this.setView("search");
        editor.searchOpen = false;
      }
      if (command === "find-next" || command === "find-previous") this.setView("search");
    });
    panel.append(editor);
    this.panels.set(file.id, panel);
    this.editors.set(file.id, editor);
    this.dock.append(panel);
    this.configureEditor(editor);
    return editor;
  }
  async openFile(id: string, selection?: { start: number; end: number }) {
    const file = this.state.entries.find((entry) => entry.id === id && entry.kind === "file");
    if (!file) return;
    const editor = this.ensureEditor(file);
    let ancestor = parentPath(file.path);
    while (ancestor) {
      const folder = this.state.entries.find(
        (entry) => entry.kind === "folder" && entry.path === ancestor,
      );
      if (folder) this.expanded.add(folder.id);
      ancestor = parentPath(ancestor);
    }
    if (matchMedia("(max-width: 560px)").matches) {
      this.state.preferences.sidebar = false;
      this.applyPreferences();
    }
    await this.dock.updateComplete;
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    if (this.disposed) return;
    this.state.active = id;
    this.selected = id;
    this.dock.openPanel(id);
    await editor.updateComplete;
    editor.focus();
    if (selection) editor.setSelectionRange(selection.start, selection.end);
    this.syncStatus();
    this.renderTree();
    this.renderDiff();
    this.scheduleSave();
  }
  renderTree() {
    const tree = this.query("[data-tree]");
    const entries = [...this.state.entries].sort((a, b) =>
      a.kind === b.kind ? a.path.localeCompare(b.path) : a.kind === "folder" ? -1 : 1,
    );
    const live = new Set(entries.map((entry) => entry.id));
    for (const [id, node] of this.treeNodes)
      if (!live.has(id)) {
        node.remove();
        this.treeNodes.delete(id);
      }
    for (const entry of entries) {
      let item = this.treeNodes.get(entry.id);
      if (!item) {
        item = document.createElement("ui-tree-item");
        item.value = entry.id;
        this.treeNodes.set(entry.id, item);
      }
      item.title = basename(entry.path) + (dirty(entry) ? " •" : "");
      item.kind = entry.kind === "folder" ? "folder" : "file";
      item.selected = entry.id === this.selected;
      item.expanded = this.expanded.has(entry.id);
      item.size = "small";
    }
    for (const entry of entries) {
      const item = this.treeNodes.get(entry.id)!;
      const parent = this.state.entries.find(
        (candidate) => candidate.path === parentPath(entry.path) && candidate.kind === "folder",
      );
      const target = parent ? this.treeNodes.get(parent.id)! : tree;
      item.slot = parent ? "children" : "";
      if (item.parentElement !== target) target.append(item);
    }
    this.query("[data-file-count]").textContent = String(
      entries.filter((entry) => entry.kind === "file").length,
    );
  }
  setView(view: "files" | "search" | "changes") {
    this.state.preferences.sidebar = true;
    this.applyPreferences();
    this.query("[data-sidebar-title]").textContent = {
      files: "EXPLORER",
      search: "SEARCH",
      changes: "CHANGES",
    }[view];
    for (const panel of this.surface.querySelectorAll<HTMLElement>("[data-view]"))
      panel.hidden = panel.dataset.view !== view;
    for (const button of this.surface.querySelectorAll<UIButton>(".studio-activity [data-command]"))
      button.selected = button.dataset.command === view;
    if (view === "search") {
      this.renderSearch();
      this.query<UIInput>("[data-search]").focus();
    }
    if (view === "changes") {
      this.renderChanges();
      this.showTool("diff");
      this.renderDiff();
    }
  }
  renderSearch() {
    const query = this.query<UIInput>("[data-search]").value;
    const matchCase = this.query<HTMLElement & { checked: boolean }>("[data-case]").checked;
    this.hits = searchFiles(this.state.entries, query, matchCase);
    this.query("[data-search-count]").textContent = query
      ? `${this.hits.length}${this.hits.length === 2000 ? "+" : ""} matches`
      : "";
    const results = this.query("[data-results]");
    results.replaceChildren();
    if (query && !this.hits.length)
      results.append(element("p", "studio-sidebar-hint", "No matches in your files."));
    for (const hit of this.hits.slice(0, 200)) {
      const row = element("button", "studio-result");
      row.type = "button";
      row.append(
        element("span", "studio-result-path", `${hit.path}:${hit.line}`),
        element("code", "", hit.excerpt),
      );
      row.addEventListener("click", () => void this.openFile(hit.id, hit), {
        signal: this.abort.signal,
      });
      results.append(row);
    }
    if (this.hits.length > 200)
      results.append(
        element(
          "p",
          "studio-sidebar-hint",
          "Showing the first 200 matches. Narrow your search to see more.",
        ),
      );
    this.updateCommandStates();
  }
  replaceAll() {
    const query = this.query<UIInput>("[data-search]").value;
    if (!query) return;
    const replacement = this.query<UIInput>("[data-replacement]").value;
    const caseSensitive = this.query<HTMLElement & { checked: boolean }>("[data-case]").checked;
    const hits = searchFiles(this.state.entries, query, caseSensitive);
    if (hits.length === 2000) {
      this.notify("Narrow your search before replacing more than 2,000 matches.", true);
      return;
    }
    this.modal(
      "Replace across files",
      `${hits.length} matches will be replaced. This workspace edit can be undone.`,
      "Replace all",
      undefined,
      async () => {
        this.model.checkpoint();
        for (const file of this.state.entries) {
          const matches = hits
            .filter((hit) => hit.id === file.id)
            .sort((a, b) => b.start - a.start);
          for (const match of matches)
            file.content =
              file.content.slice(0, match.start) + replacement + file.content.slice(match.end);
        }
        await this.syncWorkspace();
        this.notify(`Replaced ${hits.length} matches`);
      },
    );
  }
  renderChanges() {
    const list = this.query("[data-changes]");
    list.replaceChildren();
    const changed = this.state.entries.filter(dirty);
    for (const file of changed) {
      const row = element("button", "studio-change-row");
      row.type = "button";
      row.append(
        element("span", "", basename(file.path)),
        element(
          "span",
          file.saved === null ? "studio-added" : "studio-modified",
          file.saved === null ? "A" : "M",
        ),
      );
      row.title = file.path;
      row.addEventListener(
        "click",
        () => {
          void this.openFile(file.id).then(() => {
            this.showTool("diff");
            this.renderDiff();
          });
        },
        { signal: this.abort.signal },
      );
      list.append(row);
    }
    for (const file of this.state.deleted) {
      const row = element("div", "studio-change-row");
      row.append(element("span", "", file.path), element("span", "studio-removed", "D"));
      list.append(row);
    }
    if (!changed.length && !this.state.deleted.length)
      list.append(element("p", "studio-sidebar-hint", "No changes since your last save."));
    this.renderDiff();
  }
  renderDiff() {
    const file = this.current;
    const target = this.query("[data-diff]");
    target.replaceChildren();
    this.query("[data-diff-title]").textContent = file
      ? `${file.path} · Saved ↔ Working`
      : "Saved ↔ Working";
    if (!file) {
      target.append(element("p", "studio-sidebar-hint", "Open a file to review its changes."));
      return;
    }
    if (!dirty(file)) {
      target.append(element("p", "studio-sidebar-hint", "This file matches its saved baseline."));
      return;
    }
    const lines = diffLines(file.saved ?? "", file.content);
    const fragment = document.createDocumentFragment();
    for (const line of lines.slice(0, 3000)) {
      const row = element("div", "studio-diff-line studio-diff-" + line.kind);
      row.append(
        element("span", "studio-line-number", String(line.before ?? "")),
        element("span", "studio-line-number", String(line.after ?? "")),
        element(
          "span",
          "studio-diff-sign",
          line.kind === "add" ? "+" : line.kind === "remove" ? "−" : " ",
        ),
        element("code", "", line.text || " "),
      );
      fragment.append(row);
    }
    target.append(fragment);
    if (lines.length > 3000)
      target.append(
        element(
          "p",
          "studio-sidebar-hint",
          "Diff display is limited to 3,000 lines. Download the file for the complete text.",
        ),
      );
  }
  syncStatus() {
    this.query("[data-path]").textContent = this.current?.path ?? "No file open";
    this.query("[data-language]").textContent = this.current ? language(this.current.path) : "Text";
    const count = this.state.entries.filter(dirty).length + this.state.deleted.length;
    this.query("[data-dirty-count]").textContent = count ? `${count} changed` : "All saved";
    this.query<HTMLElement>("[data-empty]").hidden = this.state.open.length > 0;
    this.dock.hidden = this.state.open.length === 0;
    this.updateCommandStates();
  }
  configureEditor(editor: UIEditor) {
    const preferences = this.state.preferences;
    editor.softWrap = preferences.wrap;
    editor.showWhitespace = preferences.whitespace;
    editor.style.setProperty("--type-code-font-size", preferences.fontSize + "px");
    editor.style.setProperty(
      "--type-code-line-height",
      Math.round(preferences.fontSize * 1.65) + "px",
    );
    editor.requestUpdate();
  }
  applyPreferences() {
    const preferences = this.state.preferences;
    this.query<UIResizablePanel>("[data-sidebar]").visible = preferences.sidebar;
    this.query<UIResizablePanel>("[data-bottom]").visible = preferences.panel;
    this.query<UISelect>("[data-font]").value = String(preferences.fontSize);
    this.query<HTMLElement & { checked: boolean }>("[data-wrap]").checked = preferences.wrap;
    this.query<HTMLElement & { checked: boolean }>("[data-whitespace]").checked =
      preferences.whitespace;
    for (const editor of this.editors.values()) this.configureEditor(editor);
    this.scheduleSave();
  }
  showTool(name: string) {
    this.state.preferences.panel = true;
    this.applyPreferences();
    this.query<UITabs>("[data-tools]").value = name;
  }
  splitEditor() {
    const group = groups(this.dock.layout.root).find((item) =>
      item.panels.includes(this.state.active),
    );
    if (!group) return;
    const target = group.panels.find((id) => id !== this.state.active);
    if (target) this.dock.movePanel(target, group.id, "right");
    else this.notify("Open another file in this group to split it.");
  }
  openPalette(filesOnly: boolean) {
    const palette = this.query<UICommand>("[data-palette]");
    palette.replaceChildren();
    palette.query = "";
    palette.placeholder = filesOnly ? "Go to a file…" : "Search commands and files…";
    if (!filesOnly)
      for (const command of this.commands.resolve(["studio"], this).filter((item) => item.group)) {
        const item = document.createElement("ui-command-item");
        item.value = command.id;
        item.textContent = command.label!;
        item.disabled = command.disabled;
        const description = element("span", "", command.group ?? "");
        description.slot = "description";
        item.append(description);
        if (command.shortcut) {
          const key = document.createElement("ui-kbd");
          key.slot = "shortcut";
          key.shortcut = command.shortcut;
          key.appearance = "plain";
          item.append(key);
        }
        palette.append(item);
      }
    for (const file of this.state.entries.filter((entry) => entry.kind === "file")) {
      const item = document.createElement("ui-command-item");
      item.value = "file:" + file.id;
      item.textContent = file.path;
      item.keywords = "file document " + language(file.path);
      palette.append(item);
    }
    const empty = element("p", "studio-sidebar-hint", "No matching commands or files.");
    empty.slot = "empty";
    palette.append(empty);
    const dialog = this.query<UIDialog>("[data-palette-dialog]");
    dialog.show();
    void dialog.updateComplete.then(() => palette.focus());
  }
  pathDialog(kind: StudioEntry["kind"]) {
    const parent =
      this.selectedEntry?.kind === "folder"
        ? this.selectedEntry.path
        : parentPath(this.selectedEntry?.path ?? "");
    this.modal(
      kind === "file" ? "New file" : "New folder",
      "Paths are relative to this workspace. Nested folders are created automatically.",
      "Create",
      parent ? parent + "/" : "",
      async (path) => {
        const snapshot = structuredClone(this.state);
        this.model.checkpoint();
        try {
          const entry = this.model.create(path, kind);
          if (kind === "folder") this.expanded.add(entry.id);
          this.selected = entry.id;
          await this.syncWorkspace();
          if (kind === "file") await this.openFile(entry.id);
          this.notify(`${kind === "file" ? "File" : "Folder"} created`);
        } catch (error) {
          this.model.state = snapshot;
          this.model.history.pop();
          throw error;
        }
      },
    );
  }
  renameDialog() {
    const entry = this.selectedEntry;
    if (!entry) return;
    this.modal("Rename or move", entry.path, "Rename", entry.path, async (path) => {
      const snapshot = structuredClone(this.state);
      this.model.checkpoint();
      try {
        this.model.rename(entry.id, path);
        await this.syncWorkspace();
        this.notify("Path updated");
      } catch (error) {
        this.model.state = snapshot;
        this.model.history.pop();
        throw error;
      }
    });
  }
  deleteDialog() {
    const entry = this.selectedEntry;
    if (!entry) return;
    this.modal(
      `Delete ${basename(entry.path)}?`,
      entry.kind === "folder"
        ? "This removes the folder and its contents. Undo workspace edit restores them."
        : "The file and its draft will be removed. Undo workspace edit restores them.",
      "Delete",
      undefined,
      async () => {
        this.model.checkpoint();
        this.model.remove(entry.id);
        this.selected = this.state.active;
        await this.syncWorkspace(true);
        this.notify("Removed · Undo workspace edit restores it");
      },
    );
  }
  revertDialog() {
    const file = this.current;
    if (!file) return;
    this.modal(
      "Revert working changes?",
      file.saved === null
        ? "This new file will become empty. Undo workspace edit restores the draft."
        : "Replace this draft with its last saved text. Undo workspace edit restores the draft.",
      "Revert",
      undefined,
      async () => {
        this.model.checkpoint();
        file.content = file.saved ?? "";
        await this.syncWorkspace();
        this.notify("File reverted");
      },
    );
  }
  modal(
    title: string,
    description: string,
    submit: string,
    initial: string | undefined,
    callback: (value: string) => void | Promise<void>,
  ) {
    this.modalAction = callback;
    this.query("[data-modal-title]").textContent = title;
    this.query("[data-modal-description]").textContent = description;
    this.query("[data-modal-submit]").textContent = submit;
    this.query("[data-modal-error]").textContent = "";
    const input = this.query<HTMLInputElement>("[data-modal-input]");
    input.closest<HTMLElement>("label")!.hidden = initial === undefined;
    input.required = initial !== undefined;
    input.value = initial ?? "";
    const dialog = this.query<UIDialog>("[data-file-dialog]");
    dialog.label = title;
    dialog.show();
    void dialog.updateComplete.then(() => {
      if (initial !== undefined) {
        input.focus();
        input.setSelectionRange(0, input.value.length);
      }
    });
  }
  async submitModal() {
    try {
      await this.modalAction?.(this.query<HTMLInputElement>("[data-modal-input]").value);
      this.query<UIDialog>("[data-file-dialog]").dismiss();
      this.modalAction = undefined;
    } catch (error) {
      this.query("[data-modal-error]").textContent =
        error instanceof Error ? error.message : String(error);
    }
  }
  saveCurrent() {
    const file = this.current;
    if (!file) return;
    file.saved = file.content;
    void this.syncWorkspace();
    this.persist();
    this.notify(`${basename(file.path)} saved locally`);
  }
  saveAll() {
    for (const file of this.state.entries) if (file.kind === "file") file.saved = file.content;
    this.state.deleted = [];
    void this.syncWorkspace();
    this.persist();
    this.notify("All files saved locally");
  }
  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = this.later(() => this.persist(), 400);
  }
  persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(this.state));
      this.query("[data-persistence]").textContent = "Drafts stored on this device";
    } catch {
      this.query("[data-persistence]").textContent = "Storage full · export to keep your work";
    }
  }
  download(content: string, filename: string, mime: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    this.urls.add(url);
    const anchor = element("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    this.surface.append(anchor);
    anchor.click();
    anchor.remove();
    this.later(() => {
      URL.revokeObjectURL(url);
      this.urls.delete(url);
    }, 1000);
  }
  exportProject() {
    this.state.layout = this.dock.getLayout();
    this.download(JSON.stringify(this.state, null, 2), "studio-project.json", "application/json");
    this.notify("Project exported");
  }
  async importFiles(files: File[]) {
    if (!files.length) return;
    try {
      if (files.length + this.state.entries.length > 300)
        throw new Error("A workspace supports up to 300 files and folders.");
      const read = await Promise.all(
        files.map(async (file) => {
          if (file.size > 1_000_000)
            throw new Error(`${file.name} exceeds the 1 MB text-file limit.`);
          const content = await file.text();
          if (content.includes("\u0000"))
            throw new Error(`${file.name} appears to be binary. Import text files only.`);
          return { path: file.webkitRelativePath || file.name, content };
        }),
      );
      if (this.disposed) return;
      const snapshot = structuredClone(this.state);
      this.model.checkpoint();
      try {
        for (const file of read) {
          let path = file.path;
          let suffix = 1;
          while (this.state.entries.some((entry) => entry.path === path))
            path = file.path.replace(/(\.[^/.]+)?$/, `-${suffix++}$1`);
          const entry = this.model.create(path, "file", file.content);
          entry.saved = entry.content;
        }
        readProject(this.state);
      } catch (error) {
        this.model.state = snapshot;
        this.model.history.pop();
        throw error;
      }
      await this.syncWorkspace();
      this.notify(`Imported ${read.length} text files`);
    } catch (error) {
      this.notify(error instanceof Error ? error.message : String(error), true);
    }
  }
  async importProject(file: File) {
    try {
      if (file.size > 8_000_000) throw new Error("Project file is too large.");
      const state = readProject(JSON.parse(await file.text()));
      if (this.disposed) return;
      this.modal(
        "Open imported project?",
        "This replaces the current local workspace. Undo workspace edit restores it.",
        "Open project",
        undefined,
        async () => {
          this.model.checkpoint();
          this.model.state = state;
          this.closed.length = 0;
          await this.syncWorkspace(true);
          this.refreshPreview(false);
          this.notify("Project opened");
        },
      );
    } catch (error) {
      this.notify(error instanceof Error ? error.message : String(error), true);
    }
  }
  run() {
    const file = this.current;
    if (!file || !/\.(m?js)$/.test(file.path)) return;
    this.showTool("output");
    this.running = true;
    this.query("[data-runtime-state]").textContent = `Running ${file.path} · 10 second limit`;
    this.query(".studio-output-empty")?.remove();
    this.reportOutput({ kind: "info", text: `› ${file.path}` });
    this.runner.run(file.content);
    this.updateCommandStates();
  }
  stop() {
    this.runner.stop();
    this.running = false;
    this.reportOutput({ kind: "warn", text: "Execution stopped." });
    this.query("[data-runtime-state]").textContent = "Stopped · isolated worker";
    this.updateCommandStates();
  }
  reportOutput(message: RuntimeMessage) {
    if (this.disposed) return;
    if (message.kind === "done") {
      this.running = false;
      this.query("[data-runtime-state]").textContent = message.text;
      this.updateCommandStates();
      return;
    }
    const output = this.query("[data-output]");
    output.append(element("pre", "studio-log studio-log-" + message.kind, message.text));
    while (output.children.length > 300) output.firstElementChild?.remove();
    output.scrollTop = output.scrollHeight;
    this.query("[data-output-count]").textContent = String(output.children.length);
  }
  refreshPreview(show: boolean) {
    const html = this.current?.path.endsWith(".html")
      ? this.current
      : (this.state.entries.find((entry) => entry.path === "index.html") ??
        this.state.entries.find((entry) => entry.path.endsWith(".html")));
    if (show) this.showTool("preview");
    const frame = this.query<HTMLIFrameElement>("[data-preview]");
    if (!html) {
      frame.srcdoc =
        "<!doctype html><p style='font:14px system-ui;padding:24px'>Create an HTML file to preview it here.</p>";
      this.query("[data-preview-title]").textContent = "No HTML file";
      return;
    }
    this.query("[data-preview-title]").textContent = html.path + " · sandbox";
    frame.srcdoc = previewDocument(html, this.state.entries);
  }
  notify(message: string, error = false) {
    if (this.disposed) return;
    const stack = this.query("[data-notices]");
    const toast = document.createElement("ui-toast");
    toast.textContent = message;
    toast.tone = error ? "critical" : "neutral";
    toast.duration = 3600;
    toast.open = true;
    stack.append(toast);
    while (stack.children.length > 3) stack.firstElementChild?.remove();
    this.later(() => toast.remove(), 4200);
  }
  destroy() {
    if (this.disposed) return;
    this.persist();
    this.disposed = true;
    this.abort.abort();
    this.runner?.destroy();
    this.commands.abort();
    for (const cleanup of this.cleanups) cleanup();
    for (const timer of this.timers) clearTimeout(timer);
    for (const url of this.urls) URL.revokeObjectURL(url);
    for (const dialog of this.surface.querySelectorAll<UIDialog>("ui-dialog")) dialog.dismiss();
    this.surface.remove();
    this.editors.clear();
    this.panels.clear();
    this.treeNodes.clear();
  }
}
