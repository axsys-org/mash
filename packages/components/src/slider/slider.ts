import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A form-associated, single-thumb range control.
 *
 * The first Mash slider contract intentionally represents one numeric value;
 * multi-thumb ranges can compose multiple sliders with an application-level
 * invariant until a native multi-value contract is specified. It owns native
 * keyboard increments, form submission, validity, and state events without a
 * visual track recipe.
 *
 * @tag ui-slider
 * @summary Selects one bounded numeric value with a native range control.
 *
 * @example Volume
 * <ui-slider name="volume" value="40" min="0" max="100" label="Volume"></ui-slider>
 *
 * @csspart root - The slider label wrapper.
 * @csspart control - The native range input.
 * @csspart label - The accessible visible label when supplied.
 *
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ value: number }>} ui-slider-input - Emitted while the value changes during manipulation.
 * @fires {CustomEvent<{ value: number }>} ui-slider-change - Emitted after a committed native range change.
 */
export class UISlider extends LitElement {
  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: Number, reflect: true },
    min: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    step: { type: Number, reflect: true },
    name: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Current selected numeric value. */
  declare value: number;
  /** Inclusive lower bound. */
  declare min: number;
  /** Inclusive upper bound. */
  declare max: number;
  /** Keyboard and pointer increment. */
  declare step: number;
  /** Form key used for submission. */
  declare name: string;
  /** Accessible label for the range control. */
  declare label: string;
  /** Prevents manipulation and form participation. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;
  #formDisabled = false;
  #defaultValue: number | undefined;

  constructor() {
    super();
    this.value = 0;
    this.min = 0;
    this.max = 100;
    this.step = 1;
    this.name = "";
    this.label = "Value";
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  get #isDisabled(): boolean {
    return this.disabled || this.#formDisabled;
  }

  #normalizedValue(): number {
    const minimum = Number.isFinite(this.min) ? this.min : 0;
    const maximum = Number.isFinite(this.max) && this.max >= minimum ? this.max : minimum;
    const raw = Number.isFinite(this.value) ? this.value : minimum;
    return Math.min(Math.max(raw, minimum), maximum);
  }

  #syncForm(): void {
    this.#internals.setFormValue(
      !this.#isDisabled && this.name ? String(this.#normalizedValue()) : null,
    );
    if (this.#isDisabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultValue ??= this.value;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (
      changed.has("value") ||
      changed.has("name") ||
      changed.has("disabled") ||
      changed.has("min") ||
      changed.has("max")
    ) {
      const normalized = this.#normalizedValue();
      if (normalized !== this.value) this.value = normalized;
      this.#syncForm();
    }
  }

  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.value = this.#defaultValue ?? this.min;
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === "string" && Number.isFinite(Number(state))) this.value = Number(state);
  }

  #setValue(input: HTMLInputElement): void {
    this.value = Number(input.value);
  }

  #onInput = (event: Event): void => {
    this.#setValue(event.currentTarget as HTMLInputElement);
    this.dispatchEvent(
      new CustomEvent<{ value: number }>("ui-slider-input", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  };

  #onChange = (event: Event): void => {
    this.#setValue(event.currentTarget as HTMLInputElement);
    this.dispatchEvent(
      new CustomEvent<{ value: number }>("ui-slider-change", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  };

  protected override render(): TemplateResult {
    const value = this.#normalizedValue();
    return html`
      <label part="root">
        <span part="label" ?hidden=${!this.label}>${this.label}</span>
        <input
          part="control"
          type="range"
          .value=${String(value)}
          min=${this.min}
          max=${this.max}
          step=${this.step}
          aria-label=${this.label}
          ?disabled=${this.#isDisabled}
          @input=${this.#onInput}
          @change=${this.#onChange}
        />
      </label>
    `;
  }
}
