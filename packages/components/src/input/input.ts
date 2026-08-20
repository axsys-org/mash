import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The native input modes Mash exposes as a stable cross-platform contract. */
export type InputType = "text" | "email" | "password" | "search" | "tel" | "url";

/** The physical scale of an input control. */
export type InputSize = "small" | "medium" | "large";

/**
 * A single-line, form-associated text entry control.
 *
 * The native input remains the focus target and owns text editing semantics;
 * the custom element owns form participation across the shadow boundary.
 * Appearance, sizing, and any prefix/suffix layout belong to an opt-in
 * catalogue recipe. Use `<ui-input-group>` when a control needs adornments.
 *
 * @tag ui-input
 * @summary A tokenized, single-line text input.
 *
 * @example Search input
 * <div class="demo button-showcase-row">
 *   <ui-input type="search" placeholder="Search the workspace" label="Search"></ui-input>
 * </div>
 *
 * @csspart control - The native `<input>` that receives text entry and focus.
 * @cssstate disabled - Matches `:state(disabled)` while text entry is unavailable.
 * @cssstate readonly - Matches `:state(readonly)` while the value cannot be edited.
 * @cssstate required - Matches `:state(required)` while a value is required.
 * @cssstate invalid - Matches `:state(invalid)` while the owning field reports an error.
 *
 * @mashnode control control
 * @mashnode value value control
 * @mashnode name name control
 * @mashnode type type control
 * @mashnode size size control
 * @mashnode placeholder placeholder control
 * @mashnode label label control
 * @mashnode disabled disabled control
 * @mashnode readonly readonly control
 * @mashnode required required control
 * @mashnode invalid invalid control
 */
export class UIInput extends LitElement {
  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String },
    name: { type: String, reflect: true },
    type: { type: String, reflect: true },
    size: { type: String, reflect: true },
    placeholder: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readonly: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
  };

  /** Current text value, submitted with the containing form. */
  declare value: string;
  /** Form field name. */
  declare name: string;
  /** Native text-entry mode. */
  declare type: InputType;
  /** Physical scale. */
  declare size: InputSize;
  /** Hint shown when the field is empty. */
  declare placeholder: string;
  /** Accessible name when the input has no external label. */
  declare label: string;
  /** Prevents focus and text entry. */
  declare disabled: boolean;
  /** Allows focus and selection but prevents edits. */
  declare readonly: boolean;
  /** Requires a value before the containing form can submit. */
  declare required: boolean;

  readonly #internals: ElementInternals;
  #fieldDescription = "";
  #fieldInvalid = false;

  constructor() {
    super();
    this.value = "";
    this.name = "";
    this.type = "text";
    this.size = "medium";
    this.placeholder = "";
    this.label = "";
    this.disabled = false;
    this.readonly = false;
    this.required = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  #onInput = (event: Event): void => {
    this.value = (event.currentTarget as HTMLInputElement).value;
    this.#syncValidity();
  };

  /** @internal Cooperative field context without adding visual wrapper anatomy. */
  _setFieldContext(context: { description: string; invalid: boolean }): void {
    this.#fieldDescription = context.description;
    this.#fieldInvalid = context.invalid;
    this.requestUpdate();
  }

  #syncValidity(): void {
    const control = this.renderRoot.querySelector<HTMLInputElement>("[part='control']");
    if (!control || this.disabled) {
      this.#internals.setValidity({});
      return;
    }
    const validity = control.validity;
    const flags: ValidityStateFlags = {
      badInput: validity.badInput,
      customError: validity.customError,
      patternMismatch: validity.patternMismatch,
      rangeOverflow: validity.rangeOverflow,
      rangeUnderflow: validity.rangeUnderflow,
      stepMismatch: validity.stepMismatch,
      tooLong: validity.tooLong,
      tooShort: validity.tooShort,
      typeMismatch: validity.typeMismatch,
      valueMissing: validity.valueMissing,
    };
    this.#internals.setValidity(flags, control.validationMessage, control);
  }

  protected override firstUpdated(): void {
    this.#syncValidity();
  }

  formResetCallback(): void {
    this.value = this.getAttribute("value") ?? "";
  }

  formStateRestoreCallback(state: string | null): void {
    this.value = state ?? "";
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("value") || changed.has("name") || changed.has("disabled")) {
      this.#internals.setFormValue(this.disabled || !this.name ? null : this.value);
    }
    for (const state of ["disabled", "readonly", "required"] as const) {
      if (!changed.has(state)) continue;
      if (this[state]) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
    if (this.#fieldInvalid) this.#internals.states.add("invalid");
    else this.#internals.states.delete("invalid");
    this.#syncValidity();
  }

  protected override render(): TemplateResult {
    return html`
      <input
        part="control"
        .value=${this.value}
        type=${this.type}
        placeholder=${this.placeholder}
        aria-label=${this.label || nothing}
        aria-description=${this.#fieldDescription || nothing}
        aria-invalid=${this.#fieldInvalid ? "true" : nothing}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        @input=${this.#onInput}
      />
    `;
  }
}
