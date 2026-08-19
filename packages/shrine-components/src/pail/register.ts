import { ShrinePail } from "./pail.js";

if (!customElements.get("sh-pail")) {
  customElements.define("sh-pail", ShrinePail);
}

declare global {
  interface HTMLElementTagNameMap {
    "sh-pail": ShrinePail;
  }
}

export { ShrinePail };
