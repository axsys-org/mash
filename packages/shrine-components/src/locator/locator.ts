import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A stable location region for Shrine workspace chrome.
 *
 * Use it when a composition needs to expose the current semantic location
 * without choosing whether that location is rendered as a path, breadcrumb,
 * record title, or another renderer-native locator.
 *
 * @tag sh-locator
 * @summary Projects the current Shrine location through a portable locator node.
 *
 * @example Namespace location
 * <sh-locator><ui-path path="/interzone/projects/billing-migration"></ui-path></sh-locator>
 *
 * @slot - The current semantic location.
 * @csspart root - The outermost element.
 *
 * @mashrole slot default locator locator
 * @mashrole part root locator locator
 * @mashnode locator locator
 */
export class ShrineLocator extends LitElement {
  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<div part="root"><slot></slot></div>`;
  }
}
