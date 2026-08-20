import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

let scrollAreaId = 0;

type ScrollAxis = "block" | "inline";
export type ScrollbarMode = "always" | "hover" | "scrolling";

interface ScrollMetrics {
  inline: number;
  block: number;
  inlineMax: number;
  blockMax: number;
  inlineViewport: number;
  blockViewport: number;
  inlineContent: number;
  blockContent: number;
}

const emptyMetrics = (): ScrollMetrics => ({
  inline: 0,
  block: 0,
  inlineMax: 0,
  blockMax: 0,
  inlineViewport: 0,
  blockViewport: 0,
  inlineContent: 0,
  blockContent: 0,
});

/**
 * An accessible native scroll viewport with a stable styling boundary.
 *
 * The component deliberately keeps browser scrolling intact. It supplies a
 * focusable labelled region and exposes distinct viewport and content nodes;
 * custom thumb rendering is an optional renderer concern, not a requirement
 * for ordinary content to remain reachable.
 *
 * @tag ui-scroll-area
 * @summary Provides a labelled, keyboard-focusable native scroll viewport.
 *
 * @example Activity log
 * <ui-scroll-area label="Activity log">
 *   <ol><li>Project created</li><li>Members invited</li></ol>
 * </ui-scroll-area>
 *
 * @slot - Compatibility fallback for the `content` slot.
 * @slot content - Scrollable content.
 * @slot block-track - Optional authored content inside the block-axis scrollbar track.
 * @slot block-thumb - Optional authored content inside the block-axis scrollbar thumb.
 * @slot inline-track - Optional authored content inside the inline-axis scrollbar track.
 * @slot inline-thumb - Optional authored content inside the inline-axis scrollbar thumb.
 * @slot corner - Optional authored content at the scrollbar junction.
 *
 * @csspart root - The scroll-area boundary.
 * @csspart viewport - The native overflow viewport.
 * @csspart content - The semantic content region inside the viewport.
 * @csspart block-scrollbar - The block-axis scroll position control.
 * @csspart block-track - The full block-axis scroll extent.
 * @csspart block-thumb - The movable block-axis viewport indicator.
 * @csspart inline-scrollbar - The inline-axis scroll position control.
 * @csspart inline-track - The full inline-axis scroll extent.
 * @csspart inline-thumb - The movable inline-axis viewport indicator.
 * @csspart corner - The junction shown when both scrollbars are present.
 *
 * @cssstate scrollable-block - Content overflows the block axis.
 * @cssstate scrollable-inline - Content overflows the inline axis.
 * @cssstate at-block-start - The viewport is at its block-start edge.
 * @cssstate at-block-end - The viewport is at its block-end edge.
 * @cssstate at-inline-start - The viewport is at its inline-start edge.
 * @cssstate at-inline-end - The viewport is at its inline-end edge.
 * @cssstate visible - At least one semantic scrollbar is currently exposed.
 * @cssstate dragging - A semantic scrollbar thumb currently owns pointer movement.
 *
 * @fires {CustomEvent<{ inline: number, block: number, inlineMax: number, blockMax: number }>} ui-scroll-area-scroll - Reports renderer-neutral logical scroll offsets.
 *
 * @mashrole part root scroller root
 * @mashnode root scroller
 * @mashnode viewport viewport root
 * @mashnode content content viewport
 * @mashnode block-scrollbar scrollbar root
 * @mashnode block-track track block-scrollbar
 * @mashnode block-thumb thumb block-track
 * @mashnode inline-scrollbar scrollbar root
 * @mashnode inline-track track inline-scrollbar
 * @mashnode inline-thumb thumb inline-track
 * @mashnode corner corner root
 * @mashnode label label root
 * @mashnode scroll scroll root
 * @mashnode scrollable-block scrollable-block root
 * @mashnode scrollable-inline scrollable-inline root
 * @mashnode at-block-start at-block-start root
 * @mashnode at-block-end at-block-end root
 * @mashnode at-inline-start at-inline-start root
 * @mashnode at-inline-end at-inline-end root
 * @mashnode mode mode root
 * @mashnode idle-delay duration root
 * @mashnode visible visible root
 * @mashnode dragging dragging root
 * @mashrole attribute idle-delay duration idle-delay
 * @mashrole part block-scrollbar scrollbar block-scrollbar
 * @mashrole slot block-track track block-track
 * @mashrole part block-track track block-track
 * @mashrole slot block-thumb thumb block-thumb
 * @mashrole part block-thumb thumb block-thumb
 * @mashrole part inline-scrollbar scrollbar inline-scrollbar
 * @mashrole slot inline-track track inline-track
 * @mashrole part inline-track track inline-track
 * @mashrole slot inline-thumb thumb inline-thumb
 * @mashrole part inline-thumb thumb inline-thumb
 */
export class UIScrollArea extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
    mode: { type: String, reflect: true },
    idleDelay: { type: Number, attribute: "idle-delay", reflect: true },
    _metrics: { state: true },
  };

  /** Accessible name for the scrollable region. */
  declare label: string;
  /** Selects whether semantic scrollbars are always visible, hover-revealed, or activity-revealed. */
  declare mode: ScrollbarMode;
  /** Milliseconds that activity-revealed scrollbars remain visible after scrolling stops. */
  declare idleDelay: number;
  declare private _metrics: ScrollMetrics;

  readonly #internals: ElementInternals;
  readonly #viewportId = `ui-scroll-area-viewport-${++scrollAreaId}`;
  #resizeObserver: ResizeObserver | undefined;
  #visible = false;
  #visibilityTimer: number | undefined;
  #activeUntil = 0;
  #hovered = false;
  #focused = false;
  #dragging = false;

  constructor() {
    super();
    this.label = "Scrollable content";
    this.mode = "scrolling";
    this.idleDelay = 2000;
    this._metrics = emptyMetrics();
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  protected override firstUpdated(): void {
    const viewport = this.#viewport;
    viewport.addEventListener("scroll", this.#onScroll, { passive: true });
    this.#resizeObserver = new ResizeObserver(this.#syncScrollState);
    this.#resizeObserver.observe(viewport);
    this.#resizeObserver.observe(viewport.firstElementChild!);
    this.ownerDocument.defaultView?.requestAnimationFrame(this.#syncScrollState);
    this.#refreshVisibility();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("mode") || changed.has("idleDelay")) this.#refreshVisibility();
  }

  override disconnectedCallback(): void {
    if (this.#visibilityTimer !== undefined) window.clearTimeout(this.#visibilityTimer);
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = undefined;
    super.disconnectedCallback();
  }

  get #viewport(): HTMLElement {
    return this.renderRoot.querySelector<HTMLElement>('[part="viewport"]')!;
  }

  #setState(name: string, active: boolean): void {
    if (active) this.#internals.states.add(name);
    else this.#internals.states.delete(name);
  }

  #refreshVisibility(): void {
    const now = performance.now();
    const visible =
      this.mode === "always" ||
      this.#dragging ||
      this.#focused ||
      (this.mode === "hover" && this.#hovered) ||
      this.#activeUntil > now ||
      (this.mode === "scrolling" && this.#hovered && this.#visible);
    this.#visible = visible;
    this.#setState("visible", visible);
    this.#setState("dragging", this.#dragging);
  }

  #showForActivity(): void {
    const delay = Math.max(0, this.idleDelay);
    this.#activeUntil = performance.now() + delay;
    this.#refreshVisibility();
    if (this.#visibilityTimer !== undefined) window.clearTimeout(this.#visibilityTimer);
    this.#visibilityTimer = window.setTimeout(() => {
      this.#visibilityTimer = undefined;
      this.#activeUntil = 0;
      this.#refreshVisibility();
    }, delay + 1);
  }

  #onPointerEnter = (): void => {
    this.#hovered = true;
    this.#refreshVisibility();
  };

  #onPointerLeave = (): void => {
    this.#hovered = false;
    this.#refreshVisibility();
  };

  #onFocusIn = (): void => {
    this.#focused = true;
    this.#refreshVisibility();
  };

  #onFocusOut = (event: FocusEvent): void => {
    const root = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    this.#focused = false;
    this.#refreshVisibility();
  };

  #position(): { inline: number; block: number; inlineMax: number; blockMax: number } {
    const viewport = this.#viewport;
    return {
      inline: Math.abs(viewport.scrollLeft),
      block: viewport.scrollTop,
      inlineMax: Math.max(0, viewport.scrollWidth - viewport.clientWidth),
      blockMax: Math.max(0, viewport.scrollHeight - viewport.clientHeight),
    };
  }

  #syncScrollState = (): void => {
    const { inline, block, inlineMax, blockMax } = this.#position();
    const viewport = this.#viewport;
    const next: ScrollMetrics = {
      inline,
      block,
      inlineMax,
      blockMax,
      inlineViewport: viewport.clientWidth,
      blockViewport: viewport.clientHeight,
      inlineContent: viewport.scrollWidth,
      blockContent: viewport.scrollHeight,
    };
    if (
      Object.entries(next).some(
        ([key, value]) => this._metrics[key as keyof ScrollMetrics] !== value,
      )
    ) {
      this._metrics = next;
    }
    const epsilon = 1;
    this.#setState("scrollable-inline", inlineMax > epsilon);
    this.#setState("scrollable-block", blockMax > epsilon);
    this.#setState("at-inline-start", inline <= epsilon);
    this.#setState("at-inline-end", inlineMax - inline <= epsilon);
    this.#setState("at-block-start", block <= epsilon);
    this.#setState("at-block-end", blockMax - block <= epsilon);
  };

  #onScroll = (): void => {
    this.#syncScrollState();
    this.#showForActivity();
    this.dispatchEvent(
      new CustomEvent("ui-scroll-area-scroll", {
        bubbles: true,
        composed: true,
        detail: this.#position(),
      }),
    );
  };

  #axisMetrics(axis: ScrollAxis): {
    position: number;
    maximum: number;
    viewport: number;
    content: number;
  } {
    return axis === "block"
      ? {
          position: this._metrics.block,
          maximum: this._metrics.blockMax,
          viewport: this._metrics.blockViewport,
          content: this._metrics.blockContent,
        }
      : {
          position: this._metrics.inline,
          maximum: this._metrics.inlineMax,
          viewport: this._metrics.inlineViewport,
          content: this._metrics.inlineContent,
        };
  }

  #thumbStyle(axis: ScrollAxis): string {
    const metrics = this.#axisMetrics(axis);
    const size =
      metrics.content > 0 ? Math.min(100, (metrics.viewport / metrics.content) * 100) : 100;
    const offset = metrics.maximum > 0 ? (metrics.position / metrics.maximum) * (100 - size) : 0;
    return axis === "block"
      ? `block-size:${size}%;inset-block-start:${offset}%`
      : `inline-size:${size}%;inset-inline-start:${offset}%`;
  }

  #setPosition(axis: ScrollAxis, value: number): void {
    const viewport = this.#viewport;
    const maximum = this.#axisMetrics(axis).maximum;
    const next = Math.max(0, Math.min(maximum, value));
    if (axis === "block") viewport.scrollTop = next;
    else viewport.scrollLeft = getComputedStyle(viewport).direction === "rtl" ? -next : next;
    this.#syncScrollState();
  }

  #onScrollbarKeydown = (event: KeyboardEvent): void => {
    const target = event.currentTarget as HTMLElement;
    const axis = target.dataset.scrollAxis as ScrollAxis;
    const metrics = this.#axisMetrics(axis);
    const line = Math.max(1, metrics.viewport / 10);
    const page = Math.max(1, metrics.viewport * 0.9);
    let next: number | undefined;

    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = metrics.maximum;
    else if (event.key === "PageUp") next = metrics.position - page;
    else if (event.key === "PageDown") next = metrics.position + page;
    else if (axis === "block" && event.key === "ArrowUp") next = metrics.position - line;
    else if (axis === "block" && event.key === "ArrowDown") next = metrics.position + line;
    else if (axis === "inline" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      const rtl = getComputedStyle(this.#viewport).direction === "rtl";
      const towardEnd = event.key === (rtl ? "ArrowLeft" : "ArrowRight");
      next = metrics.position + (towardEnd ? line : -line);
    }
    if (next === undefined) return;
    event.preventDefault();
    this.#setPosition(axis, next);
  };

  #onTrackPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const track = event.currentTarget as HTMLElement;
    if (
      event
        .composedPath()
        .some(
          (target) =>
            target instanceof HTMLElement && target.getAttribute("part")?.includes("thumb"),
        )
    )
      return;
    const axis = track.dataset.scrollAxis as ScrollAxis;
    const rect = track.getBoundingClientRect();
    const coordinate = axis === "block" ? event.clientY - rect.top : event.clientX - rect.left;
    const length = axis === "block" ? rect.height : rect.width;
    if (length <= 0) return;
    this.#setPosition(axis, (coordinate / length) * this.#axisMetrics(axis).maximum);
  };

  #onThumbPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const thumb = event.currentTarget as HTMLElement;
    const axis = thumb.dataset.scrollAxis as ScrollAxis;
    const track = thumb.parentElement!;
    const origin = axis === "block" ? event.clientY : event.clientX;
    const start = this.#axisMetrics(axis).position;
    const trackLength = axis === "block" ? track.clientHeight : track.clientWidth;
    const thumbLength = axis === "block" ? thumb.clientHeight : thumb.clientWidth;
    const travel = Math.max(1, trackLength - thumbLength);
    const maximum = this.#axisMetrics(axis).maximum;

    thumb.setPointerCapture(event.pointerId);
    this.#dragging = true;
    this.#refreshVisibility();
    const move = (moveEvent: PointerEvent): void => {
      const pointer = axis === "block" ? moveEvent.clientY : moveEvent.clientX;
      this.#setPosition(axis, start + ((pointer - origin) / travel) * maximum);
    };
    const end = (endEvent: PointerEvent): void => {
      thumb.releasePointerCapture(endEvent.pointerId);
      thumb.removeEventListener("pointermove", move);
      thumb.removeEventListener("pointerup", end);
      thumb.removeEventListener("pointercancel", end);
      this.#dragging = false;
      this.#showForActivity();
    };
    thumb.addEventListener("pointermove", move);
    thumb.addEventListener("pointerup", end);
    thumb.addEventListener("pointercancel", end);
  };

  #renderScrollbar(axis: ScrollAxis): TemplateResult {
    const metrics = this.#axisMetrics(axis);
    const prefix = axis === "block" ? "block" : "inline";
    const orientation = axis === "block" ? "vertical" : "horizontal";
    return html`
      <div
        part=${`${prefix}-scrollbar`}
        role="scrollbar"
        data-scroll-axis=${axis}
        aria-label=${`${this.label} ${axis} scroll`}
        aria-controls=${this.#viewportId}
        aria-orientation=${orientation}
        aria-valuemin="0"
        aria-valuemax=${metrics.maximum}
        aria-valuenow=${metrics.position}
        tabindex=${metrics.maximum > 0 ? "0" : "-1"}
        ?hidden=${metrics.maximum <= 0}
        @keydown=${this.#onScrollbarKeydown}
      >
        <span
          part=${`${prefix}-track`}
          data-scroll-axis=${axis}
          @pointerdown=${this.#onTrackPointerDown}
        >
          <slot name=${`${prefix}-track`}></slot>
          <span
            part=${`${prefix}-thumb`}
            data-scroll-axis=${axis}
            style=${this.#thumbStyle(axis)}
            @pointerdown=${this.#onThumbPointerDown}
          >
            <slot name=${`${prefix}-thumb`}></slot>
          </span>
        </span>
      </div>
    `;
  }

  protected override render(): TemplateResult {
    return html`
      <div
        part="root"
        @pointerenter=${this.#onPointerEnter}
        @pointerleave=${this.#onPointerLeave}
        @focusin=${this.#onFocusIn}
        @focusout=${this.#onFocusOut}
      >
        <div
          part="viewport"
          id=${this.#viewportId}
          role="region"
          aria-label=${this.label}
          tabindex="0"
        >
          <div part="content">
            <slot name="content"><slot></slot></slot>
          </div>
        </div>
        ${this.#renderScrollbar("block")} ${this.#renderScrollbar("inline")}
        <span part="corner" ?hidden=${!this._metrics.blockMax || !this._metrics.inlineMax}
          ><slot name="corner"></slot
        ></span>
      </div>
    `;
  }
}
