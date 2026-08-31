import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A Shrine-owned locator lane for a namespace path or another authored
 * navigation realization.
 *
 * The locator deliberately owns no path syntax or navigation behavior. It
 * gives Shrine compositions one stable semantic boundary while `ui-path`, a
 * breadcrumb, or a product-specific locator remains replaceable authored
 * content.
 *
 * @tag sh-locator
 * @summary Hosts the replaceable locator for a Shrine composition.
 *
 * @example Namespace path
 * <sh-locator><ui-path path="/interzone/projects/billing-migration"></ui-path></sh-locator>
 *
 * @slot - A path, breadcrumb, or other authored locator.
 * @csspart root - The semantic locator boundary.
 * @csspart content - The authored locator binding.
 * @mashnode root locator
 * @mashnode content content root
 * @mashrole part root locator root
 * @mashrole slot default content content
 * @mashrole part content content content
 */
export class ShrineLocator extends LitElement {
  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<div part="root"><slot part="content"></slot></div>`;
  }
}
