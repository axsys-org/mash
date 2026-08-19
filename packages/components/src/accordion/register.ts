import { UIAccordion } from "./accordion.js";

if (!customElements.get("ui-accordion")) {
  customElements.define("ui-accordion", UIAccordion);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-accordion": UIAccordion;
  }
}

export { UIAccordion };
