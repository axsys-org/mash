import { select } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import type { D3ZoomEvent, ZoomBehavior, ZoomTransform } from "d3-zoom";
import { computeTree } from "./geometry.js";
import type { TreeBox, TreeDirection } from "./geometry.js";

/** Consumer-owned HTML box. Identity and parent strings have no application semantics here.
 * @tag goo-tree-node
 * @summary An ordinary HTML box positioned by goo-tidy-tree.
 * @mashnode root root
 * @example Consumer-owned content
 * <goo-tidy-tree>
 *   <goo-tree-node subject="/app"><button>Inspect</button></goo-tree-node>
 * </goo-tidy-tree>
 * @attr {string} subject - Required opaque identity.
 * @attr {string} parent - Optional parent subject; omit for the root.
 */
export class GooTreeNode extends HTMLElement {}

/** Spatial layout of direct light-DOM goo-tree-node children.
 * @tag goo-tidy-tree
 * @summary Measures and spatializes an already-rendered parent relation.
 * @mashnode root root
 * @mashnode viewport viewport root
 * @mashnode scene content viewport
 * @mashnode edges indicator scene
 * @mashnode children children scene
 * @mashnode layout layout root
 * @mashrole part viewport viewport viewport
 * @mashrole part scene content scene
 * @mashrole part edges indicator edges
 * @mashrole slot default children children
 * @mashrole event goo-tree-layout layout layout
 * @example HTML node-link tree
 * <goo-tidy-tree direction="right" zoom fit>
 *   <goo-tree-node subject="/app"><article>Application</article></goo-tree-node>
 *   <goo-tree-node subject="/app/cards" parent="/app"><button>Inspect cards</button></goo-tree-node>
 * </goo-tidy-tree>
 * @attr {string} direction - right (default), left, down, or up.
 * @attr {number} gap - Clear sibling/subtree spacing, default 24px.
 * @attr {number} level-gap - Clear parent/child spacing, default 64px.
 * @attr {boolean} zoom - Enable background pan and zoom.
 * @attr {boolean} fit - Fit once after the first valid, visible layout.
 * @slot - Consumer-owned goo-tree-node elements.
 * @csspart viewport - Scrollable camera viewport.
 * @csspart scene - Shared coordinate layer for HTML and edges.
 * @csspart edges - Noninteractive SVG link layer.
 * @cssprop --goo-tree-edge-width - Edge stroke width (default 1.5px).
 * @cssprop --goo-tree-edge-opacity - Edge opacity (default 0.35).
 * @fires goo-tree-layout - Successful layout: detail { nodeCount, width, height }.
 */
export class GooTidyTree extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["direction", "gap", "level-gap", "zoom", "fit"];
  }

  private readonly viewport: HTMLDivElement;
  private readonly scene: HTMLDivElement;
  private readonly edges: SVGSVGElement;
  private readonly membershipObserver = new MutationObserver(() => {
    this.refreshNodes();
    this.layout();
  });
  private readonly relationObserver = new MutationObserver(() => this.layout());
  private readonly sizes = new Map<Element, { width: number; height: number }>();
  private readonly resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const size = entry.borderBoxSize[0];
      if (entry.target !== this.viewport && size) {
        // borderBoxSize follows writing mode, whereas the layout uses physical axes.
        const vertical =
          getComputedStyle(entry.target).writingMode.startsWith("vertical") ||
          getComputedStyle(entry.target).writingMode.startsWith("sideways");
        this.sizes.set(entry.target, {
          width: vertical ? size.blockSize : size.inlineSize,
          height: vertical ? size.inlineSize : size.blockSize,
        });
      }
    }
    this.layout();
  });
  private nodes: HTMLElement[] = [];
  private boxes = new Map<string, TreeBox>();
  private frame: number | undefined;
  private width = 0;
  private height = 0;
  private camera = zoomIdentity;
  private zoomBehavior: ZoomBehavior<HTMLDivElement, unknown> | undefined;
  private fitted = false;
  private lastError: string | undefined;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      :host { display: block; min-width: 0; height: 400px; }
      [part=viewport] { position: relative; width: 100%; height: 100%; overflow: auto; }
      :host([zoom]) [part=viewport] { overflow: hidden; }
      [part=scene] { position: relative; transform-origin: top left; isolation: isolate; }
      [part=edges] { position: absolute; inset: 0; pointer-events: none; fill: none;
        stroke: currentColor; stroke-width: var(--goo-tree-edge-width, 1.5px);
        opacity: var(--goo-tree-edge-opacity, 0.35); }
      slot { display: contents; }
      ::slotted(goo-tree-node) { position: absolute; display: block; left: 0; top: 0;
        width: max-content; transform-origin: top left; z-index: 1; }
      :host([data-layout-invalid]) ::slotted(goo-tree-node) {
        position: relative; transform: none !important;
      }
    </style>
    <div part="viewport"><div part="scene">
      <svg part="edges" aria-hidden="true"></svg><slot></slot>
    </div></div>`;
    this.viewport = shadow.querySelector<HTMLDivElement>("[part=viewport]")!;
    this.scene = shadow.querySelector<HTMLDivElement>("[part=scene]")!;
    this.edges = shadow.querySelector<SVGSVGElement>("svg")!;
  }

  connectedCallback(): void {
    this.membershipObserver.observe(this, { childList: true });
    this.refreshNodes();
    this.resizeObserver.observe(this.viewport);
    this.setupZoom();
    this.layout();
  }

  disconnectedCallback(): void {
    this.membershipObserver.disconnect();
    this.relationObserver.disconnect();
    this.resizeObserver.disconnect();
    this.sizes.clear();
    this.nodes = [];
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.teardownZoom();
  }

  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (oldValue === value || !this.isConnected) return;
    if (name === "zoom") this.setupZoom();
    this.layout();
  }

  private refreshNodes(): void {
    const next = Array.from(this.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.localName === "goo-tree-node",
    );
    const membership = new Set(next);
    for (const node of this.nodes) {
      if (!membership.has(node)) {
        this.resizeObserver.unobserve(node);
        this.sizes.delete(node);
        node.style.removeProperty("transform");
      }
    }
    this.relationObserver.disconnect();
    const previous = new Set(this.nodes);
    for (const node of next) {
      if (!previous.has(node)) this.resizeObserver.observe(node, { box: "border-box" });
      this.relationObserver.observe(node, {
        attributes: true,
        attributeFilter: ["subject", "parent"],
      });
    }
    this.nodes = next;
  }

  /** Schedule a layout; repeated calls in one frame are coalesced. */
  layout(): void {
    if (!this.isConnected || this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.performLayout();
    });
  }

  private performLayout(): void {
    // Read all untransformed border boxes before writing any geometry. RO provides
    // fractional measurements; offset dimensions are a first-frame fallback only.
    const records = this.nodes.map((el) => ({
      id: el.getAttribute("subject") ?? "",
      parentId: el.getAttribute("parent"),
      el,
      width: this.sizes.get(el)?.width ?? el.offsetWidth,
      height: this.sizes.get(el)?.height ?? el.offsetHeight,
    }));
    const direction = this.getAttribute("direction");
    const orientation: TreeDirection =
      direction === "left" || direction === "up" || direction === "down" ? direction : "right";
    let result: ReturnType<typeof computeTree>;
    try {
      result = computeTree(
        records,
        orientation,
        this.spacing("gap", 24),
        this.spacing("level-gap", 64),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== this.lastError) console.warn(message);
      this.lastError = message;
      this.boxes.clear();
      this.width = this.height = 0;
      this.edges.replaceChildren();
      this.edges.setAttribute("width", "0");
      this.edges.setAttribute("height", "0");
      this.scene.style.width = this.scene.style.height = "";
      this.scene.style.transform = "none";
      // Keep invalid membership readable in normal flow; never replace its DOM.
      this.setAttribute("data-layout-invalid", "");
      return;
    }
    this.lastError = undefined;
    this.removeAttribute("data-layout-invalid");
    this.width = result.width;
    this.height = result.height;
    this.boxes = new Map(result.boxes.map((box) => [box.id, box]));
    this.scene.style.width = `${this.width}px`;
    this.scene.style.height = `${this.height}px`;
    for (const box of result.boxes) {
      box.el.style.transform = `translate(${box.x}px, ${box.y}px)`;
    }
    this.edges.setAttribute("width", String(this.width));
    this.edges.setAttribute("height", String(this.height));
    const paths = result.paths.map((d) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      return path;
    });
    this.edges.replaceChildren(...paths);
    this.applyCamera();
    if (this.hasAttribute("fit") && !this.fitted && records.some((r) => r.width && r.height)) {
      this.fitted = this.fit();
    }
    this.dispatchEvent(
      new CustomEvent("goo-tree-layout", {
        bubbles: true,
        detail: { nodeCount: records.length, width: this.width, height: this.height },
      }),
    );
  }

  private spacing(name: string, fallback: number): number {
    const raw = this.getAttribute(name);
    const value = raw?.trim() ? Number(raw) : NaN;
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  /** Fit current layout, with or without interactive zoom. Returns false before layout or when hidden. */
  fit(): boolean {
    const width = this.viewport.clientWidth;
    const height = this.viewport.clientHeight;
    if (!this.width || !this.height || !width || !height) return false;
    const k = Math.min(width / this.width, height / this.height, 1);
    this.setCamera(
      zoomIdentity.translate((width - this.width * k) / 2, (height - this.height * k) / 2).scale(k),
    );
    return true;
  }

  /** Center a subject at the current scale; no selection or other application state. */
  center(subject: string): boolean {
    const box = this.boxes.get(subject);
    if (!box) return false;
    const k = this.camera.k;
    this.setCamera(
      zoomIdentity
        .translate(
          this.viewport.clientWidth / 2 - (box.x + box.width / 2) * k,
          this.viewport.clientHeight / 2 - (box.y + box.height / 2) * k,
        )
        .scale(k),
    );
    return true;
  }

  private setCamera(camera: ZoomTransform): void {
    this.viewport.scrollLeft = this.viewport.scrollTop = 0;
    if (this.zoomBehavior) select(this.viewport).call(this.zoomBehavior.transform, camera);
    else {
      this.camera = camera;
      this.applyCamera();
    }
  }

  private applyCamera(): void {
    this.scene.style.transform = `translate(${this.camera.x}px, ${this.camera.y}px) scale(${this.camera.k})`;
  }

  private setupZoom(): void {
    this.teardownZoom();
    if (!this.hasAttribute("zoom")) return;
    this.zoomBehavior = zoom<HTMLDivElement, unknown>()
      .extent(() => [
        [0, 0],
        [this.viewport.clientWidth, this.viewport.clientHeight],
      ])
      .scaleExtent([0.01, 8])
      .filter((event: Event & { button?: number; ctrlKey?: boolean }) => {
        // composedPath sees through shadow roots in arbitrary nested Goo UI.
        const insideNode = event
          .composedPath()
          .some((target) => target instanceof Element && target.localName === "goo-tree-node");
        return (
          !insideNode &&
          !this.lastError &&
          !event.button &&
          (!event.ctrlKey || event.type === "wheel")
        );
      })
      .on("zoom", (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
        if (!this.isConnected || !this.hasAttribute("zoom")) return;
        this.camera = event.transform;
        this.applyCamera();
      });
    select(this.viewport).call(this.zoomBehavior).call(this.zoomBehavior.transform, this.camera);
  }

  private teardownZoom(): void {
    select(this.viewport).on(".zoom", null);
    this.zoomBehavior = undefined;
    this.viewport.style.removeProperty("-webkit-tap-highlight-color");
  }
}
