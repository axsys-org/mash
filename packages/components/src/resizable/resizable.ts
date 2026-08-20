import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

export type ResizableOrientation = "horizontal" | "vertical";

export interface ResizeDetail {
  delta: number;
  phase: "start" | "move" | "end";
}

/**
 * An unstyled group of user-resizable regions.
 *
 * Panels and handles remain authored children. The group owns size constraint
 * resolution and reports the resulting ordered sizes; the catalogue alone
 * decides whether the regions appear as columns, rows, rails, or another
 * visual composition.
 *
 * @tag ui-resizable
 * @summary Coordinates resizable panels and semantic resize handles.
 *
 * @example Inspector split
 * <ui-resizable orientation="horizontal" label="Workspace panels">
 *   <ui-resizable-panel min="160">
 *     <ui-tree label="Projects">
 *       <ui-tree-item kind="folder" title="Projects" expanded>
 *         <ui-tree-item slot="children" kind="file" title="Billing migration" selected></ui-tree-item>
 *         <ui-tree-item slot="children" kind="file" title="Invoice reconciliation"></ui-tree-item>
 *       </ui-tree-item>
 *     </ui-tree>
 *   </ui-resizable-panel>
 *   <ui-resizable-handle label="Resize project tree"></ui-resizable-handle>
 *   <ui-resizable-panel min="240">
 *     <ui-editor language="html" label="Record source" value="&lt;sh-myth title=&quot;Billing migration&quot;&gt;&lt;/sh-myth&gt;"></ui-editor>
 *   </ui-resizable-panel>
 * </ui-resizable>
 *
 * @slot - Ordered panels and the handles between them.
 * @csspart root - The semantic panel group.
 * @csspart children - The authored panel/handle binding.
 *
 * @fires {CustomEvent<{sizes: number[]}>} ui-resizable-change - Reports panel sizes after a resize.
 *
 * @mashnode root group
 * @mashnode children children root
 * @mashnode orientation orientation root
 * @mashnode label label root
 * @mashnode change change root
 * @mashrole part root group root
 * @mashrole slot default children children
 * @mashrole part children children children
 * @mashrole event ui-resizable-change change change
 */
export class UIResizable extends LitElement {
  static override properties = {
    orientation: { type: String, reflect: true },
    label: { type: String, reflect: true },
  };

  /** Keyboard and resize axis. Horizontal changes inline sizes; vertical changes block sizes. */
  declare orientation: ResizableOrientation;
  /** Accessible name for the panel group. */
  declare label: string;

  constructor() {
    super();
    this.orientation = "horizontal";
    this.label = "Resizable panels";
    this.addEventListener("ui-resize", this.#onResize as EventListener);
  }

  static override styles = baseStyles;

  get #panels(): UIResizablePanel[] {
    return Array.from(
      this.querySelectorAll<UIResizablePanel>(":scope > ui-resizable-panel:not([hidden])"),
    );
  }

  /** Current ordered visible-panel sizes in CSS pixels. */
  get sizes(): readonly number[] {
    return this.#panels.map((panel) => panel.measuredSize(this.orientation));
  }

  #onSlotChange = (): void => {
    for (const handle of this.querySelectorAll<UIResizableHandle>(":scope > ui-resizable-handle")) {
      handle.orientation = this.orientation;
    }
  };

  #onResize = (event: CustomEvent<ResizeDetail>): void => {
    const handle = event.target;
    if (!(handle instanceof UIResizableHandle) || handle.parentElement !== this) return;
    event.stopPropagation();

    if (event.detail.phase === "start") {
      handle.resizing = true;
      return;
    }
    if (event.detail.phase === "end") {
      handle.resizing = false;
      this.#reportSizes();
      return;
    }

    this.#resizeAtHandle(handle, event.detail.delta);
  };

  #adjacentPanels(handle: UIResizableHandle): [UIResizablePanel | null, UIResizablePanel | null] {
    let previous = handle.previousElementSibling;
    while (previous && (!(previous instanceof UIResizablePanel) || !previous.visible)) {
      previous = previous.previousElementSibling;
    }
    let next = handle.nextElementSibling;
    while (next && (!(next instanceof UIResizablePanel) || !next.visible)) {
      next = next.nextElementSibling;
    }
    return [
      previous instanceof UIResizablePanel ? previous : null,
      next instanceof UIResizablePanel ? next : null,
    ];
  }

  #resizeAtHandle(handle: UIResizableHandle, requestedDelta: number): boolean {
    const [previous, next] = this.#adjacentPanels(handle);
    if (!previous || !next) return false;

    const previousSize = previous.measuredSize(this.orientation);
    const nextSize = next.measuredSize(this.orientation);
    const minimumDelta = Math.max(previous.min - previousSize, nextSize - next.max);
    const maximumDelta = Math.min(previous.max - previousSize, nextSize - next.min);
    const delta = Math.max(minimumDelta, Math.min(requestedDelta, maximumDelta));
    if (!Number.isFinite(delta) || delta === 0) return false;
    previous.setSize(previousSize + delta, this.orientation);
    next.setSize(nextSize - delta, this.orientation);
    this.#reportSizes();
    return true;
  }

  /** Resizes one visible panel and redistributes the delta to its neighbor. */
  resizePanel(index: number, size: number): void {
    const panels = this.#panels;
    const panel = panels[Math.trunc(index)];
    if (!panel || !Number.isFinite(size)) return;
    const current = panel.measuredSize(this.orientation);
    const next = panel.nextElementSibling;
    const previous = panel.previousElementSibling;
    if (next instanceof UIResizableHandle) this.#resizeAtHandle(next, size - current);
    else if (previous instanceof UIResizableHandle) this.#resizeAtHandle(previous, current - size);
  }

  /** Restores one visible panel to its authored initial size. */
  resetPanel(index: number): void {
    const panel = this.#panels[Math.trunc(index)];
    if (!panel) return;
    this.resizePanel(index, panel.defaultSize || panel.min);
  }

  #reportSizes(): void {
    this.dispatchEvent(
      new CustomEvent<{ sizes: number[] }>("ui-resizable-change", {
        detail: { sizes: this.#panels.map((panel) => panel.measuredSize(this.orientation)) },
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("orientation")) return;
    this.#onSlotChange();
  }

  protected override render(): TemplateResult {
    return html`
      <div part="root" role="group" aria-label=${this.label}>
        <slot part="children" @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}

/**
 * One unstyled region in a resizable group.
 *
 * @tag ui-resizable-panel
 * @summary Owns one authored region and its semantic size constraints.
 * @slot - Panel content.
 * @csspart root - The panel realization.
 * @csspart content - The authored panel content binding.
 * @cssstate visible - Matches `:state(visible)` while the panel participates in layout.
 * @mashnode root panel
 * @mashnode content content root
 * @mashnode size size root
 * @mashnode min min root
 * @mashnode max max root
 * @mashnode visible visible root
 * @mashrole part root panel root
 * @mashrole slot default content content
 * @mashrole part content content content
 */
export class UIResizablePanel extends LitElement {
  static override properties = {
    size: { type: Number, reflect: true },
    min: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    visible: { type: Boolean, reflect: true },
  };

  /** Current preferred size in CSS pixels; zero allows flexible catalogue layout. */
  declare size: number;
  /** Minimum permitted size in CSS pixels. */
  declare min: number;
  /** Maximum permitted size in CSS pixels. */
  declare max: number;
  /** Whether the panel participates in the group. */
  declare visible: boolean;

  readonly #internals: ElementInternals;
  #defaultSize = 0;

  constructor() {
    super();
    this.size = 0;
    this.min = 100;
    this.max = Number.POSITIVE_INFINITY;
    this.visible = true;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultSize = this.size;
  }

  /** Initial authored size used by the owning group's reset operation. */
  get defaultSize(): number {
    return this.#defaultSize;
  }

  /** @internal Current rendered size on the group axis. */
  measuredSize(orientation: ResizableOrientation): number {
    const bounds = this.getBoundingClientRect();
    const measured = orientation === "horizontal" ? bounds.width : bounds.height;
    return this.size || measured || this.min;
  }

  /** @internal Realizes a resolved semantic size without component visual CSS. */
  setSize(size: number, orientation: ResizableOrientation): void {
    this.size = size;
    this.style.flexBasis = `${size}px`;
    this.style.flexGrow = "0";
    if (orientation === "horizontal") this.style.inlineSize = `${size}px`;
    else this.style.blockSize = `${size}px`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    const group = this.parentElement;
    const orientation =
      group instanceof UIResizable
        ? group.orientation
        : ("horizontal" satisfies ResizableOrientation);
    if (changed.has("min")) {
      if (orientation === "horizontal") this.style.minInlineSize = `${this.min}px`;
      else this.style.minBlockSize = `${this.min}px`;
    }
    if (changed.has("max")) {
      const maximum = Number.isFinite(this.max) ? `${this.max}px` : "none";
      if (orientation === "horizontal") this.style.maxInlineSize = maximum;
      else this.style.maxBlockSize = maximum;
    }
    if (changed.has("size") && this.size > 0) this.setSize(this.size, orientation);
    if (changed.has("visible")) {
      this.hidden = !this.visible;
      if (this.visible) this.#internals.states.add("visible");
      else this.#internals.states.delete("visible");
    }
  }

  protected override render(): TemplateResult {
    return html`<div part="root"><slot part="content"></slot></div>`;
  }
}

/**
 * An unstyled pointer and keyboard resize separator.
 *
 * @tag ui-resizable-handle
 * @summary Requests size transfer between the adjacent panels.
 * @slot - Optional handle content or grip.
 * @csspart control - The focusable separator control.
 * @csspart indicator - The authored or fallback grip binding.
 * @cssstate resizing - Matches `:state(resizing)` during a pointer drag.
 * @fires {CustomEvent<ResizeDetail>} ui-resize - Reports a resize phase and axis delta.
 * @mashnode control separator
 * @mashnode indicator indicator control
 * @mashnode orientation orientation control
 * @mashnode label label control
 * @mashnode resizing resizing control
 * @mashnode resize resize control
 * @mashrole part control separator control
 * @mashrole slot default indicator indicator
 * @mashrole part indicator indicator indicator
 * @mashrole event ui-resize resize resize
 */
export class UIResizableHandle extends LitElement {
  static override properties = {
    orientation: { type: String, reflect: true },
    label: { type: String, reflect: true },
    step: { type: Number, reflect: true },
    resizing: { type: Boolean, reflect: true },
  };

  /** Keyboard and pointer resize axis. Set by the owning group. */
  declare orientation: ResizableOrientation;
  /** Accessible name for the resize separator. */
  declare label: string;
  /** Keyboard resize increment in CSS pixels. */
  declare step: number;
  /** True during an active pointer resize. */
  declare resizing: boolean;

  readonly #internals: ElementInternals;
  #pointerId: number | undefined;
  #lastPosition = 0;

  constructor() {
    super();
    this.orientation = "horizontal";
    this.label = "Resize panels";
    this.step = 10;
    this.resizing = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  #emit(delta: number, phase: ResizeDetail["phase"]): void {
    this.dispatchEvent(
      new CustomEvent<ResizeDetail>("ui-resize", {
        detail: { delta, phase },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.#pointerId = event.pointerId;
    this.#lastPosition = this.orientation === "horizontal" ? event.clientX : event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.#emit(0, "start");
  };

  #onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    const position = this.orientation === "horizontal" ? event.clientX : event.clientY;
    const delta = position - this.#lastPosition;
    this.#lastPosition = position;
    this.#emit(delta, "move");
  };

  #onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    this.#pointerId = undefined;
    this.#emit(0, "end");
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const negative = this.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const positive = this.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    if (event.key !== negative && event.key !== positive) return;
    event.preventDefault();
    this.#emit(0, "start");
    this.#emit(event.key === negative ? -this.step : this.step, "move");
    this.#emit(0, "end");
  };

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("resizing")) return;
    if (this.resizing) this.#internals.states.add("resizing");
    else this.#internals.states.delete("resizing");
  }

  protected override render(): TemplateResult {
    return html`
      <div
        part="control"
        role="separator"
        tabindex="0"
        aria-label=${this.label}
        aria-orientation=${this.orientation}
        @pointerdown=${this.#onPointerDown}
        @pointermove=${this.#onPointerMove}
        @pointerup=${this.#onPointerEnd}
        @pointercancel=${this.#onPointerEnd}
        @keydown=${this.#onKeyDown}
      >
        <slot part="indicator">⋮</slot>
      </div>
    `;
  }
}
