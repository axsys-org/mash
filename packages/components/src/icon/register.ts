import { installLucideIcons } from "./lucide.js";
import { UIIcon } from "./icon.js";

installLucideIcons();

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

export * from "./lucide.js";
