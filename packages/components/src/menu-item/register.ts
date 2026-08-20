import { UIMenuItem } from "./menu-item.js";

if (!customElements.get("ui-menu-item")) customElements.define("ui-menu-item", UIMenuItem);

declare global {
  interface HTMLElementTagNameMap {
    "ui-menu-item": UIMenuItem;
  }
}

export { UIMenuItem };
