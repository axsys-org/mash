import { LitElement, css, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A semantic row of options inside a grid combobox.
 *
 * The row declares two-dimensional collection structure only. Its columns,
 * gaps, dimensions, and alignment remain catalogue recipe decisions.
 *
 * @tag ui-option-row
 * @summary Groups options into one navigable grid row.
 *
 * @example People row
 * <ui-option-row>
 *   <ui-option value="maya">Maya</ui-option>
 *   <ui-option value="sam">Sam</ui-option>
 * </ui-option-row>
 *
 * @slot - The `ui-option` cells in this row.
 *
 * @csspart row - The semantic grid row realization.
 * @csspart children - The authored option-cell collection.
 *
 * @mashnode row row
 * @mashnode children children row
 * @mashrole slot default children children
 */
export class UIOptionRow extends LitElement {
  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) this.setAttribute("role", "row");
  }

  static override styles = [
    baseStyles,
    css`
      [part~="row"],
      [part~="children"] {
        display: contents;
      }
    `,
  ];

  protected override render(): TemplateResult {
    return html`<span part="row"><slot part="children"></slot></span>`;
  }
}
