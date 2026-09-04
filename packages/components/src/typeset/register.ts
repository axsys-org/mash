import { UITypeset } from "./typeset.js";

if (!customElements.get("ui-typeset")) {
  customElements.define("ui-typeset", UITypeset);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-typeset": UITypeset;
  }
}

export { UITypeset };
