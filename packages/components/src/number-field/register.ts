import { UINumberField } from "./number-field.js";

if (!customElements.get("ui-number-field")) {
  customElements.define("ui-number-field", UINumberField);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-number-field": UINumberField;
  }
}

export { UINumberField };
