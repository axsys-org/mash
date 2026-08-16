import { UITreeItem } from "./tree-item.js";

// If this component composes elements from another package, import their
// register modules here too, so that importing this one is sufficient:
//
//   import "@mash/ui/button/register";

if (!customElements.get("ui-tree-item")) {
  customElements.define("ui-tree-item", UITreeItem);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-tree-item": UITreeItem;
  }
}

export { UITreeItem };
