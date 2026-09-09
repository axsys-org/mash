/** Transient tab offsets shared by sorting and docking. Layout remains owned by the host. */
export class ReorderMotionController {
  #host: HTMLElement;
  #entries = new Map<
    HTMLElement,
    { original: string; destination?: string; animation?: Animation }
  >();

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  move(element: HTMLElement, x: number, y: number, immediate = false): void {
    let entry = this.#entries.get(element);
    if (!entry) {
      entry = { original: element.style.translate };
      this.#entries.set(element, entry);
    }
    const to = `${x}px ${y}px`;
    if (entry.destination === to && !immediate) return;
    entry.destination = to;
    const view = this.#host.ownerDocument.defaultView!;
    const from = view.getComputedStyle(element).translate;
    entry.animation?.cancel();
    element.style.translate = to;
    if (immediate || view.matchMedia("(prefers-reduced-motion: reduce)").matches || from === to)
      return;
    const tokens = view.getComputedStyle(this.#host);
    const durationToken = tokens.getPropertyValue("--duration-control").trim();
    const parsedDuration =
      Number.parseFloat(durationToken) * (durationToken.endsWith("ms") ? 1 : 1000);
    const duration = Number.isFinite(parsedDuration) ? Math.max(0, parsedDuration) : 160;
    if (duration === 0) return;
    const easing = tokens.getPropertyValue("--easing-spring-snappy").trim() || "ease-out";
    entry.animation = element.animate(
      [{ translate: from === "none" ? "0px 0px" : from }, { translate: to }],
      { duration, easing },
    );
  }

  reset(element?: HTMLElement): void {
    for (const [target, entry] of this.#entries) {
      if (element && target !== element) continue;
      entry.animation?.cancel();
      target.style.translate = entry.original;
      this.#entries.delete(target);
    }
  }

  destroy(): void {
    this.reset();
  }
}
