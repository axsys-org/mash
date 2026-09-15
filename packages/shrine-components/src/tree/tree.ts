import { LitElement, html, svg, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { projectEdges, type GraphEdge } from "./topology.js";

interface GraphItem extends HTMLElement {
  identity?: string;
  current?: boolean;
  selected?: boolean;
  disabled?: boolean;
  focusControl?: () => void;
}

interface GraphNode {
  item: GraphItem;
  id: string;
  lane: number;
  x: number;
  y: number;
  current: boolean;
  selected: boolean;
  capsule: boolean;
  label: string;
  capsuleX: number;
  capsuleWidth: number;
}

/** The visual pronunciation supplied by an opt-in Shrine recipe. */
export type ShrineTreeVariant = "inline" | "ledger" | "lineage" | "namespace";

const MAX_LANES = 12;
const DEFAULT_LANE_STEP = 16;

/**
 * Shrine revision or namespace presentation composed over an authored `ui-tree`.
 *
 * `sh-tree` deliberately does not duplicate tree selection, disclosure,
 * keyboard navigation, or ARIA ownership. The slotted `ui-tree` remains the
 * sole interactive hierarchy while this component derives a revision graph
 * from its visible items. Inline nodes and ledger capsules are pointer proxies
 * for their real tree rows; they never create another focus stop or selection
 * store.
 *
 * `variant="namespace"` keeps the native nested hierarchy and its quiet guide
 * lanes. It does not measure or render revision nodes, connections or pointer
 * proxies. Inline data belongs in the item's `preview` slot; the same row's
 * expansion reveals that data before its child names, including lazy folders.
 *
 * Give each item a stable `value`, an integer `data-shrine-lane`, and an
 * optional whitespace- or comma-separated `data-shrine-parents` list. When a
 * parent list is omitted, the item connects to the next visible item in the
 * same lane. An explicit empty `data-shrine-parents=""` declares a root with
 * no outgoing connection. Use explicit parents for namespace trees: sibling
 * order is not revision ancestry. Detail rows may opt out with `data-shrine-graph="none"`. Empty
 * namespace containers are never silently removed: author a
 * real item when the address is meaningful, or project a compact item before
 * rendering and record its source with `data-shrine-compressed-from`.
 *
 * @tag sh-tree
 * @summary Presents Shrine namespace hierarchies or revision lanes over an accessible authored tree.
 *
 * @example Revision lineage
 * <sh-tree>
 *   <ui-tree slot="tree" label="Shrine revisions">
 *     <ui-tree-item value="head" title="Current revision" data-shrine-lane="0" data-shrine-parents="main" current></ui-tree-item>
 *     <ui-tree-item value="main" title="Main lineage" data-shrine-lane="0"></ui-tree-item>
 *   </ui-tree>
 * </sh-tree>
 *
 * @slot tree - The one authored `ui-tree` that owns hierarchy behavior.
 * @attr variant - `namespace` preserves the native nested hierarchy without graph nodes; `lineage` keeps an open graph gutter; `inline` places rows beside their own lanes; `ledger` emphasizes dense capsule topology.
 * @csspart root - The Shrine revision-tree boundary.
 * @csspart graph - The decorative graph layer.
 * @csspart canvas - The SVG canvas containing graph edges and nodes.
 * @csspart edge - Every visible parent edge; also exposes `lane-N` and `edge-lane-N`.
 * @csspart node - Every visible revision node; also exposes `lane-N`, `current`, and `selected`.
 * @csspart node-anchor - A selectable inline graph-node hit region.
 * @csspart node-hit-target - The transparent minimum pointer target around a visible node.
 * @csspart capsule - A ledger node capsule that activates its corresponding tree item.
 * @csspart capsule-shape - The painted capsule boundary.
 * @csspart capsule-label - The stable node identity inside a capsule.
 * @csspart capsule-current - A capsule whose corresponding tree item is current.
 * @csspart capsule-selected - A capsule whose corresponding tree item is selected.
 * @csspart current - A graph node whose authored tree item is current.
 * @csspart selected - A graph node whose authored tree item is selected.
 * @csspart lane-0 - Revision lane zero; lanes one through seven follow the same contract.
 * @csspart lane-1 - Revision lane one.
 * @csspart lane-2 - Revision lane two.
 * @csspart lane-3 - Revision lane three.
 * @csspart lane-4 - Revision lane four.
 * @csspart lane-5 - Revision lane five.
 * @csspart lane-6 - Revision lane six.
 * @csspart lane-7 - Revision lane seven.
 * @csspart tree - The authored interactive tree lane.
 *
 * @mashnode root root
 * @mashnode graph graph root
 * @mashnode canvas canvas graph
 * @mashnode edge edge canvas
 * @mashnode node node canvas
 * @mashnode node-anchor node-anchor canvas
 * @mashnode node-hit-target node-hit-target node-anchor
 * @mashnode capsule capsule canvas
 * @mashnode capsule-shape capsule-shape capsule
 * @mashnode capsule-label capsule-label capsule
 * @mashnode tree tree root
 * @mashrole slot tree tree tree
 * @mashrole part graph graph graph
 * @mashrole part edge edge edge
 * @mashrole part node node node
 * @mashrole part capsule capsule capsule
 */
export class ShrineTree extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
    _nodes: { state: true },
    _edges: { state: true },
    _width: { state: true },
    _height: { state: true },
  };

  /** Visual graph pronunciation; it never changes hierarchy behavior. */
  declare variant: ShrineTreeVariant;

  declare private _nodes: GraphNode[];
  declare private _edges: GraphEdge[];
  declare private _width: number;
  declare private _height: number;

  static override styles = baseStyles;

  readonly #mutations = new MutationObserver(() => this.#queueGraph());
  readonly #resize = new ResizeObserver(() => this.#queueGraph());
  #tree: HTMLElement | undefined;
  #frame: number | undefined;

  constructor() {
    super();
    this.variant = "lineage";
    this._nodes = [];
    this._edges = [];
    this._width = 0;
    this._height = 0;
  }

  protected override firstUpdated(): void {
    this.#connectTree();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("variant")) this.#queueGraph();
  }

  override disconnectedCallback(): void {
    this.#disconnectTree();
    super.disconnectedCallback();
  }

  /** Recomputes the decorative graph after non-DOM application state changes. */
  refreshGraph(): void {
    this.#queueGraph();
  }

  #onTreeSlotChange = (): void => {
    this.#connectTree();
  };

  #disconnectTree(): void {
    this.#mutations.disconnect();
    this.#resize.disconnect();
    if (this.#frame !== undefined) cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    this.#tree = undefined;
  }

  #connectTree(): void {
    this.#disconnectTree();
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="tree"]');
    const tree = slot
      ?.assignedElements({ flatten: true })
      .find((element): element is HTMLElement => element.localName === "ui-tree");
    if (!tree) {
      this._nodes = [];
      this._edges = [];
      this.style.setProperty("--sh-tree-lane-count", "1");
      this.style.setProperty("--sh-tree-capsule-reserve", "0px");
      return;
    }

    this.#tree = tree;
    this.#mutations.observe(tree, {
      attributes: true,
      attributeFilter: [
        "current",
        "data-shrine-lane",
        "data-shrine-parents",
        "data-shrine-graph",
        "data-shrine-capsule",
        "expanded",
        "hidden",
        "path",
        "selected",
        "title",
        "value",
      ],
      childList: true,
      subtree: true,
    });
    this.#resize.observe(this);
    this.#resize.observe(tree);
    this.#queueGraph();
  }

  #queueGraph(): void {
    if (!this.isConnected || this.#frame !== undefined) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = undefined;
      this.#measureGraph();
    });
  }

  #lane(item: HTMLElement): number {
    const value = Number.parseInt(item.dataset.shrineLane ?? "0", 10);
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), MAX_LANES - 1) : 0;
  }

  #laneStep(): number {
    const raw = getComputedStyle(this).getPropertyValue("--sh-tree-lane-step").trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LANE_STEP;
  }

  #identity(item: GraphItem, index: number): string {
    return (
      item.identity ||
      item.getAttribute("value") ||
      item.getAttribute("path") ||
      item.getAttribute("title") ||
      `shrine-revision-${index}`
    );
  }

  #capsuleLabel(item: GraphItem, identity: string): string {
    return item.dataset.shrineCapsule?.trim() || identity;
  }

  #capsuleWidth(label: string): number {
    // SVG text metrics are not available until after paint. Stable node ids use
    // the catalogue code face, so a bounded character estimate avoids a second
    // layout pass while preserving room for user-authored capsule labels.
    return Math.min(Math.max(label.length * 7 + 18, 38), 104);
  }

  #parents(item: HTMLElement): string[] | undefined {
    if (!item.hasAttribute("data-shrine-parents")) return undefined;
    return (item.dataset.shrineParents ?? "")
      .split(/[\s,]+/u)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  #measureGraph(): void {
    const tree = this.#tree;
    if (!tree || !this.isConnected) return;

    if (this.variant === "namespace") {
      // A namespace row is already positioned by its real ui-tree ancestry.
      // Never turn sibling order, lane metadata or an expanded preview into
      // revision geometry, and release any offsets from a previous variant.
      tree.querySelectorAll<HTMLElement>("ui-tree-item").forEach((item) => {
        if (item.closest("ui-tree") !== tree) return;
        item.style.removeProperty("--_sh-tree-item-inline-start");
      });
      if (this._nodes.length) this._nodes = [];
      if (this._edges.length) this._edges = [];
      this.style.setProperty("--sh-tree-lane-count", "1");
      this.style.setProperty("--sh-tree-capsule-reserve", "0px");
      return;
    }

    const hostRect = this.getBoundingClientRect();
    const laneStep = this.#laneStep();
    const rightToLeft = getComputedStyle(this).direction === "rtl";
    const items = [...tree.querySelectorAll<GraphItem>("ui-tree-item")].filter(
      (item) => item.closest("ui-tree") === tree && item.dataset.shrineGraph !== "none",
    );
    const measured = items
      .map((item, index) => {
        const control = item.shadowRoot?.querySelector<HTMLElement>('[part="control"]');
        const rect = control?.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return undefined;
        const lane = this.#lane(item);
        const lanePosition = laneStep * (lane + 1);
        const id = this.#identity(item, index);
        const label = this.#capsuleLabel(item, id);
        const capsuleWidth = this.#capsuleWidth(label);
        const capsule = this.variant === "ledger" || item.hasAttribute("data-shrine-capsule");
        const x = rightToLeft ? hostRect.width - lanePosition : lanePosition;
        const itemInlineStart = lanePosition + (capsule ? capsuleWidth - 6 : 10);
        const itemInlineStartValue = `${itemInlineStart}px`;
        if (item.style.getPropertyValue("--_sh-tree-item-inline-start") !== itemInlineStartValue) {
          item.style.setProperty("--_sh-tree-item-inline-start", itemInlineStartValue);
        }
        return {
          item,
          node: {
            item,
            id,
            lane,
            x,
            y: rect.top - hostRect.top + rect.height / 2,
            current: item.current ?? item.hasAttribute("current"),
            selected: item.selected ?? item.hasAttribute("selected"),
            capsule,
            label,
            capsuleX: rightToLeft ? x - capsuleWidth + 6 : x - 6,
            capsuleWidth,
          } satisfies GraphNode,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

    const nodes = measured.map(({ node }) => node);
    const edges = projectEdges(
      measured.map(({ item, node }) => ({
        ...node,
        parents: this.#parents(item),
      })),
    );

    this._width = Math.max(hostRect.width, laneStep);
    this._height = Math.max(hostRect.height, 1);
    this._nodes = nodes;
    this._edges = edges;
    const laneCount = nodes.reduce((count, node) => Math.max(count, node.lane + 1), 1);
    const capsuleReserve = nodes.reduce((reserve, node) => Math.max(reserve, node.capsuleWidth), 0);
    this.style.setProperty("--sh-tree-lane-count", String(laneCount));
    this.style.setProperty("--sh-tree-capsule-reserve", `${capsuleReserve}px`);
  }

  #activateCapsule(event: Event, node: GraphNode): void {
    event.preventDefault();
    event.stopPropagation();
    const item = node.item;
    if (!item || item.disabled || item.hasAttribute("disabled")) return;
    item.focusControl?.();
    item.dispatchEvent(new CustomEvent("ui-tree-item-select", { bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    return html`
      <div part="root">
        <div part="graph" aria-hidden="true" ?hidden=${this.variant === "namespace"}>
          <svg
            part="canvas"
            viewBox=${`0 0 ${this._width} ${this._height}`}
            preserveAspectRatio="none"
            focusable="false"
          >
            ${this._edges.map(
              (edge) => svg`<path
                part=${`edge lane-${edge.lane} edge-lane-${edge.lane}`}
                d=${edge.path}
                vector-effect="non-scaling-stroke"
              ></path>`,
            )}
            ${this._nodes.map((node) =>
              node.capsule
                ? svg`<g
                    part=${`capsule lane-${node.lane}${
                      node.current ? " capsule-current" : ""
                    }${node.selected ? " capsule-selected" : ""}`}
                    data-node-id=${node.id}
                    transform=${`translate(${node.capsuleX} ${node.y - 9})`}
                    @click=${(event: Event) => this.#activateCapsule(event, node)}
                  >
                    <rect
                      part="capsule-shape"
                      width=${node.capsuleWidth}
                      height="18"
                      rx="9"
                      vector-effect="non-scaling-stroke"
                    ></rect>
                    <text
                      part="capsule-label"
                      x=${node.capsuleWidth / 2}
                      y="9"
                      text-anchor="middle"
                      dominant-baseline="middle"
                    >${node.label}</text>
                  </g>`
                : svg`<g
                    part=${`node-anchor lane-${node.lane}`}
                    data-node-id=${node.id}
                    @click=${(event: Event) => this.#activateCapsule(event, node)}
                  >
                    <circle
                      part="node-hit-target"
                      cx=${node.x}
                      cy=${node.y}
                      r="10"
                    ></circle>
                    <circle
                      part=${`node lane-${node.lane}${node.current ? " current" : ""}${
                        node.selected ? " selected" : ""
                      }`}
                      cx=${node.x}
                      cy=${node.y}
                      r="3.5"
                      vector-effect="non-scaling-stroke"
                    ></circle>
                  </g>`,
            )}
          </svg>
        </div>
        <div part="tree">
          <slot name="tree" @slotchange=${this.#onTreeSlotChange}></slot>
        </div>
      </div>
    `;
  }
}
