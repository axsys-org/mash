import "../menu/register.js";
import "../menu-label/register.js";
import "../menu-item/register.js";
import { UIContextMenu } from "./context-menu.js";

if (!customElements.get("ui-context-menu")) customElements.define("ui-context-menu", UIContextMenu);

declare global {
  interface HTMLElementTagNameMap {
    "ui-context-menu": UIContextMenu;
  }
}

export { UIContextMenu };

export * from "./context-menu.js";
