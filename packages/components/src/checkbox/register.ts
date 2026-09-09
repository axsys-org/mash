import { UICheckbox } from "./checkbox.js";

if (!customElements.get("ui-checkbox")) {
  customElements.define("ui-checkbox", UICheckbox);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-checkbox": UICheckbox;
  }
}

export { UICheckbox };

export * from "./checkbox.js";
