/** Physical popup side shared with the portable positioner contract. */
export type AnchoredPlacement = "top" | "bottom" | "left" | "right";
/** Logical alignment along the selected popup side. */
export type AnchoredAlign = "start" | "center" | "end";

export interface AnchoredPositionConfig {
  placement: AnchoredPlacement;
  align: AnchoredAlign;
  offset: number;
  crossAxisOffset?: number;
  collisionPadding: number;
}

export interface ResolvedAnchoredPosition {
  placement: AnchoredPlacement;
  left: number;
  top: number;
}

export interface AnchoredPositionSnapshot extends ResolvedAnchoredPosition {
  align: AnchoredAlign;
  popup: DOMRect;
}

/**
 * Resolves preferred-side placement, opposite-side flipping, logical
 * alignment, and viewport clamping without depending on a DOM element type.
 * Native renderers can implement this same geometry from the generated
 * placement nodes; the Web controller below is only one binding.
 */
export function resolveAnchoredPosition(
  anchor: Pick<DOMRect, "top" | "right" | "bottom" | "left" | "width" | "height">,
  popup: Pick<DOMRect, "width" | "height">,
  viewport: { width: number; height: number },
  config: AnchoredPositionConfig,
  direction: "ltr" | "rtl" = "ltr",
): ResolvedAnchoredPosition {
  const margin = Math.max(
    0,
    Number.isFinite(config.collisionPadding) ? config.collisionPadding : 4,
  );
  const offset = Math.max(0, Number.isFinite(config.offset) ? config.offset : 0);
  const crossAxisOffset =
    typeof config.crossAxisOffset === "number" && Number.isFinite(config.crossAxisOffset)
      ? config.crossAxisOffset
      : 0;
  const available = {
    top: Math.max(0, anchor.top - margin),
    bottom: Math.max(0, viewport.height - margin - anchor.bottom),
    left: Math.max(0, anchor.left - margin),
    right: Math.max(0, viewport.width - margin - anchor.right),
  };
  const extent = {
    top: popup.height,
    bottom: popup.height,
    left: popup.width,
    right: popup.width,
  };
  const opposite: Record<AnchoredPlacement, AnchoredPlacement> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  };
  const preferred = config.placement;
  const alternate = opposite[preferred];
  const placement =
    extent[preferred] + offset <= available[preferred]
      ? preferred
      : extent[alternate] + offset <= available[alternate]
        ? alternate
        : available[preferred] >= available[alternate]
          ? preferred
          : alternate;

  const align =
    direction === "rtl" && (placement === "top" || placement === "bottom")
      ? config.align === "start"
        ? "end"
        : config.align === "end"
          ? "start"
          : "center"
      : config.align;
  const alignedX =
    align === "start"
      ? anchor.left
      : align === "end"
        ? anchor.right - popup.width
        : anchor.left + (anchor.width - popup.width) / 2;
  const alignedY =
    align === "start"
      ? anchor.top
      : align === "end"
        ? anchor.bottom - popup.height
        : anchor.top + (anchor.height - popup.height) / 2;
  let left =
    placement === "left"
      ? anchor.left - popup.width - offset
      : placement === "right"
        ? anchor.right + offset
        : alignedX + crossAxisOffset;
  let top =
    placement === "top"
      ? anchor.top - popup.height - offset
      : placement === "bottom"
        ? anchor.bottom + offset
        : alignedY + crossAxisOffset;
  left = Math.min(Math.max(margin, left), Math.max(margin, viewport.width - margin - popup.width));
  top = Math.min(Math.max(margin, top), Math.max(margin, viewport.height - margin - popup.height));
  return { placement, left, top };
}

export interface AnchoredPositionElements {
  anchor(): HTMLElement | null;
  popup(): HTMLElement | null;
  positioner(): HTMLElement | null;
  config(): AnchoredPositionConfig | null;
  point?(): { x: number; y: number } | null;
}

/** Web realization of the renderer-neutral anchored-position contract. */
export class AnchoredPositionController {
  readonly #host: HTMLElement;
  readonly #elements: AnchoredPositionElements;
  #frame?: number;
  #observer?: ResizeObserver;
  #active = false;
  #snapshot: AnchoredPositionSnapshot | null = null;

  constructor(host: HTMLElement, elements: AnchoredPositionElements) {
    this.#host = host;
    this.#elements = elements;
  }

  start(): void {
    if (this.#active || !this.#elements.config()) return;
    const view = this.#host.ownerDocument.defaultView;
    if (!view) return;
    this.#active = true;
    view.addEventListener("resize", this.queue);
    this.#host.ownerDocument.addEventListener("scroll", this.queue, true);
    if (typeof ResizeObserver !== "undefined") {
      this.#observer = new ResizeObserver(this.queue);
      const popup = this.#elements.popup();
      const anchor = this.#elements.anchor();
      if (popup) this.#observer.observe(popup);
      if (anchor) this.#observer.observe(anchor);
    }
    this.queue();
  }

  stop(): void {
    const view = this.#host.ownerDocument.defaultView;
    view?.removeEventListener("resize", this.queue);
    this.#host.ownerDocument.removeEventListener("scroll", this.queue, true);
    this.#observer?.disconnect();
    this.#observer = undefined;
    if (this.#frame !== undefined && view) view.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    this.#active = false;
    this.#snapshot = null;
    const positioner = this.#elements.positioner();
    if (positioner) {
      positioner.removeAttribute("style");
      delete positioner.dataset.side;
      delete positioner.dataset.align;
    }
  }

  get snapshot(): AnchoredPositionSnapshot | null {
    const snapshot = this.#snapshot;
    return snapshot ? { ...snapshot, popup: DOMRect.fromRect(snapshot.popup) } : null;
  }

  queue = (): void => {
    const view = this.#host.ownerDocument.defaultView;
    if (!this.#active || !view || this.#frame !== undefined) return;
    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = undefined;
      this.sync();
    });
  };

  sync(): void {
    const view = this.#host.ownerDocument.defaultView;
    const config = this.#elements.config();
    const anchorElement = this.#elements.anchor();
    const popup = this.#elements.popup();
    const positioner = this.#elements.positioner();
    if (!this.#active || !view || !config || !anchorElement || !popup || !positioner) return;
    const point = this.#elements.point?.();
    const anchor = point
      ? new DOMRect(point.x, point.y, 0, 0)
      : anchorElement.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const resolved = resolveAnchoredPosition(
      anchor,
      popupRect,
      { width: view.innerWidth, height: view.innerHeight },
      config,
      getComputedStyle(anchorElement).direction as "ltr" | "rtl",
    );
    positioner.style.position = "fixed";
    positioner.style.display = "block";
    positioner.style.insetInlineStart = `${Math.round(resolved.left)}px`;
    positioner.style.insetBlockStart = `${Math.round(resolved.top)}px`;
    // A backdrop-filter or transform on an ancestor establishes a containing
    // block for fixed descendants. Nested material menus therefore need one
    // measured correction to retain viewport coordinates without portalling
    // their semantic DOM out of the owning menu item.
    const actual = positioner.getBoundingClientRect();
    const deltaX = resolved.left - actual.left;
    const deltaY = resolved.top - actual.top;
    if (Math.abs(deltaX) > 0.5) {
      positioner.style.insetInlineStart = `${Math.round(resolved.left + deltaX)}px`;
    }
    if (Math.abs(deltaY) > 0.5) {
      positioner.style.insetBlockStart = `${Math.round(resolved.top + deltaY)}px`;
    }
    const finalPopup = popup.getBoundingClientRect();
    positioner.dataset.side = resolved.placement;
    positioner.dataset.align = config.align;
    this.#snapshot = {
      ...resolved,
      left: finalPopup.left,
      top: finalPopup.top,
      align: config.align,
      popup: DOMRect.fromRect(finalPopup),
    };
  }
}
