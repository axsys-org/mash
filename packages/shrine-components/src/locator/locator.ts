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
 * @slot context - Optional context label above the locator.
 * @slot actions - Authored contextual controls beside the locator.
 * @csspart root - The semantic locator boundary.
 * @csspart content - The authored locator binding.
 * @csspart context - The optional context label.
 * @csspart actions - The optional contextual actions.
 * @mashnode root locator
 * @mashnode content content root
 * @mashnode context context root
 * @mashnode actions actions root
 * @mashrole slot context context context
 * @mashrole slot actions actions actions
 * @mashrole part context context context
 * @mashrole part actions actions actions
 * @mashrole part root locator root
 * @mashrole slot default content content
 * @mashrole part content content content
 */
export class ShrineLocator extends LitElement {
  static override properties = { _filledSlots: { state: true } };
  declare private _filledSlots: ReadonlySet<string>;

  constructor() {
    super();
    this._filledSlots = new Set();
  }

  static override styles = baseStyles;

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const next = new Set(this._filledSlots);
    if (slot.assignedNodes({ flatten: true }).length) next.add(slot.name);
    else next.delete(slot.name);
    this._filledSlots = next;
  };

  protected override render(): TemplateResult {
    return html`<div part="root">
      <div part="context" ?hidden=${!this._filledSlots.has("context")}>
        <slot name="context" @slotchange=${this.#onSlotChange}></slot>
      </div>
      <slot part="content"></slot>
      <div part="actions" ?hidden=${!this._filledSlots.has("actions")}>
        <slot name="actions" @slotchange=${this.#onSlotChange}></slot>
      </div>
    </div>`;
  }
}
