import "../toggle/register.js";
import { UIToggleGroup } from "./toggle-group.js";

if (!customElements.get("ui-toggle-group")) {
  customElements.define("ui-toggle-group", UIToggleGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-toggle-group": UIToggleGroup;
  }
}

export { UIToggleGroup };

export * from "./toggle-group.js";
