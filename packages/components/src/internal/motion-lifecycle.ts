export interface MotionLifecycleContext<T> {
  value: T;
  reducedMotion: boolean;
  interrupted: boolean;
}

export interface MotionLifecycleOptions<T> {
  target: () => Element | null;
  onStart?: (context: MotionLifecycleContext<T>) => void;
  onFinish?: (context: MotionLifecycleContext<T>) => void;
  reducedMotion?: () => boolean;
  skipAnimations?: (value: T) => boolean;
}

/**
 * Small, framework-free coordinator for CSS animation lifecycles.
 *
 * It owns no visual recipe and does not mutate the target. Callers publish
 * semantic states before `play()`, CSS realizes those states, and this
 * controller only announces when the resulting animations settle.
 */
export class MotionLifecycleController<T> {
  readonly #host: HTMLElement;
  readonly #options: MotionLifecycleOptions<T>;
  #cycle = 0;
  #active: MotionLifecycleContext<T> | undefined;
  #frame: number | undefined;
  #timeout: number | undefined;

  constructor(host: HTMLElement, options: MotionLifecycleOptions<T>) {
    this.#host = host;
    this.#options = options;
  }

  play(value: T): void {
    this.cancel();
    const context: MotionLifecycleContext<T> = {
      value,
      reducedMotion: this.#reducedMotion(),
      interrupted: false,
    };
    this.#active = context;
    const cycle = ++this.#cycle;
    this.#options.onStart?.({ ...context });

    const view = this.#host.ownerDocument.defaultView;
    if (!view) {
      this.#finish(cycle, false);
      return;
    }

    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = undefined;
      if (cycle !== this.#cycle) {
        return;
      }
      const target = this.#options.target();
      const skipped = context.reducedMotion || this.#options.skipAnimations?.(value);
      const animations = skipped ? [] : (target?.getAnimations() ?? []);
      if (animations.length === 0) {
        if (skipped) {
          queueMicrotask(() => this.#finish(cycle, false));
          return;
        }
        const timeout =
          target instanceof HTMLElement ? this.#computedMotionTime(getComputedStyle(target)) : 0;
        if (timeout === Infinity) return;
        if (timeout > 0) {
          this.#timeout = view.setTimeout(() => this.#finish(cycle, false), timeout + 16);
          return;
        }
        queueMicrotask(() => this.#finish(cycle, false));
        return;
      }
      if (animations.some((animation) => this.#animationTotalTime(animation) === Infinity)) return;

      this.#timeout = view.setTimeout(
        () => this.#finish(cycle, false),
        this.#finishTimeout(target, animations),
      );
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
        if (cycle !== this.#cycle) return;
        this.#clearTimeout();
        this.#finish(cycle, false);
      });
    });
  }

  cancel(): void {
    const active = this.#active;
    if (!active) return;
    const view = this.#host.ownerDocument.defaultView;
    if (this.#frame !== undefined && view) view.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    this.#clearTimeout();
    this.#active = undefined;
    this.#cycle += 1;
    this.#options.onFinish?.({ ...active, interrupted: true });
  }

  destroy(): void {
    this.cancel();
  }

  #reducedMotion(): boolean {
    if (this.#options.reducedMotion) return this.#options.reducedMotion();
    const view = this.#host.ownerDocument.defaultView;
    return view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  #finish(cycle: number, interrupted: boolean): void {
    if (cycle !== this.#cycle) return;
    const active = this.#active;
    if (!active) return;
    this.#clearTimeout();
    this.#active = undefined;
    this.#options.onFinish?.({ ...active, interrupted });
  }

  #clearTimeout(): void {
    const view = this.#host.ownerDocument.defaultView;
    if (this.#timeout !== undefined && view) view.clearTimeout(this.#timeout);
    this.#timeout = undefined;
  }

  #finishTimeout(target: Element | null, animations: Animation[]): number {
    const animationTime = animations.reduce(
      (maximum, animation) => Math.max(maximum, this.#animationTotalTime(animation)),
      0,
    );
    const styleTime =
      target instanceof HTMLElement ? this.#computedMotionTime(getComputedStyle(target)) : 0;
    return Math.max(animationTime, styleTime, 0) + 16;
  }

  #animationTotalTime(animation: Animation): number {
    const timing = animation.effect?.getTiming();
    if (!timing) return 0;
    const iterations = timing.iterations ?? 1;
    if (iterations === Infinity) return Infinity;
    const duration = typeof timing.duration === "number" ? timing.duration : 0;
    const delay = typeof timing.delay === "number" ? timing.delay : 0;
    const endDelay = typeof timing.endDelay === "number" ? timing.endDelay : 0;
    return Math.max(0, delay + duration * iterations + endDelay);
  }

  #computedMotionTime(style: CSSStyleDeclaration): number {
    return Math.max(
      this.#longestDeclaredTime(style.transitionDuration, style.transitionDelay),
      this.#longestDeclaredTime(
        style.animationDuration,
        style.animationDelay,
        style.animationIterationCount,
      ),
    );
  }

  #longestDeclaredTime(durations: string, delays: string, iterations = "1"): number {
    const durationValues = this.#timeList(durations);
    const delayValues = this.#timeList(delays);
    const iterationValues = iterations
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => (value === "infinite" ? Infinity : Number.parseFloat(value)))
      .map((value) => (Number.isFinite(value) ? value : value === Infinity ? Infinity : 1));
    const count = Math.max(durationValues.length, delayValues.length, iterationValues.length, 1);
    let maximum = 0;

    for (let index = 0; index < count; index += 1) {
      const duration = durationValues[index % durationValues.length] ?? 0;
      const delay = delayValues[index % delayValues.length] ?? 0;
      const iteration = iterationValues[index % iterationValues.length] ?? 1;
      if (iteration === Infinity && duration > 0) return Infinity;
      maximum = Math.max(maximum, Math.max(0, delay + duration * iteration));
    }

    return maximum;
  }

  #timeList(value: string): number[] {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const amount = Number.parseFloat(part);
        if (!Number.isFinite(amount)) return 0;
        return part.endsWith("ms") ? amount : amount * 1000;
      });
  }
}
