import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import type { UIAccordionItem } from "../accordion-item/accordion-item.js";

/** Open-state policy for an accordion. */
export type AccordionMode = "single" | "multiple";

/**
 * Coordinates related `ui-accordion-item` disclosures.
 *
 * Single mode (the default) leaves at most one item open; multiple mode lets
 * each item remain independently expanded. The parent owns that policy while
 * the item remains an accessible disclosure primitive in any renderer.
 *
 * @tag ui-accordion
 * @summary Coordinates a set of labelled disclosure items.
 *
 * @example Account settings
 * <ui-accordion mode="single">
 *   <ui-accordion-item value="profile" title="Profile" open>Profile details</ui-accordion-item>
 *   <ui-accordion-item value="security" title="Security">Security details</ui-accordion-item>
 * </ui-accordion>
 *
 * @slot - `ui-accordion-item` elements.
 *
 * @csspart root - The accordion container.
 * @csspart children - The authored accordion-item collection.
 * @cssstate disabled - Matches `:state(disabled)` while disclosure changes are unavailable.
 *
 * @fires {CustomEvent<{ values: string[] }>} ui-accordion-change - Emitted after the open item set changes.
 *
 * @mashnode root root
 * @mashnode children children root
 * @mashnode disabled disabled root
 * @mashrole slot default children children
 */
export class UIAccordion extends LitElement {
  static override properties = {
    mode: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Whether one or many items can remain open. */
  declare mode: AccordionMode;
  /** Prevents disclosure changes throughout the accordion. */
  declare disabled: boolean;

  readonly #childDisabled = new WeakMap<UIAccordionItem, boolean>();
  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.mode = "single";
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  #items(): UIAccordionItem[] {
    return [...this.querySelectorAll<UIAccordionItem>(":scope > ui-accordion-item")];
  }

  #syncItems(): void {
    const items = this.#items();
    let hasOpen = false;
    for (const item of items) {
      const original = this.#childDisabled.get(item);
      if (original === undefined) this.#childDisabled.set(item, item.disabled);
      item.disabled = this.disabled || (original ?? false);
      if (this.mode === "single" && item.open) {
        if (hasOpen) item.open = false;
        hasOpen = true;
      }
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("mode") || changed.has("disabled")) this.#syncItems();
    if (changed.has("disabled")) {
      if (this.disabled) this.#internals.states.add("disabled");
      else this.#internals.states.delete("disabled");
    }
  }

  #onSlotChange = (): void => this.#syncItems();

  #onItemChange = (event: Event): void => {
    const item = event.target;
    if (!(item instanceof HTMLElement) || item.localName !== "ui-accordion-item" || this.disabled)
      return;
    const option = item as UIAccordionItem;
    if (this.mode === "single" && option.open) {
      for (const sibling of this.#items()) if (sibling !== option) sibling.open = false;
    }
    this.dispatchEvent(
      new CustomEvent<{ values: string[] }>("ui-accordion-change", {
        bubbles: true,
        composed: true,
        detail: {
          values: this.#items()
            .filter((candidate) => candidate.open)
            .map((candidate) => candidate.value),
        },
      }),
    );
  };

  protected override render(): TemplateResult {
    return html`<div part="root" @ui-accordion-item-change=${this.#onItemChange}>
      <slot part="children" @slotchange=${this.#onSlotChange}></slot>
    </div>`;
  }
}
