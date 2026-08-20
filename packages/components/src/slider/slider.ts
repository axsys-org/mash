import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { numberArrayConverter } from "../internal/number-array.js";

export type SliderOrientation = "horizontal" | "vertical";
export type SliderScale = "linear" | "logarithmic";

/**
 * A form-associated single-value or two-thumb range control.
 *
 * The same portable track/indicator/thumb anatomy supports linear or
 * logarithmic values, logical orientation, and reversed direction. Native
 * range inputs remain the Web focus and pointer bindings; a catalogue owns
 * every visible dimension and color.
 *
 * @tag ui-slider
 * @summary Selects one bounded numeric value with a native range control.
 *
 * @example Volume
 * <ui-slider name="volume" value="40" min="0" max="100" label="Volume"></ui-slider>
 *
 * @example Price range
 * <ui-slider name="price" values="[12,45]" min="0" max="100" label="Price range"></ui-slider>
 *
 * @slot label - Authored control label; the `label` attribute is the compatibility fallback.
 * @slot track - Optional authored content within the range track.
 * @slot indicator - Optional authored content within the selected range indicator.
 * @slot thumb - Optional authored content within the single or range-end thumb.
 * @slot start-thumb - Optional authored content within the range-start thumb.
 * @slot end-thumb - Optional authored content within the range-end thumb; falls back to `thumb`.
 *
 * @csspart root - The slider label wrapper.
 * @csspart control - The native range input.
 * @csspart start-control - The native range-start input when `values` has two entries.
 * @csspart end-control - The native range-end input, or the single-value input.
 * @csspart label - The accessible visible label when supplied.
 * @csspart track - The full value range.
 * @csspart indicator - The range from the minimum to the current value.
 * @csspart thumb - The movable current-value affordance.
 * @csspart start-thumb - The movable range-start affordance.
 * @csspart end-thumb - Alias for the range-end/current-value affordance.
 *
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate invalid - Matches `:state(invalid)` while the owning field reports an error.
 * @cssstate range - Matches `:state(range)` while two values are active.
 *
 * @fires {CustomEvent<{ value: number, values: number[] }>} ui-slider-input - Emitted while the value changes during manipulation.
 * @fires {CustomEvent<{ value: number, values: number[] }>} ui-slider-change - Emitted after a committed native range change.
 *
 * @mashnode root root
 * @mashnode label label root
 * @mashnode control control root
 * @mashnode start-control control root
 * @mashnode track track control
 * @mashnode indicator indicator track
 * @mashnode thumb thumb track
 * @mashnode start-thumb thumb track
 * @mashnode value value root
 * @mashnode values value root
 * @mashnode min min root
 * @mashnode max max root
 * @mashnode step step root
 * @mashnode name name root
 * @mashnode disabled disabled root
 * @mashnode invalid invalid control
 * @mashnode range range root
 * @mashnode orientation orientation root
 * @mashnode scale scale root
 * @mashnode reversed reversed root
 * @mashnode input input root
 * @mashnode change change root
 * @mashrole part start-control control start-control
 * @mashrole part end-control control control
 * @mashrole attribute values value values
 * @mashrole slot start-thumb thumb start-thumb
 * @mashrole part start-thumb thumb start-thumb
 * @mashrole slot end-thumb thumb thumb
 * @mashrole part end-thumb thumb thumb
 */
export class UISlider extends LitElement {
  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: Number, reflect: true },
    values: { converter: numberArrayConverter, reflect: true },
    min: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    step: { type: Number, reflect: true },
    name: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    orientation: { type: String, reflect: true },
    scale: { type: String, reflect: true },
    reversed: { type: Boolean, reflect: true },
    _authoredLabel: { type: String, state: true },
  };

  /** Current selected numeric value. */
  declare value: number;
  /** Ordered start/end values. Two entries activate range mode. */
  declare values: number[];
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
  /** Logical control axis. */
  declare orientation: SliderOrientation;
  /** Position-to-value mapping. Logarithmic scale requires a positive minimum. */
  declare scale: SliderScale;
  /** Reverses the value direction along the selected axis. */
  declare reversed: boolean;

  declare private _authoredLabel: string;

  readonly #internals: ElementInternals;
  #formDisabled = false;
  #defaultValue: number | undefined;
  #defaultValues: number[] | undefined;
  #fieldDescription = "";
  #fieldInvalid = false;

  constructor() {
    super();
    this.value = 0;
    this.values = [];
    this.min = 0;
    this.max = 100;
    this.step = 1;
    this.name = "";
    this.label = "Value";
    this.disabled = false;
    this.orientation = "horizontal";
    this.scale = "linear";
    this.reversed = false;
    this._authoredLabel = "";
    this.#internals = this.attachInternals();
  }

  static override styles = [
    baseStyles,
    css`
      /* Two native ranges overlap in range mode. Only their native thumbs take
         pointer input; the authored Mash thumbs remain visual recipe targets.
         This is interaction geometry, not product styling. */
      input[data-range] {
        pointer-events: none;
      }

      input[data-range]::-webkit-slider-thumb {
        pointer-events: auto;
      }

      input[data-range]::-moz-range-thumb {
        pointer-events: auto;
      }
    `,
  ];

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

  get #isRange(): boolean {
    return this.values.length >= 2;
  }

  #bounds(): [number, number] {
    const minimum = Number.isFinite(this.min) ? this.min : 0;
    const maximum = Number.isFinite(this.max) && this.max >= minimum ? this.max : minimum;
    return [minimum, maximum];
  }

  #normalizedValue(value = this.value): number {
    const [minimum, maximum] = this.#bounds();
    const raw = Number.isFinite(value) ? value : minimum;
    const clamped = Math.min(Math.max(raw, minimum), maximum);
    const step = Number.isFinite(this.step) && this.step > 0 ? this.step : 1;
    const snapped = minimum + Math.round((clamped - minimum) / step) * step;
    return Math.min(maximum, Math.max(minimum, Number(snapped.toFixed(10))));
  }

  #normalizedValues(): [number, number] {
    const [minimum, maximum] = this.#bounds();
    const first = this.#normalizedValue(this.values[0] ?? minimum);
    const second = this.#normalizedValue(this.values[1] ?? maximum);
    return first <= second ? [first, second] : [second, first];
  }

  get #usesLogarithmicScale(): boolean {
    const [minimum, maximum] = this.#bounds();
    return this.scale === "logarithmic" && minimum > 0 && maximum > minimum;
  }

  #ratioForValue(value: number): number {
    const [minimum, maximum] = this.#bounds();
    if (maximum <= minimum) return 0;
    if (this.#usesLogarithmicScale) {
      return Math.log(value / minimum) / Math.log(maximum / minimum);
    }
    return (value - minimum) / (maximum - minimum);
  }

  #valueForRatio(ratio: number): number {
    const [minimum, maximum] = this.#bounds();
    const normalized = Math.max(0, Math.min(1, ratio));
    const raw = this.#usesLogarithmicScale
      ? minimum * Math.pow(maximum / minimum, normalized)
      : minimum + (maximum - minimum) * normalized;
    return this.#normalizedValue(raw);
  }

  #visualPercentage(value: number): number {
    let ratio = this.#ratioForValue(value);
    if (this.reversed) ratio = 1 - ratio;
    if (this.orientation === "vertical") ratio = 1 - ratio;
    return ratio * 100;
  }

  #syncForm(): void {
    if (this.#isDisabled || !this.name) this.#internals.setFormValue(null);
    else if (this.#isRange) {
      const formValue = new FormData();
      for (const value of this.#normalizedValues()) formValue.append(this.name, String(value));
      this.#internals.setFormValue(formValue);
    } else this.#internals.setFormValue(String(this.#normalizedValue()));
    if (this.#isDisabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
    if (this.#isRange) this.#internals.states.add("range");
    else this.#internals.states.delete("range");
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultValue ??= this.value;
    this.#defaultValues ??= [...this.values];
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (
      changed.has("value") ||
      changed.has("values") ||
      changed.has("name") ||
      changed.has("disabled") ||
      changed.has("min") ||
      changed.has("max")
    ) {
      const normalized = this.#normalizedValue();
      if (normalized !== this.value) this.value = normalized;
      if (this.#isRange) {
        const range = this.#normalizedValues();
        if (range[0] !== this.values[0] || range[1] !== this.values[1]) this.values = range;
      }
      this.#syncForm();
    }
  }

  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.value = this.#defaultValue ?? this.min;
    this.values = [...(this.#defaultValues ?? [])];
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === "string" && Number.isFinite(Number(state))) this.value = Number(state);
    else if (state instanceof FormData) {
      this.values = state.getAll(this.name).map(Number).filter(Number.isFinite);
    }
  }

  /** @internal Cooperative field context without introducing visual anatomy. */
  _setFieldContext(context: { description: string; invalid: boolean }): void {
    this.#fieldDescription = context.description;
    this.#fieldInvalid = context.invalid;
    if (context.invalid) this.#internals.states.add("invalid");
    else this.#internals.states.delete("invalid");
    this.requestUpdate();
  }

  #setThumb(which: "end" | "start", value: number): number {
    const next = this.#normalizedValue(value);
    if (!this.#isRange) {
      this.value = next;
      return next;
    }
    const [start, end] = this.#normalizedValues();
    this.values = which === "start" ? [Math.min(next, end), end] : [start, Math.max(start, next)];
    return which === "start" ? this.values[0]! : this.values[1]!;
  }

  #eventDetail(value: number): { value: number; values: number[] } {
    return { value, values: this.#isRange ? [...this.#normalizedValues()] : [this.value] };
  }

  #setFromInput(input: HTMLInputElement): number {
    return this.#setThumb(
      input.dataset.thumb as "end" | "start",
      this.#usesLogarithmicScale
        ? this.#valueForRatio(Number(input.value) / 10_000)
        : Number(input.value),
    );
  }

  #onInput = (event: Event): void => {
    const value = this.#setFromInput(event.currentTarget as HTMLInputElement);
    this.dispatchEvent(
      new CustomEvent<{ value: number; values: number[] }>("ui-slider-input", {
        bubbles: true,
        composed: true,
        detail: this.#eventDetail(value),
      }),
    );
  };

  #onChange = (event: Event): void => {
    const value = this.#setFromInput(event.currentTarget as HTMLInputElement);
    this.dispatchEvent(
      new CustomEvent<{ value: number; values: number[] }>("ui-slider-change", {
        bubbles: true,
        composed: true,
        detail: this.#eventDetail(value),
      }),
    );
  };

  #onKeydown = (event: KeyboardEvent): void => {
    const input = event.currentTarget as HTMLInputElement;
    const which = input.dataset.thumb as "end" | "start";
    const current =
      which === "start" && this.#isRange
        ? this.#normalizedValues()[0]
        : this.#normalizedValue(this.#isRange ? this.#normalizedValues()[1] : this.value);
    const [minimum, maximum] = this.#bounds();
    const step = Number.isFinite(this.step) && this.step > 0 ? this.step : 1;
    const direction = getComputedStyle(input).direction;
    const positiveArrow =
      this.orientation === "vertical"
        ? direction === "rtl"
          ? "ArrowUp"
          : "ArrowDown"
        : direction === "rtl"
          ? "ArrowLeft"
          : "ArrowRight";
    const negativeArrow =
      this.orientation === "vertical"
        ? positiveArrow === "ArrowUp"
          ? "ArrowDown"
          : "ArrowUp"
        : positiveArrow === "ArrowRight"
          ? "ArrowLeft"
          : "ArrowRight";
    let next: number | undefined;
    if (event.key === "Home") next = minimum;
    else if (event.key === "End") next = maximum;
    else if (event.key === "PageUp") next = current + step * 10;
    else if (event.key === "PageDown") next = current - step * 10;
    else if (event.key === positiveArrow) next = current + step;
    else if (event.key === negativeArrow) next = current - step;
    if (next === undefined) return;
    event.preventDefault();
    const value = this.#setThumb(which, next);
    const detail = this.#eventDetail(value);
    this.dispatchEvent(
      new CustomEvent("ui-slider-input", { bubbles: true, composed: true, detail }),
    );
    this.dispatchEvent(
      new CustomEvent("ui-slider-change", { bubbles: true, composed: true, detail }),
    );
  };

  #renderControl(
    which: "end" | "start",
    value: number,
    label: string,
    range: boolean,
  ): TemplateResult {
    const [minimum, maximum] = this.#bounds();
    const positional = this.#usesLogarithmicScale;
    return html`
      <input
        part=${which === "start" ? "start-control" : range ? "control end-control" : "control"}
        type="range"
        data-thumb=${which}
        ?data-range=${range}
        min=${positional ? "0" : String(minimum)}
        max=${positional ? "10000" : String(maximum)}
        step=${positional ? "1" : String(this.step)}
        .value=${String(positional ? this.#ratioForValue(value) * 10_000 : value)}
        aria-label=${range ? `${label} ${which === "start" ? "minimum" : "maximum"}` : label}
        aria-description=${this.#fieldDescription || nothing}
        aria-invalid=${this.#fieldInvalid ? "true" : nothing}
        aria-orientation=${this.orientation}
        aria-valuemin=${minimum}
        aria-valuemax=${maximum}
        aria-valuenow=${value}
        ?disabled=${this.#isDisabled}
        @keydown=${this.#onKeydown}
        @input=${this.#onInput}
        @change=${this.#onChange}
      />
    `;
  }

  protected override render(): TemplateResult {
    const value = this.#normalizedValue();
    const label = this.#effectiveLabel;
    const rangeMode = this.#isRange;
    const [start, end] = rangeMode ? this.#normalizedValues() : [this.#bounds()[0], value];
    const startPercentage = this.#visualPercentage(start);
    const endPercentage = this.#visualPercentage(end);
    const indicatorStart = Math.min(startPercentage, endPercentage);
    const indicatorSize = Math.abs(endPercentage - startPercentage);
    const indicatorStyle =
      this.orientation === "vertical"
        ? `inset-block-start:${indicatorStart}%;block-size:${indicatorSize}%`
        : `inset-inline-start:${indicatorStart}%;inline-size:${indicatorSize}%`;
    const thumbStyle = (thumbValue: number): string =>
      this.orientation === "vertical"
        ? `inset-block-start:${this.#visualPercentage(thumbValue)}%`
        : `inset-inline-start:${this.#visualPercentage(thumbValue)}%`;
    return html`
      <label part="root">
        <span part="label" ?hidden=${!label}
          ><slot name="label" @slotchange=${this.#onLabelChange}>${this.label}</slot></span
        >
        ${rangeMode ? this.#renderControl("start", start, label, true) : nothing}
        ${this.#renderControl("end", end, label, rangeMode)}
        <span part="track">
          <slot name="track"></slot>
          <span part="indicator" style=${indicatorStyle}>
            <slot name="indicator"></slot>
          </span>
          ${
            rangeMode
              ? html`<span part="start-thumb" style=${thumbStyle(start)}>
                  <slot name="start-thumb"></slot>
                </span>`
              : nothing
          }
          ${
            rangeMode
              ? html`<span part="thumb end-thumb" style=${thumbStyle(end)}>
                  <slot name="end-thumb"><slot name="thumb"></slot></slot>
                </span>`
              : html`<span part="thumb" style=${thumbStyle(end)}><slot name="thumb"></slot></span>`
          }
        </span>
      </label>
    `;
  }
}
