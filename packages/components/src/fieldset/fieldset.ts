import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A native fieldset boundary for a related group of controls.
 *
 * Use this when a shared legend is semantically meaningful. It should not
 * become a generic layout wrapper: arbitrary grouping belongs to a card or
 * stack, while controls sharing a question belong here.
 *
 * @tag ui-fieldset
 * @summary Semantically groups related form controls under a legend.
 *
 * @example Notification settings
 * <ui-fieldset legend="Notifications">
 *   <ui-checkbox name="email">Email updates</ui-checkbox>
 * </ui-fieldset>
 *
 * @slot - Related form controls.
 *
 * @csspart root - The native fieldset element.
 * @csspart legend - The native fieldset legend.
 * @csspart children - The authored form-control collection.
 * @cssstate disabled - Matches `:state(disabled)` while the control group is disabled.
 *
 * @mashnode root root
 * @mashnode legend legend root
 * @mashnode children children root
 * @mashnode disabled disabled root
 * @mashrole slot default children children
 */
export class UIFieldset extends LitElement {
  static override properties = {
    legend: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Visible group name. */
  declare legend: string;
  /** Disables native and form-associated controls in the group. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.legend = "";
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("disabled")) return;
    if (this.disabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
  }

  protected override render(): TemplateResult {
    return html`<fieldset part="root" ?disabled=${this.disabled}>
      ${this.legend ? html`<legend part="legend">${this.legend}</legend>` : null}<slot
        part="children"
      ></slot>
    </fieldset>`;
  }
}
