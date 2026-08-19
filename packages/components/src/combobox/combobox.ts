import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import type { UIOption } from "../option/option.js";

let comboboxListId = 0;

/**
 * A form-associated editable listbox with filterable slotted options.
 *
 * The component leaves option sourcing to the caller—static slots, rendered
 * search results, or an async wrapper all work—while it owns editable input,
 * listbox relationships, keyboard opening, selection, and form state.
 *
 * @tag ui-combobox
 * @summary Edits or selects one value from filterable slotted options.
 *
 * @example Assign owner
 * <ui-combobox name="owner" label="Owner">
 *   <ui-option value="maya">Maya</ui-option>
 *   <ui-option value="sam">Sam</ui-option>
 * </ui-combobox>
 *
 * @slot - `ui-option` suggestions.
 *
 * @csspart control - The native editable combobox input.
 * @csspart listbox - The semantic listbox of suggestions.
 *
 * @cssstate open - Matches `:state(open)` while suggestions are visible.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ value: string }>} ui-combobox-input - Emitted as the editable text changes.
 * @fires {CustomEvent<{ value: string }>} ui-combobox-change - Emitted after an option is selected.
 * @fires {CustomEvent<{ open: boolean }>} ui-combobox-open-change - Emitted after user interaction changes suggestion visibility.
 */
export class UICombobox extends LitElement {
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

  /** Current editable or selected value. */
  declare value: string;
  /** Form key used for submission. */
  declare name: string;
  /** Accessible name for the editable input. */
  declare label: string;
  /** Hint shown while the input is empty. */
  declare placeholder: string;
  /** Whether suggestions are visible. */
  declare open: boolean;
  /** Prevents editing and form participation. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;
  readonly #listboxId = `ui-combobox-listbox-${++comboboxListId}`;
  #formDisabled = false;
  #defaultValue: string | undefined;

  constructor() {
    super();
    this.value = "";
    this.name = "";
    this.label = "Search options";
    this.placeholder = "";
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

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultValue ??= this.value;
  }

  #sync(): void {
    const needle = this.value.trim().toLocaleLowerCase();
    for (const option of this.#options())
      option.hidden =
        Boolean(needle) && !option.textContent!.trim().toLocaleLowerCase().includes(needle);
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
    this.value = this.#defaultValue ?? "";
    this.open = false;
  }
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === "string") this.value = state;
  }

  #setOpen(open: boolean): void {
    if (this.#isDisabled || this.open === open) return;
    this.open = open;
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>("ui-combobox-open-change", {
        bubbles: true,
        composed: true,
        detail: { open },
      }),
    );
  }

  #onInput = (event: Event): void => {
    this.value = (event.currentTarget as HTMLInputElement).value;
    this.#setOpen(true);
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-combobox-input", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  };

  #onOptionSelect = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.localName !== "ui-option") return;
    const option = target as UIOption;
    this.value = option.value || option.textContent?.trim() || "";
    this.#setOpen(false);
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-combobox-change", {
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
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.#setOpen(true);
      this.#options()
        .find((option) => !option.disabled && !option.hidden)
        ?.focus();
    }
  };

  protected override render(): TemplateResult {
    return html`
      <input
        part="control"
        type="text"
        role="combobox"
        .value=${this.value}
        placeholder=${this.placeholder}
        aria-label=${this.label}
        aria-controls=${this.#listboxId}
        aria-expanded=${this.open ? "true" : "false"}
        ?disabled=${this.#isDisabled}
        @input=${this.#onInput}
        @keydown=${this.#onKeydown}
      />
      <div
        part="listbox"
        id=${this.#listboxId}
        role="listbox"
        aria-label=${this.label}
        ?hidden=${!this.open}
      >
        <slot @slotchange=${() => this.#sync()}></slot>
      </div>
    `;
  }
}
