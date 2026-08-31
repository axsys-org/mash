/** Logical overflow edges exposed by compact label and path viewports. */
export interface InlineOverflowState {
  overflowing: boolean;
  start: boolean;
  end: boolean;
}

interface OverflowHost extends HTMLElement {
  requestUpdate(): unknown;
}

const emptyState = (): InlineOverflowState => ({
  overflowing: false,
  start: false,
  end: false,
});

/**
 * Keeps logical inline-overflow state in sync without prescribing presentation.
 *
 * Consumers expose the states as CSS custom states and decide whether their
 * recipe uses a mask, a progressive blur, a scrollbar, or no visual treatment.
 */
export class InlineOverflowController {
  readonly #host: OverflowHost;
  readonly #internals: ElementInternals;
  #viewport?: HTMLElement;
  #observer?: ResizeObserver;
  #frame?: number;
  #pendingAlignment?: "start" | "end";

  state: InlineOverflowState = emptyState();

  constructor(host: OverflowHost, internals: ElementInternals) {
    this.#host = host;
    this.#internals = internals;
  }

  connect(viewport: HTMLElement): void {
    if (this.#viewport === viewport) return;
    this.disconnect();
    this.#viewport = viewport;
    viewport.addEventListener("scroll", this.sync, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      this.#observer = new ResizeObserver(() => this.queue());
      this.#observer.observe(viewport);
      if (viewport.firstElementChild) this.#observer.observe(viewport.firstElementChild);
    }
    this.queue();
  }

  disconnect(): void {
    this.#viewport?.removeEventListener("scroll", this.sync);
    this.#observer?.disconnect();
    this.#observer = undefined;
    const view = this.#host.ownerDocument.defaultView;
    if (this.#frame !== undefined && view) view.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    this.#viewport = undefined;
  }

  /** Re-measures after rendering and optionally preserves a logical edge. */
  queue = (alignment?: "start" | "end"): void => {
    if (alignment) this.#pendingAlignment = alignment;
    const view = this.#host.ownerDocument.defaultView;
    if (!this.#viewport || this.#frame !== undefined) return;
    if (!view) {
      this.sync();
      return;
    }
    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = undefined;
      const viewport = this.#viewport;
      if (!viewport) return;
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      if (this.#pendingAlignment === "start") viewport.scrollLeft = 0;
      if (this.#pendingAlignment === "end") {
        const direction = getComputedStyle(viewport).direction;
        viewport.scrollLeft = direction === "rtl" ? -max : max;
      }
      this.#pendingAlignment = undefined;
      this.sync();
    });
  };

  sync = (): void => {
    const viewport = this.#viewport;
    if (!viewport) return;
    const epsilon = 1;
    const inline = Math.abs(viewport.scrollLeft);
    const inlineMax = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const next: InlineOverflowState = {
      overflowing: inlineMax > epsilon,
      start: inlineMax > epsilon && inline > epsilon,
      end: inlineMax > epsilon && inlineMax - inline > epsilon,
    };
    if (
      next.overflowing === this.state.overflowing &&
      next.start === this.state.start &&
      next.end === this.state.end
    ) {
      return;
    }
    this.state = next;
    this.#setState("overflowing", next.overflowing);
    this.#setState("overflow-start", next.start);
    this.#setState("overflow-end", next.end);
    this.#host.requestUpdate();
  };

  #setState(name: string, active: boolean): void {
    if (active) this.#internals.states.add(name);
    else this.#internals.states.delete(name);
  }
}
