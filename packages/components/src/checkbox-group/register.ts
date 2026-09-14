import "../checkbox/register.js";
import { UICheckboxGroup } from "./checkbox-group.js";

if (!customElements.get("ui-checkbox-group")) {
  customElements.define("ui-checkbox-group", UICheckboxGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-checkbox-group": UICheckboxGroup;
  }
}

export { UICheckboxGroup };

export * from "./checkbox-group.js";
