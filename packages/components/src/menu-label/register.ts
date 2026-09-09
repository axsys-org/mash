import { UIMenuLabel } from "./menu-label.js";

// If this component composes elements from another package, import their
// register modules here too, so that importing this one is sufficient:
//
//   import "@mash/ui/button/register";

if (!customElements.get("ui-menu-label")) {
  customElements.define("ui-menu-label", UIMenuLabel);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-menu-label": UIMenuLabel;
  }
}

export { UIMenuLabel };

export * from "./menu-label.js";
