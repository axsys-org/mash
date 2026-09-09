import { UINavigationMenu } from "./navigation-menu.js";

if (!customElements.get("ui-navigation-menu"))
  customElements.define("ui-navigation-menu", UINavigationMenu);

declare global {
  interface HTMLElementTagNameMap {
    "ui-navigation-menu": UINavigationMenu;
  }
}

export { UINavigationMenu };

export * from "./navigation-menu.js";
