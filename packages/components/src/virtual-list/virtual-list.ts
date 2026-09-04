import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

export type VirtualListOrientation = "vertical" | "horizontal";
export type VirtualListAlignment = "start" | "center" | "end" | "nearest";

/**
 * An unstyled variable-size virtual list.
 *
 * Authored `<ui-virtual-item>` children carry stable content and size metadata.
 * The list composes only the visible window plus overscan, maintains leading
 * and trailing extent, and exposes imperative scroll targeting without making
 * any visual choice about rows, cards, columns, or separators.
 *
 * @tag ui-virtual-list
 * @summary Composes only the visible range of a large authored collection.
 *
 * @example Project activity
 * <ui-virtual-list label="Project activity" overscan="2">
 *   <ui-virtual-item size="48">Project created</ui-virtual-item>
 *   <ui-virtual-item size="64">Invoice migration linked</ui-virtual-item>
 *   <ui-virtual-item size="48">Review requested</ui-virtual-item>
 *   <ui-virtual-item size="56">Finance crew assigned</ui-virtual-item>
 *   <ui-virtual-item size="48">External reference updated</ui-virtual-item>
 *   <ui-virtual-item size="64">Migration window approved</ui-virtual-item>
 *   <ui-virtual-item size="48">Rollback checklist attached</ui-virtual-item>
 *   <ui-virtual-item size="56">Dependencies moved to review</ui-virtual-item>
 *   <ui-virtual-item size="48">Invoice sample recorded</ui-virtual-item>
 *   <ui-virtual-item size="64">Production rehearsal scheduled</ui-virtual-item>
 *   <ui-virtual-item size="48">Deployment warning resolved</ui-virtual-item>
 *   <ui-virtual-item size="56">Release notes published</ui-virtual-item>
 *   <ui-virtual-item size="48">Migration plan archived</ui-virtual-item>
 *   <ui-virtual-item size="64">Billing migration completed</ui-virtual-item>
 * </ui-virtual-list>
 *
 * @slot - Ordered virtual items.
 * @csspart root - The virtual-list root.
 * @csspart viewport - The bounded scroll viewport.
 * @csspart content - The complete virtual content extent.
 * @csspart before - The leading offscreen extent.
 * @csspart items - The authored item binding.
 * @csspart after - The trailing offscreen extent.
 * @cssstate scrollable - Matches `:state(scrollable)` while content exceeds the viewport.
 *
 * @fires {CustomEvent<{start: number, end: number}>} ui-visible-range-change - Reports the half-open visible item range.
 *
 * @mashnode root scroller
 * @mashnode viewport viewport root
 * @mashnode content content viewport
 * @mashnode before prefix content
 * @mashnode items list content
 * @mashnode after suffix content
 * @mashnode orientation orientation root
 * @mashnode overscan overscan root
 * @mashnode label label root
 * @mashnode scrollable scrollable-block root
 * @mashnode range change root
 * @mashrole part root scroller root
 * @mashrole part before prefix before
 * @mashrole slot default list items
 * @mashrole part items list items
 * @mashrole part after suffix after
 * @mashrole state scrollable scrollable-block scrollable
 * @mashrole event ui-visible-range-change change range
 */
export class UIVirtualList extends LitElement {
  static override properties = {
    orientation: { type: String, reflect: true },
    overscan: { type: Number, reflect: true },
    label: { type: String, reflect: true },
  };

  /** Scroll and item layout axis. */
  declare orientation: VirtualListOrientation;
  /** Extra item count composed before and after the viewport. */
  declare overscan: number;
  /** Accessible name for the collection. */
  declare label: string;
  readonly #internals: ElementInternals;
  #resizeObserver?: ResizeObserver;
  #resizeFrame?: number;
  #start = 0;
  #end = 0;
  #pendingScroll: { index: number; alignment: VirtualListAlignment } | null = null;

  constructor() {
    super();
    this.orientation = "vertical";
    this.overscan = 1;
    this.label = "Virtual list";
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  get #items(): UIVirtualItem[] {
    return Array.from(this.querySelectorAll<UIVirtualItem>(":scope > ui-virtual-item"));
  }

  protected override firstUpdated(): void {
    const viewport = this.renderRoot.querySelector<HTMLElement>("[part='viewport']");
    if (viewport && typeof ResizeObserver !== "undefined") {
      this.#resizeObserver = new ResizeObserver(() => {
        if (this.#resizeFrame !== undefined) cancelAnimationFrame(this.#resizeFrame);
        this.#resizeFrame = requestAnimationFrame(() => {
          this.#resizeFrame = undefined;
          this.#syncVisibleRange();
        });
      });
      this.#resizeObserver.observe(viewport);
    }
    this.#syncVisibleRange();
    this.#flushPendingScroll();
  }

  override disconnectedCallback(): void {
    this.#resizeObserver?.disconnect();
    if (this.#resizeFrame !== undefined) cancelAnimationFrame(this.#resizeFrame);
    super.disconnectedCallback();
  }

  #onSlotChange = (): void => {
    this.#syncVisibleRange();
    this.#flushPendingScroll();
  };

  #onScroll = (): void => {
    this.#syncVisibleRange();
  };

  #syncVisibleRange(): void {
    const viewport = this.renderRoot.querySelector<HTMLElement>("[part='viewport']");
    if (!viewport) return;
    const items = this.#items;
    const sizes = items.map((item) => Math.max(1, item.size));
    const offsets = Array.from<number>({ length: sizes.length + 1 });
    offsets[0] = 0;
    for (let index = 0; index < sizes.length; index += 1) {
      offsets[index + 1] = offsets[index]! + sizes[index]!;
    }
    const total = offsets.at(-1) ?? 0;
    const scroll = this.orientation === "vertical" ? viewport.scrollTop : viewport.scrollLeft;
    const extent = this.orientation === "vertical" ? viewport.clientHeight : viewport.clientWidth;
    const viewportEnd = scroll + Math.max(1, extent);

    // Binary-search the cumulative extents so scrolling remains logarithmic
    // even when the authored collection contains tens of thousands of items.
    let low = 0;
    let high = sizes.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (offsets[middle + 1]! <= scroll) low = middle + 1;
      else high = middle;
    }
    let start = Math.min(low, Math.max(0, items.length - 1));
    low = start;
    high = sizes.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (offsets[middle]! < viewportEnd) low = middle + 1;
      else high = middle;
    }
    let end = low;

    const overscan = Math.max(0, Math.trunc(this.overscan) || 0);
    start = Math.max(0, start - overscan);
    end = Math.min(items.length, Math.max(start + 1, end + overscan));

    this.#setSpacer("before", offsets[start] ?? 0);
    this.#setSpacer("after", Math.max(0, total - (offsets[end] ?? total)));
    items.forEach((item, index) => {
      item.index = index;
      item.setSize = items.length;
      item.realize(index >= start && index < end, this.orientation);
    });

    const scrollable = total > extent && extent > 0;
    if (scrollable) this.#internals.states.add("scrollable");
    else this.#internals.states.delete("scrollable");

    if (start === this.#start && end === this.#end) return;
    this.#start = start;
    this.#end = end;
    this.dispatchEvent(
      new CustomEvent<{ start: number; end: number }>("ui-visible-range-change", {
        detail: { start, end },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Scrolls an item into the viewport using semantic alignment. */
  scrollToItem(index: number, alignment: VirtualListAlignment = "nearest"): void {
    this.#pendingScroll = { index, alignment };
    this.#flushPendingScroll();
  }

  /** Scrolls the final logical item to the end edge of the viewport. */
  scrollToBottom(): void {
    this.scrollToItem(Number.MAX_SAFE_INTEGER, "end");
  }

  /** Current overscanned half-open item range. */
  get visibleRange(): readonly [start: number, end: number] {
    return [this.#start, this.#end];
  }

  #flushPendingScroll(): void {
    if (!this.#pendingScroll) return;
    const items = this.#items;
    if (items.length === 0) return;
    const viewport = this.renderRoot.querySelector<HTMLElement>("[part='viewport']");
    if (!viewport) return;
    const { index, alignment } = this.#pendingScroll;
    this.#pendingScroll = null;
    const target = Math.max(0, Math.min(items.length - 1, Math.trunc(index)));
    const before = items.slice(0, target).reduce((sum, item) => sum + Math.max(1, item.size), 0);
    const itemSize = Math.max(1, items[target]!.size);
    const extent = this.orientation === "vertical" ? viewport.clientHeight : viewport.clientWidth;
    const current = this.orientation === "vertical" ? viewport.scrollTop : viewport.scrollLeft;
    let offset = before;
    if (alignment === "center") offset = before - Math.max(0, (extent - itemSize) / 2);
    if (alignment === "end") offset = before + itemSize - extent;
    if (alignment === "nearest") {
      if (before >= current && before + itemSize <= current + extent) return;
      offset = before < current ? before : before + itemSize - extent;
    }
    if (this.orientation === "vertical") viewport.scrollTop = Math.max(0, offset);
    else viewport.scrollLeft = Math.max(0, offset);
    this.#syncVisibleRange();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("orientation") || changed.has("overscan")) this.#syncVisibleRange();
    this.#flushPendingScroll();
  }

  #spacerStyle(size: number): string {
    return this.orientation === "vertical"
      ? `block-size:${size}px;inline-size:1px`
      : `inline-size:${size}px;block-size:1px`;
  }

  #setSpacer(part: "before" | "after", size: number): void {
    const spacer = this.renderRoot.querySelector<HTMLElement>(`[part='${part}']`);
    if (spacer) spacer.setAttribute("style", this.#spacerStyle(size));
  }

  protected override render(): TemplateResult {
    return html`
      <div part="root">
        <div
          part="viewport"
          role="list"
          aria-label=${this.label || nothing}
          aria-orientation=${this.orientation}
          @scroll=${this.#onScroll}
        >
          <div part="content">
            <div part="before" style=${this.#spacerStyle(0)}></div>
            <slot part="items" @slotchange=${this.#onSlotChange}></slot>
            <div part="after" style=${this.#spacerStyle(0)}></div>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * One variable-size authored item in a virtual list.
 *
 * @tag ui-virtual-item
 * @summary Carries one item's stable content, index, size, and visibility state.
 * @example Project activity item
 * <ui-virtual-list label="Project activity"><ui-virtual-item size="48">Billing migration updated</ui-virtual-item></ui-virtual-list>
 * @slot - Item content.
 * @csspart root - The visible item realization.
 * @csspart content - The authored item content binding.
 * @cssstate visible - Matches `:state(visible)` while the item is composed.
 * @mashnode root item
 * @mashnode content content root
 * @mashnode index index root
 * @mashnode set-size set-size root
 * @mashnode size size root
 * @mashaxis size layout-size
 * @mashnode visible visible root
 * @mashrole part root item root
 * @mashrole slot default content content
 * @mashrole part content content content
 */
export class UIVirtualItem extends LitElement {
  static override properties = {
    index: { type: Number, reflect: true },
    setSize: { type: Number, attribute: "set-size", reflect: true },
    size: { type: Number, reflect: true },
    visible: { type: Boolean, reflect: true },
  };

  /** Stable zero-based logical item index. */
  declare index: number;
  /** Total logical collection size for accessibility position reporting. */
  declare setSize: number;
  /** Item extent on the list axis in CSS pixels. */
  declare size: number;
  /** Whether this item currently participates in the composed visible window. */
  declare visible: boolean;

  readonly #internals: ElementInternals;
  #orientation: VirtualListOrientation = "vertical";

  constructor() {
    super();
    this.index = 0;
    this.setSize = 0;
    this.size = 40;
    this.visible = true;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  /** @internal Applies list-owned visibility and extent realization. */
  realize(visible: boolean, orientation: VirtualListOrientation): void {
    this.#orientation = orientation;
    this.visible = visible;
    this.style.display = "block";
    this.style.flex = "none";
    const extent = visible ? `${Math.max(1, this.size)}px` : "0px";
    if (orientation === "vertical") {
      this.style.blockSize = extent;
      this.style.inlineSize = "";
    } else {
      this.style.inlineSize = extent;
      this.style.blockSize = "";
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("visible")) {
      if (this.visible) this.#internals.states.add("visible");
      else this.#internals.states.delete("visible");
    }
    if (changed.has("size")) this.realize(this.visible, this.#orientation);
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this.visible) return nothing;
    return html`<div
      part="root"
      role="listitem"
      aria-posinset=${this.index + 1}
      aria-setsize=${this.setSize > 0 ? this.setSize : nothing}
    >
      <slot part="content"></slot>
    </div>`;
  }
}
