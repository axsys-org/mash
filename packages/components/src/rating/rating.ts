import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";
import { baseStyles } from "../internal/base-styles.js";

/**
 * A keyboard-accessible, form-associated rating.
 * @tag ui-rating
 * @summary Chooses a score on a bounded star scale.
 * @example Rating
 * <ui-rating name="rating" label="Your rating" value="3"></ui-rating>
 * @csspart root - The labelled rating group.
 * @csspart item - Each selectable score.
 * @csspart control - The native radio input.
 * @csspart star - The visible score symbol.
 * @csspart filled - A star included in the current rating.
 * @mashnode root rating
 * @mashnode item score root
 * @mashnode control control item
 * @mashnode star indicator item
 * @mashnode filled filled star
 * @mashnode size size root
 * @mashaxis size control-size
 * @fires {CustomEvent<{ value: number }>} ui-rating-change - The user chose a new rating.
 */
export class UIRating extends LitElement {
  static formAssociated = true;
  static override properties = {
    value: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    name: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readonly: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
  };
  /** Selected score; zero means unanswered. */
  declare value: number;
  /** Number of scores; bounded to 1–20. */
  declare max: number;
  /** Name used for form submission. */
  declare name: string;
  /** Accessible name for the score. */
  declare label: string;
  /** Prevent changes and form submission. */
  declare disabled: boolean;
  /** Display a score without interactive controls. */
  declare readonly: boolean;
  /** Require a nonzero score on submission. */
  declare required: boolean;
  /** Size of the score controls. */
  declare size: "small" | "medium" | "large";
  #internals = this.attachInternals();
  #default = 0;
  #formDisabled = false;
  constructor() {
    super();
    this.value = 0;
    this.max = 5;
    this.name = "";
    this.label = "Rating";
    this.disabled = false;
    this.readonly = false;
    this.required = false;
    this.size = "medium";
  }
  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
      }
      [part="root"] {
        display: inline-flex;
      }
      [part="item"] {
        position: relative;
        display: inline-flex;
        cursor: pointer;
      }
      [part="control"] {
        position: absolute;
        inset: 0;
        margin: 0;
        opacity: 0;
        cursor: inherit;
      }
      [part="control"]:focus-visible + span {
        outline: 2px solid currentColor;
        outline-offset: 2px;
        border-radius: 2px;
      }
      :host([disabled]) [part="item"] {
        cursor: default;
      }
    `,
  ];
  override connectedCallback(): void {
    super.connectedCallback();
    this.#default = this.value;
  }
  get #limit(): number {
    return Math.max(1, Math.min(20, Math.floor(this.max) || 5));
  }
  get #score(): number {
    return Math.max(0, Math.min(this.#limit, this.value || 0));
  }
  protected override updated(_changed: PropertyValues<this>): void {
    this.#internals.setFormValue(
      this.disabled || this.#formDisabled || !this.#score ? null : String(this.#score),
    );
    this.#internals.setValidity(
      this.required && !this.#score && !this.disabled && !this.#formDisabled
        ? { valueMissing: true }
        : {},
      this.required && !this.#score ? "Choose a rating." : "",
    );
  }
  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }
  formResetCallback(): void {
    this.value = this.#default;
  }
  formStateRestoreCallback(state: string): void {
    this.value = Number(state) || 0;
  }
  #choose(value: number): void {
    if (this.disabled || this.#formDisabled || this.readonly) return;
    this.value = value;
    this.dispatchEvent(
      new CustomEvent("ui-rating-change", { bubbles: true, composed: true, detail: { value } }),
    );
  }
  protected override render(): TemplateResult {
    return html`<div
      part="root"
      role=${this.readonly ? "img" : "radiogroup"}
      aria-label=${this.readonly ? `${this.label}: ${this.#score} of ${this.#limit}` : this.label}
    >
      ${Array.from(
        { length: this.#limit },
        (_, index) =>
          html`<label part="item">
            ${this.readonly ? "" : html`<input part="control" type="radio" name="rating" aria-label=${`${index + 1} of ${this.#limit}`} .checked=${this.#score === index + 1} ?disabled=${this.disabled || this.#formDisabled} @change=${() => this.#choose(index + 1)} />`}
            <span part=${index < this.#score ? "star filled" : "star"} aria-hidden="true">★</span>
          </label>`,
      )}
    </div>`;
  }
}
