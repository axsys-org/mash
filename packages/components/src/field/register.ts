import { UIField } from "./field.js";

if (!customElements.get("ui-field")) {
  customElements.define("ui-field", UIField);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-field": UIField;
  }
}

export { UIField };

export * from "./field.js";
