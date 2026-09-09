import { Bound } from "@blocksuite/global/gfx";
import { type DragEventDetail, type FileUploadChangeDetail } from "@mash/ui";

import {
  allocateBlockId,
  blockDefinitions,
  createBlock,
  renderUploadedFile,
  setAttributes,
  type BlockDefinition,
} from "./editing-blocks.js";
import { applyStageUtilityRecipes } from "./application-recipes.js";

type EdgelessTool = "connector" | "frame" | "hand" | "select" | "text";

interface EdgelessNodeRecord {
  id: string;
  kind: string;
  title: string;
  bound: Bound;
  z: number;
  frameId?: string;
  seedImage?: boolean;
  text?: string;
}

interface EdgelessConnector {
  id: string;
  source: string;
  target: string;
}

interface EdgelessNodeSnapshot extends Omit<EdgelessNodeRecord, "bound"> {
  xywh: [number, number, number, number];
}

interface EdgelessSnapshot {
  nodes: EdgelessNodeSnapshot[];
  connectors: EdgelessConnector[];
  selection: string[];
}

interface PointerSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
}

interface PanSession extends PointerSession {
  startPanX: number;
  startPanY: number;
}

interface MarqueeSession extends PointerSession {
  additive: boolean;
  startCanvasX: number;
  startCanvasY: number;
}

interface ResizeSession extends PointerSession {
  nodeId: string;
  startBound: Bound;
}

type EdgelessDraggable = HTMLElement & {
  controlled: boolean;
  disabled: boolean;
  x: number;
  y: number;
};

type ValueElement = HTMLElement & {
  disabled?: boolean;
  value: string;
};

const sceneBounds = new Bound(0, 0, 1440, 900);
const gridStep = 8;
const minimumZoom = 0.3;
const maximumZoom = 1.6;

const initialNodes: readonly EdgelessNodeRecord[] = [
  {
    id: "frame-launch",
    kind: "frame",
    title: "Launch system",
    bound: new Bound(56, 56, 720, 520),
    z: 0,
  },
  {
    id: "canvas-title",
    kind: "title",
    title: "Adaptive workspace",
    text: "Adaptive workspace",
    bound: new Bound(96, 112, 288, 112),
    z: 2,
    frameId: "frame-launch",
  },
  {
    id: "canvas-tasks",
    kind: "task-list",
    title: "Release gates",
    bound: new Bound(424, 104, 304, 192),
    z: 3,
    frameId: "frame-launch",
  },
  {
    id: "canvas-image",
    kind: "image",
    title: "Material study",
    bound: new Bound(96, 264, 288, 248),
    z: 4,
    frameId: "frame-launch",
    seedImage: true,
  },
  {
    id: "canvas-progress",
    kind: "progress",
    title: "Release confidence",
    bound: new Bound(424, 352, 304, 144),
    z: 5,
    frameId: "frame-launch",
  },
  {
    id: "canvas-code",
    kind: "code",
    title: "Agent stream",
    bound: new Bound(864, 136, 344, 208),
    z: 6,
  },
  {
    id: "canvas-approval",
    kind: "approval",
    title: "Review gate",
    bound: new Bound(848, 416, 424, 232),
    z: 7,
  },
];

const initialConnectors: readonly EdgelessConnector[] = [
  { id: "connector-title-tasks", source: "canvas-title", target: "canvas-tasks" },
  { id: "connector-tasks-progress", source: "canvas-tasks", target: "canvas-progress" },
  { id: "connector-progress-code", source: "canvas-progress", target: "canvas-code" },
];

function elementFromPath(event: Event, selector: string): HTMLElement | null {
  return (
    event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches(selector)) ??
    null
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function snap(value: number): number {
  return Math.round(value / gridStep) * gridStep;
}

function defaultNodeSize(kind: string): [number, number] {
  if (kind === "table") return [432, 248];
  if (kind === "approval") return [416, 232];
  if (kind === "image" || kind === "media") return [320, 232];
  if (kind === "code") return [352, 208];
  if (kind === "task-list" || kind === "tabs") return [304, 192];
  if (kind === "metrics") return [352, 184];
  if (kind === "title" || kind === "heading" || kind === "body") return [288, 120];
  return [304, 168];
}

function iconForBlock(definition: BlockDefinition): HTMLElement {
  const icon = document.createElement("ui-icon");
  setAttributes(icon, { name: definition.icon || "object.document", label: "" });
  icon.slot = "prefix";
  return icon;
}

class EdgelessPlayground {
  readonly #root: HTMLElement;
  readonly #viewport: HTMLElement;
  readonly #scene: HTMLElement;
  readonly #connectorLayer: SVGSVGElement;
  readonly #marquee: HTMLElement;
  readonly #minimap: HTMLElement;
  readonly #selectionToolbar: HTMLElement;
  readonly #records = new Map<string, EdgelessNodeRecord>();
  readonly #nodes = new Map<string, EdgelessDraggable>();
  readonly #selectedIds = new Set<string>();
  readonly #assetUrls = new Set<string>();
  readonly #resizeObserver: ResizeObserver;
  #connectors: EdgelessConnector[] = [];
  #tool: EdgelessTool = "select";
  #zoom = 1;
  #panX = 0;
  #panY = 0;
  #panSession: PanSession | null = null;
  #marqueeSession: MarqueeSession | null = null;
  #resizeSession: ResizeSession | null = null;
  #dragOrigins: Map<string, Bound> | null = null;
  #dragChanged = false;
  #connectorSourceId: string | null = null;
  #zIndex = 8;
  #assetCount = 0;
  #commentCount = 2;
  #history: EdgelessSnapshot[] = [];
  #historyIndex = -1;
  #initialViewFitted = false;

  constructor(root: HTMLElement) {
    const viewport = root.querySelector<HTMLElement>("[data-edgeless-viewport]");
    const scene = root.querySelector<HTMLElement>("[data-edgeless-scene]");
    const connectorLayer = root.querySelector<SVGSVGElement>("[data-edgeless-connectors]");
    const marquee = root.querySelector<HTMLElement>("[data-edgeless-marquee]");
    const minimap = root.querySelector<HTMLElement>("[data-edgeless-minimap]");
    const selectionToolbar = root.querySelector<HTMLElement>(".example-edgeless-selection-bar");
    if (!viewport || !scene || !connectorLayer || !marquee || !minimap || !selectionToolbar) {
      throw new Error("Edgeless playground anatomy is incomplete.");
    }

    this.#root = root;
    this.#viewport = viewport;
    this.#scene = scene;
    this.#connectorLayer = connectorLayer;
    this.#marquee = marquee;
    this.#minimap = minimap;
    this.#selectionToolbar = selectionToolbar;
    this.#resizeObserver = new ResizeObserver(() => {
      if (this.#fitInitialView()) return;
      this.#applyViewportTransform();
      this.#positionSelectionToolbar();
      this.#updateMinimap();
    });
    this.#resizeObserver.observe(viewport);

    this.#populateInsertMenu();
    for (const record of initialNodes) this.#mountNode(this.#cloneRecord(record));
    this.#connectors = initialConnectors.map((connector) => ({ ...connector }));
    this.#selectedIds.add("canvas-title");
    this.#rebuildLayerTree();
    this.#commitSnapshot();

    root.addEventListener("click", this.#onClick);
    root.addEventListener("change", this.#onChange);
    root.addEventListener("input", this.#onInput);
    root.addEventListener("keydown", this.#onKeydown);
    root.addEventListener("pointerdown", this.#onPointerDown, true);
    root.addEventListener("pointermove", this.#onPointerMove);
    root.addEventListener("pointerup", this.#onPointerUp);
    root.addEventListener("pointercancel", this.#onPointerUp);
    root.addEventListener("ui-drag-start", this.#onDragStart);
    root.addEventListener("ui-drag", this.#onDrag);
    root.addEventListener("ui-drag-end", this.#onDragEnd);
    root.addEventListener("ui-file-upload-change", this.#onFileUploadChange);
    root.addEventListener("ui-menu-select", this.#onMenuSelect);
    root.addEventListener("ui-toggle-group-change", this.#onToolChange);
    viewport.addEventListener("wheel", this.#onWheel, { passive: false });

    requestAnimationFrame(() => {
      this.#fitInitialView();
    });
  }

  destroy(): void {
    this.#root.removeEventListener("click", this.#onClick);
    this.#root.removeEventListener("change", this.#onChange);
    this.#root.removeEventListener("input", this.#onInput);
    this.#root.removeEventListener("keydown", this.#onKeydown);
    this.#root.removeEventListener("pointerdown", this.#onPointerDown, true);
    this.#root.removeEventListener("pointermove", this.#onPointerMove);
    this.#root.removeEventListener("pointerup", this.#onPointerUp);
    this.#root.removeEventListener("pointercancel", this.#onPointerUp);
    this.#root.removeEventListener("ui-drag-start", this.#onDragStart);
    this.#root.removeEventListener("ui-drag", this.#onDrag);
    this.#root.removeEventListener("ui-drag-end", this.#onDragEnd);
    this.#root.removeEventListener("ui-file-upload-change", this.#onFileUploadChange);
    this.#root.removeEventListener("ui-menu-select", this.#onMenuSelect);
    this.#root.removeEventListener("ui-toggle-group-change", this.#onToolChange);
    this.#viewport.removeEventListener("wheel", this.#onWheel);
    this.#resizeObserver.disconnect();
    for (const url of this.#assetUrls) URL.revokeObjectURL(url);
    this.#assetUrls.clear();
  }

  #cloneRecord(record: EdgelessNodeRecord): EdgelessNodeRecord {
    return { ...record, bound: record.bound.clone() };
  }

  #populateInsertMenu(): void {
    const menu = this.#root.querySelector<HTMLElement>("[data-edgeless-insert-menu]");
    if (!menu) return;
    const groups = new Map<string, BlockDefinition[]>();
    for (const definition of blockDefinitions) {
      const entries = groups.get(definition.group) ?? [];
      entries.push(definition);
      groups.set(definition.group, entries);
    }
    for (const [group, definitions] of groups) {
      const label = document.createElement("ui-menu-label");
      label.textContent = group;
      menu.append(label);
      for (const definition of definitions) {
        const item = document.createElement("ui-menu-item");
        item.setAttribute("value", `insert:${definition.type}`);
        item.append(iconForBlock(definition), definition.label);
        menu.append(item);
      }
    }
    const count = this.#root.querySelector<HTMLOutputElement>("[data-edgeless-insert-count]");
    if (count) count.value = String(blockDefinitions.length);
    applyStageUtilityRecipes(menu);
  }

  #mountNode(record: EdgelessNodeRecord): EdgelessDraggable {
    const node = document.createElement("ui-draggable") as EdgelessDraggable;
    node.className = "example-edgeless-node";
    node.dataset.edgelessNode = record.id;
    node.dataset.edgelessKind = record.kind;
    node.setAttribute("containment", "none");
    node.setAttribute("controlled", "");
    node.setAttribute("role", "group");
    node.setAttribute("aria-label", `${record.title}, ${record.kind} block`);
    node.tabIndex = 0;
    node.controlled = true;
    node.x = record.bound.x;
    node.y = record.bound.y;

    if (record.kind === "frame") node.dataset.edgelessFrame = "";
    if (record.frameId) node.dataset.edgelessFrameId = record.frameId;

    const handle = document.createElement("ui-toolbar");
    handle.className = "example-edgeless-node-handle";
    handle.slot = "handle";
    handle.setAttribute("label", `Move ${record.title}`);
    handle.dataset.edgelessNodeHandle = "";
    const dragIcon = document.createElement("ui-icon");
    setAttributes(dragIcon, { name: "action.drag", label: "" });
    const title = document.createElement("span");
    title.textContent = record.title;
    const badge = document.createElement("ui-badge");
    setAttributes(badge, { size: "small", tone: record.kind === "frame" ? "accent" : "neutral" });
    badge.textContent = record.kind;
    handle.append(dragIcon, title, badge);

    const content = document.createElement("div");
    content.className = "example-edgeless-node-content";
    content.append(this.#createNodeContent(record));

    const resize = document.createElement("button");
    resize.className = "example-edgeless-resize-handle";
    resize.type = "button";
    resize.setAttribute("aria-label", `Resize ${record.title}`);
    resize.title = "Resize block";
    resize.dataset.edgelessResize = "";

    node.append(handle, content, resize);
    this.#records.set(record.id, record);
    this.#nodes.set(record.id, node);
    this.#scene.append(node);
    this.#applyRecord(node, record);
    applyStageUtilityRecipes(node);
    return node;
  }

  #createNodeContent(record: EdgelessNodeRecord): HTMLElement {
    if (record.kind === "frame") {
      const frame = document.createElement("div");
      frame.className = "example-edgeless-frame-content";
      const label = document.createElement("span");
      label.textContent = "Frame";
      const title = document.createElement("strong");
      title.textContent = record.title;
      const count = document.createElement("span");
      count.dataset.edgelessFrameCount = "";
      frame.append(label, title, count);
      return frame;
    }

    const definition = blockDefinitions.find((candidate) => candidate.type === record.kind);
    let content: HTMLElement;
    if (record.seedImage) content = this.#createSeedImage(definition);
    else if (definition) content = definition.create();
    else {
      content = document.createElement("p");
      content.textContent = record.title;
    }

    const editable = content.matches("[data-editing-text]")
      ? content
      : content.querySelector<HTMLElement>("[data-editing-text]");
    if (editable && record.text) editable.textContent = record.text;
    return createBlock(record.kind, content, `${record.id}-block`);
  }

  #createSeedImage(definition: BlockDefinition | undefined): HTMLElement {
    const figure = document.createElement("figure");
    figure.className = "example-editing-media example-edgeless-seed-image";
    figure.dataset.editingComponent = "image";
    figure.dataset.editingUploadContainer = "image";
    const image = document.createElement("ui-image");
    image.className = "example-editing-image-preview";
    setAttributes(image, {
      src: "/assets/editor-workbench-cover.png",
      alt: "Material samples and interface diagrams arranged on a studio worktable",
      loading: "eager",
    });
    const caption = document.createElement("figcaption");
    caption.className = "example-editing-media-caption";
    const copy = document.createElement("div");
    const title = document.createElement("span");
    title.textContent = "Material study";
    const meta = document.createElement("small");
    meta.textContent = "Workspace asset";
    copy.append(title, meta);
    const replacement = definition?.create().querySelector<HTMLElement>("ui-file-upload");
    if (replacement) {
      replacement.className = "example-editing-upload-compact";
      caption.append(copy, replacement);
    } else caption.append(copy);
    figure.append(image, caption);
    return figure;
  }

  #applyRecord(node: EdgelessDraggable, record: EdgelessNodeRecord): void {
    node.x = record.bound.x;
    node.y = record.bound.y;
    node.style.inlineSize = `${record.bound.w}px`;
    node.style.blockSize = `${record.bound.h}px`;
    node.style.zIndex = String(record.z);
    node.dataset.edgelessXywh = record.bound.serialize();
    node.disabled = this.#tool !== "select";
  }

  #nodeForEvent(event: Event): EdgelessDraggable | null {
    return elementFromPath(event, "[data-edgeless-node]") as EdgelessDraggable | null;
  }

  #select(ids: Iterable<string>, additive = false): void {
    if (!additive) this.#selectedIds.clear();
    for (const id of ids) {
      if (!this.#records.has(id)) continue;
      if (additive && this.#selectedIds.has(id)) this.#selectedIds.delete(id);
      else this.#selectedIds.add(id);
    }
    this.#sync();
  }

  #setTool(tool: EdgelessTool): void {
    this.#tool = tool;
    this.#connectorSourceId = null;
    this.#root.dataset.edgelessTool = tool;
    this.#root.removeAttribute("data-edgeless-connecting");
    for (const node of this.#nodes.values()) node.disabled = tool !== "select";
    const group = this.#root.querySelector<ValueElement>("[data-edgeless-tool-group]");
    if (group) group.value = tool;
    this.#sync(`${tool[0]!.toUpperCase()}${tool.slice(1)} tool`);
  }

  #onToolChange = (event: Event): void => {
    const group = elementFromPath(event, "[data-edgeless-tool-group]");
    if (!group) return;
    const value = (event as CustomEvent<{ values: string[] }>).detail.values[0];
    if (
      value === "connector" ||
      value === "frame" ||
      value === "hand" ||
      value === "select" ||
      value === "text"
    ) {
      this.#setTool(value);
    }
  };

  #onMenuSelect = (event: Event): void => {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    if (!value.startsWith("insert:")) return;
    const definition = blockDefinitions.find((candidate) => candidate.type === value.slice(7));
    if (definition) this.#insertDefinition(definition);
  };

  #onClick = (event: Event): void => {
    const layer = elementFromPath(event, "[data-edgeless-layer]");
    if (layer?.dataset.edgelessLayer) {
      this.#select([layer.dataset.edgelessLayer]);
      this.#nodes.get(layer.dataset.edgelessLayer)?.focus({ preventScroll: true });
      return;
    }

    const action = elementFromPath(event, "[data-edgeless-action]")?.dataset.edgelessAction;
    if (!action) return;
    if (action === "undo") this.#undo();
    else if (action === "redo") this.#redo();
    else if (action === "zoom-in") this.#zoomBy(0.1);
    else if (action === "zoom-out") this.#zoomBy(-0.1);
    else if (action === "fit") this.#fitRecords([...this.#records.values()]);
    else if (action === "fit-selection") this.#fitSelection();
    else if (action === "duplicate") this.#duplicateSelection();
    else if (action === "delete") this.#deleteSelection();
    else if (action === "bring-forward") this.#bringForward();
    else if (action === "focus-comments") this.#focusComments();
    else if (action === "add-comment") this.#addComment();
  };

  #onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 && event.button !== 1) return;
    const node = this.#nodeForEvent(event);
    const resize = elementFromPath(event, "[data-edgeless-resize]");
    if (resize && node && event.button === 0) {
      const record = this.#records.get(node.dataset.edgelessNode ?? "");
      if (!record) return;
      event.preventDefault();
      event.stopPropagation();
      this.#select([record.id]);
      this.#resizeSession = {
        pointerId: event.pointerId,
        nodeId: record.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startBound: record.bound.clone(),
      };
      resize.setPointerCapture(event.pointerId);
      node.dataset.edgelessResizing = "";
      return;
    }

    if (this.#tool === "hand" || event.button === 1) {
      const insideViewport = event.composedPath().includes(this.#viewport);
      if (!insideViewport) return;
      event.preventDefault();
      this.#panSession = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: this.#panX,
        startPanY: this.#panY,
      };
      this.#viewport.setPointerCapture(event.pointerId);
      this.#root.dataset.edgelessPanning = "";
      return;
    }

    if (node) {
      const id = node.dataset.edgelessNode;
      if (!id) return;
      if (this.#tool === "connector") {
        event.preventDefault();
        event.stopPropagation();
        this.#connectFrom(id);
      } else if (this.#tool === "select") {
        this.#select([id], event.shiftKey);
      }
      return;
    }

    if (!event.composedPath().includes(this.#viewport) || event.button !== 0) return;
    const point = this.#clientToCanvas(event.clientX, event.clientY);
    if (this.#tool === "frame" || this.#tool === "text") {
      event.preventDefault();
      const kind = this.#tool === "frame" ? "frame" : "body";
      const [width, height] = kind === "frame" ? [384, 264] : defaultNodeSize(kind);
      const record: EdgelessNodeRecord = {
        id: allocateBlockId(kind),
        kind,
        title: kind === "frame" ? "Untitled frame" : "Text",
        text: kind === "body" ? "Start typing..." : undefined,
        bound: new Bound(snap(point.x), snap(point.y), width, height),
        z: ++this.#zIndex,
      };
      const mounted = this.#mountNode(record);
      this.#rebuildLayerTree();
      this.#select([record.id]);
      this.#setTool("select");
      this.#commitSnapshot(`${kind === "frame" ? "Frame" : "Text block"} inserted`);
      if (kind === "body") {
        requestAnimationFrame(() =>
          mounted.querySelector<HTMLElement>("[contenteditable]")?.focus(),
        );
      }
      return;
    }

    if (this.#tool === "connector") {
      this.#connectorSourceId = null;
      this.#root.removeAttribute("data-edgeless-connecting");
      this.#sync("Choose a source block");
      return;
    }

    this.#root.focus({ preventScroll: true });
    this.#marqueeSession = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCanvasX: point.x,
      startCanvasY: point.y,
      additive: event.shiftKey,
    };
    this.#viewport.setPointerCapture(event.pointerId);
    this.#marquee.hidden = false;
    this.#updateMarquee(event.clientX, event.clientY);
  };

  #onPointerMove = (event: PointerEvent): void => {
    if (event.composedPath().includes(this.#viewport)) {
      const point = this.#clientToCanvas(event.clientX, event.clientY);
      const coordinate = this.#root.querySelector<HTMLElement>("[data-edgeless-coordinate]");
      if (coordinate) coordinate.textContent = `${Math.round(point.x)}, ${Math.round(point.y)}`;
    }

    if (this.#panSession?.pointerId === event.pointerId) {
      this.#panX = this.#panSession.startPanX + event.clientX - this.#panSession.startClientX;
      this.#panY = this.#panSession.startPanY + event.clientY - this.#panSession.startClientY;
      this.#applyViewportTransform();
      return;
    }

    if (this.#resizeSession?.pointerId === event.pointerId) {
      const session = this.#resizeSession;
      const record = this.#records.get(session.nodeId);
      const node = this.#nodes.get(session.nodeId);
      if (!record || !node) return;
      const deltaX = (event.clientX - session.startClientX) / this.#zoom;
      const deltaY = (event.clientY - session.startClientY) / this.#zoom;
      record.bound.w = Math.max(160, snap(session.startBound.w + deltaX));
      record.bound.h = Math.max(96, snap(session.startBound.h + deltaY));
      this.#applyRecord(node, record);
      this.#syncGeometry();
      return;
    }

    if (this.#marqueeSession?.pointerId === event.pointerId) {
      this.#updateMarquee(event.clientX, event.clientY);
    }
  };

  #onPointerUp = (event: PointerEvent): void => {
    if (this.#panSession?.pointerId === event.pointerId) {
      this.#panSession = null;
      this.#root.removeAttribute("data-edgeless-panning");
      this.#sync("Canvas panned");
    }

    if (this.#resizeSession?.pointerId === event.pointerId) {
      const node = this.#nodes.get(this.#resizeSession.nodeId);
      node?.removeAttribute("data-edgeless-resizing");
      this.#resizeSession = null;
      this.#commitSnapshot("Block resized");
    }

    if (this.#marqueeSession?.pointerId === event.pointerId) {
      const session = this.#marqueeSession;
      const point = this.#clientToCanvas(event.clientX, event.clientY);
      const selection = Bound.fromPoints([
        [session.startCanvasX, session.startCanvasY],
        [point.x, point.y],
      ]);
      const matches = [...this.#records.values()]
        .filter((record) => selection.isOverlapWithBound(record.bound))
        .map((record) => record.id);
      this.#marqueeSession = null;
      this.#marquee.hidden = true;
      this.#select(matches, session.additive);
      this.#sync(matches.length ? `${matches.length} blocks selected` : "Selection cleared");
    }
  };

  #updateMarquee(clientX: number, clientY: number): void {
    const session = this.#marqueeSession;
    if (!session) return;
    const viewport = this.#viewport.getBoundingClientRect();
    const left = Math.min(session.startClientX, clientX) - viewport.left;
    const top = Math.min(session.startClientY, clientY) - viewport.top;
    this.#marquee.style.left = `${left}px`;
    this.#marquee.style.top = `${top}px`;
    this.#marquee.style.inlineSize = `${Math.abs(clientX - session.startClientX)}px`;
    this.#marquee.style.blockSize = `${Math.abs(clientY - session.startClientY)}px`;
  }

  #onDragStart = (event: Event): void => {
    const node = this.#nodeForEvent(event);
    if (!node || this.#tool !== "select") return;
    const id = node.dataset.edgelessNode;
    if (!id) return;
    if (!this.#selectedIds.has(id)) this.#select([id]);
    this.#dragOrigins = new Map(
      [...this.#selectedIds]
        .map((selectedId) => {
          const record = this.#records.get(selectedId);
          return record ? ([selectedId, record.bound.clone()] as const) : null;
        })
        .filter((entry): entry is readonly [string, Bound] => Boolean(entry)),
    );
    this.#dragChanged = false;
    node.dataset.edgelessDragging = "";
    this.#bringForward(false);
  };

  #onDrag = (event: Event): void => {
    const node = this.#nodeForEvent(event);
    if (!node || !this.#dragOrigins) return;
    const detail = (event as CustomEvent<DragEventDetail>).detail;
    const deltaX = snap(detail.delta.x / this.#zoom);
    const deltaY = snap(detail.delta.y / this.#zoom);
    this.#dragChanged ||= deltaX !== 0 || deltaY !== 0;
    for (const [id, origin] of this.#dragOrigins) {
      const record = this.#records.get(id);
      const target = this.#nodes.get(id);
      if (!record || !target) continue;
      record.bound.x = origin.x + deltaX;
      record.bound.y = origin.y + deltaY;
      this.#applyRecord(target, record);
    }
    this.#syncGeometry();
  };

  #onDragEnd = (event: Event): void => {
    const node = this.#nodeForEvent(event);
    node?.removeAttribute("data-edgeless-dragging");
    this.#dragOrigins = null;
    if (this.#dragChanged) this.#commitSnapshot("Block moved");
    this.#dragChanged = false;
  };

  #onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const direction = event.deltaY > 0 ? -0.08 : 0.08;
      this.#setZoom(this.#zoom + direction, event.clientX, event.clientY);
      return;
    }
    this.#panX -= event.deltaX;
    this.#panY -= event.deltaY;
    this.#applyViewportTransform();
  };

  #onInput = (event: Event): void => {
    const field = elementFromPath(event, "[data-edgeless-field]") as ValueElement | null;
    if (!field || this.#selectedIds.size !== 1) return;
    const record = this.#records.get([...this.#selectedIds][0]!);
    const node = record ? this.#nodes.get(record.id) : null;
    const value = Number.parseFloat(field.value);
    const key = field.dataset.edgelessField;
    if (!record || !node || !Number.isFinite(value) || !key) return;
    if (key === "x") record.bound.x = snap(value);
    else if (key === "y") record.bound.y = snap(value);
    else if (key === "w") record.bound.w = Math.max(160, snap(value));
    else if (key === "h") record.bound.h = Math.max(96, snap(value));
    this.#applyRecord(node, record);
    this.#syncGeometry();
  };

  #onChange = (event: Event): void => {
    if (elementFromPath(event, "[data-edgeless-field]")) this.#commitSnapshot("Geometry updated");
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing || this.#eventOwnsTextInput(event)) return;
    const key = event.key.toLocaleLowerCase();
    if ((event.metaKey || event.ctrlKey) && key === "a") {
      event.preventDefault();
      this.#select(this.#records.keys());
      return;
    }
    if ((event.metaKey || event.ctrlKey) && key === "d") {
      event.preventDefault();
      this.#duplicateSelection();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && key === "z") {
      event.preventDefault();
      if (event.shiftKey) this.#redo();
      else this.#undo();
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      this.#deleteSelection();
      return;
    }
    if (event.key === "Escape") {
      this.#connectorSourceId = null;
      this.#root.removeAttribute("data-edgeless-connecting");
      this.#setTool("select");
      return;
    }
    if (key === "v") this.#setTool("select");
    else if (key === "h") this.#setTool("hand");
    else if (key === "f") this.#setTool("frame");
    else if (key === "t") this.#setTool("text");
    else if (key === "l") this.#setTool("connector");
    else if (key === "0") this.#fitRecords([...this.#records.values()]);
    else if (event.key === "+" || event.key === "=") this.#zoomBy(0.1);
    else if (event.key === "-") this.#zoomBy(-0.1);
    else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      const distance = event.shiftKey ? gridStep : 1;
      const x = event.key === "ArrowLeft" ? -distance : event.key === "ArrowRight" ? distance : 0;
      const y = event.key === "ArrowUp" ? -distance : event.key === "ArrowDown" ? distance : 0;
      this.#nudgeSelection(x, y);
    }
  };

  #eventOwnsTextInput(event: Event): boolean {
    return event
      .composedPath()
      .some(
        (node) =>
          node instanceof HTMLInputElement ||
          node instanceof HTMLTextAreaElement ||
          (node instanceof HTMLElement &&
            (node.isContentEditable || node.matches("ui-input, ui-textarea"))),
      );
  }

  #onFileUploadChange = (event: Event): void => {
    const detail = (event as CustomEvent<FileUploadChangeDetail>).detail;
    const upload = elementFromPath(event, "[data-editing-upload]");
    const container = upload?.closest<HTMLElement>("[data-editing-upload-container]");
    const node = upload?.closest<EdgelessDraggable>("[data-edgeless-node]");
    const file = detail.accepted[0];
    if (!upload || !container || !node || !file) {
      const reason = detail.rejected[0]?.reason;
      this.#sync(reason === "max-size" ? "That file is larger than 100 MB" : "File rejected");
      return;
    }
    const url = URL.createObjectURL(file);
    this.#assetUrls.add(url);
    renderUploadedFile(container, file, url, `canvas-asset-${++this.#assetCount}`);
    applyStageUtilityRecipes(container);
    this.#select([node.dataset.edgelessNode!]);
    this.#sync(`${file.name} added`);
  };

  #insertDefinition(definition: BlockDefinition): void {
    const viewport = this.#viewport.getBoundingClientRect();
    const center = this.#clientToCanvas(
      viewport.left + viewport.width / 2,
      viewport.top + viewport.height / 2,
    );
    const [width, height] = defaultNodeSize(definition.type);
    const bound = this.#findOpenBound(center.x, center.y, width, height);
    const record: EdgelessNodeRecord = {
      id: allocateBlockId(definition.type),
      kind: definition.type,
      title: definition.label,
      bound,
      z: ++this.#zIndex,
    };
    this.#mountNode(record);
    this.#rebuildLayerTree();
    this.#select([record.id]);
    this.#revealBound(record.bound);
    this.#commitSnapshot(`${definition.label} inserted`);
  }

  #findOpenBound(centerX: number, centerY: number, width: number, height: number): Bound {
    const step = gridStep * 5;
    const originX = snap(centerX - width / 2);
    const originY = snap(centerY - height / 2);
    const occupied = [...this.#records.values()].filter((record) => record.kind !== "frame");
    const visited = new Set<string>();

    for (let radius = 0; radius <= 18; radius += 1) {
      for (let y = -radius; y <= radius; y += 1) {
        for (let x = -radius; x <= radius; x += 1) {
          if (radius > 0 && Math.abs(x) !== radius && Math.abs(y) !== radius) continue;
          const candidateX = snap(
            clamp(originX + x * step, gridStep * 2, sceneBounds.w - width - gridStep * 2),
          );
          const candidateY = snap(
            clamp(originY + y * step, gridStep * 2, sceneBounds.h - height - gridStep * 2),
          );
          const key = `${candidateX}:${candidateY}`;
          if (visited.has(key)) continue;
          visited.add(key);
          const candidate = new Bound(candidateX, candidateY, width, height);
          const padded = candidate.expand(gridStep * 2);
          if (!occupied.some((record) => padded.isOverlapWithBound(record.bound))) return candidate;
        }
      }
    }

    return new Bound(originX, originY, width, height);
  }

  #revealBound(bound: Bound): void {
    const viewport = this.#viewport.getBoundingClientRect();
    const margin = 32;
    const toolbarClearance = 72;
    const left = this.#panX + bound.minX * this.#zoom;
    const right = this.#panX + bound.maxX * this.#zoom;
    const top = this.#panY + bound.minY * this.#zoom;
    const bottom = this.#panY + bound.maxY * this.#zoom;
    if (left < margin) this.#panX += margin - left;
    else if (right > viewport.width - margin) this.#panX -= right - viewport.width + margin;
    if (top < toolbarClearance) this.#panY += toolbarClearance - top;
    else if (bottom > viewport.height - margin) this.#panY -= bottom - viewport.height + margin;
    this.#applyViewportTransform();
  }

  #connectFrom(id: string): void {
    if (!this.#connectorSourceId) {
      this.#connectorSourceId = id;
      this.#root.dataset.edgelessConnecting = "";
      this.#select([id]);
      this.#sync("Choose a destination block");
      return;
    }
    if (this.#connectorSourceId === id) {
      this.#connectorSourceId = null;
      this.#root.removeAttribute("data-edgeless-connecting");
      this.#sync("Connector cancelled");
      return;
    }
    this.#connectors.push({
      id: allocateBlockId("connector"),
      source: this.#connectorSourceId,
      target: id,
    });
    this.#connectorSourceId = null;
    this.#root.removeAttribute("data-edgeless-connecting");
    this.#select([id]);
    this.#setTool("select");
    this.#commitSnapshot("Blocks connected");
  }

  #duplicateSelection(): void {
    if (this.#selectedIds.size === 0) return;
    const nextSelection: string[] = [];
    for (const id of this.#selectedIds) {
      const source = this.#records.get(id);
      if (!source) continue;
      const nextId = allocateBlockId(source.kind);
      const duplicate = this.#cloneRecord(source);
      duplicate.id = nextId;
      duplicate.title = `${source.title} copy`;
      duplicate.bound.x += 24;
      duplicate.bound.y += 24;
      duplicate.z = ++this.#zIndex;
      this.#mountNode(duplicate);
      nextSelection.push(nextId);
    }
    this.#rebuildLayerTree();
    this.#select(nextSelection);
    const firstDuplicate = this.#records.get(nextSelection[0] ?? "");
    if (firstDuplicate) this.#revealBound(firstDuplicate.bound);
    this.#commitSnapshot(
      `${nextSelection.length} block${nextSelection.length === 1 ? "" : "s"} duplicated`,
    );
  }

  #deleteSelection(): void {
    if (this.#selectedIds.size === 0) return;
    const removed = new Set(this.#selectedIds);
    for (const id of removed) {
      this.#nodes.get(id)?.remove();
      this.#nodes.delete(id);
      this.#records.delete(id);
    }
    this.#connectors = this.#connectors.filter(
      (connector) => !removed.has(connector.source) && !removed.has(connector.target),
    );
    this.#selectedIds.clear();
    this.#rebuildLayerTree();
    this.#commitSnapshot(`${removed.size} block${removed.size === 1 ? "" : "s"} deleted`);
    this.#sync();
  }

  #bringForward(commit = true): void {
    if (this.#selectedIds.size === 0) return;
    for (const id of this.#selectedIds) {
      const record = this.#records.get(id);
      const node = this.#nodes.get(id);
      if (!record || !node) continue;
      record.z = ++this.#zIndex;
      this.#applyRecord(node, record);
    }
    this.#rebuildLayerTree();
    if (commit) this.#commitSnapshot("Selection brought forward");
  }

  #nudgeSelection(x: number, y: number): void {
    if (this.#selectedIds.size === 0) return;
    for (const id of this.#selectedIds) {
      const record = this.#records.get(id);
      const node = this.#nodes.get(id);
      if (!record || !node) continue;
      record.bound.x += x;
      record.bound.y += y;
      this.#applyRecord(node, record);
    }
    this.#commitSnapshot("Selection nudged");
    this.#syncGeometry();
  }

  #focusComments(): void {
    const tabs = this.#root.querySelector<ValueElement>("[data-edgeless-inspector-tabs]");
    if (tabs) tabs.value = "comments";
    requestAnimationFrame(() =>
      this.#root.querySelector<HTMLElement>("[data-edgeless-comment-input]")?.focus(),
    );
  }

  #addComment(): void {
    const input = this.#root.querySelector<ValueElement>("[data-edgeless-comment-input]");
    const thread = this.#root.querySelector<HTMLElement>("[data-edgeless-comment-thread]");
    const value = input?.value.trim() ?? "";
    if (!input || !thread || !value) {
      this.#sync("Write a comment first");
      return;
    }
    const bubble = document.createElement("ui-bubble");
    bubble.setAttribute("variant", this.#commentCount % 2 === 0 ? "secondary" : "primary");
    const subject =
      this.#selectedIds.size === 1
        ? this.#records.get([...this.#selectedIds][0]!)?.title
        : undefined;
    bubble.textContent = subject ? `${subject}: ${value}` : value;
    thread.append(bubble);
    input.value = "";
    this.#commentCount += 1;
    const count = this.#root.querySelector<HTMLElement>("[data-edgeless-comment-count]");
    if (count) count.textContent = String(this.#commentCount);
    applyStageUtilityRecipes(bubble);
    this.#sync("Comment added");
  }

  #clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const viewport = this.#viewport.getBoundingClientRect();
    return {
      x: (clientX - viewport.left - this.#panX) / this.#zoom,
      y: (clientY - viewport.top - this.#panY) / this.#zoom,
    };
  }

  #zoomBy(delta: number): void {
    const viewport = this.#viewport.getBoundingClientRect();
    this.#setZoom(
      this.#zoom + delta,
      viewport.left + viewport.width / 2,
      viewport.top + viewport.height / 2,
    );
  }

  #setZoom(value: number, clientX: number, clientY: number): void {
    const next = clamp(value, minimumZoom, maximumZoom);
    if (next === this.#zoom) return;
    const anchor = this.#clientToCanvas(clientX, clientY);
    const viewport = this.#viewport.getBoundingClientRect();
    this.#zoom = next;
    this.#panX = clientX - viewport.left - anchor.x * next;
    this.#panY = clientY - viewport.top - anchor.y * next;
    this.#applyViewportTransform();
    this.#sync(`Zoom ${Math.round(next * 100)}%`);
  }

  #fitSelection(): void {
    const records = [...this.#selectedIds]
      .map((id) => this.#records.get(id))
      .filter((record): record is EdgelessNodeRecord => Boolean(record));
    this.#fitRecords(records.length ? records : [...this.#records.values()]);
  }

  #fitInitialView(): boolean {
    if (this.#initialViewFitted) return false;
    const viewport = this.#viewport.getBoundingClientRect();
    if (viewport.width < 240 || viewport.height < 240) return false;
    this.#initialViewFitted = true;
    this.#fitRecords([...this.#records.values()]);
    this.#sync("Canvas ready");
    return true;
  }

  #fitRecords(records: readonly EdgelessNodeRecord[]): void {
    if (records.length === 0) return;
    const viewport = this.#viewport.getBoundingClientRect();
    let bounds = records[0]!.bound.clone();
    for (const record of records.slice(1)) bounds = bounds.unite(record.bound);
    bounds = bounds.expand(48);
    this.#zoom = clamp(
      Math.min(viewport.width / Math.max(bounds.w, 1), viewport.height / Math.max(bounds.h, 1)),
      minimumZoom,
      1,
    );
    this.#panX = (viewport.width - bounds.w * this.#zoom) / 2 - bounds.x * this.#zoom;
    this.#panY = (viewport.height - bounds.h * this.#zoom) / 2 - bounds.y * this.#zoom;
    this.#applyViewportTransform();
    this.#sync("Content fitted");
  }

  #applyViewportTransform(): void {
    this.#scene.style.transform = `translate(${this.#panX}px, ${this.#panY}px) scale(${this.#zoom})`;
    const spacing = gridStep * 2 * this.#zoom;
    this.#viewport.style.backgroundSize = `${spacing}px ${spacing}px`;
    this.#viewport.style.backgroundPosition = `${this.#panX % spacing}px ${this.#panY % spacing}px`;
    const output = this.#root.querySelector<HTMLOutputElement>("[data-edgeless-zoom]");
    if (output) output.value = `${Math.round(this.#zoom * 100)}%`;
    this.#positionSelectionToolbar();
    this.#updateMinimap();
  }

  #syncGeometry(): void {
    this.#updateConnectors();
    this.#syncFrameCounts();
    this.#syncInspector();
    this.#positionSelectionToolbar();
    this.#updateMinimap();
  }

  #updateConnectors(): void {
    this.#connectorLayer.replaceChildren();
    for (const connector of this.#connectors) {
      const source = this.#records.get(connector.source)?.bound;
      const target = this.#records.get(connector.target)?.bound;
      if (!source || !target) continue;
      const leftToRight = source.center[0] <= target.center[0];
      const startX = leftToRight ? source.maxX : source.minX;
      const endX = leftToRight ? target.minX : target.maxX;
      const startY = source.center[1];
      const endY = target.center[1];
      const curve = Math.max(48, Math.abs(endX - startX) * 0.45);
      const direction = leftToRight ? 1 : -1;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute(
        "d",
        `M ${startX} ${startY} C ${startX + curve * direction} ${startY}, ${endX - curve * direction} ${endY}, ${endX} ${endY}`,
      );
      path.setAttribute("class", "example-edgeless-connector-line");
      const endpoint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      endpoint.setAttribute("cx", String(endX));
      endpoint.setAttribute("cy", String(endY));
      endpoint.setAttribute("r", "4");
      endpoint.setAttribute("class", "example-edgeless-connector-end");
      this.#connectorLayer.append(path, endpoint);
    }
    applyStageUtilityRecipes(this.#connectorLayer);
  }

  #syncFrameCounts(): void {
    const frames = [...this.#records.values()].filter((record) => record.kind === "frame");
    for (const frame of frames) {
      const count = [...this.#records.values()].filter(
        (record) => record.kind !== "frame" && frame.bound.containsPoint(record.bound.center),
      ).length;
      const output = this.#nodes
        .get(frame.id)
        ?.querySelector<HTMLElement>("[data-edgeless-frame-count]");
      if (output) output.textContent = `${count} block${count === 1 ? "" : "s"}`;
    }
  }

  #rebuildLayerTree(): void {
    const tree = this.#root.querySelector<HTMLElement>("[data-edgeless-layer-tree]");
    if (!tree) return;
    tree.replaceChildren();
    const records = [...this.#records.values()].sort((left, right) => right.z - left.z);
    for (const record of records) {
      const item = document.createElement("ui-tree-item");
      item.setAttribute("title", record.title);
      item.setAttribute("kind", record.kind === "frame" ? "folder" : "file");
      item.dataset.edgelessLayer = record.id;
      tree.append(item);
    }
    const count = this.#root.querySelector<HTMLElement>("[data-edgeless-layer-count]");
    if (count) count.textContent = String(records.length);
    applyStageUtilityRecipes(tree);
    this.#syncLayerSelection();
  }

  #syncLayerSelection(): void {
    for (const item of this.#root.querySelectorAll<HTMLElement>("[data-edgeless-layer]")) {
      item.toggleAttribute("selected", this.#selectedIds.has(item.dataset.edgelessLayer ?? ""));
    }
  }

  #syncInspector(): void {
    const records = [...this.#selectedIds]
      .map((id) => this.#records.get(id))
      .filter((record): record is EdgelessNodeRecord => Boolean(record));
    const first = records[0];
    const title = this.#root.querySelector<HTMLElement>("[data-edgeless-selection-title]");
    const kind = this.#root.querySelector<HTMLElement>("[data-edgeless-selection-kind]");
    const count = this.#root.querySelector<HTMLElement>("[data-edgeless-selection-count]");
    if (title) title.textContent = first ? first.title : "Nothing selected";
    if (kind)
      kind.textContent = records.length > 1 ? "Multiple block types" : (first?.kind ?? "Canvas");
    if (count) count.textContent = String(records.length);

    for (const field of this.#root.querySelectorAll<ValueElement>("[data-edgeless-field]")) {
      field.disabled = records.length !== 1;
      const key = field.dataset.edgelessField as "h" | "w" | "x" | "y" | undefined;
      field.value = first && key ? String(Math.round(first.bound[key])) : "";
    }
  }

  #positionSelectionToolbar(): void {
    const nodes = [...this.#selectedIds]
      .map((id) => this.#nodes.get(id))
      .filter((node): node is EdgelessDraggable => Boolean(node));
    this.#selectionToolbar.hidden = nodes.length === 0;
    if (nodes.length === 0) return;
    const root = this.#root.getBoundingClientRect();
    const rects = nodes.map((node) => Bound.fromDOMRect(node.getBoundingClientRect()));
    let bounds = rects[0]!;
    for (const rect of rects.slice(1)) bounds = bounds.unite(rect);
    const width = this.#selectionToolbar.getBoundingClientRect().width || 180;
    const left = clamp(bounds.center[0] - root.left - width / 2, 8, root.width - width - 8);
    let top = bounds.minY - root.top - 44;
    if (top < 56) top = bounds.maxY - root.top + 8;
    this.#selectionToolbar.style.left = `${left}px`;
    this.#selectionToolbar.style.top = `${top}px`;
  }

  #updateMinimap(): void {
    this.#minimap.replaceChildren();
    for (const record of this.#records.values()) {
      const node = document.createElement("span");
      node.className = "example-edgeless-minimap-node";
      node.toggleAttribute("data-edgeless-selected", this.#selectedIds.has(record.id));
      node.style.left = `${(record.bound.x / sceneBounds.w) * 100}%`;
      node.style.top = `${(record.bound.y / sceneBounds.h) * 100}%`;
      node.style.inlineSize = `${Math.max(2, (record.bound.w / sceneBounds.w) * 100)}%`;
      node.style.blockSize = `${Math.max(2, (record.bound.h / sceneBounds.h) * 100)}%`;
      this.#minimap.append(node);
    }
    const viewport = this.#viewport.getBoundingClientRect();
    const view = document.createElement("span");
    view.className = "example-edgeless-minimap-view";
    view.style.left = `${(-this.#panX / this.#zoom / sceneBounds.w) * 100}%`;
    view.style.top = `${(-this.#panY / this.#zoom / sceneBounds.h) * 100}%`;
    view.style.inlineSize = `${(viewport.width / this.#zoom / sceneBounds.w) * 100}%`;
    view.style.blockSize = `${(viewport.height / this.#zoom / sceneBounds.h) * 100}%`;
    this.#minimap.append(view);
    applyStageUtilityRecipes(this.#minimap);
  }

  #sync(message?: string): void {
    for (const [id, node] of this.#nodes) {
      const selected = this.#selectedIds.has(id);
      node.setAttribute("aria-selected", String(selected));
      node.toggleAttribute("data-edgeless-selected", selected);
      node.toggleAttribute("data-edgeless-connector-source", this.#connectorSourceId === id);
    }
    this.#syncLayerSelection();
    this.#syncInspector();
    this.#syncHistoryButtons();
    this.#updateConnectors();
    this.#syncFrameCounts();
    this.#positionSelectionToolbar();
    this.#updateMinimap();
    const count = this.#root.querySelector<HTMLElement>("[data-edgeless-node-count]");
    if (count) count.textContent = String(this.#records.size);
    if (message) {
      const status = this.#root.querySelector<HTMLOutputElement>("[data-edgeless-status]");
      if (status) status.value = message;
    }
  }

  #snapshot(): EdgelessSnapshot {
    return {
      nodes: [...this.#records.values()].map(({ bound, ...record }) => ({
        ...record,
        xywh: bound.toXYWH(),
      })),
      connectors: this.#connectors.map((connector) => ({ ...connector })),
      selection: [...this.#selectedIds],
    };
  }

  #commitSnapshot(message?: string): void {
    const snapshot = this.#snapshot();
    this.#history.splice(this.#historyIndex + 1);
    this.#history.push(snapshot);
    if (this.#history.length > 30) this.#history.shift();
    this.#historyIndex = this.#history.length - 1;
    this.#syncHistoryButtons();
    if (message) this.#sync(message);
  }

  #restoreSnapshot(snapshot: EdgelessSnapshot): void {
    for (const node of this.#nodes.values()) node.remove();
    this.#nodes.clear();
    this.#records.clear();
    this.#selectedIds.clear();
    for (const node of snapshot.nodes) {
      const { xywh, ...record } = node;
      this.#mountNode({ ...record, bound: Bound.fromXYWH(xywh) });
    }
    this.#connectors = snapshot.connectors.map((connector) => ({ ...connector }));
    for (const id of snapshot.selection) if (this.#records.has(id)) this.#selectedIds.add(id);
    this.#zIndex = Math.max(0, ...[...this.#records.values()].map((record) => record.z));
    this.#rebuildLayerTree();
    this.#sync();
  }

  #undo(): void {
    if (this.#historyIndex <= 0) return;
    this.#historyIndex -= 1;
    this.#restoreSnapshot(this.#history[this.#historyIndex]!);
    this.#sync("Undo");
  }

  #redo(): void {
    if (this.#historyIndex >= this.#history.length - 1) return;
    this.#historyIndex += 1;
    this.#restoreSnapshot(this.#history[this.#historyIndex]!);
    this.#sync("Redo");
  }

  #syncHistoryButtons(): void {
    const undo = this.#root.querySelector<ValueElement>("[data-edgeless-action='undo']");
    const redo = this.#root.querySelector<ValueElement>("[data-edgeless-action='redo']");
    if (undo) undo.disabled = this.#historyIndex <= 0;
    if (redo) redo.disabled = this.#historyIndex >= this.#history.length - 1;
  }
}

const edgelessPlaygrounds = new Map<HTMLElement, EdgelessPlayground>();

function reconcileEdgelessPlaygrounds(): void {
  for (const [root, playground] of edgelessPlaygrounds) {
    if (!root.isConnected) {
      playground.destroy();
      edgelessPlaygrounds.delete(root);
    }
  }
  for (const root of document.querySelectorAll<HTMLElement>("[data-catalog-edgeless-playground]")) {
    if (!edgelessPlaygrounds.has(root)) {
      edgelessPlaygrounds.set(root, new EdgelessPlayground(root));
    }
  }
}

const edgelessPlaygroundObserver = new MutationObserver(reconcileEdgelessPlaygrounds);

function observeEdgelessPlaygrounds(): void {
  edgelessPlaygroundObserver.observe(document.documentElement, { childList: true, subtree: true });
  reconcileEdgelessPlaygrounds();
}

if (document.documentElement) observeEdgelessPlaygrounds();
else document.addEventListener("DOMContentLoaded", observeEdgelessPlaygrounds, { once: true });

const edgelessPlaygroundHot = (
  import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }
).hot;
edgelessPlaygroundHot?.dispose(() => {
  edgelessPlaygroundObserver.disconnect();
  for (const playground of edgelessPlaygrounds.values()) playground.destroy();
  edgelessPlaygrounds.clear();
});
