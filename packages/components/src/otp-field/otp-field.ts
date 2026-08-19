import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

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
 * @csspart root - The labelled OTP group.
 * @csspart cell - Each single-character native input.
 * @csspart label - The accessible visible group label.
 *
 * @cssstate complete - Matches `:state(complete)` when every cell has a character.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ value: string, complete: boolean }>} ui-otp-field-input - Emitted whenever a cell changes or a code is pasted.
 * @fires {CustomEvent<{ value: string }>} ui-otp-field-complete - Emitted when a complete code is entered.
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
    name: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Complete code assembled from the visible cells. */
  declare value: string;
  /** Required number of passcode characters. */
  declare length: number;
  /** Form key used for submission. */
  declare name: string;
  /** Accessible label for the code group. */
  declare label: string;
  /** Prevents entry and form participation. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;
  #formDisabled = false;
  #defaultValue: string | undefined;

  constructor() {
    super();
    this.value = "";
    this.length = 6;
    this.name = "";
    this.label = "Verification code";
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  get #isDisabled(): boolean {
    return this.disabled || this.#formDisabled;
  }

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
      changed.has("length")
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
    this.value = this.#defaultValue ?? "";
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === "string") this.value = state;
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
    return html`
      <div part="root" role="group" aria-label=${this.label}>
        <span part="label" ?hidden=${!this.label}>${this.label}</span>
        ${Array.from(
          { length: this.#normalizedLength },
          (_, index) =>
            html`<input
              part="cell"
              data-index=${index}
              type="text"
              inputmode="numeric"
              autocomplete=${index === 0 ? "one-time-code" : "off"}
              maxlength="1"
              aria-label=${`${this.label}, character ${index + 1} of ${this.#normalizedLength}`}
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
