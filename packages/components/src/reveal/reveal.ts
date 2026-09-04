import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { MotionLifecycleController } from "../internal/motion-lifecycle.js";

export type RevealAxis = "block" | "inline";
export type RevealState = "entering" | "active" | "exiting";

export interface RevealEventDetail {
  axis: RevealAxis;
  interrupted: boolean;
  open: boolean;
  reducedMotion: boolean;
  state: RevealState;
}

/**
 * Keeps measured content mounted while a disclosure region opens or exits.
 *
 * Reveal owns the platform mechanics of measuring, clipping, reduced-motion
 * fallback, and exit presence. It deliberately leaves trigger semantics to
 * disclosure components such as `ui-collapsible` and `ui-accordion-item`.
 *
 * @tag ui-reveal
 * @summary Animates block or inline disclosure while preserving exit presence.
 *
 * @example Disclosure content reveal
 * <ui-reveal open>
 *   <p>Measured content stays in the DOM until the exit animation settles.</p>
 * </ui-reveal>
 *
 * @slot - Content that is measured and clipped while entering or exiting.
 *
 * @csspart root - The render-presence boundary.
 * @csspart content - The clipped disclosure region.
 * @csspart measure - The natural-size measurement wrapper around authored content.
 *
 * @cssstate open - Matches `:state(open)` while the public open state is true.
 * @cssstate present - Matches `:state(present)` while content remains mounted.
 * @cssstate entering - Matches `:state(entering)` during open animation.
 * @cssstate active - Matches `:state(active)` after open animation has settled.
 * @cssstate exiting - Matches `:state(exiting)` during close animation.
 * @cssstate reduced-motion - Matches `:state(reduced-motion)` when the environment suppresses motion.
 *
 * @fires {CustomEvent<RevealEventDetail>} mash-reveal-start - Announces a measured reveal lifecycle.
 * @fires {CustomEvent<RevealEventDetail>} mash-reveal-end - Announces completion or interruption of that lifecycle.
 *
 * @mashnode root root
 * @mashnode content content root
 * @mashnode measure measure content
 * @mashnode open open root
 * @mashnode axis axis root
 * @mashnode present present root
 * @mashnode entering entering root
 * @mashnode active active root
 * @mashnode exiting exiting root
 * @mashnode reduced-motion reduced-motion root
 * @mashrole event mash-reveal-start state content
 * @mashrole event mash-reveal-end state content
 */
export class UIReveal extends LitElement {
  static override properties = {
    open: { type: Boolean, reflect: true },
    axis: { type: String, reflect: true },
    revealPresent: { state: true },
  };

  /** Whether the measured content is disclosed. */
  declare open: boolean;
  /** Axis whose size is animated between zero and the measured content size. */
  declare axis: RevealAxis;
  /** Internal render-presence; public state remains the `open` contract. */
  declare protected revealPresent: boolean;

  readonly #internals: ElementInternals;
  readonly #motion: MotionLifecycleController<RevealEventDetail>;

  constructor() {
    super();
    this.open = false;
    this.axis = "block";
    this.revealPresent = false;
    this.#internals = this.attachInternals();
    this.#motion = new MotionLifecycleController(this, {
      target: () => this.#content(),
      onStart: ({ value, reducedMotion }) => {
        this.#setReducedMotionState(reducedMotion);
        this.dispatchEvent(
          new CustomEvent<RevealEventDetail>("mash-reveal-start", {
            bubbles: true,
            composed: true,
            detail: { ...value, reducedMotion },
          }),
        );
      },
      onFinish: ({ value, reducedMotion, interrupted }) => {
        this.#setReducedMotionState(reducedMotion);
        if (!interrupted) this.#settle(value.state);
        this.dispatchEvent(
          new CustomEvent<RevealEventDetail>("mash-reveal-end", {
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
        display: block;
        --_mash-reveal-duration: var(--duration-surface, 200ms);
        --_mash-reveal-easing: var(--easing-surface, cubic-bezier(0.3, 0, 0, 1));
      }

      [part="root"] {
        display: block;
      }

      [part="content"] {
        block-size: 0px;
        inline-size: auto;
        overflow: clip;
        transition:
          block-size var(--_mash-reveal-duration) var(--_mash-reveal-easing),
          inline-size var(--_mash-reveal-duration) var(--_mash-reveal-easing);
      }

      [part="measure"] {
        display: block;
      }

      :host([axis="inline"]) {
        display: inline-block;
      }

      :host([axis="inline"]) [part="content"] {
        block-size: auto;
        inline-size: 0px;
      }

      :host([axis="inline"]) [part="measure"] {
        display: inline-block;
        min-inline-size: max-content;
      }

      @media (prefers-reduced-motion: reduce) {
        [part="content"] {
          transition: none !important;
        }
      }
    `,
  ];

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("open") && this.open) this.revealPresent = true;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("axis") && this.open) this.#setAutoDimension();
    if (!changed.has("open")) return;
    if (this.open) this.#enter();
    else this.#exit(changed.get("open") === true);
  }

  override disconnectedCallback(): void {
    this.#motion.destroy();
    super.disconnectedCallback();
  }

  #onSlotChange = (): void => {
    if (this.open && !this.matches(":state(active)")) this.#setMeasuredDimension();
  };

  #enter(): void {
    const content = this.#content();
    if (!content) return;

    this.#setPresenceStates(true);
    this.#setPhase("entering");
    this.#setZeroDimension();
    content.getBoundingClientRect();
    this.#setMeasuredDimension();
    this.#motion.play(this.#eventDetail("entering", false));
  }

  #exit(wasOpen: boolean): void {
    this.#internals.states.delete("open");
    this.#internals.states.delete("active");
    if (!wasOpen || !this.revealPresent) {
      this.#setAbsent();
      return;
    }

    const content = this.#content();
    if (!content) {
      this.#setAbsent();
      return;
    }

    this.#setMeasuredDimension();
    content.getBoundingClientRect();
    this.#setPhase("exiting");
    this.#setZeroDimension();
    this.#motion.play(this.#eventDetail("exiting", false));
  }

  #settle(state: RevealState): void {
    this.#internals.states.delete("entering");
    this.#internals.states.delete("exiting");
    if (state === "entering") {
      this.#internals.states.add("active");
      this.#setAutoDimension();
      return;
    }
    this.#setAbsent();
  }

  #setPresenceStates(present: boolean): void {
    if (present) {
      this.#internals.states.add("present");
      this.#internals.states.add("open");
      return;
    }
    this.#internals.states.delete("present");
    this.#internals.states.delete("open");
  }

  #setPhase(state: "entering" | "exiting"): void {
    this.#internals.states.delete("active");
    this.#internals.states.delete(state === "entering" ? "exiting" : "entering");
    this.#internals.states.add(state);
  }

  #setAbsent(): void {
    this.revealPresent = false;
    this.#setPresenceStates(false);
    this.#internals.states.delete("active");
    this.#internals.states.delete("entering");
    this.#internals.states.delete("exiting");
    this.#setZeroDimension();
  }

  #setReducedMotionState(reducedMotion: boolean): void {
    if (reducedMotion) this.#internals.states.add("reduced-motion");
    else this.#internals.states.delete("reduced-motion");
  }

  #setMeasuredDimension(): void {
    const measure = this.#measure();
    if (!measure) return;
    const axis = this.#axis();
    const size = axis === "inline" ? measure.scrollWidth : measure.scrollHeight;
    this.#setDimension(`${Math.max(0, size)}px`);
  }

  #setZeroDimension(): void {
    this.#setDimension("0px");
  }

  #setAutoDimension(): void {
    this.#setDimension("auto");
  }

  #setDimension(value: string): void {
    const content = this.#content();
    if (!content) return;
    if (this.#axis() === "inline") {
      content.style.blockSize = "auto";
      content.style.inlineSize = value;
      return;
    }
    content.style.blockSize = value;
    content.style.inlineSize = "";
  }

  #eventDetail(state: RevealState, interrupted: boolean): RevealEventDetail {
    return {
      axis: this.#axis(),
      interrupted,
      open: this.open,
      reducedMotion: false,
      state,
    };
  }

  #axis(): RevealAxis {
    return this.axis === "inline" ? "inline" : "block";
  }

  #content(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part="content"]');
  }

  #measure(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part="measure"]');
  }

  protected override render(): TemplateResult {
    return html`
      <div part="root" ?hidden=${!this.revealPresent}>
        <div part="content" aria-hidden=${this.open ? nothing : "true"}>
          <div part="measure"><slot @slotchange=${this.#onSlotChange}></slot></div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    "mash-reveal-start": CustomEvent<RevealEventDetail>;
    "mash-reveal-end": CustomEvent<RevealEventDetail>;
  }
}
