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
        will-change: filter, opacity, rotate, scale, translate;
      }

      :host([motion="fade"]) .motion-target {
        transition: opacity var(--duration-control) var(--easing-control);
      }

      :host([motion="fade"][state="active"]) .motion-target {
        opacity: var(--motion-opacity-muted);
      }

      :host([motion="scale"]) .motion-target {
        transition: scale var(--duration-control) var(--easing-spring-snappy);
      }

      :host([motion="scale"][state="active"]) .motion-target {
        scale: var(--motion-scale-pressed);
      }

      :host([motion="rotate"]) .motion-target,
      :host([motion="spin"]) .motion-target {
        transition: rotate var(--duration-control) var(--easing-spring-snappy);
      }

      :host([motion="rotate"][state="active"]) .motion-target,
      :host([motion="spin"][state="active"]) .motion-target {
        rotate: calc(var(--motion-rotation-quarter) * 1turn);
      }

      :host([motion="slide-inline"]) .motion-target {
        transition: translate var(--duration-surface) var(--easing-spring-gentle);
      }

      :host([motion="slide-inline"][state="active"]) .motion-target {
        translate: var(--motion-distance-short) 0;
      }

      :host([motion="slide-block"]) .motion-target {
        transition: translate var(--duration-surface) var(--easing-spring-gentle);
      }

      :host([motion="slide-block"][state="active"]) .motion-target {
        translate: 0 var(--motion-distance-short);
      }

      :host([motion="blur"]) .motion-target {
        transition:
          filter var(--duration-surface) var(--easing-surface),
          opacity var(--duration-surface) var(--easing-surface);
      }

      :host([motion="blur"][state="active"]) .motion-target {
        filter: blur(var(--motion-blur-subtle));
        opacity: var(--motion-opacity-muted);
      }

      :host([state="entering"]) .motion-target {
        animation: mash-motion-enter var(--duration-surface) var(--easing-spring-gentle) both;
      }

      :host([state="exiting"]) .motion-target {
        animation: mash-motion-exit var(--duration-surface) var(--easing-surface) both;
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
        animation: mash-motion-shake var(--duration-surface) var(--easing-control) both;
      }

      :host([motion="spin"][state="loading"]) .motion-target {
        animation: mash-motion-spin calc(var(--duration-surface) * 5) var(--easing-control) infinite;
      }

      :host([motion="pulse"][state="loading"]) .motion-target {
        animation: mash-motion-pulse calc(var(--duration-surface) * 5) var(--easing-surface)
          infinite alternate;
      }

      @keyframes mash-motion-enter {
        from {
          opacity: var(--motion-opacity-hidden);
          scale: var(--motion-scale-enter);
        }
        to {
          opacity: var(--motion-opacity-visible);
          scale: var(--motion-scale-rest);
        }
      }

      @keyframes mash-motion-exit {
        from {
          opacity: var(--motion-opacity-visible);
          scale: var(--motion-scale-rest);
        }
        to {
          opacity: var(--motion-opacity-hidden);
          scale: var(--motion-scale-enter);
        }
      }

      @keyframes mash-motion-enter-inline {
        from {
          opacity: var(--motion-opacity-hidden);
          translate: calc(var(--motion-distance-medium) * -1) 0;
        }
      }

      @keyframes mash-motion-exit-inline {
        to {
          opacity: var(--motion-opacity-hidden);
          translate: var(--motion-distance-medium) 0;
        }
      }

      @keyframes mash-motion-enter-block {
        from {
          opacity: var(--motion-opacity-hidden);
          translate: 0 calc(var(--motion-distance-medium) * -1);
        }
      }

      @keyframes mash-motion-exit-block {
        to {
          opacity: var(--motion-opacity-hidden);
          translate: 0 var(--motion-distance-medium);
        }
      }

      @keyframes mash-motion-enter-blur {
        from {
          filter: blur(var(--motion-blur-emphasized));
          opacity: var(--motion-opacity-hidden);
        }
        to {
          filter: blur(var(--motion-blur-none));
          opacity: var(--motion-opacity-visible);
        }
      }

      @keyframes mash-motion-exit-blur {
        from {
          filter: blur(var(--motion-blur-none));
          opacity: var(--motion-opacity-visible);
        }
        to {
          filter: blur(var(--motion-blur-emphasized));
          opacity: var(--motion-opacity-hidden);
        }
      }

      @keyframes mash-motion-shake {
        0%,
        100% {
          translate: 0;
        }
        25% {
          translate: calc(var(--motion-distance-short) * -1) 0;
        }
        75% {
          translate: var(--motion-distance-short) 0;
        }
      }

      @keyframes mash-motion-spin {
        to {
          rotate: calc(var(--motion-rotation-full) * 1turn);
        }
      }

      @keyframes mash-motion-pulse {
        from {
          opacity: var(--motion-opacity-muted);
          scale: var(--motion-scale-rest);
        }
        to {
          opacity: var(--motion-opacity-visible);
          scale: var(--motion-scale-emphasized);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .motion-target {
          animation: none !important;
          filter: none !important;
          opacity: var(--motion-opacity-visible) !important;
          rotate: none !important;
          scale: var(--motion-scale-rest) !important;
          translate: none !important;
          transition: none !important;
        }
      }
    `,
  ];

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("state") && !changed.has("motion")) return;
    const previousState = (changed.get("state") as MotionState | undefined) ?? "idle";
    if (changed.get("state") === undefined && this.state === "idle") return;
    this.#begin(previousState);
  }

  override disconnectedCallback(): void {
    this.#lifecycle.destroy();
    super.disconnectedCallback();
  }

  /** Replays a lifecycle state even when it is already current. */
  async play(state: Exclude<MotionState, "idle"> = "active"): Promise<void> {
    if (this.state === state) {
      this.state = "idle";
      await this.updateComplete;
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
