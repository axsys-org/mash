import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import {
  PresenceLifecycleController,
  type PresenceLifecycleContext,
  type PresenceState,
} from "../internal/presence-lifecycle.js";

export type RevealAxis = "block" | "inline";
export type RevealState = "entering" | "active" | "exiting";

export interface RevealEventDetail {
  axis: RevealAxis;
  interrupted: boolean;
  open: boolean;
  reducedMotion: boolean;
  state: RevealState;
}

interface RevealPresenceValue {
  axis: RevealAxis;
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
  readonly #presence: PresenceLifecycleController<RevealPresenceValue>;

  constructor() {
    super();
    this.open = false;
    this.axis = "block";
    this.revealPresent = false;
    this.#internals = this.attachInternals();
    this.#presence = new PresenceLifecycleController(this, {
      target: () => this.#content(),
      present: () => this.revealPresent,
      setPresent: (present) => {
        this.revealPresent = present;
      },
      setState: (state, present) => this.#setState(state, present),
      beforeEnter: () => {
        this.#setZeroDimension();
        this.#content()?.getBoundingClientRect();
        this.#setMeasuredDimension();
      },
      beforeExitPhase: () => {
        this.#setMeasuredDimension();
        this.#content()?.getBoundingClientRect();
      },
      afterExitPhase: () => this.#setZeroDimension(),
      onSettle: (phase) => {
        if (phase === "active") this.#setAutoDimension();
        else this.#setZeroDimension();
      },
      onStart: (context) => {
        this.dispatchEvent(
          new CustomEvent<RevealEventDetail>("mash-reveal-start", {
            bubbles: true,
            composed: true,
            detail: this.#eventDetail(context),
          }),
        );
      },
      onFinish: (context) => {
        this.dispatchEvent(
          new CustomEvent<RevealEventDetail>("mash-reveal-end", {
            bubbles: true,
            composed: true,
            detail: this.#eventDetail(context),
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
    this.#presence.destroy();
    super.disconnectedCallback();
  }

  #onSlotChange = (): void => {
    if (this.open && !this.matches(":state(active)")) this.#setMeasuredDimension();
  };

  #enter(): void {
    const content = this.#content();
    if (!content) return;

    this.#presence.enter(this.#presenceValue("entering"));
  }

  #exit(wasOpen: boolean): void {
    if (!this.#content()) {
      this.#presence.absent();
      return;
    }
    this.#presence.exit(this.#presenceValue("exiting"), wasOpen);
  }

  #setState(state: PresenceState, present: boolean): void {
    if (present) this.#internals.states.add(state);
    else this.#internals.states.delete(state);
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

  #presenceValue(state: RevealState): RevealPresenceValue {
    return {
      axis: this.#axis(),
      state,
    };
  }

  #eventDetail(context: PresenceLifecycleContext<RevealPresenceValue>): RevealEventDetail {
    return {
      axis: context.value.axis,
      interrupted: context.interrupted,
      open: context.open,
      reducedMotion: context.reducedMotion,
      state: context.value.state,
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
