import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A form-associated, keyboard- and paste-aware one-time-passcode field.
 *
 * `value` is the complete code submitted to the form. The visible cells are
 * intentionally a single control contract: typing advances, Backspace moves
 * toward the previous cell, and a pasted code fills consecutive cells. This
 * gives a native renderer enough behaviour to map to platform OTP widgets.
 *
 * @tag ui-otp-field
 * @summary Captures a fixed-length one-time passcode as one form value.
 *
 * @example Verification code
 * <ui-otp-field name="verification-code" length="6" label="Verification code"></ui-otp-field>
 *
 * @slot label - Authored group label; the `label` attribute is the compatibility fallback.
 *
 * @csspart root - The labelled OTP group.
 * @csspart cell - Each single-character native input.
 * @csspart separator - Visual separator between groups of cells.
 * @csspart label - The accessible visible group label.
 *
 * @cssstate complete - Matches `:state(complete)` when every cell has a character.
 * @cssstate masked - Matches `:state(masked)` while entered characters are obscured.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate invalid - Matches `:state(invalid)` while the owning field reports an error.
 *
 * @fires {CustomEvent<{ value: string, complete: boolean }>} ui-otp-field-input - Emitted whenever a cell changes or a code is pasted.
 * @fires {CustomEvent<{ value: string }>} ui-otp-field-complete - Emitted when a complete code is entered.
 *
 * @mashnode root root
 * @mashnode label label root
 * @mashnode cell cell root
 * @mashnode separator separator root
 * @mashnode group-size group-size root
 * @mashnode value value root
 * @mashnode length length root
 * @mashnode name name root
 * @mashnode disabled disabled root
 * @mashnode masked masked root
 * @mashnode complete complete root
 * @mashnode invalid invalid root
 * @mashnode input input root
 */
export class UIOtpField extends LitElement {
  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String, reflect: true },
    length: { type: Number, reflect: true },
    groupSize: { type: Number, attribute: "group-size", reflect: true },
    name: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    masked: { type: Boolean, reflect: true },
    _authoredLabel: { type: String, state: true },
  };

  /** Complete code assembled from the visible cells. */
  declare value: string;
  /** Required number of passcode characters. */
  declare length: number;
  /** Cells per visual group; zero keeps one uninterrupted group. */
  declare groupSize: number;
  /** Form key used for submission. */
  declare name: string;
  /** Accessible label for the code group. */
  declare label: string;
  /** Prevents entry and form participation. */
  declare disabled: boolean;
  /** Obscures entered characters without changing the submitted value. */
  declare masked: boolean;

  declare private _authoredLabel: string;

  readonly #internals: ElementInternals;
  #formDisabled = false;
  #defaultValue: string | undefined;
  #fieldDescription = "";
  #fieldInvalid = false;

  constructor() {
    super();
    this.value = "";
    this.length = 6;
    this.groupSize = 0;
    this.name = "";
    this.label = "Verification code";
    this.disabled = false;
    this.masked = false;
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

  get #normalizedLength(): number {
    return Math.min(Math.max(Math.floor(Number.isFinite(this.length) ? this.length : 6), 1), 12);
  }

  #normalizedValue(value = this.value): string {
    return [...value].slice(0, this.#normalizedLength).join("");
  }

  #cells(): HTMLInputElement[] {
    return [...this.renderRoot.querySelectorAll<HTMLInputElement>("input")];
  }

  #syncForm(): void {
    const value = this.#normalizedValue();
    this.#internals.setFormValue(!this.#isDisabled && this.name ? value : null);
    if (value.length === this.#normalizedLength) this.#internals.states.add("complete");
    else this.#internals.states.delete("complete");
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
      changed.has("length") ||
      changed.has("masked")
    ) {
      const normalized = this.#normalizedValue();
      if (normalized !== this.value) this.value = normalized;
      this.#syncForm();
    }
    if (changed.has("masked")) {
      if (this.masked) this.#internals.states.add("masked");
      else this.#internals.states.delete("masked");
    }
  }

  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }

  formResetCallback(): void {
    this.value = this.#defaultValue ?? "";
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === "string") this.value = state;
  }

  /** @internal Cooperative field context without introducing visual anatomy. */
  _setFieldContext(context: { description: string; invalid: boolean }): void {
    this.#fieldDescription = context.description;
    this.#fieldInvalid = context.invalid;
    if (context.invalid) this.#internals.states.add("invalid");
    else this.#internals.states.delete("invalid");
    this.requestUpdate();
  }

  #setCharacters(value: string, start = 0): void {
    const chars = [...this.#normalizedValue()];
    const incoming = [...value];
    for (
      let index = 0;
      index < incoming.length && start + index < this.#normalizedLength;
      index += 1
    ) {
      chars[start + index] = incoming[index]!;
    }
    this.value = chars.slice(0, this.#normalizedLength).join("");
  }

  #emitInput(): void {
    const complete = this.value.length === this.#normalizedLength;
    this.dispatchEvent(
      new CustomEvent<{ value: string; complete: boolean }>("ui-otp-field-input", {
        bubbles: true,
        composed: true,
        detail: { value: this.value, complete },
      }),
    );
    if (complete) {
      this.dispatchEvent(
        new CustomEvent<{ value: string }>("ui-otp-field-complete", {
          bubbles: true,
          composed: true,
          detail: { value: this.value },
        }),
      );
    }
  }

  #onInput = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    const index = Number(input.dataset.index);
    const characters = input.value.replace(/\s/g, "");
    if (characters.length > 1) this.#setCharacters(characters, index);
    else {
      const values = [...this.#normalizedValue().padEnd(this.#normalizedLength, " ")];
      values[index] = characters;
      this.value = values.join("").trimEnd();
    }
    this.#emitInput();
    const next =
      this.#cells()[Math.min(index + Math.max(characters.length, 1), this.#normalizedLength - 1)];
    if (characters) next?.focus();
  };

  #onKeydown = (event: KeyboardEvent): void => {
    const input = event.currentTarget as HTMLInputElement;
    const index = Number(input.dataset.index);
    if (event.key === "Backspace" && !input.value && index > 0) {
      event.preventDefault();
      const values = [...this.#normalizedValue().padEnd(this.#normalizedLength, " ")];
      values[index - 1] = " ";
      this.value = values.join("").trimEnd();
      this.#emitInput();
      this.#cells()[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      this.#cells()[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < this.#normalizedLength - 1) {
      event.preventDefault();
      this.#cells()[index + 1]?.focus();
    }
  };

  #onPaste = (event: ClipboardEvent): void => {
    const input = event.currentTarget as HTMLInputElement;
    const text = event.clipboardData?.getData("text")?.replace(/\s/g, "") ?? "";
    if (!text) return;
    event.preventDefault();
    this.#setCharacters(text, Number(input.dataset.index));
    this.#emitInput();
    this.#cells()[
      Math.min(Number(input.dataset.index) + text.length, this.#normalizedLength - 1)
    ]?.focus();
  };

  protected override render(): TemplateResult {
    const value = this.#normalizedValue();
    const label = this.#effectiveLabel;
    return html`
      <div
        part="root"
        role="group"
        aria-label=${label}
        aria-description=${this.#fieldDescription || nothing}
        aria-invalid=${this.#fieldInvalid ? "true" : nothing}
      >
        <span part="label" ?hidden=${!label}
          ><slot name="label" @slotchange=${this.#onLabelChange}>${this.label}</slot></span
        >
        ${Array.from(
          { length: this.#normalizedLength },
          (_, index) =>
            html`${this.groupSize > 0 && index > 0 && index % Math.max(1, Math.floor(this.groupSize)) === 0 ? html`<span part="separator" aria-hidden="true">–</span>` : nothing}<input
                part="cell"
                data-index=${index}
                type=${this.masked ? "password" : "text"}
                inputmode="numeric"
                autocomplete=${index === 0 ? "one-time-code" : "off"}
                maxlength="1"
                aria-label=${`${label}, character ${index + 1} of ${this.#normalizedLength}`}
                .value=${value[index] ?? ""}
                ?disabled=${this.#isDisabled}
                @input=${this.#onInput}
                @keydown=${this.#onKeydown}
                @paste=${this.#onPaste}
              />`,
        )}
      </div>
    `;
  }
}
