import { ReorderMotionController } from "../internal/reorder-motion.js";

export interface HoverOptions {
  /** Authored highlight, normally placed in the motion scene's underlay slot. */
  highlight: HTMLElement;
  /** Selector for interactive items within this scene. */
  items?: string;
  /** Nearest-item search direction. */
  axis?: "horizontal" | "vertical" | "both";
  /** Maximum gap distance in CSS pixels that may forward a click. Off by default. */
  gap?: number;
}

/** Measured hover and focus state; presentation remains on the authored underlay. */
export class HoverController {
  readonly #host: HTMLElement;
  readonly #options: HoverOptions;
  readonly #motion: ReorderMotionController;
  readonly #abort = new AbortController();
  readonly #resize: ResizeObserver;
  readonly #mutation: MutationObserver;
  #items: HTMLElement[] = [];
  #active: HTMLElement | null = null;
  #point: { x: number; y: number } | null = null;
  #focused: HTMLElement | null = null;
  #frame = 0;
  #destroyed = false;

  constructor(host: HTMLElement, options: HoverOptions) {
    this.#host = host;
    this.#options = options;
    this.#motion = new ReorderMotionController(host);
    const signal = this.#abort.signal;
    host.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType === "touch") return;
        this.#point = { x: event.clientX, y: event.clientY };
        this.#queue();
      },
      { signal },
    );
    host.addEventListener(
      "pointerleave",
      () => {
        this.#point = null;
        this.#queue();
      },
      { signal },
    );
    host.addEventListener(
      "focusin",
      (event) => {
        this.#focused = this.#items.find((item) => event.composedPath().includes(item)) ?? null;
        this.#point = null;
        this.#queue();
      },
      { signal },
    );
    host.addEventListener(
      "focusout",
      () => {
        this.#focused = null;
        this.#queue();
      },
      { signal },
    );
    host.addEventListener("click", this.#click, { signal });
    host.ownerDocument.addEventListener("scroll", this.#queue, {
      capture: true,
      passive: true,
      signal,
    });
    this.#resize = new ResizeObserver(this.#queue);
    this.#mutation = new MutationObserver(() => this.refresh());
    this.#mutation.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "disabled", "aria-disabled", "class"],
    });
    this.refresh();
  }

  /** Refresh after a transform or external layout change that does not resize an item. */
  refresh(): void {
    if (this.#destroyed) return;
    this.#items = [
      ...this.#host.querySelectorAll<HTMLElement>(this.#options.items ?? "[data-hover-item]"),
    ];
    this.#resize.disconnect();
    this.#resize.observe(this.#host);
    this.#items.forEach((item) => this.#resize.observe(item));
    this.#queue();
  }

  #enabled(item: HTMLElement): boolean {
    return (
      item.isConnected &&
      !item.matches('[disabled], [aria-disabled="true"]') &&
      item.checkVisibility({ checkVisibilityCSS: true }) &&
      item.getBoundingClientRect().width > 0
    );
  }

  #nearest(x: number, y: number): HTMLElement | null {
    let nearest: HTMLElement | null = null;
    let distance = Infinity;
    for (const item of this.#items) {
      if (!this.#enabled(item)) continue;
      const rect = item.getBoundingClientRect();
      const dx = x - (rect.left + rect.width / 2);
      const dy = y - (rect.top + rect.height / 2);
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return item;
      const next =
        this.#options.axis === "horizontal"
          ? Math.abs(dx)
          : this.#options.axis === "both"
            ? Math.hypot(dx, dy)
            : Math.abs(dy);
      if (next < distance) {
        nearest = item;
        distance = next;
      }
    }
    return nearest;
  }

  #queue = (): void => {
    if (this.#frame || this.#destroyed) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      const item = this.#point ? this.#nearest(this.#point.x, this.#point.y) : this.#focused;
      this.#show(item && this.#enabled(item) ? item : null);
    });
  };

  #show(item: HTMLElement | null): void {
    const highlight = this.#options.highlight;
    const fresh = !this.#active;
    if (this.#active !== item) this.#active?.removeAttribute("data-hover-active");
    this.#active = item;
    highlight.toggleAttribute("data-hover-visible", Boolean(item));
    if (!item) {
      this.#host.removeAttribute("data-hover-index");
      return;
    }
    item.setAttribute("data-hover-active", "");
    this.#host.setAttribute("data-hover-index", String(this.#items.indexOf(item)));
    const outer = this.#host.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    const scaleX = outer.width / this.#host.offsetWidth || 1;
    const scaleY = outer.height / this.#host.offsetHeight || 1;
    highlight.style.width = `${rect.width / scaleX}px`;
    highlight.style.height = `${rect.height / scaleY}px`;
    this.#motion.move(
      highlight,
      (rect.left - outer.left) / scaleX - this.#host.clientLeft + this.#host.scrollLeft,
      (rect.top - outer.top) / scaleY - this.#host.clientTop + this.#host.scrollTop,
      fresh,
    );
  }

  #click = (event: MouseEvent): void => {
    if (!this.#options.gap || event.detail === 0 || event.defaultPrevented || event.button !== 0)
      return;
    if (this.#items.some((item) => event.composedPath().includes(item))) return;
    const item = this.#nearest(event.clientX, event.clientY);
    if (!item) return;
    const rect = item.getBoundingClientRect();
    const distance = Math.hypot(
      Math.max(rect.left - event.clientX, 0, event.clientX - rect.right),
      Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom),
    );
    if (distance > this.#options.gap) return;
    this.#show(item);
    item.click();
  };

  /** Cancels pending work, observers and listeners. Called when the motion scene disconnects. */
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    cancelAnimationFrame(this.#frame);
    this.#abort.abort();
    this.#resize.disconnect();
    this.#mutation.disconnect();
    this.#show(null);
    this.#motion.destroy();
    this.#options.highlight.style.removeProperty("width");
    this.#options.highlight.style.removeProperty("height");
  }
}
