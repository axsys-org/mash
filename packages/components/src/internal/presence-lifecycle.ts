import { MotionLifecycleController } from "./motion-lifecycle.js";

export type PresenceMotionPhase = "entering" | "exiting";
export type PresenceSettledPhase = "active" | "absent";
export type PresenceState =
  "open" | "present" | "entering" | "active" | "exiting" | "reduced-motion";

export interface PresenceLifecycleContext<T> {
  value: T;
  phase: PresenceMotionPhase;
  open: boolean;
  reducedMotion: boolean;
  interrupted: boolean;
}

export interface PresenceLifecycleEventDetail {
  open: boolean;
  phase: PresenceMotionPhase;
  reducedMotion: boolean;
  interrupted: boolean;
}

export interface PresenceLifecycleOptions<T> {
  target: () => Element | null;
  present: () => boolean;
  setPresent: (present: boolean) => void;
  setState: (state: PresenceState, present: boolean) => void;
  beforeEnter?: () => void;
  beforeExitPhase?: () => void;
  afterExitPhase?: () => void;
  onStart?: (context: PresenceLifecycleContext<T>) => void;
  onFinish?: (context: PresenceLifecycleContext<T>) => void;
  onSettle?: (phase: PresenceSettledPhase) => void;
  reducedMotion?: () => boolean;
  skipAnimations?: (context: PresenceLifecycleContext<T>) => boolean;
}

interface PresenceMotionValue<T> {
  open: boolean;
  phase: PresenceMotionPhase;
  value: T;
}

/**
 * Shared open/present/phase state machine for components with exit presence.
 *
 * Visual recipes still live in CSS. The controller only keeps semantic states,
 * render presence, reduced-motion state, and motion lifecycle callbacks in the
 * same order for reveal, overlays, toasts, and future popup compositions.
 */
export class PresenceLifecycleController<T> {
  readonly #options: PresenceLifecycleOptions<T>;
  readonly #motion: MotionLifecycleController<PresenceMotionValue<T>>;

  constructor(host: HTMLElement, options: PresenceLifecycleOptions<T>) {
    this.#options = options;
    this.#motion = new MotionLifecycleController(host, {
      target: options.target,
      reducedMotion: options.reducedMotion,
      skipAnimations: (value) => {
        const context = this.#context(value, false, this.#reducedMotion());
        return options.skipAnimations?.(context) ?? false;
      },
      onStart: ({ value, reducedMotion }) => {
        this.#setState("reduced-motion", reducedMotion);
        this.#options.onStart?.(this.#context(value, false, reducedMotion));
      },
      onFinish: ({ value, reducedMotion, interrupted }) => {
        this.#setState("reduced-motion", reducedMotion);
        if (!interrupted) this.#settle(value.phase);
        this.#options.onFinish?.(this.#context(value, interrupted, reducedMotion));
      },
    });
  }

  enter(value: T): void {
    this.#setPresent(true);
    this.#setState("open", true);
    this.#setPhase("entering");
    this.#options.beforeEnter?.();
    this.#motion.play({ value, phase: "entering", open: true });
  }

  exit(value: T, wasOpen: boolean): void {
    this.#setState("open", false);
    this.#setState("active", false);

    if (!wasOpen || !this.#options.present()) {
      this.absent();
      return;
    }

    this.#options.beforeExitPhase?.();
    this.#setPhase("exiting");
    this.#options.afterExitPhase?.();
    this.#motion.play({ value, phase: "exiting", open: false });
  }

  absent(): void {
    this.#motion.cancel();
    this.#setPresent(false);
    this.#setState("open", false);
    this.#setState("active", false);
    this.#setState("entering", false);
    this.#setState("exiting", false);
    this.#options.onSettle?.("absent");
  }

  destroy(): void {
    this.#motion.destroy();
  }

  #settle(phase: PresenceMotionPhase): void {
    this.#setState("entering", false);
    this.#setState("exiting", false);

    if (phase === "entering") {
      this.#setState("active", true);
      this.#options.onSettle?.("active");
      return;
    }

    this.#setPresent(false);
    this.#setState("open", false);
    this.#setState("active", false);
    this.#options.onSettle?.("absent");
  }

  #setPhase(phase: PresenceMotionPhase): void {
    this.#setState("active", false);
    this.#setState(phase === "entering" ? "exiting" : "entering", false);
    this.#setState(phase, true);
  }

  #setPresent(present: boolean): void {
    this.#options.setPresent(present);
    this.#setState("present", present);
  }

  #setState(state: PresenceState, present: boolean): void {
    this.#options.setState(state, present);
  }

  #context(
    value: PresenceMotionValue<T>,
    interrupted: boolean,
    reducedMotion: boolean,
  ): PresenceLifecycleContext<T> {
    return {
      value: value.value,
      phase: value.phase,
      open: value.open,
      reducedMotion,
      interrupted,
    };
  }

  #reducedMotion(): boolean {
    const root = this.#options.target()?.ownerDocument.documentElement;
    const view = root?.ownerDocument.defaultView;
    return (
      this.#options.reducedMotion?.() ??
      view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
      false
    );
  }
}
