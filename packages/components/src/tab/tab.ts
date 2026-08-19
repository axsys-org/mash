import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * One selectable tab inside `ui-tabs`.
 *
 * Give every tab a `value` that matches a `ui-tab-panel`. The tabs parent owns
 * which value is selected and wires panel identifiers; this element owns the
 * native focusable tab control and portable activation event.
 *
 * @tag ui-tab
 * @summary A selectable tab within a tablist.
 *
 * @slot - Visible tab label.
 *
 * @csspart control - The native button carrying the tab role.
 *
 * @cssstate selected - Matches `:state(selected)` while active.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ value: string }>} ui-tab-select - Emitted when the tab is activated.
 */
export class UITab extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String, reflect: true },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    controls: { type: String, reflect: true },
  };

  /** Stable value matched to a panel in the containing tabs. */
  declare value: string;
  /** Whether this tab is currently selected. */
  declare selected: boolean;
  /** Prevents selection. */
  declare disabled: boolean;
  /** Identifier of the panel this tab controls. */
  declare controls: string;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.value = "";
    this.selected = false;
    this.disabled = false;
    this.controls = "";
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
      new CustomEvent<{ value: string }>("ui-tab-select", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  };

  protected override render(): TemplateResult {
    return html`
      <button
        part="control"
        type="button"
        role="tab"
        aria-selected=${this.selected ? "true" : "false"}
        aria-controls=${this.controls || undefined}
        tabindex=${this.selected ? "0" : "-1"}
        ?disabled=${this.disabled}
        @click=${this.#select}
      >
        <slot></slot>
      </button>
    `;
  }
}
