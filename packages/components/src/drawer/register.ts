import { UIDrawer } from "./drawer.js";

if (!customElements.get("ui-drawer")) customElements.define("ui-drawer", UIDrawer);

declare global {
  interface HTMLElementTagNameMap {
    "ui-drawer": UIDrawer;
  }
}

export { UIDrawer };
