import { UITab } from "./tab.js";

if (!customElements.get("ui-tab")) {
  customElements.define("ui-tab", UITab);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-tab": UITab;
  }
}

export { UITab };

export * from "./tab.js";
