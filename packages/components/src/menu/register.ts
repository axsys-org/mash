import "../menu-label/register.js";
import "../menu-item/register.js";
import "../scroll-area/register.js";
import { UIMenu } from "./menu.js";

if (!customElements.get("ui-menu")) customElements.define("ui-menu", UIMenu);

declare global {
  interface HTMLElementTagNameMap {
    "ui-menu": UIMenu;
  }
}

export { UIMenu };

export * from "./menu.js";
