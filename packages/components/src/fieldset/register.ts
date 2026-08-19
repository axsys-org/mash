import { UIFieldset } from "./fieldset.js";

if (!customElements.get("ui-fieldset")) {
  customElements.define("ui-fieldset", UIFieldset);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-fieldset": UIFieldset;
  }
}

export { UIFieldset };
