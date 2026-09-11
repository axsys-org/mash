import "@mash/ui/button";
import { registerIcon } from "@mash/ui/icon";
import "@mash/ui/kbd";
import "@mash/ui/slider";
import "@mash/ui/calendar";
import { type UIDialog } from "@mash/ui/dialog";
import "@mash/ui/dialog";
import { type UICommand, type CommandItem } from "@mash/ui/command-palette";
import "@mash/ui/command-palette";
import { DragController, leftTopDragPositioner, type DragEventDetail } from "@mash/ui/drag";
import { type UIResizableHandle, type ResizeDetail } from "@mash/ui/resizable";
import "@mash/ui/resizable";
import { motionTiming } from "@mash/ui/motion";
import {
  desktopApps,
  readDesktop,
  saveDesktop,
  createWindow,
  layoutDesktop,
  clampRect,
  type DesktopAppId,
  type DesktopWindow,
  type DesktopSplit,
  type Rect,
} from "./desktop-model.js";
import {
  desktopChannel,
  isDesktopMessage,
  shortcutAction,
  type DesktopAction,
  type DesktopMessage,
} from "./desktop-bridge.js";
import { escape } from "./shared.js";
import { readNotebook } from "./documents-store.js";
import "./desktop.css";

const icon = (name: string) => `<ui-icon name="${name}" aria-hidden="true"></ui-icon>`;
const labels = { dwindle: "Dwindle", master: "Master", columns: "Columns" };
const appFor = (pane: DesktopWindow) => desktopApps.find((app) => app.id === pane.app)!;
type MountedWindow = {
  node: HTMLElement;
  frame?: HTMLIFrameElement;
  drag: DragController;
  closing: boolean;
  disposed?: () => void;
  timeout?: ReturnType<typeof setTimeout>;
};

export async function mount(root: HTMLElement): Promise<() => void> {
  registerIcon(
    "desktop.conversation",
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M20 11.5a8 8 0 0 1-8 8H4l-1 2V11.5a8.5 8.5 0 0 1 17 0Z"/><path d="M7 9h9M7 13h6"/></svg>',
  );
  const controller = new AbortController();
  const { signal } = controller;
  // Publish the shared seed before parallel app frames can initialize different source IDs.
  try {
    readNotebook();
  } catch {
    /* Source apps provide their own recovery UI. */
  }
  const state = readDesktop();
  const mounted = new Map<string, MountedWindow>();
  const separators = new Map<string, UIResizableHandle>();
  const placements = new Map<string, Rect>();
  let activeSplits: DesktopSplit[] = [];
  let maximized: string | null = null;
  let dragging: string | null = null;
  let dropTarget: string | null = null;
  let menuWindow: string | null = null;
  let renderFrame = 0;
  let noticeTimeout: ReturnType<typeof setTimeout> | undefined;
  let showDesktop = false;

  root.innerHTML = `<div class="desktop" tabindex="-1" aria-label="Desktop workspace">
    <div class="desktop-wallpaper" aria-hidden="true"><svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="desktop-sky" x2="0" y2="1"><stop stop-color="var(--desktop-sky-top)"/><stop offset="1" stop-color="var(--desktop-sky-bottom)"/></linearGradient><linearGradient id="desktop-ridge" x2=".9" y2="1"><stop stop-color="var(--desktop-ridge-top)"/><stop offset="1" stop-color="var(--desktop-ridge-bottom)"/></linearGradient></defs><path fill="url(#desktop-sky)" d="M0 0h1600v1000H0z"/><circle cx="1120" cy="280" r="125" fill="var(--desktop-sun)"/><path fill="var(--desktop-far)" d="M0 600 280 315 410 450 670 200 1080 660 1350 410 1600 630V1000H0Z"/><path fill="var(--desktop-mid)" d="M0 740 310 520 620 760 940 420 1240 710 1600 570V1000H0Z"/><path fill="url(#desktop-ridge)" d="M0 870Q360 470 720 800T1600 700V1000H0Z"/><g fill="none" stroke="var(--desktop-line)" stroke-width="1.5"><path d="M0 900Q360 500 720 830T1600 730"/><path d="M0 930Q360 530 720 860T1600 760"/><path d="M0 960Q360 560 720 890T1600 790"/><path d="M0 990Q360 590 720 920T1600 820"/></g></svg></div>
    <header class="desktop-bar">
      <div class="desktop-bar-start"><a class="desktop-back" href="/stories" aria-label="Back to stories" title="Back to stories">${icon("navigation.back")}</a>
      <button class="desktop-launch" data-action="launcher" aria-label="Open application launcher" title="Applications · Alt Space">${icon("action.search")}</button>
      <span class="desktop-divider"></span><nav class="desktop-workspaces" aria-label="Workspaces">${state.workspaces.map((space) => `<button data-workspace="${space.id}" aria-label="Workspace ${space.id}" title="Workspace ${space.id} · Alt ${space.id}"><span>${space.id}</span><i></i></button>`).join("")}</nav>
      <span class="desktop-active-app"></span></div>
      <button class="desktop-clock" data-action="calendar" aria-label="Open calendar"><time></time></button>
      <div class="desktop-bar-end"><button data-action="layout" class="desktop-layout" title="Change tiling layout · Alt J" aria-label="Change tiling layout">${icon("object.table")}<span></span></button>
      <button data-action="overview" aria-label="Workspace overview" title="Workspace overview">${icon("object.layers")}</button>
      <button data-action="settings" aria-label="Desktop settings" title="Desktop settings">${icon("action.settings")}</button>
      <button data-action="fullscreen" aria-label="Enter desktop fullscreen" title="Desktop fullscreen">${icon("action.fit")}</button></div>
    </header>
    <div class="desktop-stage"><div class="desktop-empty"><span class="desktop-empty-index">01</span><h1>Room to think.</h1><p>Open an app. Make this space yours.</p><ui-button data-action="launcher" variant="secondary">${icon("action.add")} Open application <ui-kbd>Alt Space</ui-kbd></ui-button><div class="desktop-empty-shortcuts">${desktopApps
      .slice(0, 4)
      .map((app) => `<button data-open="${app.id}">${icon(app.icon)}${app.title}</button>`)
      .join("")}</div></div><div class="desktop-drop-marker" aria-hidden="true"></div></div>
    <footer class="desktop-shelf"><div class="desktop-shelf-context"><span class="desktop-live-dot"></span><span>Local workspace</span></div><nav class="desktop-dock" aria-label="Applications">${desktopApps.map((app) => `<button data-open="${app.id}" aria-label="Open ${app.title}" title="${app.title}">${icon(app.icon)}<span class="desktop-dock-tooltip">${app.title}</span><i></i></button>`).join("")}<span class="desktop-divider"></span><button data-action="desktop" aria-label="Show desktop" title="Show desktop">${icon("object.table")}</button></nav><button class="desktop-shortcuts" data-action="help" aria-label="Keyboard shortcuts">${icon("object.keyboard")}<span>Shortcuts</span></button></footer>
    <div class="desktop-notice" role="status" aria-live="polite" hidden></div>
    <ui-dialog class="desktop-launcher" label="Applications and commands"><ui-command label="Applications and commands" placeholder="Open an app or run a command…"><span slot="search-prefix">${icon("action.search")}</span><ui-kbd slot="search-suffix">Esc</ui-kbd><div slot="footer" class="desktop-command-footer"><span><ui-kbd>↑</ui-kbd><ui-kbd>↓</ui-kbd> navigate</span><span><ui-kbd>↵</ui-kbd> open</span></div></ui-command></ui-dialog>
    <ui-dialog class="desktop-settings" label="Desktop settings"><div class="desktop-setting"><div><h3>Appearance</h3><p>Applied to every open app.</p></div><div class="desktop-segments"><button data-theme-choice="light">Light</button><button data-theme-choice="dark">Dark</button></div></div><div class="desktop-setting"><h3>Wallpaper</h3><div class="desktop-wallpaper-options">${["dune", "alpine", "ink"].map((name) => `<button data-wallpaper-choice="${name}" aria-label="${name[0]!.toUpperCase() + name.slice(1)} wallpaper"><i data-wallpaper="${name}"></i><span>${name[0]!.toUpperCase() + name.slice(1)}</span></button>`).join("")}</div></div><div class="desktop-setting"><h3>Window spacing <output class="desktop-gap-value"></output></h3><ui-slider class="desktop-gap" label="Window spacing" min="4" max="24" step="2"></ui-slider></div><div class="desktop-setting"><h3>Workspace layout</h3><div class="desktop-segments">${Object.entries(
      labels,
    )
      .map(([id, label]) => `<button data-layout-choice="${id}">${label}</button>`)
      .join(
        "",
      )}</div></div><p class="desktop-setting-note">Your layout is saved on this device. App content stays in its own workspace.</p><div slot="actions" class="desktop-settings-actions"><ui-button data-action="reset-layout" variant="ghost" size="small">Reset window positions</ui-button><ui-button data-action="settings-done" variant="secondary" size="small">Done</ui-button></div></ui-dialog>
    <ui-dialog class="desktop-calendar" label="Calendar"><ui-calendar></ui-calendar></ui-dialog>
    <ui-dialog class="desktop-overview" label="Workspace overview"><div class="desktop-overview-content"></div></ui-dialog>
    <ui-dialog class="desktop-window-options" label="Window actions"><div class="desktop-window-menu"></div></ui-dialog>
    <ui-dialog class="desktop-help" label="Keyboard shortcuts"><p>Use these anywhere, including inside an app.</p><dl>${[
      ["Alt Space", "Applications and commands"],
      ["Alt 1–5", "Switch workspace"],
      ["Alt Shift 1–5", "Move window to workspace"],
      ["Alt ← ↑ ↓ →", "Focus a window"],
      ["Alt Shift ← ↑ ↓ →", "Swap tiled windows"],
      ["Alt T", "Toggle floating"],
      ["Alt Enter", "Maximize or restore"],
      ["Alt J", "Change tiling layout"],
      ["Alt W", "Close focused window"],
      ["Alt /", "This shortcut guide"],
    ]
      .map(
        ([key, description]) =>
          `<div><dt>${description}</dt><dd><ui-kbd>${key}</ui-kbd></dd></div>`,
      )
      .join(
        "",
      )}</dl><p>Drag a title bar to swap tiles or move a floating window. Drag a divider to resize; double-click a title to maximize.</p><ui-button slot="close" variant="secondary">Got it</ui-button></ui-dialog>
  </div>`;
  const shell = root.querySelector<HTMLElement>(".desktop")!;
  const stage = root.querySelector<HTMLElement>(".desktop-stage")!;
  const find = <T extends HTMLElement = HTMLElement>(selector: string) =>
    root.querySelector<T>(selector)!;
  const dialog = (name: string) => find<UIDialog>(`.desktop-${name}`);
  const command = find<UICommand>("ui-command");
  const current = () => state.workspaces.find((space) => space.id === state.workspace)!;
  const active = () => state.windows.find((pane) => pane.id === state.active);
  const lastVisibleWindow = (): string | null => {
    for (let index = state.windows.length - 1; index >= 0; index--) {
      const pane = state.windows[index]!;
      if (!pane.minimized && (pane.workspace === state.workspace || pane.pinned)) return pane.id;
    }
    return null;
  };
  const send = (entry: MountedWindow, message: DesktopMessage) =>
    entry.frame?.contentWindow?.postMessage(message, location.origin);
  const persist = () => saveDesktop(state);
  const notice = (message: string) => {
    const target = find(".desktop-notice");
    target.textContent = message;
    target.hidden = false;
    clearTimeout(noticeTimeout);
    noticeTimeout = setTimeout(() => {
      target.hidden = true;
    }, 2500);
  };
  const focusWindow = (id: string, enter = false) => {
    const pane = state.windows.find((item) => item.id === id);
    if (!pane || mounted.get(id)?.closing) return;
    if (!pane.pinned) state.workspace = pane.workspace;
    pane.minimized = false;
    state.active = id;
    showDesktop = false;
    const entry = mounted.get(id);
    if (entry) {
      if (enter) {
        entry.frame?.focus();
        send(entry, { channel: desktopChannel, type: "activate" });
      }
    }
    render();
    persist();
  };
  const setWorkspace = (id: number) => {
    if (!state.workspaces.some((space) => space.id === id)) return;
    state.workspace = id;
    showDesktop = false;
    maximized = null;
    const previous = active();
    if (!previous || (!previous.pinned && previous.workspace !== id) || previous.minimized)
      state.active = lastVisibleWindow();
    render();
    persist();
    shell.focus({ preventScroll: true });
  };
  const moveWindow = (id: string, workspace: number) => {
    const pane = state.windows.find((item) => item.id === id);
    if (!pane) return;
    pane.workspace = workspace;
    pane.pinned = false;
    setWorkspace(workspace);
    focusWindow(id);
    notice(`Moved ${appFor(pane).title} to workspace ${workspace}`);
  };
  const toggleFloat = (id: string) => {
    const pane = state.windows.find((item) => item.id === id);
    if (!pane) return;
    maximized = null;
    pane.floating = !pane.floating;
    if (!pane.floating) pane.pinned = false;
    else {
      const width = Math.min(stage.clientWidth * 0.8, 960);
      const height = Math.min(stage.clientHeight * 0.85, 720);
      pane.rect = clampRect(
        { x: (stage.clientWidth - width) / 2, y: (stage.clientHeight - height) / 2, width, height },
        stage.clientWidth,
        stage.clientHeight,
      );
    }
    focusWindow(id);
  };
  const toggleMaximize = (id: string) => {
    maximized = maximized === id ? null : id;
    focusWindow(id);
  };
  const minimize = (id: string) => {
    const pane = state.windows.find((item) => item.id === id);
    if (!pane) return;
    pane.minimized = true;
    if (maximized === id) maximized = null;
    state.active = lastVisibleWindow();
    render();
    persist();
  };
  const closeWindow = async (id: string) => {
    const entry = mounted.get(id);
    if (!entry || entry.closing) return;
    entry.closing = true;
    entry.node.inert = true;
    const fade = entry.node.animate(
      [
        { opacity: 1, scale: "1" },
        { opacity: 0, scale: ".98" },
      ],
      { ...motionTiming("moderate", "exit", shell), fill: "forwards" },
    );
    const flush = entry.frame
      ? new Promise<void>((resolve) => {
          entry.disposed = resolve;
          entry.timeout = setTimeout(resolve, 500);
          send(entry, { channel: desktopChannel, type: "dispose" });
        })
      : Promise.resolve();
    await Promise.all([flush, fade.finished.catch(() => {})]);
    clearTimeout(entry.timeout);
    entry.drag.destroy();
    entry.node.remove();
    mounted.delete(id);
    state.windows = state.windows.filter((pane) => pane.id !== id);
    if (maximized === id) maximized = null;
    if (state.active === id) state.active = lastVisibleWindow();
    if (!signal.aborted) {
      render();
      persist();
      shell.focus({ preventScroll: true });
    }
  };
  const openApp = (app: DesktopAppId, href?: string) => {
    const candidate = createWindow(app, state.workspace, href);
    const existing = state.windows.find(
      (pane) =>
        pane.app === app &&
        (!href || pane.href === candidate.href) &&
        !mounted.get(pane.id)?.closing,
    );
    if (existing) {
      focusWindow(existing.id, true);
      return;
    }
    if (state.windows.length >= 12) {
      notice("Close a window before opening another.");
      return;
    }
    state.windows.push(candidate);
    maximized = null;
    focusWindow(candidate.id);
  };
  const layoutCycle = () => {
    const layouts = ["dwindle", "master", "columns"] as const;
    current().layout = layouts[(layouts.indexOf(current().layout) + 1) % layouts.length]!;
    maximized = null;
    render();
    persist();
    notice(`${labels[current().layout]} layout`);
  };
  const swap = (first: string, second: string) => {
    const a = state.windows.findIndex((pane) => pane.id === first);
    const b = state.windows.findIndex((pane) => pane.id === second);
    if (a < 0 || b < 0) return;
    [state.windows[a], state.windows[b]] = [state.windows[b]!, state.windows[a]!];
    render();
    persist();
  };
  const directional = (direction: "left" | "right" | "up" | "down", rearrange: boolean) => {
    const source = state.active && placements.get(state.active);
    if (!source) return;
    const horizontal = direction === "left" || direction === "right";
    const sign = direction === "left" || direction === "up" ? -1 : 1;
    const x = source.x + source.width / 2,
      y = source.y + source.height / 2;
    const candidates = [...placements]
      .filter(([id]) => id !== state.active)
      .map(([id, rect]) => {
        const dx = rect.x + rect.width / 2 - x,
          dy = rect.y + rect.height / 2 - y;
        const primary = horizontal ? dx : dy,
          secondary = horizontal ? dy : dx;
        return { id, primary, score: Math.abs(primary) + Math.abs(secondary) * 2 };
      })
      .filter((item) => item.primary * sign > 4)
      .sort((a, b) => a.score - b.score);
    const next = candidates[0];
    if (!next) return;
    if (
      rearrange &&
      active() &&
      !active()!.floating &&
      !state.windows.find((pane) => pane.id === next.id)!.floating
    )
      swap(state.active!, next.id);
    else focusWindow(next.id, true);
  };

  function createPane(pane: DesktopWindow): MountedWindow {
    const app = appFor(pane);
    const node = document.createElement("section");
    node.id = `desktop-window-${pane.id}`;
    node.className = "desktop-window";
    node.dataset.window = pane.id;
    node.dataset.app = pane.app;
    node.setAttribute("aria-label", `${app.title} window`);
    node.tabIndex = -1;
    node.innerHTML = `<header class="desktop-titlebar"><div class="desktop-grab" title="Drag to rearrange; double-click to maximize">${icon(app.icon)}<span>${escape(app.title)}</span><span class="desktop-window-mode"></span></div><div class="desktop-window-controls"><button data-window-action="options" aria-label="Window options for ${app.title}" title="Window actions">${icon("navigation.more.horizontal")}</button><button data-window-action="float" aria-label="Float ${app.title}" title="Toggle floating · Alt T">${icon("action.launch")}</button><button data-window-action="minimize" aria-label="Minimize ${app.title}" title="Minimize">${icon("action.remove")}</button><button data-window-action="maximize" aria-label="Maximize ${app.title}" title="Maximize · Alt Enter">${icon("action.fit")}</button><button data-window-action="close" aria-label="Close ${app.title}" title="Close · Alt W">${icon("action.dismiss")}</button></div></header><div class="desktop-app"><div class="desktop-app-loading" role="status"><span></span>Opening ${app.title}…</div></div><ui-resizable-handle class="desktop-resize-x" orientation="horizontal" label="Resize ${app.title} width"></ui-resizable-handle><ui-resizable-handle class="desktop-resize-y" orientation="vertical" label="Resize ${app.title} height"></ui-resizable-handle>`;
    stage.append(node);
    const grab = node.querySelector<HTMLElement>(".desktop-grab")!;
    const drag = new DragController(node, {
      handle: grab,
      threshold: 6,
      containment: stage,
      positioner: leftTopDragPositioner,
    });
    const entry: MountedWindow = { node, drag, closing: false };
    node.addEventListener(
      "pointerdown",
      () => {
        if (state.active !== pane.id) focusWindow(pane.id);
      },
      { signal },
    );
    node.addEventListener(
      "focusin",
      () => {
        if (state.active !== pane.id) focusWindow(pane.id);
      },
      { signal },
    );
    grab.addEventListener("dblclick", () => toggleMaximize(pane.id), { signal });
    node.addEventListener(
      "ui-drag-start",
      (event: CustomEvent<DragEventDetail>) => {
        if (event.target !== node) return;
        if (maximized || stage.clientWidth < 740) {
          event.preventDefault();
          return;
        }
        dragging = pane.id;
        dropTarget = null;
        shell.dataset.interacting = "true";
        node.dataset.dragging = "true";
        focusWindow(pane.id);
      },
      { signal },
    );
    node.addEventListener(
      "ui-drag-move",
      (event: CustomEvent<DragEventDetail>) => {
        if (event.target !== node) return;
        if (pane.floating) return;
        const box = stage.getBoundingClientRect();
        const point = { x: event.detail.pointer.x - box.left, y: event.detail.pointer.y - box.top };
        dropTarget =
          [...placements].find(
            ([id, rect]) =>
              id !== pane.id &&
              point.x >= rect.x &&
              point.x <= rect.x + rect.width &&
              point.y >= rect.y &&
              point.y <= rect.y + rect.height &&
              !state.windows.find((item) => item.id === id)?.floating,
          )?.[0] ?? null;
        const marker = find(".desktop-drop-marker");
        marker.hidden = !dropTarget;
        if (dropTarget) place(marker, placements.get(dropTarget)!);
      },
      { signal },
    );
    node.addEventListener(
      "ui-drag-end",
      (event: CustomEvent<DragEventDetail>) => {
        if (event.target !== node) return;
        delete shell.dataset.interacting;
        delete node.dataset.dragging;
        find(".desktop-drop-marker").hidden = true;
        dragging = null;
        if (!event.detail.cancelled) {
          if (pane.floating)
            pane.rect = clampRect(
              { ...pane.rect, ...event.detail.position },
              stage.clientWidth,
              stage.clientHeight,
            );
          else if (dropTarget) swap(pane.id, dropTarget);
        }
        dropTarget = null;
        render();
        persist();
      },
      { signal },
    );
    for (const axis of ["x", "y"] as const) {
      const handle = node.querySelector<UIResizableHandle>(`.desktop-resize-${axis}`)!;
      handle.addEventListener(
        "ui-resize",
        (rawEvent) => {
          const event = rawEvent as CustomEvent<ResizeDetail>;
          event.stopPropagation();
          if (!pane.floating || maximized) return;
          handle.resizing = event.detail.phase !== "end";
          if (event.detail.phase === "start") shell.dataset.interacting = "true";
          if (event.detail.phase === "move") {
            const next = { ...pane.rect };
            if (axis === "x") next.width += event.detail.delta;
            else next.height += event.detail.delta;
            pane.rect = clampRect(next, stage.clientWidth, stage.clientHeight);
            render();
          }
          if (event.detail.phase === "end") {
            delete shell.dataset.interacting;
            persist();
          }
        },
        { signal },
      );
    }
    node.animate(
      [
        { opacity: 0, transform: "scale(.97) translateY(6px)" },
        { opacity: 1, transform: "none" },
      ],
      motionTiming("slow", "enter", shell),
    );
    return entry;
  }
  function loadPane(pane: DesktopWindow, entry: MountedWindow) {
    if (entry.frame) return;
    const frame = document.createElement("iframe");
    frame.title = appFor(pane).title;
    const url = new URL(pane.href, location.origin);
    url.searchParams.set("embedded", "desktop");
    url.searchParams.set("theme", document.documentElement.dataset.theme ?? "dark");
    frame.src = url.pathname + url.search + url.hash;
    frame.setAttribute("allow", "clipboard-read; clipboard-write; fullscreen");
    frame.addEventListener(
      "load",
      () =>
        send(entry, {
          channel: desktopChannel,
          type: "theme",
          theme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
        }),
      { signal },
    );
    entry.frame = frame;
    entry.node.querySelector(".desktop-app")!.append(frame);
  }
  function place(node: HTMLElement, rect: Rect) {
    node.style.left = `${rect.x}px`;
    node.style.top = `${rect.y}px`;
    node.style.width = `${rect.width}px`;
    node.style.height = `${rect.height}px`;
  }
  function render() {
    if (signal.aborted) return;
    const width = stage.clientWidth,
      height = stage.clientHeight;
    if (!width || !height) return;
    const layout = layoutDesktop(state, width, height);
    placements.clear();
    if (!showDesktop)
      for (const [id, rect] of layout.rects) {
        if (!maximized || maximized === id)
          placements.set(id, maximized ? { x: 0, y: 0, width, height } : rect);
      }
    for (const pane of state.windows) {
      let entry = mounted.get(pane.id);
      if (!entry) {
        entry = createPane(pane);
        mounted.set(pane.id, entry);
      }
      if (entry.closing) continue;
      const rect = placements.get(pane.id);
      entry.node.hidden = !rect;
      entry.node.inert = !rect;
      entry.node.dataset.active = String(pane.id === state.active);
      entry.node.style.zIndex = String(
        dragging === pane.id ? 100 : pane.id === state.active ? 60 : pane.floating ? 40 : 10,
      );
      entry.node.dataset.floating = String(pane.floating);
      entry.node.dataset.maximized = String(pane.id === maximized);
      entry.node.querySelector(".desktop-window-mode")!.textContent = pane.pinned
        ? "Pinned"
        : pane.floating
          ? "Floating"
          : "";
      const floatButton = entry.node.querySelector('[data-window-action="float"]')!;
      floatButton.setAttribute(
        "aria-label",
        `${pane.floating ? "Tile" : "Float"} ${appFor(pane).title}`,
      );
      entry.node
        .querySelector('[data-window-action="maximize"]')!
        .setAttribute(
          "aria-label",
          `${pane.id === maximized ? "Restore" : "Maximize"} ${appFor(pane).title}`,
        );
      if (rect) {
        loadPane(pane, entry);
        if (dragging !== pane.id) {
          place(entry.node, rect);
          entry.drag.updateOptions({
            position: { x: rect.x, y: rect.y },
            disabled: !!maximized || width < 740,
          });
        }
        if (pane.floating)
          for (const axis of ["x", "y"]) {
            const handle = entry.node.querySelector<UIResizableHandle>(`.desktop-resize-${axis}`)!;
            const size = axis === "x" ? rect.width : rect.height;
            handle.setRange(
              size,
              Math.min(axis === "x" ? 360 : 240, axis === "x" ? width : height),
              axis === "x" ? width : height,
              entry.node.id,
            );
          }
      }
    }
    activeSplits = showDesktop || maximized ? [] : layout.splits;
    for (const [key, node] of separators)
      if (!activeSplits.some((split) => split.key === key)) {
        node.remove();
        separators.delete(key);
      }
    for (const split of activeSplits) {
      let handle = separators.get(split.key);
      if (!handle) {
        handle = document.createElement("ui-resizable-handle");
        handle.className = "desktop-split";
        handle.dataset.split = split.key;
        handle.label = "Resize tiled windows";
        handle.addEventListener(
          "ui-resize",
          (rawEvent) => {
            const event = rawEvent as CustomEvent<ResizeDetail>;
            event.stopPropagation();
            const currentSplit = activeSplits.find((item) => item.key === split.key);
            if (!currentSplit) return;
            handle!.resizing = event.detail.phase !== "end";
            if (event.detail.phase === "start") shell.dataset.interacting = "true";
            if (event.detail.phase === "move") {
              current().ratios[split.key] = Math.max(
                0.18,
                Math.min(0.82, currentSplit.ratio + event.detail.delta / currentSplit.extent),
              );
              render();
            }
            if (event.detail.phase === "end") {
              delete shell.dataset.interacting;
              persist();
            }
          },
          { signal },
        );
        stage.append(handle);
        separators.set(split.key, handle);
      }
      handle.orientation = split.orientation;
      place(handle, split.rect);
      handle.setRange(split.extent * split.ratio, split.extent * 0.18, split.extent * 0.82, "");
    }
    shell.dataset.wallpaper = state.wallpaper;
    shell.style.setProperty("--desktop-gap", `${state.gap}px`);
    find(".desktop-empty").hidden = placements.size > 0;
    find(".desktop-empty-index").textContent = String(state.workspace).padStart(2, "0");
    find(".desktop-active-app").textContent = active() ? appFor(active()!).title : "";
    find(".desktop-layout span").textContent = labels[current().layout];
    for (const button of root.querySelectorAll<HTMLElement>("[data-workspace]")) {
      const id = Number(button.dataset.workspace);
      button.setAttribute("aria-pressed", String(state.workspace === id));
      button.dataset.occupied = String(state.windows.some((pane) => pane.workspace === id));
    }
    for (const button of root.querySelectorAll<HTMLElement>(".desktop-dock [data-open]")) {
      button.dataset.running = String(
        state.windows.some((pane) => pane.app === button.dataset.open),
      );
      button.setAttribute(
        "aria-pressed",
        String(active()?.app === button.dataset.open && !showDesktop),
      );
    }
  }

  function openLauncher() {
    command.query = "";
    command.escapeClears = false;
    const items: CommandItem[] = desktopApps.map((app) => ({
      value: `app:${app.id}`,
      label: app.title,
      description: app.description,
      icon: app.icon,
      group: "Applications",
    }));
    for (const pane of state.windows)
      items.push({
        value: `window:${pane.id}`,
        label: `Switch to ${appFor(pane).title}`,
        description: `Workspace ${pane.workspace}${pane.minimized ? " · Minimized" : ""}`,
        icon: appFor(pane).icon,
        group: "Open windows",
      });
    for (const [value, label, shortcutLabel] of [
      ["layout", "Change tiling layout", "Alt J"],
      ["overview", "Workspace overview", ""],
      ["settings", "Desktop settings", ""],
      ["help", "Keyboard shortcuts", "Alt /"],
      ["desktop", "Show desktop", ""],
    ])
      items.push({
        value: `action:${value}`,
        label: label!,
        shortcut: shortcutLabel!,
        group: "Desktop",
      });
    command.items = items;
    dialog("launcher").open = true;
    void dialog("launcher").updateComplete.then(() => command.focus());
  }
  function openOverview() {
    find(".desktop-overview-content").innerHTML = state.workspaces
      .map((space) => {
        const windows = state.windows.filter((pane) => pane.workspace === space.id);
        return `<section class="desktop-overview-space"><button class="desktop-overview-heading" data-overview-space="${space.id}" aria-pressed="${state.workspace === space.id}"><span>Workspace ${space.id}</span><small>${windows.length} ${windows.length === 1 ? "window" : "windows"} · ${labels[space.layout]}</small></button><div>${windows.length ? windows.map((pane) => `<button data-focus-window="${pane.id}" class="desktop-overview-window">${icon(appFor(pane).icon)}<span>${appFor(pane).title}<small>${pane.minimized ? "Minimized" : pane.pinned ? "Pinned" : pane.floating ? "Floating" : "Tiled"}</small></span>${icon("navigation.forward")}</button>`).join("") : "<p>Nothing open. A fresh workspace.</p>"}</div></section>`;
      })
      .join("");
    dialog("overview").open = true;
  }
  function openOptions(id: string) {
    const pane = state.windows.find((item) => item.id === id);
    if (!pane) return;
    menuWindow = id;
    find(".desktop-window-menu").innerHTML =
      `<div class="desktop-menu-actions"><button data-option="float">${icon("action.launch")}${pane.floating ? "Tile window" : "Float window"}<ui-kbd>Alt T</ui-kbd></button><button data-option="pin">${icon("object.layers")}${pane.pinned ? "Unpin from workspaces" : "Pin to all workspaces"}</button><button data-option="maximize">${icon("action.fit")}${maximized === id ? "Restore window" : "Maximize window"}<ui-kbd>Alt Enter</ui-kbd></button><button data-option="minimize">${icon("action.remove")}Minimize window</button></div><h3>Move to workspace</h3><div class="desktop-segments">${state.workspaces.map((space) => `<button data-move-workspace="${space.id}" aria-label="Move to workspace ${space.id}" aria-pressed="${pane.workspace === space.id}">${space.id}</button>`).join("")}</div><a class="desktop-open-separately" href="${escape(pane.href)}" target="_blank" rel="noopener">Open separately ${icon("action.launch")}</a>`;
    dialog("window-options").open = true;
  }
  function syncSettings() {
    for (const button of root.querySelectorAll<HTMLElement>("[data-theme-choice]"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.themeChoice === document.documentElement.dataset.theme),
      );
    for (const button of root.querySelectorAll<HTMLElement>("[data-wallpaper-choice]"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.wallpaperChoice === state.wallpaper),
      );
    for (const button of root.querySelectorAll<HTMLElement>("[data-layout-choice]"))
      button.setAttribute("aria-pressed", String(button.dataset.layoutChoice === current().layout));
    find<HTMLElement & { value: number }>(".desktop-gap").value = state.gap;
    find(".desktop-gap-value").textContent = `${state.gap}px`;
  }
  function action(name: string) {
    if (name === "launcher") openLauncher();
    if (name === "layout") layoutCycle();
    if (name === "overview") openOverview();
    if (name === "help") dialog("help").open = true;
    if (name === "settings") {
      syncSettings();
      dialog("settings").open = true;
    }
    if (name === "settings-done") dialog("settings").open = false;
    if (name === "calendar") dialog("calendar").open = true;
    if (name === "desktop") {
      showDesktop = !showDesktop;
      maximized = null;
      render();
    }
    if (name === "reset-layout") {
      for (const pane of state.windows.filter((item) => item.workspace === state.workspace)) {
        pane.floating = false;
        pane.pinned = false;
        pane.minimized = false;
      }
      current().ratios = {};
      current().layout = "dwindle";
      maximized = null;
      showDesktop = false;
      syncSettings();
      render();
      persist();
      notice("Window positions reset. App content kept.");
    }
    if (name === "fullscreen") {
      const request = document.fullscreenElement
        ? document.exitFullscreen()
        : shell.requestFullscreen?.();
      void request?.catch(() =>
        notice("Fullscreen is unavailable in this browser. You can still maximize any window."),
      );
    }
  }
  function shortcut(message: DesktopAction) {
    if (["launcher", "help"].includes(message.action)) {
      action(message.action);
      return;
    }
    if ([...root.querySelectorAll<UIDialog>("ui-dialog")].some((item) => item.open)) return;
    if (message.action === "workspace") {
      setWorkspace(message.workspace);
      return;
    }
    if (message.action === "layout") {
      layoutCycle();
      return;
    }
    const pane = active();
    if (!pane) return;
    if (message.action === "close") void closeWindow(pane.id);
    if (message.action === "maximize") toggleMaximize(pane.id);
    if (message.action === "float") toggleFloat(pane.id);
    if (message.action === "move-workspace") moveWindow(pane.id, message.workspace);
    if (message.action === "focus" || message.action === "swap")
      directional(message.direction, message.action === "swap");
  }
  root.addEventListener(
    "click",
    (event) => {
      const target = event
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement &&
            !!node.closest(
              "[data-action],[data-open],[data-workspace],[data-window-action],[data-focus-window],[data-overview-space],[data-theme-choice],[data-wallpaper-choice],[data-layout-choice],[data-option],[data-move-workspace]",
            ),
        )
        ?.closest<HTMLElement>(
          "[data-action],[data-open],[data-workspace],[data-window-action],[data-focus-window],[data-overview-space],[data-theme-choice],[data-wallpaper-choice],[data-layout-choice],[data-option],[data-move-workspace]",
        );
      if (!target) return;
      if (target.dataset.action) action(target.dataset.action);
      if (target.dataset.open) openApp(target.dataset.open as DesktopAppId);
      if (target.dataset.workspace) setWorkspace(Number(target.dataset.workspace));
      if (target.dataset.windowAction) {
        const id = target.closest<HTMLElement>("[data-window]")!.dataset.window!;
        const kind = target.dataset.windowAction;
        if (kind === "close") void closeWindow(id);
        if (kind === "float") toggleFloat(id);
        if (kind === "maximize") toggleMaximize(id);
        if (kind === "minimize") minimize(id);
        if (kind === "options") openOptions(id);
      }
      if (target.dataset.focusWindow) {
        dialog("overview").open = false;
        focusWindow(target.dataset.focusWindow, true);
      }
      if (target.dataset.overviewSpace) {
        dialog("overview").open = false;
        setWorkspace(Number(target.dataset.overviewSpace));
      }
      if (target.dataset.themeChoice) {
        const theme = target.dataset.themeChoice === "light" ? "light" : "dark";
        document.documentElement.dataset.theme = theme;
        try {
          localStorage.setItem("mash-theme", theme);
        } catch {
          /* Theme still applies without storage. */
        }
        const url = new URL(location.href);
        url.searchParams.set("theme", theme);
        history.replaceState(null, "", url);
        for (const entry of mounted.values())
          send(entry, { channel: desktopChannel, type: "theme", theme });
        syncSettings();
      }
      if (target.dataset.wallpaperChoice) {
        state.wallpaper = target.dataset.wallpaperChoice as typeof state.wallpaper;
        syncSettings();
        render();
        persist();
      }
      if (target.dataset.layoutChoice) {
        current().layout = target.dataset.layoutChoice as "dwindle" | "master" | "columns";
        maximized = null;
        syncSettings();
        render();
        persist();
      }
      if (target.dataset.option && menuWindow) {
        const pane = state.windows.find((item) => item.id === menuWindow);
        if (!pane) return;
        dialog("window-options").open = false;
        if (target.dataset.option === "float") toggleFloat(pane.id);
        if (target.dataset.option === "maximize") toggleMaximize(pane.id);
        if (target.dataset.option === "minimize") minimize(pane.id);
        if (target.dataset.option === "pin") {
          if (!pane.floating) toggleFloat(pane.id);
          pane.pinned = !pane.pinned;
          focusWindow(pane.id);
        }
      }
      if (target.dataset.moveWorkspace && menuWindow) {
        dialog("window-options").open = false;
        moveWindow(menuWindow, Number(target.dataset.moveWorkspace));
      }
    },
    { signal },
  );
  command.addEventListener(
    "ui-command-select",
    (rawEvent) => {
      const event = rawEvent as CustomEvent<{ value: string }>;
      dialog("launcher").open = false;
      const [kind, ...rest] = event.detail.value.split(":");
      const value = rest.join(":");
      if (kind === "app") openApp(value as DesktopAppId);
      if (kind === "window") focusWindow(value, true);
      if (kind === "action") action(value);
    },
    { signal },
  );
  find(".desktop-gap").addEventListener(
    "ui-slider-input",
    () => {
      state.gap = Number(find<HTMLElement & { value: number }>(".desktop-gap").value);
      find(".desktop-gap-value").textContent = `${state.gap}px`;
      render();
      persist();
    },
    { signal },
  );
  window.addEventListener(
    "message",
    (event) => {
      if (event.origin !== location.origin || !isDesktopMessage(event.data)) return;
      const pair = [...mounted].find(([, entry]) => entry.frame?.contentWindow === event.source);
      if (!pair) return;
      const [id, entry] = pair;
      const message = event.data;
      if (message.type === "disposed") {
        entry.disposed?.();
        return;
      }
      if (entry.closing) return;
      if (message.type === "ready") {
        entry.node.dataset.ready = "true";
        entry.node.querySelector(".desktop-app-loading")?.remove();
        send(entry, {
          channel: desktopChannel,
          type: "theme",
          theme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
        });
        const chosen = state.active ? mounted.get(state.active) : undefined;
        if (
          chosen?.node.dataset.ready === "true" &&
          ![...root.querySelectorAll<UIDialog>("ui-dialog")].some((item) => item.open)
        ) {
          chosen.frame?.focus();
          send(chosen, { channel: desktopChannel, type: "activate" });
        }
      }
      if (message.type === "focus" && state.active !== id && placements.has(id)) focusWindow(id);
      if (message.type === "shortcut") {
        if (placements.has(id)) {
          state.active = id;
          shortcut(message);
        }
      }
      if (message.type === "open") {
        const app = desktopApps.find(
          (item) => new URL(message.href, location.origin).pathname === `/stories/${item.id}`,
        );
        if (app) openApp(app.id, message.href);
      }
    },
    { signal },
  );
  window.addEventListener(
    "keydown",
    (event) => {
      const request = shortcutAction(event);
      if (!request) return;
      event.preventDefault();
      event.stopPropagation();
      shortcut(request);
    },
    { capture: true, signal },
  );
  document.addEventListener(
    "fullscreenchange",
    () => {
      find('[data-action="fullscreen"]').setAttribute(
        "aria-label",
        document.fullscreenElement ? "Exit desktop fullscreen" : "Enter desktop fullscreen",
      );
    },
    { signal },
  );
  const clock = () => {
    find(".desktop-clock time").textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
  };
  clock();
  const clockInterval = setInterval(clock, 30000);
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(renderFrame);
    renderFrame = requestAnimationFrame(render);
  });
  observer.observe(stage);
  render();
  persist();
  return () => {
    controller.abort();
    observer.disconnect();
    cancelAnimationFrame(renderFrame);
    clearInterval(clockInterval);
    clearTimeout(noticeTimeout);
    persist();
    for (const entry of mounted.values()) {
      clearTimeout(entry.timeout);
      entry.disposed?.();
      send(entry, { channel: desktopChannel, type: "dispose" });
      entry.drag.destroy();
    }
    mounted.clear();
  };
}
