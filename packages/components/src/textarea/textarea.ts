import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * An unstyled, form-associated multi-line text editor.
 *
 * The native textarea remains the focus and editing target. Mash exposes its
 * value, state, events, and control anatomy without prescribing padding,
 * borders, typography, dimensions, or resize presentation.
 *
 * @tag ui-textarea
 * @summary Edits ordinary multi-line text.
 *
 * @example Project notes
 * <ui-textarea
 *   name="notes"
 *   label="Project notes"
 *   placeholder="Add context for the migration"
 * ></ui-textarea>
 *
 * @csspart control - The native textarea that owns editing and focus.
 * @cssstate disabled - Matches `:state(disabled)` while editing is unavailable.
 * @cssstate readonly - Matches `:state(readonly)` while the value cannot be edited.
 * @cssstate required - Matches `:state(required)` while a value is required.
 * @cssstate invalid - Matches `:state(invalid)` while the owning field reports an error.
 *
 * @fires {InputEvent} input - Reports an in-progress value edit.
 * @fires {Event} change - Reports a committed value edit.
 *
 * @mashnode control control
 * @mashnode value value control
 * @mashnode name name control
 * @mashnode placeholder placeholder control
 * @mashnode label label control
 * @mashnode disabled disabled control
 * @mashnode readonly readonly control
 * @mashnode required required control
 * @mashnode invalid invalid control
 * @mashnode input input control
 * @mashnode change change control
 */
export class UITextarea extends LitElement {
  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String },
    name: { type: String, reflect: true },
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
  /** Hint shown while the value is empty. */
  declare placeholder: string;
  /** Accessible name when no external label is present. */
  declare label: string;
  /** Prevents focus and text editing. */
  declare disabled: boolean;
  /** Allows focus and selection but prevents edits. */
  declare readonly: boolean;
  /** Requires a value before the containing form may submit. */
  declare required: boolean;

  readonly #internals: ElementInternals;
  #fieldDescription = "";
  #fieldInvalid = false;

  constructor() {
    super();
    this.value = "";
    this.name = "";
    this.placeholder = "";
    this.label = "";
    this.disabled = false;
    this.readonly = false;
    this.required = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  #onInput = (event: Event): void => {
    this.value = (event.currentTarget as HTMLTextAreaElement).value;
    this.#syncValidity();
  };

  /** @internal Cooperative field context without introducing visual anatomy. */
  _setFieldContext(context: { description: string; invalid: boolean }): void {
    this.#fieldDescription = context.description;
    this.#fieldInvalid = context.invalid;
    this.requestUpdate();
  }

  #syncValidity(): void {
    const control = this.renderRoot.querySelector<HTMLTextAreaElement>("[part='control']");
    if (!control || this.disabled) {
      this.#internals.setValidity({});
      return;
    }
    const validity = control.validity;
    this.#internals.setValidity(
      {
        customError: validity.customError,
        tooLong: validity.tooLong,
        tooShort: validity.tooShort,
        valueMissing: validity.valueMissing,
      },
      control.validationMessage,
      control,
    );
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
      <textarea
        part="control"
        .value=${this.value}
        placeholder=${this.placeholder}
        aria-label=${this.label || nothing}
        aria-description=${this.#fieldDescription || nothing}
        aria-invalid=${this.#fieldInvalid ? "true" : nothing}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        @input=${this.#onInput}
      ></textarea>
    `;
  }
}
