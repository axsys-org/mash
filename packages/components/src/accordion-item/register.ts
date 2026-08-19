import { UIAccordionItem } from "./accordion-item.js";

if (!customElements.get("ui-accordion-item")) {
  customElements.define("ui-accordion-item", UIAccordionItem);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-accordion-item": UIAccordionItem;
  }
}

export { UIAccordionItem };
