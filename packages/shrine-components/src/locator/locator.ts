import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * TODO: what this component is for, and when to reach for it.
 *
 * @tag sh-locator
 * @summary TODO: one line describing what it does.
 *
 * @slot - TODO: describe the default slot.
 * @csspart root - The outermost element.
 */
export class ShrineLocator extends LitElement {
  // Reactive properties go here, as a plain object — this system uses no
  // decorators. Declare the matching fields with `declare` and assign their
  // defaults in a constructor. Every attribute needs a JSDoc description, or
  // the manifest build fails.
  //
  // static override properties = {
  //   tone: { type: String, reflect: true },
  // };
  //
  // /** TODO: describe this attribute. */
  // declare tone: ShrineLocatorTone;

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<div part="root"><slot></slot></div>`;
  }
}
