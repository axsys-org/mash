import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "./base-styles.js";

/**
 * Shared behavioural core for checkboxes and switches.
 *
 * This deliberately owns no visual CSS. The native input is usable without a
 * recipe, while a catalogue can style its stable parts from outside the shadow
 * root. That keeps the form and accessibility contract portable to React,
 * GPUI, and future renderers without coupling it to Mash's current look.
 */
export abstract class UICheckable extends LitElement {
  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    name: { type: String, reflect: true },
    required: { type: Boolean, reflect: true },
    value: { type: String, reflect: true },
  };

  static override styles = baseStyles;

  /** Current checked state. The containing application may set this directly. */
  declare checked: boolean;
  /** Prevents user interaction and form participation. */
  declare disabled: boolean;
  /** Form key used when the control is checked. */
  declare name: string;
  /** Requires the control to be checked before the form can submit. */
  declare required: boolean;
  /** Form value submitted when checked. */
  declare value: string;

  protected abstract readonly changeEventName: string;
  protected abstract readonly controlRole: "switch" | null;
  /** Native control type. Radio groups reuse this form-associated core. */
  protected readonly inputType: "checkbox" | "radio" = "checkbox";

  readonly #internals: ElementInternals;
  #defaultChecked: boolean | undefined;
  #formDisabled = false;

  constructor() {
    super();
    this.checked = false;
    this.disabled = false;
    this.name = "";
    this.required = false;
    this.value = "on";
    this.#internals = this.attachInternals();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Capture the authored default after attribute upgrades, before ordinary
    // property writes begin. `form.reset()` restores this value.
    this.#defaultChecked ??= this.checked;
  }

  get #isDisabled(): boolean {
    return this.disabled || this.#formDisabled;
  }

  #syncStates(): void {
    const states = this.#internals.states;
    if (this.checked) states.add("checked");
    else states.delete("checked");

    if (this.#isDisabled) states.add("disabled");
    else states.delete("disabled");
  }

  #syncForm(): void {
    const control = this.renderRoot.querySelector<HTMLInputElement>("input");
    const participates = this.checked && !this.#isDisabled && Boolean(this.name);

    this.#internals.setFormValue(
      participates ? this.value : null,
      this.checked ? "checked" : "unchecked",
    );

    if (this.required && !this.checked && !this.#isDisabled) {
      this.#internals.setValidity(
        { valueMissing: true },
        "Select this option to continue.",
        control ?? undefined,
      );
    } else {
      this.#internals.setValidity({});
    }

    this.#syncStates();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (
      changed.has("checked") ||
      changed.has("disabled") ||
      changed.has("name") ||
      changed.has("required") ||
      changed.has("value")
    ) {
      this.#syncForm();
    }
  }

  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.checked = this.#defaultChecked ?? false;
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    this.checked = state === "checked";
  }

  #onInput = (event: Event): void => {
    this.checked = (event.currentTarget as HTMLInputElement).checked;
  };

  #onChange = (): void => {
    this.dispatchEvent(
      new CustomEvent<{ checked: boolean }>(this.changeEventName, {
        bubbles: true,
        composed: true,
        detail: { checked: this.checked },
      }),
    );
  };

  /** Renders the native, intentionally unstyled checkable control. */
  protected renderCheckable(): TemplateResult {
    return html`
      <label part="root">
        <input
          part="control"
          type=${this.inputType}
          .checked=${this.checked}
          name=${this.name}
          value=${this.value}
          role=${this.controlRole ?? nothing}
          ?disabled=${this.#isDisabled}
          ?required=${this.required}
          @input=${this.#onInput}
          @change=${this.#onChange}
        />
        <span part="label"><slot></slot></span>
      </label>
    `;
  }
}
