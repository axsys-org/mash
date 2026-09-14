import { installCarbonIcons } from "./carbon.js";
import { UIIcon } from "./icon.js";

installCarbonIcons();

if (!customElements.get("ui-icon")) {
  customElements.define("ui-icon", UIIcon);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-icon": UIIcon;
  }
}

export { UIIcon };

export * from "./icon.js";

export * from "./carbon.js";
