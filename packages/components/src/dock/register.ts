import "../dock-panel/register.js";
import { UIDock } from "./dock.js";

if (!customElements.get("ui-dock")) {
  customElements.define("ui-dock", UIDock);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-dock": UIDock;
  }
}

export * from "./dock.js";
