import { GooTidyTree, GooTreeNode } from "./goo-tidy-tree.js";

if (!customElements.get("goo-tree-node")) customElements.define("goo-tree-node", GooTreeNode);
if (!customElements.get("goo-tidy-tree")) customElements.define("goo-tidy-tree", GooTidyTree);

declare global {
  interface HTMLElementTagNameMap {
    "goo-tidy-tree": GooTidyTree;
    "goo-tree-node": GooTreeNode;
  }
}

export { GooTidyTree, GooTreeNode };
export type { TreeDirection } from "./geometry.js";
