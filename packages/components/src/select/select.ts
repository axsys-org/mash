import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import type { UIOption } from "../option/option.js";

let selectListId = 0;

/**
 * A form-associated button/listbox select with slotted `ui-option` values.
 *
 * The control preserves native form participation while exposing a complete
 * portable listbox anatomy. The option slot is intentional: callers retain
 * rich labels and disabled options without leaking array rendering policy into
 * the component API.
 *
 * @tag ui-select
 * @summary Selects one slotted option and submits its value with a form.
 *
 * @example Project visibility
 * <ui-select name="visibility" value="team" label="Visibility">
 *   <ui-option value="private">Private</ui-option>
 *   <ui-option value="team">Team</ui-option>
 * </ui-select>
 *
 * @slot - `ui-option` elements.
 *
 * @csspart trigger - The native listbox trigger button.
 * @csspart listbox - The semantic option list.
 *
 * @cssstate open - Matches `:state(open)` while choices are visible.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ value: string }>} ui-select-change - Emitted after the selected option changes.
 * @fires {CustomEvent<{ open: boolean }>} ui-select-open-change - Emitted after user interaction changes list visibility.
 */
export class UISelect extends LitElement {
  static formAssociated = true;
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
  static override properties = {
    value: { type: String, reflect: true },
    name: { type: String, reflect: true },
    label: { type: String, reflect: true },
    placeholder: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Value of the selected option. */
  declare value: string;
  /** Form key used for submission. */
  declare name: string;
  /** Accessible name for the select trigger. */
  declare label: string;
  /** Text shown before an option is selected. */
  declare placeholder: string;
  /** Whether the option list is visible. */
  declare open: boolean;
  /** Prevents selection and form participation. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;
  readonly #listboxId = `ui-select-listbox-${++selectListId}`;
  #formDisabled = false;

  constructor() {
    super();
    this.value = "";
    this.name = "";
    this.label = "Select an option";
    this.placeholder = "Select…";
    this.open = false;
    this.disabled = false;
    this.#internals = this.attachInternals();
    this.addEventListener("ui-option-select", this.#onOptionSelect);
  }

  static override styles = baseStyles;

  get #isDisabled(): boolean {
    return this.disabled || this.#formDisabled;
  }
  #options(): UIOption[] {
    return [...this.querySelectorAll<UIOption>(":scope > ui-option")];
  }

  #sync(): void {
    for (const option of this.#options()) option.selected = option.value === this.value;
    this.#internals.setFormValue(!this.#isDisabled && this.name ? this.value : null);
    if (this.open) this.#internals.states.add("open");
    else this.#internals.states.delete("open");
    if (this.#isDisabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (
      changed.has("value") ||
      changed.has("name") ||
      changed.has("open") ||
      changed.has("disabled")
    )
      this.#sync();
  }

  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }
  formResetCallback(): void {
    this.value = this.getAttribute("value") ?? "";
  }

  #setOpen(open: boolean): void {
    if (this.#isDisabled || this.open === open) return;
    this.open = open;
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>("ui-select-open-change", {
        bubbles: true,
        composed: true,
        detail: { open },
      }),
    );
  }

  #onOptionSelect = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.localName !== "ui-option") return;
    const option = target as UIOption;
    this.value = option.value;
    this.#setOpen(false);
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-select-change", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.#setOpen(false);
      return;
    }
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      this.#setOpen(!this.open || event.key !== "Enter");
      if (this.open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        const options = this.#options().filter((option) => !option.disabled);
        const index = Math.max(
          0,
          options.findIndex((option) => option.value === this.value),
        );
        options[
          (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length
        ]?.focus();
      }
    }
  };

  #onSlotChange = (): void => this.#sync();

  protected override render(): TemplateResult {
    const selected = this.#options().find((option) => option.value === this.value);
    return html`
      <button
        part="trigger"
        type="button"
        role="combobox"
        aria-label=${this.label}
        aria-controls=${this.#listboxId}
        aria-expanded=${this.open ? "true" : "false"}
        ?disabled=${this.#isDisabled}
        @click=${() => this.#setOpen(!this.open)}
        @keydown=${this.#onKeydown}
      >
        ${selected?.textContent?.trim() || this.placeholder}
      </button>
      <div
        part="listbox"
        id=${this.#listboxId}
        role="listbox"
        aria-label=${this.label}
        ?hidden=${!this.open}
      >
        <slot @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}
