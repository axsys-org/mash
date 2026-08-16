import { LitElement, css, html, type TemplateResult } from "lit";

/**
 * TODO: what this component is for, and when to reach for it.
 *
 * @tag ui-tree-item
 * @summary TODO: one line describing what it does.
 *
 * @slot - TODO: describe the default slot.
 * @csspart root - The outermost element.
 */
export class UITreeItem extends LitElement {
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
  // declare tone: UITreeItemTone;

  static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
    }

    :host([hidden]) {
      display: none !important;
    }

    /* Style from the semantic tokens (--color-*, --space-*, --radius-*).
       Never reference --ref-* primitives, and keep anything you compute in a
       private --_* variable rather than exposing it. */
  `;

  protected override render(): TemplateResult {
    return html`<div part="root"><slot></slot></div>`;
  }
}
