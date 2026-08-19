import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A selectable listbox option shared by Mash choice controls.
 *
 * It is intentionally a concrete semantic item rather than an untyped slot:
 * select, combobox, and autocomplete can preserve `value`, disabled state,
 * active selection, and a single selection event across renderers.
 *
 * @tag ui-option
 * @summary A selectable option in a Mash listbox choice control.
 *
 * @example Team option
 * <ui-option value="team">Team</ui-option>
 *
 * @slot - Visible option label.
 *
 * @csspart control - The native option button.
 *
 * @cssstate selected - Matches `:state(selected)` while active.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ value: string }>} ui-option-select - Emitted when the option is activated.
 */
export class UIOption extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
  static override properties = {
    value: { type: String, reflect: true },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Stable value selected by the owning choice control. */
  declare value: string;
  /** Whether the option is currently selected. */
  declare selected: boolean;
  /** Prevents option selection. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.value = "";
    this.selected = false;
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("selected") && !changed.has("disabled")) return;
    if (this.selected) this.#internals.states.add("selected");
    else this.#internals.states.delete("selected");
    if (this.disabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
  }

  #select = (): void => {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-option-select", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  };

  protected override render(): TemplateResult {
    return html`<button
      part="control"
      type="button"
      role="option"
      aria-selected=${this.selected ? "true" : "false"}
      ?disabled=${this.disabled}
      @click=${this.#select}
    >
      <slot></slot>
    </button>`;
  }
}
