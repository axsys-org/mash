import { UIDockPanel } from "./dock-panel.js";

if (!customElements.get("ui-dock-panel")) {
  customElements.define("ui-dock-panel", UIDockPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-dock-panel": UIDockPanel;
  }
}

export * from "./dock-panel.js";
