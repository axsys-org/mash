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
      if (cycle !== this.#cycle) {
        this.#frame = undefined;
        return;
      }
      this.#frame = view.requestAnimationFrame(() => {
        this.#frame = undefined;
        if (cycle !== this.#cycle) return;
        const target = this.#options.target();
        const animations =
          context.reducedMotion || this.#options.skipAnimations?.(value)
            ? []
            : (target?.getAnimations() ?? []);
        if (animations.length === 0) {
          queueMicrotask(() => this.#finish(cycle, false));
          return;
        }
        void Promise.allSettled(animations.map((animation) => animation.finished)).then(() =>
          this.#finish(cycle, false),
        );
      });
    });
  }

  cancel(): void {
    const active = this.#active;
    if (!active) return;
    const view = this.#host.ownerDocument.defaultView;
    if (this.#frame !== undefined && view) view.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
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
    this.#active = undefined;
    this.#options.onFinish?.({ ...active, interrupted });
  }
}
