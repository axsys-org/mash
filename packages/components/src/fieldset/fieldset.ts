import { LitElement, html, type TemplateResult } from "lit";

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

  constructor() {
    super();
    this.legend = "";
    this.disabled = false;
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<fieldset part="root" ?disabled=${this.disabled}>
      ${this.legend ? html`<legend part="legend">${this.legend}</legend>` : null}<slot></slot>
    </fieldset>`;
  }
}
