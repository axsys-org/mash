import { UITabPanel } from "./tab-panel.js";

if (!customElements.get("ui-tab-panel")) {
  customElements.define("ui-tab-panel", UITabPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-tab-panel": UITabPanel;
  }
}

export { UITabPanel };

export * from "./tab-panel.js";
