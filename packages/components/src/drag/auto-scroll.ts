import { type DragPoint, rectFromDomRect, viewportRect } from "./geometry.js";

export interface DragAutoScrollOptions {
  target: Window | HTMLElement;
  /** Scroll speeds in CSS pixels per second, from the outer to innermost edge zone. */
  speed?: number | readonly number[];
  /** Edge distances in CSS pixels, ordered from widest to narrowest. */
  sensitivity?: number | readonly number[];
  /** Lower native scrollLeft bound; RTL elements use negative coordinates. */
  minX?: number;
  /** Upper native scrollLeft bound; RTL elements normally end at zero. */
  maxX?: number;
  minY?: number;
  maxY?: number;
}

interface Velocity {
  x: number;
  y: number;
}

const DEFAULT_SPEED = [40, 200, 1000] as const;
const DEFAULT_SENSITIVITY = [100, 40, 0] as const;

function values(
  value: number | readonly number[] | undefined,
  fallback: readonly number[],
): number[] {
  const source = typeof value === "number" ? [value] : (value ?? fallback);
  return source
    .filter(Number.isFinite)
    .map((item) => Math.max(0, item))
    .slice(0, 3);
}

function isWindow(target: Window | HTMLElement): target is Window {
  return "document" in target && "scrollTo" in target;
}

function scrollPosition(target: Window | HTMLElement): DragPoint {
  return isWindow(target)
    ? { x: target.scrollX, y: target.scrollY }
    : { x: target.scrollLeft, y: target.scrollTop };
}

function scrollMaximum(target: Window | HTMLElement): DragPoint {
  if (isWindow(target)) {
    const root = target.document.documentElement;
    return {
      x: Math.max(0, root.scrollWidth - root.clientWidth),
      y: Math.max(0, root.scrollHeight - root.clientHeight),
    };
  }
  return {
    x: Math.max(0, target.scrollWidth - target.clientWidth),
    y: Math.max(0, target.scrollHeight - target.clientHeight),
  };
}

function applyScroll(target: Window | HTMLElement, point: DragPoint): void {
  if (isWindow(target)) target.scrollTo(point.x, point.y);
  else {
    target.scrollLeft = point.x;
    target.scrollTop = point.y;
  }
}

function edgeSpeed(
  distance: number,
  speeds: readonly number[],
  sensitivity: readonly number[],
): number {
  let result = 0;
  const count = Math.min(speeds.length, sensitivity.length);
  for (let index = 0; index < count; index += 1) {
    const threshold = sensitivity[index];
    const speed = speeds[index];
    if (threshold !== undefined && speed !== undefined && distance <= threshold) result = speed;
  }
  return result;
}

/** A lifecycle-scoped requestAnimationFrame auto-scroll loop. */
export class DragAutoScrollController {
  readonly #view: Window;
  readonly #onScroll: () => void;
  #options: DragAutoScrollOptions;
  #speed: number[];
  #sensitivity: number[];
  #velocity: Velocity = { x: 0, y: 0 };
  #frame: number | undefined;
  #lastTime = 0;

  constructor(options: DragAutoScrollOptions, onScroll: () => void) {
    const view = isWindow(options.target)
      ? options.target
      : options.target.ownerDocument.defaultView;
    if (!view) throw new Error("Auto-scroll target must belong to a live document.");
    this.#view = view;
    this.#onScroll = onScroll;
    this.#options = options;
    this.#speed = values(options.speed, DEFAULT_SPEED);
    this.#sensitivity = values(options.sensitivity, DEFAULT_SENSITIVITY).sort((a, b) => b - a);
  }

  updateOptions(options: DragAutoScrollOptions): void {
    this.stop();
    this.#options = options;
    this.#speed = values(options.speed, DEFAULT_SPEED);
    this.#sensitivity = values(options.sensitivity, DEFAULT_SENSITIVITY).sort((a, b) => b - a);
  }

  update(pointer: DragPoint): boolean {
    const target = this.#options.target;
    const rect = isWindow(target)
      ? viewportRect(target)
      : rectFromDomRect(target.getBoundingClientRect());
    const left = edgeSpeed(pointer.x - rect.left, this.#speed, this.#sensitivity);
    const right = edgeSpeed(rect.right - pointer.x, this.#speed, this.#sensitivity);
    const top = edgeSpeed(pointer.y - rect.top, this.#speed, this.#sensitivity);
    const bottom = edgeSpeed(rect.bottom - pointer.y, this.#speed, this.#sensitivity);
    this.#velocity = {
      x: left > 0 ? -left : right > 0 ? right : 0,
      y: top > 0 ? -top : bottom > 0 ? bottom : 0,
    };

    const active = this.#velocity.x !== 0 || this.#velocity.y !== 0;
    if (active && this.#frame === undefined) {
      this.#lastTime = this.#view.performance.now();
      this.#frame = this.#view.requestAnimationFrame(this.#tick);
    } else if (!active) {
      this.stop();
    }
    return active;
  }

  #tick = (time: number): void => {
    this.#frame = undefined;
    const elapsed = Math.min(64, Math.max(0, time - this.#lastTime));
    this.#lastTime = time;
    const target = this.#options.target;
    const current = scrollPosition(target);
    const maximum = scrollMaximum(target);
    const rtl = !isWindow(target) && this.#view.getComputedStyle(target).direction === "rtl";
    const nativeMinimumX = rtl ? -maximum.x : 0;
    const nativeMaximumX = rtl ? 0 : maximum.x;
    const minimumX = Math.max(nativeMinimumX, this.#options.minX ?? nativeMinimumX);
    const minimumY = Math.max(0, this.#options.minY ?? 0);
    const maximumX = Math.min(nativeMaximumX, this.#options.maxX ?? nativeMaximumX);
    const maximumY = Math.min(maximum.y, this.#options.maxY ?? maximum.y);
    const next = {
      x: Math.min(maximumX, Math.max(minimumX, current.x + (this.#velocity.x * elapsed) / 1000)),
      y: Math.min(maximumY, Math.max(minimumY, current.y + (this.#velocity.y * elapsed) / 1000)),
    };
    if (next.x !== current.x || next.y !== current.y) {
      applyScroll(target, next);
      this.#onScroll();
    }
    if (this.#velocity.x !== 0 || this.#velocity.y !== 0) {
      this.#frame = this.#view.requestAnimationFrame(this.#tick);
    }
  };

  stop(): void {
    if (this.#frame !== undefined) this.#view.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    this.#velocity = { x: 0, y: 0 };
  }

  destroy(): void {
    this.stop();
  }
}
