import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A form-associated numeric field with explicit decrement and increment parts.
 *
 * Its native number input keeps browser editing, numeric keyboard semantics,
 * and mobile input-mode affordances. The step controls are semantic buttons,
 * not a visual treatment, so a renderer may arrange or omit their recipe while
 * retaining the same range and form contract.
 *
 * @tag ui-number-field
 * @summary Edits one bounded numeric value and participates in forms.
 *
 * @example Seats
 * <ui-number-field name="seats" value="3" min="1" max="20" label="Seats"></ui-number-field>
 *
 * @slot label - Authored field label; the `label` attribute is the compatibility fallback.
 *
 * @csspart root - The labelled field wrapper.
 * @csspart decrement - The native decrement button.
 * @csspart control - The native number input.
 * @csspart increment - The native increment button.
 * @csspart label - The accessible visible label.
 *
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate required - Matches `:state(required)` when a value is required.
 * @cssstate invalid - Matches `:state(invalid)` while the owning field reports an error.
 *
 * @fires {CustomEvent<{ value: number }>} ui-number-field-input - Emitted while typed or stepped value changes.
 * @fires {CustomEvent<{ value: number }>} ui-number-field-change - Emitted after a committed native number change.
 * @fires {CustomEvent<{ direction: "decrement" | "increment", value: number }>} ui-number-field-step - Cancellable request emitted before a step is applied.
 *
 * @mashnode root root
 * @mashnode label label root
 * @mashnode control control root
 * @mashnode decrement decrement root
 * @mashnode increment increment root
 * @mashnode value value root
 * @mashnode min min root
 * @mashnode max max root
 * @mashnode step step root
 * @mashnode name name root
 * @mashnode required required root
 * @mashnode disabled disabled root
 * @mashnode invalid invalid control
 * @mashnode input input root
 * @mashnode change change root
 * @mashnode step-request step-request root
 * @mashrole event ui-number-field-step step-request step-request
 */
export class UINumberField extends LitElement {
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
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    _authoredLabel: { type: String, state: true },
  };

  /** Current numeric value. */
  declare value: number;
  /** Inclusive lower bound. */
  declare min: number;
  /** Inclusive upper bound. */
  declare max: number;
  /** Numeric increment used by the buttons and native input. */
  declare step: number;
  /** Form key used for submission. */
  declare name: string;
  /** Accessible label for the field. */
  declare label: string;
  /** Requires a value before a containing form submits. */
  declare required: boolean;
  /** Prevents editing and form participation. */
  declare disabled: boolean;

  declare private _authoredLabel: string;

  readonly #internals: ElementInternals;
  #formDisabled = false;
  #defaultValue: number | undefined;
  #fieldDescription = "";
  #fieldInvalid = false;

  constructor() {
    super();
    this.value = 0;
    this.min = Number.NEGATIVE_INFINITY;
    this.max = Number.POSITIVE_INFINITY;
    this.step = 1;
    this.name = "";
    this.label = "Number";
    this.required = false;
    this.disabled = false;
    this._authoredLabel = "";
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  get #isDisabled(): boolean {
    return this.disabled || this.#formDisabled;
  }

  get #effectiveLabel(): string {
    return this._authoredLabel || this.label;
  }

  #onLabelChange = (event: Event): void => {
    this._authoredLabel = (event.target as HTMLSlotElement)
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
  };

  #normalizedValue(value = this.value): number {
    const minimum = Number.isFinite(this.min) ? this.min : Number.NEGATIVE_INFINITY;
    const maximum = Number.isFinite(this.max) ? this.max : Number.POSITIVE_INFINITY;
    const raw = Number.isFinite(value) ? value : 0;
    return Math.min(Math.max(raw, minimum), maximum);
  }

  #syncForm(): void {
    const input = this.renderRoot.querySelector<HTMLInputElement>("input");
    const value = this.#normalizedValue();
    this.#internals.setFormValue(!this.#isDisabled && this.name ? String(value) : null);
    if (this.required && !this.#isDisabled && !Number.isFinite(this.value)) {
      this.#internals.setValidity(
        { valueMissing: true },
        "Enter a number to continue.",
        input ?? undefined,
      );
    } else {
      this.#internals.setValidity({});
    }
    if (this.#isDisabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
    if (this.required) this.#internals.states.add("required");
    else this.#internals.states.delete("required");
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
      changed.has("required") ||
      changed.has("min") ||
      changed.has("max")
    ) {
      const value = this.#normalizedValue();
      if (value !== this.value) this.value = value;
      this.#syncForm();
    }
  }

  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.value = this.#defaultValue ?? 0;
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === "string" && Number.isFinite(Number(state))) this.value = Number(state);
  }

  /** @internal Cooperative field context without introducing visual anatomy. */
  _setFieldContext(context: { description: string; invalid: boolean }): void {
    this.#fieldDescription = context.description;
    this.#fieldInvalid = context.invalid;
    if (context.invalid) this.#internals.states.add("invalid");
    else this.#internals.states.delete("invalid");
    this.requestUpdate();
  }

  #setValue(value: number): void {
    this.value = this.#normalizedValue(value);
  }

  #emitInput(): void {
    this.dispatchEvent(
      new CustomEvent<{ value: number }>("ui-number-field-input", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  }

  #emitChange(): void {
    this.dispatchEvent(
      new CustomEvent<{ value: number }>("ui-number-field-change", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  }

  #onInput = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    if (input.value !== "") this.#setValue(Number(input.value));
    this.#emitInput();
  };

  #onChange = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    if (input.value !== "") this.#setValue(Number(input.value));
    this.#emitChange();
  };

  #stepBy(delta: number): void {
    if (this.#isDisabled) return;
    const value = this.#normalizedValue(
      this.value + delta * (Number.isFinite(this.step) && this.step > 0 ? this.step : 1),
    );
    const request = new CustomEvent<{ direction: "decrement" | "increment"; value: number }>(
      "ui-number-field-step",
      {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { direction: delta < 0 ? "decrement" : "increment", value },
      },
    );
    if (!this.dispatchEvent(request)) return;
    this.#setValue(value);
    this.#emitInput();
    this.#emitChange();
  }

  protected override render(): TemplateResult {
    const value = this.#normalizedValue();
    const label = this.#effectiveLabel;
    return html`
      <label part="root">
        <span part="label" ?hidden=${!label}
          ><slot name="label" @slotchange=${this.#onLabelChange}>${this.label}</slot></span
        >
        <span>
          <button
            part="decrement"
            type="button"
            aria-label=${`Decrease ${label}`}
            ?disabled=${this.#isDisabled}
            @click=${() => this.#stepBy(-1)}
          >
            −
          </button>
          <input
            part="control"
            type="number"
            .value=${String(value)}
            min=${Number.isFinite(this.min) ? this.min : undefined}
            max=${Number.isFinite(this.max) ? this.max : undefined}
            step=${this.step}
            aria-label=${label}
            aria-description=${this.#fieldDescription || nothing}
            aria-invalid=${this.#fieldInvalid ? "true" : nothing}
            ?required=${this.required}
            ?disabled=${this.#isDisabled}
            @input=${this.#onInput}
            @change=${this.#onChange}
          />
          <button
            part="increment"
            type="button"
            aria-label=${`Increase ${label}`}
            ?disabled=${this.#isDisabled}
            @click=${() => this.#stepBy(1)}
          >
            +
          </button>
        </span>
      </label>
    `;
  }
}
