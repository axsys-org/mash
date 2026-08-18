import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** How much visual weight the button carries. Orthogonal to {@link ButtonTone}. */
export type ButtonVariant = "primary" | "secondary" | "quiet";

/** The button's physical scale. */
export type ButtonSize = "small" | "medium" | "large";

/** What the button's action *means*. Orthogonal to {@link ButtonVariant}. */
export type ButtonTone = "accent" | "neutral" | "positive" | "warning" | "critical";

/** How the button behaves inside a form. Mirrors the native `<button type>` attribute. */
export type ButtonType = "button" | "submit" | "reset";

/**
 * A button.
 *
 * Two independent axes describe every button in the system. `variant` controls
 * emphasis — how loudly it asks to be pressed. `tone` controls meaning — what
 * kind of thing happens when it is. They compose freely: a `quiet` `critical`
 * button is a low-emphasis destructive action, and needs no special casing.
 *
 * The element is form-associated, so a `submit` button submits its containing
 * form even though the real `<button>` lives inside a shadow root.
 *
 * This component intentionally exposes **no public CSS custom properties**. It
 * is built entirely from the semantic design tokens, and everything it computes
 * internally is a private `--_*` variable. Restyling a button means changing the
 * design language — the shared semantic tokens — not overriding one component.
 *
 * @tag ui-button
 * @summary Triggers an action. The primary interactive control of the system.
 *
 * @example Foundation matrix
 * <div class="demo button-showcase">
 *   <div class="button-showcase-heading">
 *     <strong>Emphasis × meaning</strong>
 *     <span>Every tone composes with every variant.</span>
 *   </div>
 *   <div class="button-showcase-grid">
 *     <span class="button-showcase-label">accent</span>
 *     <ui-button size="small">Primary</ui-button>
 *     <ui-button variant="secondary" size="small">Secondary</ui-button>
 *     <ui-button variant="quiet" size="small">Quiet</ui-button>
 *     <span class="button-showcase-label">neutral</span>
 *     <ui-button tone="neutral" size="small">Primary</ui-button>
 *     <ui-button tone="neutral" variant="secondary" size="small">Secondary</ui-button>
 *     <ui-button tone="neutral" variant="quiet" size="small">Quiet</ui-button>
 *     <span class="button-showcase-label">positive</span>
 *     <ui-button tone="positive" size="small">Primary</ui-button>
 *     <ui-button tone="positive" variant="secondary" size="small">Secondary</ui-button>
 *     <ui-button tone="positive" variant="quiet" size="small">Quiet</ui-button>
 *     <span class="button-showcase-label">warning</span>
 *     <ui-button tone="warning" size="small">Primary</ui-button>
 *     <ui-button tone="warning" variant="secondary" size="small">Secondary</ui-button>
 *     <ui-button tone="warning" variant="quiet" size="small">Quiet</ui-button>
 *     <span class="button-showcase-label">critical</span>
 *     <ui-button tone="critical" size="small">Primary</ui-button>
 *     <ui-button tone="critical" variant="secondary" size="small">Secondary</ui-button>
 *     <ui-button tone="critical" variant="quiet" size="small">Quiet</ui-button>
 *   </div>
 *   <div class="button-showcase-rule"></div>
 *   <div class="button-showcase-heading">
 *     <strong>Size</strong>
 *     <span>Use the same action at three physical scales.</span>
 *   </div>
 *   <div class="button-showcase-row">
 *     <ui-button size="small">Small</ui-button>
 *     <ui-button>Medium</ui-button>
 *     <ui-button size="large">Large</ui-button>
 *   </div>
 * </div>
 *
 * @example Content variants
 * <div class="demo button-showcase button-showcase-compact">
 *   <div class="button-showcase-heading">
 *     <strong>Content is a slot</strong>
 *     <span>Prefix and suffix content keeps the action legible.</span>
 *   </div>
 *   <div class="button-showcase-row">
 *     <ui-button><span slot="prefix" aria-hidden="true">+</span>Create</ui-button>
 *     <ui-button variant="secondary"><span slot="prefix" aria-hidden="true">□</span>Save draft</ui-button>
 *     <ui-button variant="quiet"><span slot="suffix" aria-hidden="true">→</span>View details</ui-button>
 *   </div>
 *   <div class="button-showcase-rule"></div>
 *   <div class="button-showcase-heading">
 *     <strong>States</strong>
 *     <span>Inert states preserve the same geometry and hierarchy.</span>
 *   </div>
 *   <div class="button-showcase-row">
 *     <ui-button disabled>Disabled</ui-button>
 *     <ui-button loading>Loading</ui-button>
 *     <ui-button tone="critical" variant="secondary">Delete</ui-button>
 *   </div>
 * </div>
 *
 * @slot - The button's label.
 * @slot prefix - Content placed before the label, typically an icon. Hidden while loading.
 * @slot suffix - Content placed after the label, typically a chevron or badge.
 *
 * @csspart control - The native `<button>`. The styling escape hatch of last resort.
 * @csspart prefix - The wrapper around the `prefix` slot.
 * @csspart label - The wrapper around the default slot.
 * @csspart suffix - The wrapper around the `suffix` slot.
 * @csspart spinner - The loading indicator, present only while `loading` is set.
 *
 * @cssstate loading - Matches `:state(loading)` while an async action is in flight.
 * @cssstate pressed - Matches `:state(pressed)` while the button is actively held down.
 *
 * @fires {PointerEvent} click - The button's behavioural output. Retargeted to the
 *   host, so listeners attach to `<ui-button>` directly. Suppressed entirely while
 *   `disabled` or `loading`.
 */
export class UIButton extends LitElement {
  /** Lets the element participate in form submission and reset from inside its shadow root. */
  static formAssociated = true;

  /**
   * Focus is delegated to the inner `<button>`, so `buttonEl.focus()`,
   * tab order and `:focus-visible` all behave as if the host were the control.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    tone: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
    type: { type: String, reflect: true },
    name: { type: String, reflect: true },
    value: { type: String, reflect: true },
  };

  /** Visual emphasis. */
  declare variant: ButtonVariant;
  /** Physical scale. */
  declare size: ButtonSize;
  /** Semantic meaning of the action. */
  declare tone: ButtonTone;
  /** Prevents interaction and removes the button from the tab order. */
  declare disabled: boolean;
  /** Shows a spinner and suppresses interaction while an action is in flight. */
  declare loading: boolean;
  /** Form behaviour, mirroring native `<button type>`. */
  declare type: ButtonType;
  /** Form control name, submitted with the form. */
  declare name: string;
  /** Form control value, submitted with the form. */
  declare value: string;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.variant = "primary";
    this.size = "medium";
    this.tone = "accent";
    this.disabled = false;
    this.loading = false;
    this.type = "button";
    this.name = "";
    this.value = "";

    this.#internals = this.attachInternals();

    // Both listeners live on the host, and the order is deliberate.
    //
    // The capture listener runs first and drops the event entirely when the
    // button is inert — the inner button's own `disabled` cannot stop a click
    // that landed on the host, or one dispatched by `.click()`.
    //
    // Activation then listens in the bubble phase, again on the host, so that
    // it sees every click the same way: one that started on the inner button
    // and bubbled up, and one dispatched directly at the host. Binding it to
    // the inner button instead would silently ignore the latter.
    this.addEventListener("click", this.#onHostClick, { capture: true });
    this.addEventListener("click", this.#onActivate);
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;

        /* ------------------------------------------------------------------
         * Private implementation variables.
         *
         * Two levels of indirection, and the split is what keeps the axes
         * orthogonal: the tone rules below set only --_tone-*, the variant
         * rules set only --_background/--_foreground *in terms of* --_tone-*.
         * Because custom properties substitute at use time rather than at
         * declaration time, tone and variant never need to know about each
         * other, and there is no rule for each of the 15 combinations.
         * ------------------------------------------------------------------ */

        /* size axis */
        --_padding-inline: var(--space-control-inline);
        --_padding-block: var(--space-control-block);
        --_font-size: var(--type-label-font-size);
        --_font-weight: var(--type-label-font-weight);
        --_line-height: var(--type-label-line-height);

        /* tone axis */
        --_tone: var(--color-action);
        --_tone-hover: var(--color-action-hover);
        --_tone-pressed: var(--color-action-pressed);
        --_on-tone: var(--color-on-action);

        /* variant axis, resolved through the tone axis */
        --_background: var(--_tone);
        --_background-hover: var(--_tone-hover);
        --_background-pressed: var(--_tone-pressed);
        --_foreground: var(--_on-tone);
        --_border-color: transparent;
      }

      /* --- size ------------------------------------------------------- */

      :host([size="small"]) {
        --_padding-inline: var(--space-control-inline-small);
        --_padding-block: var(--space-control-block-small);
        --_font-size: var(--type-label-small-font-size);
        --_font-weight: var(--type-label-small-font-weight);
        --_line-height: var(--type-label-small-line-height);
      }

      :host([size="large"]) {
        --_padding-inline: var(--space-control-inline-large);
        --_padding-block: var(--space-control-block-large);
        --_font-size: var(--type-label-large-font-size);
        --_font-weight: var(--type-label-large-font-weight);
        --_line-height: var(--type-label-large-line-height);
      }

      /* --- tone ------------------------------------------------------- */

      :host([tone="neutral"]) {
        --_tone: var(--color-neutral);
        --_tone-hover: var(--color-neutral-hover);
        --_tone-pressed: var(--color-neutral-pressed);
        --_on-tone: var(--color-on-neutral);
      }

      :host([tone="positive"]) {
        --_tone: var(--color-positive);
        --_tone-hover: var(--color-positive-hover);
        --_tone-pressed: var(--color-positive-pressed);
        --_on-tone: var(--color-on-positive);
      }

      :host([tone="warning"]) {
        --_tone: var(--color-warning);
        --_tone-hover: var(--color-warning-hover);
        --_tone-pressed: var(--color-warning-pressed);
        --_on-tone: var(--color-on-warning);
      }

      :host([tone="critical"]) {
        --_tone: var(--color-critical);
        --_tone-hover: var(--color-critical-hover);
        --_tone-pressed: var(--color-critical-pressed);
        --_on-tone: var(--color-on-critical);
      }

      /* --- variant ---------------------------------------------------- */

      /* Secondary and quiet paint the tone as *text*, and tint the surface only
         on interaction. color-mix keeps that derivation here, in the one place
         it applies, rather than adding two more tokens per tone. */
      :host([variant="secondary"]),
      :host([variant="quiet"]) {
        --_background: transparent;
        --_background-hover: color-mix(in oklab, var(--_tone) 12%, transparent);
        --_background-pressed: color-mix(in oklab, var(--_tone) 22%, transparent);
        --_foreground: var(--_tone);
      }

      :host([variant="secondary"]) {
        --_border-color: var(--color-border-strong);
      }

      /* --- disabled --------------------------------------------------- */

      :host([disabled]) {
        --_background: var(--color-neutral);
        --_foreground: var(--color-text-disabled);
        --_border-color: var(--color-border);
      }

      :host([disabled][variant="secondary"]),
      :host([disabled][variant="quiet"]) {
        --_background: transparent;
      }

      /* --- control ---------------------------------------------------- */

      .control {
        flex: 1 1 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;

        margin: 0;
        padding-block: var(--_padding-block);
        padding-inline: var(--_padding-inline);

        border: var(--border-hairline) solid var(--_border-color);
        border-radius: var(--radius-control);
        background-color: var(--_background);
        color: var(--_foreground);

        font-family: var(--type-label-font-family);
        font-size: var(--_font-size);
        font-weight: var(--_font-weight);
        line-height: var(--_line-height);

        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;

        transition:
          background-color var(--duration-control) var(--easing-control),
          border-color var(--duration-control) var(--easing-control),
          color var(--duration-control) var(--easing-control);
      }

      .control:hover:not(:disabled) {
        background-color: var(--_background-hover);
      }

      .control:active:not(:disabled) {
        background-color: var(--_background-pressed);
      }

      .control:focus-visible {
        outline: var(--border-focus-ring) solid var(--color-focus-ring);
        outline-offset: var(--border-focus-ring-offset);
      }

      .control:disabled {
        cursor: not-allowed;
      }

      /* --- slots ------------------------------------------------------ */

      .prefix,
      .suffix,
      .label {
        display: inline-flex;
        align-items: center;
      }

      /* Spacing hangs off the slotted content rather than off a gap on the
         control. An empty prefix wrapper is a zero-size flex item and so
         disappears on its own — whereas gap would reserve space for it and
         force the component to track whether each slot is filled. */
      ::slotted([slot="prefix"]),
      .spinner {
        margin-inline-end: var(--space-control-gap);
      }

      ::slotted([slot="suffix"]) {
        margin-inline-start: var(--space-control-gap);
      }

      /* --- loading ---------------------------------------------------- */

      .spinner {
        inline-size: 1em;
        block-size: 1em;
        border: var(--border-strong) solid currentColor;
        border-block-start-color: transparent;
        border-radius: var(--radius-pill);
        animation: ui-button-spin 700ms linear infinite;
      }

      @keyframes ui-button-spin {
        to {
          transform: rotate(1turn);
        }
      }

      /* --- environment ------------------------------------------------ */

      @media (prefers-reduced-motion: reduce) {
        .control {
          transition-duration: 0s;
        }

        /* The ring stays, it just stops moving: the affordance is the shape,
           not the motion. aria-busy carries the same information to AT. */
        .spinner {
          animation: none;
        }
      }

      @media (forced-colors: active) {
        .control {
          border-color: ButtonBorder;
          background-color: ButtonFace;
          color: ButtonText;
        }

        .control:focus-visible {
          outline-color: Highlight;
        }

        :host([disabled]) .control {
          border-color: GrayText;
          color: GrayText;
        }
      }
    `,
  ];

  /** True when the button cannot currently be activated. */
  get #inert(): boolean {
    return this.disabled || this.loading;
  }

  #onHostClick = (event: MouseEvent): void => {
    if (!this.#inert) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #onActivate = (): void => {
    if (this.#inert) return;

    // The inner <button> is `type="button"`, so nothing happens implicitly.
    // Form behaviour is driven explicitly through ElementInternals, which is
    // the only way to reach the form across a shadow boundary.
    const form = this.#internals.form;
    if (!form) return;

    if (this.type === "submit") form.requestSubmit();
    else if (this.type === "reset") form.reset();
  };

  #setPressed = (pressed: boolean): void => {
    if (pressed && !this.#inert) this.#internals.states.add("pressed");
    else this.#internals.states.delete("pressed");
  };

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("loading")) {
      if (this.loading) this.#internals.states.add("loading");
      else this.#internals.states.delete("loading");
    }

    // A button that goes inert mid-press must not stay stuck in :state(pressed).
    if ((changed.has("disabled") || changed.has("loading")) && this.#inert) {
      this.#internals.states.delete("pressed");
    }
  }

  protected override render(): TemplateResult {
    return html`
      <button
        part="control"
        class="control"
        type="button"
        ?disabled=${this.#inert}
        aria-busy=${this.loading ? "true" : "false"}
        @pointerdown=${() => this.#setPressed(true)}
        @pointerup=${() => this.#setPressed(false)}
        @pointercancel=${() => this.#setPressed(false)}
        @pointerleave=${() => this.#setPressed(false)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === " " || e.key === "Enter") this.#setPressed(true);
        }}
        @keyup=${() => this.#setPressed(false)}
        @blur=${() => this.#setPressed(false)}
      >
        <span part="prefix" class="prefix">
          ${
            this.loading
              ? html`<span part="spinner" class="spinner" aria-hidden="true"></span>`
              : html`<slot name="prefix"></slot>`
          }
        </span>

        <span part="label" class="label"><slot></slot></span>

        <span part="suffix" class="suffix">
          <slot name="suffix"></slot>
        </span>
      </button>
    `;
  }
}
