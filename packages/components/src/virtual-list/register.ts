import { UIVirtualItem, UIVirtualList } from "./virtual-list.js";

const definitions = [
  ["ui-virtual-list", UIVirtualList],
  ["ui-virtual-item", UIVirtualItem],
] as const;

for (const [tag, definition] of definitions) {
  if (!customElements.get(tag)) customElements.define(tag, definition);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-virtual-list": UIVirtualList;
    "ui-virtual-item": UIVirtualItem;
  }
}

export { UIVirtualItem, UIVirtualList };
