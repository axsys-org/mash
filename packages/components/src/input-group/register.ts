import { UIInputGroup } from "./input-group.js";

if (!customElements.get("ui-input-group")) {
  customElements.define("ui-input-group", UIInputGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-input-group": UIInputGroup;
  }
}

export { UIInputGroup };
