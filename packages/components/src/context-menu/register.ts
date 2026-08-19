import { UIContextMenu } from "./context-menu.js";

if (!customElements.get("ui-context-menu")) customElements.define("ui-context-menu", UIContextMenu);

declare global {
  interface HTMLElementTagNameMap {
    "ui-context-menu": UIContextMenu;
  }
}

export { UIContextMenu };
