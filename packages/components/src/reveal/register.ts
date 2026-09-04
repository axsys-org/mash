import { UIReveal } from "./reveal.js";

if (!customElements.get("ui-reveal")) {
  customElements.define("ui-reveal", UIReveal);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-reveal": UIReveal;
  }
}

export { UIReveal };
