import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The native input modes Mash exposes as a stable cross-platform contract. */
export type InputType = "text" | "email" | "password" | "search" | "tel" | "url";

/** Native virtual-keyboard hints supported by the single-line control. */
export type InputMode =
  "decimal" | "email" | "none" | "numeric" | "search" | "tel" | "text" | "url";

/** The physical scale of an input control. */
export type InputSize = "inherit" | "default" | "compact" | "small" | "medium" | "large";

/** Fired when Enter is pressed while the native input owns focus. */
export interface InputEnterDetail {
  value: string;
  secondary: boolean;
}

/** Fired when focus enters or leaves the native editing control. */
export interface InputFocusChangeDetail {
  focused: boolean;
}

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
 * @cssstate focused - Matches `:state(focused)` while the native control owns focus.
 * @cssstate invalid - Matches `:state(invalid)` while the native control or owning field reports an error.
 *
 * @fires {InputEvent} input - Reports an in-progress value edit.
 * @fires {Event} change - Reports a committed value edit.
 * @fires {CustomEvent<InputEnterDetail>} ui-input-enter - Reports Enter activation without preventing native form submission.
 * @fires {CustomEvent<InputFocusChangeDetail>} ui-input-focus-change - Reports focus entry and exit across the shadow boundary.
 *
 * @mashnode control control
 * @mashnode value value control
 * @mashnode name name control
 * @mashnode type type control
 * @mashnode size size control
 * @mashaxis size control-size
 * @mashnode placeholder placeholder control
 * @mashnode label label control
 * @mashnode autocomplete autocomplete control
 * @mashnode inputmode input-mode control
 * @mashnode pattern pattern control
 * @mashnode minlength min-length control
 * @mashnode maxlength max-length control
 * @mashnode clean-on-escape clear control
 * @mashnode disabled disabled control
 * @mashnode readonly readonly control
 * @mashnode required required control
 * @mashnode focused focused control
 * @mashnode invalid invalid control
 * @mashnode input input control
 * @mashnode change change control
 * @mashnode enter enter control
 * @mashnode focus-change change control
 * @mashrole state focused focused focused
 * @mashrole event ui-input-enter enter enter
 * @mashrole event ui-input-focus-change change focus-change
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
    autocomplete: { type: String, reflect: true },
    inputMode: { type: String, attribute: "inputmode", reflect: true },
    pattern: { type: String, reflect: true },
    minLength: { type: Number, attribute: "minlength" },
    maxLength: { type: Number, attribute: "maxlength" },
    cleanOnEscape: { type: Boolean, attribute: "clean-on-escape", reflect: true },
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
  /** Physical scale; inherit follows the nearest data-mash-size context. */
  declare size: InputSize;
  /** Hint shown when the field is empty. */
  declare placeholder: string;
  /** Accessible name when the input has no external label. */
  declare label: string;
  /** Browser autocomplete hint. */
  declare autocomplete: string;
  /** Virtual keyboard hint for touch devices. */
  declare inputMode: InputMode;
  /** Native regular-expression validation pattern. */
  declare pattern: string;
  /** Native minimum text length, or `-1` when unset. */
  declare minLength: number;
  /** Native maximum text length, or `-1` when unset. */
  declare maxLength: number;
  /** Clears an editable value when Escape is pressed. */
  declare cleanOnEscape: boolean;
  /** Prevents focus and text entry. */
  declare disabled: boolean;
  /** Allows focus and selection but prevents edits. */
  declare readonly: boolean;
  /** Requires a value before the containing form can submit. */
  declare required: boolean;

  readonly #internals: ElementInternals;
  #fieldDescription = "";
  #fieldInvalid = false;
  #nativeInvalid = false;
  #defaultValue: string | undefined;
  #formDisabled = false;

  constructor() {
    super();
    this.value = "";
    this.name = "";
    this.type = "text";
    this.size = "inherit";
    this.placeholder = "";
    this.label = "";
    this.autocomplete = "";
    this.inputMode = "text";
    this.pattern = "";
    this.minLength = -1;
    this.maxLength = -1;
    this.cleanOnEscape = false;
    this.disabled = false;
    this.readonly = false;
    this.required = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultValue ??= this.value;
  }

  get control(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>("[part='control']") ?? null;
  }

  override focus(options?: FocusOptions): void {
    this.control?.focus(options);
  }

  override blur(): void {
    this.control?.blur();
  }

  /** Selects the complete native value. */
  select(): void {
    this.control?.select();
  }

  /** Moves the native text selection without inventing editor state. */
  setSelectionRange(start: number, end: number, direction?: SelectionDirection): void {
    this.control?.setSelectionRange(start, end, direction);
  }

  #onInput = (event: Event): void => {
    this.value = (event.currentTarget as HTMLInputElement).value;
    this.#syncValidity();
  };

  #onChange = (event: Event): void => {
    this.value = (event.currentTarget as HTMLInputElement).value;
    this.#syncValidity();
    // Native change is not composed. Publish the committed value at the host
    // so ordinary form owners receive the documented event across shadow DOM.
    event.stopPropagation();
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (this.#effectiveDisabled) return;
    if (event.key === "Enter" && !event.isComposing) {
      this.dispatchEvent(
        new CustomEvent<InputEnterDetail>("ui-input-enter", {
          bubbles: true,
          composed: true,
          detail: { value: this.value, secondary: event.shiftKey },
        }),
      );
    }
    if (event.key !== "Escape" || !this.cleanOnEscape || !this.value || this.readonly) return;
    event.preventDefault();
    const control = event.currentTarget as HTMLInputElement;
    control.value = "";
    control.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        composed: true,
        inputType: "deleteContentBackward",
      }),
    );
  };

  #onFocus = (): void => {
    this.#internals.states.add("focused");
    this.dispatchEvent(
      new CustomEvent<InputFocusChangeDetail>("ui-input-focus-change", {
        bubbles: true,
        composed: true,
        detail: { focused: true },
      }),
    );
  };

  #onBlur = (): void => {
    this.#internals.states.delete("focused");
    this.dispatchEvent(
      new CustomEvent<InputFocusChangeDetail>("ui-input-focus-change", {
        bubbles: true,
        composed: true,
        detail: { focused: false },
      }),
    );
  };

  /** @internal Cooperative field context without adding visual wrapper anatomy. */
  _setFieldContext(context: { description: string; invalid: boolean }): void {
    this.#fieldDescription = context.description;
    this.#fieldInvalid = context.invalid;
    this.#syncInvalidState();
    this.requestUpdate();
  }

  #syncInvalidState(): void {
    if (!this.#effectiveDisabled && (this.#fieldInvalid || this.#nativeInvalid))
      this.#internals.states.add("invalid");
    else this.#internals.states.delete("invalid");
  }

  #syncValidity(): void {
    const control = this.control;
    if (!control || this.#effectiveDisabled) {
      this.#internals.setValidity({});
      this.#nativeInvalid = false;
      this.#syncInvalidState();
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
    this.#nativeInvalid = !validity.valid;
    this.#syncInvalidState();
  }

  protected override firstUpdated(): void {
    this.#syncValidity();
  }

  get #effectiveDisabled(): boolean {
    return this.disabled || this.#formDisabled;
  }

  /** Receives the browser's disabled state, including ancestor fieldsets. */
  formDisabledCallback(disabled: boolean): void {
    if (this.#formDisabled === disabled) return;
    this.#formDisabled = disabled;
    // Apply immediately so fieldset mutations cannot leave an editable control
    // between the browser callback and the next rendering update.
    if (this.control) this.control.disabled = this.#effectiveDisabled;
    this.#syncFormState();
    this.requestUpdate();
  }

  #syncFormState(): void {
    const disabled = this.#effectiveDisabled;
    this.#internals.setFormValue(disabled || !this.name ? null : this.value);
    if (disabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
    this.#syncValidity();
  }

  formResetCallback(): void {
    this.value = this.#defaultValue ?? "";
  }

  formStateRestoreCallback(state: string | null): void {
    this.value = state ?? "";
  }

  protected override updated(changed: PropertyValues<this>): void {
    this.#syncFormState();
    for (const state of ["readonly", "required"] as const) {
      if (!changed.has(state)) continue;
      if (this[state]) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
  }

  protected override render(): TemplateResult {
    return html`
      <input
        part="control"
        .value=${this.value}
        type=${this.type}
        placeholder=${this.placeholder}
        autocomplete=${this.autocomplete || nothing}
        inputmode=${this.inputMode || nothing}
        pattern=${this.pattern || nothing}
        minlength=${this.minLength >= 0 ? this.minLength : nothing}
        maxlength=${this.maxLength >= 0 ? this.maxLength : nothing}
        aria-label=${this.label || nothing}
        aria-description=${this.#fieldDescription || nothing}
        aria-invalid=${!this.#effectiveDisabled && this.#fieldInvalid ? "true" : nothing}
        ?disabled=${this.#effectiveDisabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        @input=${this.#onInput}
        @change=${this.#onChange}
        @keydown=${this.#onKeydown}
        @focus=${this.#onFocus}
        @blur=${this.#onBlur}
      />
    `;
  }
}
