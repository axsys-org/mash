export type DesktopAppId =
  "documents" | "projects" | "study" | "command-center" | "studio" | "commons" | "characters";

export const desktopApps: {
  id: DesktopAppId;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "documents",
    title: "Documents",
    description: "Pages, blocks, and canvases",
    icon: "object.document",
  },
  {
    id: "projects",
    title: "Projects",
    description: "Issues and project documents",
    icon: "object.table",
  },
  {
    id: "study",
    title: "Study",
    description: "Cards connected to your sources",
    icon: "object.layers",
  },
  {
    id: "command-center",
    title: "Search",
    description: "Find, open, and capture across your workspace",
    icon: "action.search",
  },
  {
    id: "studio",
    title: "Editor",
    description: "Files, code, and live previews",
    icon: "object.terminal",
  },
  {
    id: "commons",
    title: "Conversations",
    description: "Rooms, messages, and shared notes",
    icon: "desktop.conversation",
  },
  {
    id: "characters",
    title: "Characters",
    description: "Emoji and symbols",
    icon: "object.keyboard",
  },
];

export type Rect = { x: number; y: number; width: number; height: number };
export type DesktopWindow = {
  id: string;
  app: DesktopAppId;
  href: string;
  workspace: number;
  floating: boolean;
  minimized: boolean;
  pinned: boolean;
  rect: Rect;
};
export type DesktopWorkspace = {
  id: number;
  layout: "dwindle" | "master" | "columns";
  ratios: Record<string, number>;
};
export type DesktopState = {
  version: 1;
  workspace: number;
  active: string | null;
  windows: DesktopWindow[];
  workspaces: DesktopWorkspace[];
  wallpaper: "dune" | "alpine" | "ink";
  gap: number;
};
export type DesktopSplit = {
  key: string;
  /** Horizontal splits place panes beside one another; vertical splits stack them. */
  orientation: "horizontal" | "vertical";
  /** The gutter between panes, relative to the stage. */
  rect: Rect;
  /** Available axis length, excluding the gutter, used to convert drag distance to a ratio. */
  extent: number;
  ratio: number;
};

export const storageKey = "mash-desktop-v1";
const workspaceIds = [1, 2, 3, 4, 5];
const baseRect: Rect = { x: 72, y: 56, width: 760, height: 540 };
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const validWorkspace = (value: unknown): value is number =>
  typeof value === "number" && workspaceIds.includes(value);
const isApp = (value: unknown): value is DesktopAppId =>
  desktopApps.some((app) => app.id === value);

/** A pane may restore only its own known story route, never an external or recursive desktop URL. */
export function normalizeDesktopHref(app: DesktopAppId, href?: string): string {
  const fallback = `/stories/${app}`;
  if (
    !href ||
    href.length > 4096 ||
    !href.startsWith("/stories/") ||
    href.includes("\\") ||
    [...href].some((character) => character.charCodeAt(0) < 32)
  )
    return fallback;
  try {
    const url = new URL(href, "https://desktop.invalid");
    if (url.origin !== "https://desktop.invalid" || url.pathname !== fallback) return fallback;
    url.searchParams.delete("embedded");
    url.searchParams.delete("theme");
    url.searchParams.sort();
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export function createWindow(app: DesktopAppId, workspace: number, href?: string): DesktopWindow {
  return {
    id: `pane-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`,
    app,
    href: normalizeDesktopHref(app, href),
    workspace: validWorkspace(workspace) ? workspace : 1,
    floating: false,
    minimized: false,
    pinned: false,
    rect: { ...baseRect },
  };
}

export function createDesktop(): DesktopState {
  const documents = createWindow("documents", 1);
  return {
    version: 1,
    workspace: 1,
    active: documents.id,
    windows: [documents, createWindow("command-center", 1)],
    workspaces: workspaceIds.map((id) => ({ id, layout: "dwindle", ratios: {} })),
    wallpaper: "dune",
    gap: 12,
  };
}

function restoreRect(value: unknown): Rect {
  if (!record(value)) return { ...baseRect };
  return {
    x: finite(value.x) ? clamp(value.x, 0, 16000) : baseRect.x,
    y: finite(value.y) ? clamp(value.y, 0, 16000) : baseRect.y,
    width: finite(value.width) ? clamp(value.width, 1, 16000) : baseRect.width,
    height: finite(value.height) ? clamp(value.height, 1, 16000) : baseRect.height,
  };
}

export function readDesktop(): DesktopState {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!record(raw) || raw.version !== 1 || !Array.isArray(raw.windows)) return createDesktop();
    const ids = new Set<string>();
    const windows: DesktopWindow[] = [];
    for (const item of raw.windows.slice(0, 64)) {
      if (
        !record(item) ||
        typeof item.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,100}$/u.test(item.id) ||
        ids.has(item.id) ||
        !isApp(item.app)
      )
        continue;
      ids.add(item.id);
      windows.push({
        id: item.id,
        app: item.app,
        href: normalizeDesktopHref(item.app, typeof item.href === "string" ? item.href : undefined),
        workspace: validWorkspace(item.workspace) ? item.workspace : 1,
        floating: item.floating === true,
        minimized: item.minimized === true,
        pinned: item.pinned === true,
        rect: restoreRect(item.rect),
      });
    }
    const workspace = validWorkspace(raw.workspace) ? raw.workspace : 1;
    const savedWorkspaces: unknown[] = Array.isArray(raw.workspaces) ? raw.workspaces : [];
    const workspaces: DesktopWorkspace[] = workspaceIds.map((id) => {
      const saved = savedWorkspaces.find((value) => record(value) && value.id === id);
      const layout =
        record(saved) && (saved.layout === "master" || saved.layout === "columns")
          ? saved.layout
          : "dwindle";
      const ratios: Record<string, number> = {};
      if (record(saved) && record(saved.ratios)) {
        for (const [key, ratio] of Object.entries(saved.ratios).slice(0, 256)) {
          if (/^[a-z]+(?:-[a-z]+)?:[a-zA-Z0-9_-]{1,100}$/u.test(key) && finite(ratio))
            ratios[key] = clamp(ratio, 0.18, 0.82);
        }
      }
      return { id, layout, ratios };
    });
    const visible = windows.filter(
      (pane) => !pane.minimized && (pane.workspace === workspace || pane.pinned),
    );
    const active = visible.find((pane) => pane.id === raw.active)?.id ?? visible.at(-1)?.id ?? null;
    return {
      version: 1,
      workspace,
      active,
      windows,
      workspaces,
      wallpaper: raw.wallpaper === "alpine" || raw.wallpaper === "ink" ? raw.wallpaper : "dune",
      gap: finite(raw.gap) ? clamp(raw.gap, 0, 32) : 12,
    };
  } catch {
    return createDesktop();
  }
}

/** Storage restrictions must not prevent the current desktop from working. */
export function saveDesktop(state: DesktopState): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // The current session remains usable when storage is unavailable or full.
  }
}

export function clampRect(rect: Rect, width: number, height: number): Rect {
  const areaWidth = finite(width) ? Math.max(0, width) : 0;
  const areaHeight = finite(height) ? Math.max(0, height) : 0;
  const paneWidth = clamp(
    finite(rect.width) ? rect.width : baseRect.width,
    Math.min(360, areaWidth),
    areaWidth,
  );
  const paneHeight = clamp(
    finite(rect.height) ? rect.height : baseRect.height,
    Math.min(240, areaHeight),
    areaHeight,
  );
  return {
    x: clamp(finite(rect.x) ? rect.x : 0, 0, areaWidth - paneWidth),
    y: clamp(finite(rect.y) ? rect.y : 0, 0, areaHeight - paneHeight),
    width: paneWidth,
    height: paneHeight,
  };
}

export function layoutDesktop(
  state: DesktopState,
  width: number,
  height: number,
): { rects: Map<string, Rect>; splits: DesktopSplit[] } {
  const rects = new Map<string, Rect>();
  const splits: DesktopSplit[] = [];
  const bounds: Rect = {
    x: 0,
    y: 0,
    width: finite(width) ? Math.max(0, width) : 0,
    height: finite(height) ? Math.max(0, height) : 0,
  };
  const visible = state.windows.filter(
    (pane) => !pane.minimized && (pane.workspace === state.workspace || pane.pinned),
  );
  if (!visible.length || bounds.width === 0 || bounds.height === 0) return { rects, splits };
  if (bounds.width < 740) {
    const pane = visible.find((item) => item.id === state.active) ?? visible.at(-1);
    if (pane) rects.set(pane.id, bounds);
    return { rects, splits };
  }
  const workspace = state.workspaces.find((item) => item.id === state.workspace);
  const layout = workspace?.layout ?? "dwindle";
  const gap = finite(state.gap) ? clamp(state.gap, 0, 32) : 12;

  function arrange(panes: DesktopWindow[], area: Rect, mode: string): void {
    const first = panes[0];
    if (!first) return;
    if (panes.length === 1) {
      rects.set(first.id, area);
      return;
    }
    const horizontal =
      mode === "columns" || mode === "master" || (mode === "dwindle" && area.width >= area.height);
    const dimension = horizontal ? area.width : area.height;
    const gutter = Math.min(gap, dimension / 4);
    const extent = dimension - gutter;
    const key = `${mode}:${first.id}`;
    const preferred = mode === "master" ? 0.6 : mode === "dwindle" ? 0.5 : 1 / panes.length;
    // Keep a usable first pane where possible while preserving space for the remaining group.
    const minimum = Math.min(0.45, (horizontal ? 260 : 180) / Math.max(1, extent));
    const ratio = clamp(
      workspace?.ratios[key] ?? preferred,
      Math.max(0.18, minimum),
      Math.min(0.82, 1 - minimum),
    );
    const firstExtent = extent * ratio;
    const lastExtent = extent - firstExtent;
    const firstArea = {
      ...area,
      ...(horizontal ? { width: firstExtent } : { height: firstExtent }),
    };
    const restArea = horizontal
      ? { ...area, x: area.x + firstExtent + gutter, width: lastExtent }
      : { ...area, y: area.y + firstExtent + gutter, height: lastExtent };
    const splitArea = horizontal
      ? { x: area.x + firstExtent, y: area.y, width: gutter, height: area.height }
      : { x: area.x, y: area.y + firstExtent, width: area.width, height: gutter };
    splits.push({
      key,
      orientation: horizontal ? "horizontal" : "vertical",
      rect: splitArea,
      extent,
      ratio,
    });
    rects.set(first.id, firstArea);
    arrange(panes.slice(1), restArea, mode === "master" ? "master-stack" : mode);
  }

  arrange(
    visible.filter((pane) => !pane.floating),
    bounds,
    layout,
  );
  for (const pane of visible) {
    if (pane.floating) rects.set(pane.id, clampRect(pane.rect, bounds.width, bounds.height));
  }
  return { rects, splits };
}
