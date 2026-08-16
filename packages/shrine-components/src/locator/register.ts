import { ShrineLocator } from "./locator.js";

// If this component composes elements from another package, import their
// register modules here too, so that importing this one is sufficient:
//
//   import "@mash/ui/button/register";

if (!customElements.get("sh-locator")) {
  customElements.define("sh-locator", ShrineLocator);
}

declare global {
  interface HTMLElementTagNameMap {
    "sh-locator": ShrineLocator;
  }
}

export { ShrineLocator };
