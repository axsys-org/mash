// Documented, tree-specific WA entrypoints also register their own dependencies.
import "@awesome.me/webawesome/dist/components/tree/tree.js";
import "@awesome.me/webawesome/dist/components/tree-item/tree-item.js";
import { GooTree } from "./goo-tree.js";

if (!customElements.get("goo-tree")) customElements.define("goo-tree", GooTree);

declare global {
  interface HTMLElementTagNameMap {
    "goo-tree": GooTree;
  }
}

export { GooTree };
export type {
  GooTreeSelection,
  GooTreeToggleDetail,
  GooTreeSelectDetail,
  GooTreeLazyLoadDetail,
} from "./goo-tree.js";
