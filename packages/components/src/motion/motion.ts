import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { MotionLifecycleController } from "../internal/motion-lifecycle.js";

export type MotionRecipe =
  | "none"
  | "custom"
  | "fade"
  | "scale"
  | "slide-inline"
  | "slide-block"
  | "rotate"
  | "spin"
  | "pulse"
  | "shake"
  | "blur";
export type MotionState = "idle" | "active" | "loading" | "entering" | "exiting";
export type MotionTarget = "root" | "underlay" | "content" | "overlay" | "indicator";

export interface MotionEventDetail {
  motion: MotionRecipe;
  state: MotionState;
  previousState: MotionState;
  target: MotionTarget;
  reducedMotion: boolean;
  interrupted: boolean;
}

/**
 * Coordinates semantic motion across arbitrary slotted content.
 *
 * The component owns lifecycle and a generic four-layer scene. The thing being
 * animated remains authored content: a surface, separator, glyph, progress
 * indicator, drag preview, or an entire composed component can occupy any lane.
 * Nested motion elements provide independent timelines without teaching the
 * slotted components about animation.
 *
 * @tag ui-motion
 * @summary Applies token-driven motion states to arbitrary slotted anatomy.
 *
 * @example A component-agnostic motion scene
 * <ui-motion motion="scale" state="entering">
 *   <ui-card title="Billing migration">Any component can be the target.</ui-card>
 *   <ui-badge slot="indicator">Updated</ui-badge>
 * </ui-motion>
 *
 * @slot - Primary authored content.
 * @slot underlay - Content behind the primary lane.
 * @slot overlay - Content above the primary lane.
 * @slot indicator - Highest-priority compact state or progress content.
 *
 * @csspart root - The layered motion-scene boundary.
 * @csspart underlay - The authored background lane.
 * @csspart content - The default authored content lane.
 * @csspart overlay - The authored foreground lane.
 * @csspart indicator - The authored state or progress lane.
 *
 * @cssstate animating - Matches `:state(animating)` during an active lifecycle.
 * @cssstate reduced-motion - Matches `:state(reduced-motion)` when the environment suppresses motion.
 *
 * @fires {CustomEvent<MotionEventDetail>} mash-motion-start - Announces a semantic motion lifecycle after state changes.
 * @fires {CustomEvent<MotionEventDetail>} mash-motion-end - Announces completion or interruption of that lifecycle.
 *
 * @mashnode root motion
 * @mashnode underlay underlay root
 * @mashnode content content root
 * @mashnode overlay overlay root
 * @mashnode indicator indicator root
 * @mashnode motion motion root
 * @mashnode state state root
 * @mashnode target target root
 * @mashnode animating animating root
 * @mashnode reduced-motion reduced-motion root
 * @mashrole slot underlay underlay underlay
 * @mashrole slot default content content
 * @mashrole slot overlay overlay overlay
 * @mashrole slot indicator indicator indicator
 * @mashrole event mash-motion-start state state
 * @mashrole event mash-motion-end state state
 */
export class UIMotion extends LitElement {
  static override properties = {
    motion: { type: String, reflect: true },
    state: { type: String, reflect: true },
    target: { type: String, reflect: true },
  };

  /** Semantic motion recipe. `custom` leaves visual realization entirely to CSS parts. */
  declare motion: MotionRecipe;
  /** Current renderer-neutral lifecycle state. */
  declare state: MotionState;
  /** Scene lane that receives the recipe. */
  declare target: MotionTarget;

  readonly #internals: ElementInternals;
  readonly #lifecycle: MotionLifecycleController<MotionEventDetail>;

  constructor() {
    super();
    this.motion = "none";
    this.state = "idle";
    this.target = "content";
    this.#internals = this.attachInternals();
    this.#lifecycle = new MotionLifecycleController(this, {
      target: () => this.renderRoot.querySelector<HTMLElement>(".motion-target"),
      skipAnimations: (detail) => detail.motion === "none",
      onStart: ({ value, reducedMotion }) => {
        this.#internals.states.add("animating");
        if (reducedMotion) this.#internals.states.add("reduced-motion");
        else this.#internals.states.delete("reduced-motion");
        this.dispatchEvent(
          new CustomEvent<MotionEventDetail>("mash-motion-start", {
            bubbles: true,
            composed: true,
            detail: { ...value, reducedMotion },
          }),
        );
      },
      onFinish: ({ value, reducedMotion, interrupted }) => {
        this.#internals.states.delete("animating");
        this.dispatchEvent(
          new CustomEvent<MotionEventDetail>("mash-motion-end", {
            bubbles: true,
            composed: true,
            detail: { ...value, reducedMotion, interrupted },
          }),
        );
      },
    });
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
        --_mash-motion-duration-control: var(--duration-control, 120ms);
        --_mash-motion-duration-surface: var(--duration-surface, 200ms);
        --_mash-motion-easing-control: var(--easing-control, cubic-bezier(0.2, 0, 0, 1));
        --_mash-motion-easing-surface: var(--easing-surface, cubic-bezier(0.3, 0, 0, 1));
        --_mash-motion-easing-spring-gentle: var(
          --easing-spring-gentle,
          cubic-bezier(0.3, 0, 0, 1)
        );
        --_mash-motion-easing-spring-snappy: var(
          --easing-spring-snappy,
          cubic-bezier(0.2, 0, 0, 1)
        );
        --_mash-motion-distance-short: var(--motion-distance-short, 0.25rem);
        --_mash-motion-distance-medium: var(--motion-distance-medium, 0.75rem);
        --_mash-motion-scale-rest: var(--motion-scale-rest, 1);
        --_mash-motion-scale-enter: var(--motion-scale-enter, 0.96);
        --_mash-motion-scale-pressed: var(--motion-scale-pressed, 0.98);
        --_mash-motion-scale-emphasized: var(--motion-scale-emphasized, 1.04);
        --_mash-motion-blur-none: var(--motion-blur-none, 0px);
        --_mash-motion-blur-subtle: var(--motion-blur-subtle, 4px);
        --_mash-motion-blur-emphasized: var(--motion-blur-emphasized, 12px);
        --_mash-motion-opacity-hidden: var(--motion-opacity-hidden, 0);
        --_mash-motion-opacity-muted: var(--motion-opacity-muted, 0.56);
        --_mash-motion-opacity-visible: var(--motion-opacity-visible, 1);
        --_mash-motion-rotation-quarter: var(--motion-rotation-quarter, 0.25);
        --_mash-motion-rotation-full: var(--motion-rotation-full, 1);
      }

      [part="root"] {
        display: inline-grid;
        isolation: isolate;
      }

      [part="underlay"],
      [part="content"],
      [part="overlay"],
      [part="indicator"] {
        grid-area: 1 / 1;
        min-inline-size: 0;
        min-block-size: 0;
      }

      [part="underlay"] {
        z-index: 0;
      }

      [part="content"] {
        z-index: 1;
      }

      [part="overlay"] {
        z-index: 2;
      }

      [part="indicator"] {
        z-index: 3;
      }

      /* Empty scene lanes still occupy the shared grid area. They must not
         swallow pointer input intended for the primary content; authored
         overlay or indicator children opt themselves back into hit testing. */
      [part="underlay"],
      [part="overlay"],
      [part="indicator"] {
        pointer-events: none;
      }

      slot[name]::slotted(*) {
        pointer-events: auto;
      }

      .motion-target {
        transform-origin: center;
      }

      :host(:state(animating)) .motion-target {
        will-change: filter, opacity, rotate, scale, translate;
      }

      :host([motion="fade"]) .motion-target {
        transition: opacity var(--_mash-motion-duration-control) var(--_mash-motion-easing-control);
      }

      :host([motion="fade"][state="active"]) .motion-target {
        opacity: var(--_mash-motion-opacity-muted);
      }

      :host([motion="scale"]) .motion-target {
        transition: scale var(--_mash-motion-duration-control)
          var(--_mash-motion-easing-spring-snappy);
      }

      :host([motion="scale"][state="active"]) .motion-target {
        scale: var(--_mash-motion-scale-pressed);
      }

      :host([motion="rotate"]) .motion-target,
      :host([motion="spin"]) .motion-target {
        transition: rotate var(--_mash-motion-duration-control)
          var(--_mash-motion-easing-spring-snappy);
      }

      :host([motion="rotate"][state="active"]) .motion-target,
      :host([motion="spin"][state="active"]) .motion-target {
        rotate: calc(var(--_mash-motion-rotation-quarter) * 1turn);
      }

      :host([motion="slide-inline"]) .motion-target {
        transition: translate var(--_mash-motion-duration-surface)
          var(--_mash-motion-easing-spring-gentle);
      }

      :host([motion="slide-inline"][state="active"]) .motion-target {
        translate: var(--_mash-motion-distance-short) 0;
      }

      :host([motion="slide-block"]) .motion-target {
        transition: translate var(--_mash-motion-duration-surface)
          var(--_mash-motion-easing-spring-gentle);
      }

      :host([motion="slide-block"][state="active"]) .motion-target {
        translate: 0 var(--_mash-motion-distance-short);
      }

      :host([motion="blur"]) .motion-target {
        transition:
          filter var(--_mash-motion-duration-surface) var(--_mash-motion-easing-surface),
          opacity var(--_mash-motion-duration-surface) var(--_mash-motion-easing-surface);
      }

      .motion-target {
        transition-delay: var(--mash-stagger-delay, 0ms);
      }

      :host([motion="blur"][state="active"]) .motion-target {
        filter: blur(var(--_mash-motion-blur-subtle));
        opacity: var(--_mash-motion-opacity-muted);
      }

      :host([state="entering"]) .motion-target {
        animation: mash-motion-enter var(--_mash-motion-duration-surface)
          var(--_mash-motion-easing-spring-gentle) var(--mash-stagger-delay, 0ms) both;
      }

      :host([state="exiting"]) .motion-target {
        animation: mash-motion-exit var(--_mash-motion-duration-surface)
          var(--_mash-motion-easing-surface) var(--mash-stagger-delay, 0ms) both;
      }

      :host([motion="slide-inline"][state="entering"]) .motion-target {
        animation-name: mash-motion-enter-inline;
      }

      :host([motion="slide-inline"][state="exiting"]) .motion-target {
        animation-name: mash-motion-exit-inline;
      }

      :host([motion="slide-block"][state="entering"]) .motion-target {
        animation-name: mash-motion-enter-block;
      }

      :host([motion="slide-block"][state="exiting"]) .motion-target {
        animation-name: mash-motion-exit-block;
      }

      :host([motion="blur"][state="entering"]) .motion-target {
        animation-name: mash-motion-enter-blur;
      }

      :host([motion="blur"][state="exiting"]) .motion-target {
        animation-name: mash-motion-exit-blur;
      }

      :host([motion="shake"][state="active"]) .motion-target {
        animation: mash-motion-shake var(--_mash-motion-duration-surface)
          var(--_mash-motion-easing-control) var(--mash-stagger-delay, 0ms) both;
      }

      :host([motion="spin"][state="loading"]) .motion-target {
        animation: mash-motion-spin calc(var(--_mash-motion-duration-surface) * 5)
          var(--_mash-motion-easing-control) var(--mash-stagger-delay, 0ms) infinite;
      }

      :host([motion="pulse"][state="loading"]) .motion-target {
        animation: mash-motion-pulse calc(var(--_mash-motion-duration-surface) * 5)
          var(--_mash-motion-easing-surface) var(--mash-stagger-delay, 0ms) infinite alternate;
      }

      @keyframes mash-motion-enter {
        from {
          opacity: var(--_mash-motion-opacity-hidden);
          scale: var(--_mash-motion-scale-enter);
        }
        to {
          opacity: var(--_mash-motion-opacity-visible);
          scale: var(--_mash-motion-scale-rest);
        }
      }

      @keyframes mash-motion-exit {
        from {
          opacity: var(--_mash-motion-opacity-visible);
          scale: var(--_mash-motion-scale-rest);
        }
        to {
          opacity: var(--_mash-motion-opacity-hidden);
          scale: var(--_mash-motion-scale-enter);
        }
      }

      @keyframes mash-motion-enter-inline {
        from {
          opacity: var(--_mash-motion-opacity-hidden);
          translate: calc(var(--_mash-motion-distance-medium) * -1) 0;
        }
      }

      @keyframes mash-motion-exit-inline {
        to {
          opacity: var(--_mash-motion-opacity-hidden);
          translate: var(--_mash-motion-distance-medium) 0;
        }
      }

      @keyframes mash-motion-enter-block {
        from {
          opacity: var(--_mash-motion-opacity-hidden);
          translate: 0 calc(var(--_mash-motion-distance-medium) * -1);
        }
      }

      @keyframes mash-motion-exit-block {
        to {
          opacity: var(--_mash-motion-opacity-hidden);
          translate: 0 var(--_mash-motion-distance-medium);
        }
      }

      @keyframes mash-motion-enter-blur {
        from {
          filter: blur(var(--_mash-motion-blur-emphasized));
          opacity: var(--_mash-motion-opacity-hidden);
        }
        to {
          filter: blur(var(--_mash-motion-blur-none));
          opacity: var(--_mash-motion-opacity-visible);
        }
      }

      @keyframes mash-motion-exit-blur {
        from {
          filter: blur(var(--_mash-motion-blur-none));
          opacity: var(--_mash-motion-opacity-visible);
        }
        to {
          filter: blur(var(--_mash-motion-blur-emphasized));
          opacity: var(--_mash-motion-opacity-hidden);
        }
      }

      @keyframes mash-motion-shake {
        0%,
        100% {
          translate: 0;
        }
        25% {
          translate: calc(var(--_mash-motion-distance-short) * -1) 0;
        }
        75% {
          translate: var(--_mash-motion-distance-short) 0;
        }
      }

      @keyframes mash-motion-spin {
        to {
          rotate: calc(var(--_mash-motion-rotation-full) * 1turn);
        }
      }

      @keyframes mash-motion-pulse {
        from {
          opacity: var(--_mash-motion-opacity-muted);
          scale: var(--_mash-motion-scale-rest);
        }
        to {
          opacity: var(--_mash-motion-opacity-visible);
          scale: var(--_mash-motion-scale-emphasized);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .motion-target {
          animation: none !important;
          filter: none !important;
          opacity: var(--_mash-motion-opacity-visible) !important;
          rotate: none !important;
          scale: var(--_mash-motion-scale-rest) !important;
          translate: none !important;
          transition: none !important;
        }
      }
    `,
  ];

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("state") && !changed.has("motion")) return;
    const previousState = (changed.get("state") as MotionState | undefined) ?? "idle";
    if (this.state === "idle") {
      this.#lifecycle.cancel();
      return;
    }
    this.#begin(previousState);
  }

  override disconnectedCallback(): void {
    this.#lifecycle.destroy();
    super.disconnectedCallback();
  }

  /** Replays a lifecycle state even when it is already current. */
  async play(state: Exclude<MotionState, "idle"> = "active"): Promise<void> {
    if (this.state === state) {
      const target = this.#motionTarget();
      const restoreMotion = target ? this.#suspendTargetMotion(target) : undefined;
      this.state = "idle";
      await this.updateComplete;
      target?.getBoundingClientRect();
      await this.#nextPaint();
      restoreMotion?.();
      target?.getBoundingClientRect();
    }
    this.state = state;
    await this.updateComplete;
  }

  #begin(previousState: MotionState): void {
    const detail: MotionEventDetail = {
      motion: this.motion,
      state: this.state,
      previousState,
      target: this.target,
      reducedMotion: false,
      interrupted: false,
    };
    this.#lifecycle.play(detail);
  }

  #targetClass(target: MotionTarget): string {
    return this.target === target ? "motion-target" : "";
  }

  #motionTarget(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>(".motion-target");
  }

  #suspendTargetMotion(target: HTMLElement): () => void {
    const animation = target.style.animation;
    const transition = target.style.transition;
    target.style.animation = "none";
    target.style.transition = "none";
    return () => {
      target.style.animation = animation;
      target.style.transition = transition;
    };
  }

  #nextFrame(): Promise<void> {
    const view = this.ownerDocument.defaultView;
    if (!view) return Promise.resolve();
    return new Promise((resolve) => view.requestAnimationFrame(() => resolve()));
  }

  async #nextPaint(): Promise<void> {
    await this.#nextFrame();
    await this.#nextFrame();
  }

  protected override render(): TemplateResult {
    return html`
      <span part="root" class=${this.#targetClass("root")}>
        <span part="underlay" class=${this.#targetClass("underlay")}
          ><slot name="underlay"></slot
        ></span>
        <span part="content" class=${this.#targetClass("content")}><slot></slot></span>
        <span part="overlay" class=${this.#targetClass("overlay")}
          ><slot name="overlay"></slot
        ></span>
        <span part="indicator" class=${this.#targetClass("indicator")}
          ><slot name="indicator"></slot
        ></span>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    "mash-motion-start": CustomEvent<MotionEventDetail>;
    "mash-motion-end": CustomEvent<MotionEventDetail>;
  }
}
