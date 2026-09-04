import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

let scrollAreaId = 0;
const defaultIdleDelay = 2000;

export type ScrollAxis = "block" | "inline";
export type ScrollbarMode = "always" | "hover" | "scrolling";
export type ScrollbarSize = "compact" | "medium" | "large";
export type ScrollbarGutter = "none" | "stable";
export type ScrollSnapMode = "none" | "proximity" | "mandatory";
export type ScrollTargetAlignment = "start" | "center" | "end" | "nearest";

export interface ScrollToTargetOptions {
  align?: ScrollTargetAlignment;
  axis?: ScrollAxis;
  behavior?: ScrollBehavior;
}

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
 * @slot block-detents - Authored block-axis target marks. Use `data-scroll-target` or `data-scroll-detent` on each control.
 * @slot inline-detents - Authored inline-axis target marks. Use `data-scroll-target` or `data-scroll-detent` on each control.
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
 * @csspart block-detents - The block-axis authored target-mark layer.
 * @csspart inline-detents - The inline-axis authored target-mark layer.
 * @csspart corner - The junction shown when both scrollbars are present.
 *
 * @cssstate scrollable-block - Content overflows the block axis.
 * @cssstate scrollable-inline - Content overflows the inline axis.
 * @cssstate at-block-start - The viewport is at its block-start edge.
 * @cssstate at-block-end - The viewport is at its block-end edge.
 * @cssstate at-inline-start - The viewport is at its inline-start edge.
 * @cssstate at-inline-end - The viewport is at its inline-end edge.
 * @cssstate visible - At least one semantic scrollbar is currently exposed.
 * @cssstate idle - The viewport is not currently scrolling or being dragged.
 * @cssstate active - Scrolling, target navigation, or thumb dragging is active.
 * @cssstate hovered - The pointer is within the scroll-area boundary.
 * @cssstate focused - Focus is within the scroll-area boundary.
 * @cssstate dragging - A semantic scrollbar thumb currently owns pointer movement.
 * @cssstate at-detent - The current scroll offset aligns with an authored detent.
 *
 * @fires {CustomEvent<{ inline: number, block: number, inlineMax: number, blockMax: number }>} ui-scroll-area-scroll - Reports renderer-neutral logical scroll offsets.
 * @fires {CustomEvent<{ axis: ScrollAxis, target: string | null, position: number }>} ui-scroll-area-target - Reports authored detent and target navigation.
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
 * @mashnode size size root
 * @mashaxis size scrollbar-size
 * @mashnode gutter gutter root
 * @mashnode snap snap root
 * @mashnode idle-delay duration root
 * @mashnode visible visible root
 * @mashnode idle idle root
 * @mashnode active active root
 * @mashnode hovered hovered root
 * @mashnode focused focused root
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
    size: { type: String, reflect: true },
    gutter: { type: String, reflect: true },
    snap: { type: String, reflect: true },
    idleDelay: { type: Number, attribute: "idle-delay", reflect: true },
    _metrics: { state: true },
  };

  /** Accessible name for the scrollable region. */
  declare label: string;
  /** Selects whether semantic scrollbars are always visible, hover-revealed, or activity-revealed. */
  declare mode: ScrollbarMode;
  /** Selects the semantic scrollbar hit area and visible track measure. */
  declare size: ScrollbarSize;
  /** Selects no reserved layout space or a stable gutter reserved for both axes. */
  declare gutter: ScrollbarGutter;
  /** Selects native CSS scroll snapping for authored detent targets. */
  declare snap: ScrollSnapMode;
  /** Milliseconds that activity-revealed scrollbars remain visible after scrolling stops. */
  declare idleDelay: number;
  declare private _metrics: ScrollMetrics;

  readonly #internals: ElementInternals;
  readonly #viewportId = `ui-scroll-area-viewport-${++scrollAreaId}`;
  #resizeObserver: ResizeObserver | undefined;
  #syncFrame: number | undefined;
  #visible = false;
  #visibilityTimer: number | undefined;
  #activeUntil = 0;
  #hovered = false;
  #focused = false;
  #dragging = false;
  #activeDetent: HTMLElement | undefined;

  constructor() {
    super();
    this.label = "Scrollable content";
    this.mode = "scrolling";
    this.size = "medium";
    this.gutter = "none";
    this.snap = "none";
    this.idleDelay = defaultIdleDelay;
    this._metrics = emptyMetrics();
    this.#internals = this.attachInternals();
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        min-block-size: 0;
        overflow: hidden;
      }

      [part="root"] {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr);
        inline-size: 100%;
        block-size: 100%;
        max-block-size: inherit;
        min-inline-size: 0;
        min-block-size: 0;
        overflow: hidden;
      }

      :host([gutter="stable"]) [part="root"] {
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-rows: minmax(0, 1fr) auto;
      }

      [part="viewport"] {
        grid-column: 1;
        grid-row: 1;
        inline-size: 100%;
        block-size: 100%;
        max-inline-size: 100%;
        max-block-size: inherit;
        min-inline-size: 0;
        min-block-size: 0;
        overflow: auto;
      }

      [part="content"] {
        min-inline-size: 0;
      }

      :host([snap="proximity"]) [part="viewport"] {
        scroll-snap-type: block proximity;
      }

      :host([snap="mandatory"]) [part="viewport"] {
        scroll-snap-type: block mandatory;
      }

      [part="block-scrollbar"],
      [part="inline-scrollbar"] {
        touch-action: none;
      }
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#connectScrollState();
  }

  protected override firstUpdated(): void {
    this.#connectScrollState();
  }

  override disconnectedCallback(): void {
    this.#disconnectScrollState();
    super.disconnectedCallback();
  }

  #connectScrollState(): void {
    if (this.#resizeObserver) return;
    const viewport = this.#viewport;
    viewport.addEventListener("scroll", this.#onScroll, { passive: true });
    this.#resizeObserver = new ResizeObserver(this.#queueScrollStateSync);
    this.#resizeObserver.observe(viewport);
    if (viewport.firstElementChild) this.#resizeObserver.observe(viewport.firstElementChild);
    this.#queueScrollStateSync();
    this.#refreshVisibility();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (
      changed.has("mode") ||
      changed.has("idleDelay") ||
      changed.has("size") ||
      changed.has("gutter") ||
      changed.has("snap")
    ) {
      this.#refreshVisibility();
      this.#queueScrollStateSync();
    }
  }

  #disconnectScrollState(): void {
    if (this.hasUpdated) this.#viewport.removeEventListener("scroll", this.#onScroll);
    if (this.#visibilityTimer !== undefined) window.clearTimeout(this.#visibilityTimer);
    this.#visibilityTimer = undefined;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = undefined;
    const view = this.ownerDocument.defaultView;
    if (this.#syncFrame !== undefined && view) view.cancelAnimationFrame(this.#syncFrame);
    this.#syncFrame = undefined;
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
    const active = this.#dragging || this.#activeUntil > now;
    const visible =
      this.mode === "always" ||
      this.#dragging ||
      this.#focused ||
      (this.mode === "hover" && this.#hovered) ||
      this.#activeUntil > now ||
      (this.mode === "scrolling" && this.#hovered && this.#visible);
    this.#visible = visible;
    this.#setState("visible", visible);
    this.#setState("idle", !active);
    this.#setState("active", active);
    this.#setState("hovered", this.#hovered);
    this.#setState("focused", this.#focused);
    this.#setState("dragging", this.#dragging);
    this.toggleAttribute("data-scroll-visible", visible);
    this.toggleAttribute("data-scroll-active", active);
    this.toggleAttribute("data-scroll-idle", !active);
    this.toggleAttribute("data-scroll-hovered", this.#hovered);
    this.toggleAttribute("data-scroll-focused", this.#focused);
    this.toggleAttribute("data-scroll-dragging", this.#dragging);
  }

  #showForActivity(): void {
    const delay = this.#idleDelayMs();
    this.#activeUntil = performance.now() + delay;
    this.#refreshVisibility();
    if (this.#visibilityTimer !== undefined) window.clearTimeout(this.#visibilityTimer);
    this.#visibilityTimer = window.setTimeout(() => {
      this.#visibilityTimer = undefined;
      this.#activeUntil = 0;
      this.#refreshVisibility();
    }, delay + 1);
  }

  #idleDelayMs(): number {
    return Math.max(0, Number.isFinite(this.idleDelay) ? this.idleDelay : defaultIdleDelay);
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
    this.#syncDetents();
  };

  #queueScrollStateSync = (): void => {
    const view = this.ownerDocument.defaultView;
    if (!view) {
      this.#syncScrollState();
      return;
    }
    if (this.#syncFrame !== undefined) return;
    this.#syncFrame = view.requestAnimationFrame(() => {
      this.#syncFrame = undefined;
      this.#syncScrollState();
    });
  };

  #detentControls(axis: ScrollAxis): HTMLElement[] {
    const slotName = `${axis}-detents`;
    const controls: HTMLElement[] = [];
    for (const root of this.querySelectorAll<HTMLElement>(`[slot="${slotName}"]`)) {
      if (root.matches("[data-scroll-target], [data-scroll-detent]")) controls.push(root);
      controls.push(
        ...root.querySelectorAll<HTMLElement>("[data-scroll-target], [data-scroll-detent]"),
      );
    }
    return controls;
  }

  #resolveTarget(reference: string): HTMLElement | null {
    const normalized = reference.trim();
    if (!normalized) return null;
    if (normalized.startsWith("#")) {
      try {
        return this.querySelector<HTMLElement>(normalized);
      } catch {
        return null;
      }
    }
    return this.querySelector<HTMLElement>(`[data-scroll-id="${CSS.escape(normalized)}"]`);
  }

  #targetPosition(
    target: Element,
    axis: ScrollAxis,
    align: ScrollTargetAlignment = "start",
  ): number {
    const viewport = this.#viewport;
    const metrics = this.#axisMetrics(axis);
    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const current = metrics.position;
    const start =
      current +
      (axis === "block" ? targetRect.top - viewportRect.top : targetRect.left - viewportRect.left);
    const targetSize = axis === "block" ? targetRect.height : targetRect.width;
    let next = start;
    if (align === "center") next -= (metrics.viewport - targetSize) / 2;
    else if (align === "end") next -= metrics.viewport - targetSize;
    else if (align === "nearest") {
      const targetEnd = start + targetSize;
      const viewportEnd = current + metrics.viewport;
      if (start >= current && targetEnd <= viewportEnd) return current;
      if (targetEnd > viewportEnd) next = targetEnd - metrics.viewport;
    }
    return Math.max(0, Math.min(metrics.maximum, next));
  }

  #detentPosition(control: HTMLElement, axis: ScrollAxis): number | undefined {
    const reference = control.dataset.scrollTarget;
    if (reference) {
      const target = this.#resolveTarget(reference);
      return target ? this.#targetPosition(target, axis) : undefined;
    }
    const raw = Number.parseFloat(control.dataset.scrollDetent ?? "");
    if (!Number.isFinite(raw)) return undefined;
    const normalized = raw > 1 ? raw / 100 : raw;
    return Math.max(0, Math.min(1, normalized)) * this.#axisMetrics(axis).maximum;
  }

  #scrollBehavior(requested: ScrollBehavior): ScrollBehavior {
    return this.ownerDocument.defaultView?.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : requested;
  }

  #syncDetents = (): void => {
    const candidates: Array<{ axis: ScrollAxis; control: HTMLElement; distance: number }> = [];
    for (const axis of ["block", "inline"] as const) {
      const metrics = this.#axisMetrics(axis);
      for (const control of this.#detentControls(axis)) {
        const position = this.#detentPosition(control, axis);
        if (position === undefined) continue;
        const normalized = metrics.maximum > 0 ? position / metrics.maximum : 0;
        control.style.setProperty("--ui-scroll-detent-position", `${normalized * 100}%`);
        control.dataset.scrollPosition = `${position}`;
        candidates.push({ axis, control, distance: Math.abs(metrics.position - position) });
      }
    }
    candidates.sort((left, right) => left.distance - right.distance);
    const nearest = candidates[0];
    const preferred = candidates.find(
      ({ control, distance }) =>
        control === this.#activeDetent &&
        nearest !== undefined &&
        Math.abs(distance - nearest.distance) <= 1,
    );
    const closest = preferred ?? nearest;
    for (const { control } of candidates) {
      if (control === closest?.control) continue;
      delete control.dataset.scrollDetentCurrent;
      control.removeAttribute("aria-current");
    }
    this.#activeDetent = closest?.control;
    if (this.#activeDetent) {
      this.#activeDetent.dataset.scrollDetentCurrent = "";
      this.#activeDetent.setAttribute("aria-current", "location");
    }
    const threshold = closest ? Math.max(1, this.#axisMetrics(closest.axis).viewport * 0.025) : 1;
    this.#setState("at-detent", Boolean(closest && closest.distance <= threshold));
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
    else viewport.scrollLeft = this.#inlineScrollLeft(next);
    this.#syncScrollState();
  }

  #inlineScrollLeft(position: number): number {
    return getComputedStyle(this.#viewport).direction === "rtl" ? -position : position;
  }

  #scrollToPosition(axis: ScrollAxis, value: number, behavior: ScrollBehavior): void {
    const maximum = this.#axisMetrics(axis).maximum;
    const next = Math.max(0, Math.min(maximum, value));
    this.#viewport.scrollTo({
      [axis === "block" ? "top" : "left"]: axis === "block" ? next : this.#inlineScrollLeft(next),
      behavior,
    });
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
            target instanceof HTMLElement &&
            (target.getAttribute("part")?.includes("thumb") ||
              target.dataset.scrollTarget !== undefined ||
              target.dataset.scrollDetent !== undefined),
        )
    )
      return;
    const axis = track.dataset.scrollAxis as ScrollAxis;
    const rect = track.getBoundingClientRect();
    const coordinate = axis === "block" ? event.clientY - rect.top : event.clientX - rect.left;
    const length = axis === "block" ? rect.height : rect.width;
    if (length <= 0) return;
    this.#setPosition(axis, (coordinate / length) * this.#axisMetrics(axis).maximum);
    this.#showForActivity();
  };

  #onDetentClick = (event: MouseEvent): void => {
    const control = event
      .composedPath()
      .find(
        (target): target is HTMLElement =>
          target instanceof HTMLElement &&
          (target.dataset.scrollTarget !== undefined || target.dataset.scrollDetent !== undefined),
      );
    if (!control) return;
    const axis = ((event.currentTarget as HTMLElement).dataset.scrollAxis ?? "block") as ScrollAxis;
    const behavior = this.#scrollBehavior(
      control.dataset.scrollBehavior === "smooth" ? "smooth" : "auto",
    );
    const align = (control.dataset.scrollAlign ?? "start") as ScrollTargetAlignment;
    const targetReference = control.dataset.scrollTarget;
    const target = targetReference ? this.#resolveTarget(targetReference) : null;
    const position = target
      ? this.#targetPosition(target, axis, align)
      : this.#detentPosition(control, axis);
    if (position === undefined) return;
    this.#activeDetent = control;
    this.#scrollToPosition(axis, position, behavior);
    this.#showForActivity();
    this.dispatchEvent(
      new CustomEvent("ui-scroll-area-target", {
        bubbles: true,
        composed: true,
        detail: { axis, target: targetReference ?? null, position },
      }),
    );
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
          <span part=${`${prefix}-detents`} data-scroll-axis=${axis} @click=${this.#onDetentClick}>
            <slot name=${`${prefix}-detents`} @slotchange=${this.#syncDetents}></slot>
          </span>
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

  /** The native overflow viewport retained beneath the authored scrollbar anatomy. */
  get viewportElement(): HTMLElement {
    return this.#viewport;
  }

  /** Scrolls the native viewport without exposing shadow-DOM implementation details. */
  scrollViewportTo(options: ScrollToOptions): void {
    this.#viewport.scrollTo(options);
  }

  /** Resolves a slotted target or selector and scrolls it into this viewport. */
  scrollToTarget(target: string | Element, options: ScrollToTargetOptions = {}): boolean {
    const resolved = typeof target === "string" ? this.#resolveTarget(target) : target;
    if (!resolved) return false;
    const axis = options.axis ?? "block";
    const position = this.#targetPosition(resolved, axis, options.align ?? "start");
    if (typeof target === "string") {
      this.#activeDetent = [...this.#detentControls(axis)].find(
        (control) => control.dataset.scrollTarget === target,
      );
    }
    this.#scrollToPosition(axis, position, this.#scrollBehavior(options.behavior ?? "auto"));
    this.#showForActivity();
    this.dispatchEvent(
      new CustomEvent("ui-scroll-area-target", {
        bubbles: true,
        composed: true,
        detail: { axis, target: typeof target === "string" ? target : null, position },
      }),
    );
    return true;
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
