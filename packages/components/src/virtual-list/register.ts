import { UIVirtualItem, UIVirtualList } from "./virtual-list.js";

if (!customElements.get("ui-virtual-list")) customElements.define("ui-virtual-list", UIVirtualList);
if (!customElements.get("ui-virtual-item")) customElements.define("ui-virtual-item", UIVirtualItem);

declare global {
  interface HTMLElementTagNameMap {
    "ui-virtual-list": UIVirtualList;
    "ui-virtual-item": UIVirtualItem;
  }
}

export { UIVirtualItem, UIVirtualList };

export * from "./virtual-list.js";
