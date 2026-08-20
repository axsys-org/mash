import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

let optionId = 0;

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
 * @slot indicator - Optional selected-state indicator.
 *
 * @csspart control - The realized option surface.
 * @csspart label - The authored option label.
 * @csspart text - Alias for the authored option label.
 * @csspart indicator - The optional selected-state indicator.
 *
 * @cssstate selected - Matches `:state(selected)` while selected.
 * @cssstate active - Matches `:state(active)` while keyboard navigation targets this option.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ value: string }>} ui-option-select - Emitted when the option is activated.
 *
 * @mashnode item option
 * @mashnode label label item
 * @mashnode indicator indicator item
 * @mashrole part control option item
 * @mashrole slot default label label
 * @mashrole part text label label
 */
export class UIOption extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    selected: { type: Boolean, reflect: true },
    active: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Stable value selected by the owning choice control. */
  declare value: string;
  /** Whether the option is currently selected. */
  declare selected: boolean;
  /** Whether keyboard navigation currently targets this option. */
  declare active: boolean;
  /** Prevents option selection. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.value = "";
    this.selected = false;
    this.active = false;
    this.disabled = false;
    this.#internals = this.attachInternals();
    this.addEventListener("click", this.#select);
  }

  static override styles = baseStyles;

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("selected") && !changed.has("active") && !changed.has("disabled")) return;
    if (this.selected) this.#internals.states.add("selected");
    else this.#internals.states.delete("selected");
    if (this.active) this.#internals.states.add("active");
    else this.#internals.states.delete("active");
    if (this.disabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
    this.tabIndex = this.active && !this.disabled ? 0 : -1;
    this.#internals.ariaSelected = this.selected ? "true" : "false";
    this.#internals.ariaDisabled = this.disabled ? "true" : "false";
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("role", this.closest("ui-option-row") ? "gridcell" : "option");
    if (!this.id) this.id = `ui-option-${++optionId}`;
    if (!this.hasAttribute("tabindex")) this.tabIndex = -1;
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
    return html`<span part="control">
      <slot part="label text"></slot>
      <slot name="indicator" part="indicator" ?hidden=${!this.selected}></slot>
    </span>`;
  }
}
