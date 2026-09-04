import { UICollapsible } from "./collapsible.js";
import "../reveal/register.js";

if (!customElements.get("ui-collapsible")) {
  customElements.define("ui-collapsible", UICollapsible);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-collapsible": UICollapsible;
  }
}

export { UICollapsible };
