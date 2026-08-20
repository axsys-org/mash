import { UIRadio } from "./radio.js";

if (!customElements.get("ui-radio")) {
  customElements.define("ui-radio", UIRadio);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-radio": UIRadio;
  }
}

export { UIRadio };
