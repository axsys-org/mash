import { UITree } from "./tree.js";

// If this component composes elements from another package, import their
// register modules here too, so that importing this one is sufficient:
//
//   import "@mash/ui/button/register";

if (!customElements.get("ui-tree")) {
  customElements.define("ui-tree", UITree);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-tree": UITree;
  }
}

export { UITree };
