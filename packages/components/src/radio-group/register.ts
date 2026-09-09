import "../radio/register.js";
import { UIRadioGroup } from "./radio-group.js";

if (!customElements.get("ui-radio-group")) {
  customElements.define("ui-radio-group", UIRadioGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-radio-group": UIRadioGroup;
  }
}

export { UIRadioGroup };

export * from "./radio-group.js";
