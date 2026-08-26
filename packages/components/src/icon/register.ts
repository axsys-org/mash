import { UIIcon } from "./icon.js";

if (!customElements.get("ui-icon")) {
  customElements.define("ui-icon", UIIcon);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-icon": UIIcon;
  }
}

export { UIIcon };
