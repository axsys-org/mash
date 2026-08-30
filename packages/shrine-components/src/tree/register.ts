import "@mash/ui/tree/register";
import "@mash/ui/tree-item/register";

import { ShrineTree } from "./tree.js";

if (!customElements.get("sh-tree")) {
  customElements.define("sh-tree", ShrineTree);
}

declare global {
  interface HTMLElementTagNameMap {
    "sh-tree": ShrineTree;
  }
}

export { ShrineTree };
