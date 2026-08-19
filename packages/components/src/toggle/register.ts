import { UIToggle } from "./toggle.js";

if (!customElements.get("ui-toggle")) {
  customElements.define("ui-toggle", UIToggle);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-toggle": UIToggle;
  }
}

export { UIToggle };
