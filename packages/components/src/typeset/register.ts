import { UITypeset } from "./typeset.js";

// If this component composes elements from another package, import their
// register modules here too, so that importing this one is sufficient:
//
//   import "@mash/ui/button/register";

if (!customElements.get("ui-typeset")) {
  customElements.define("ui-typeset", UITypeset);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-typeset": UITypeset;
  }
}

export { UITypeset };
