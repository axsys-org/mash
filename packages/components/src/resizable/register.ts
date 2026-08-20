import { UIResizable, UIResizableHandle, UIResizablePanel } from "./resizable.js";

const definitions = [
  ["ui-resizable", UIResizable],
  ["ui-resizable-panel", UIResizablePanel],
  ["ui-resizable-handle", UIResizableHandle],
] as const;

for (const [tag, definition] of definitions) {
  if (!customElements.get(tag)) customElements.define(tag, definition);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-resizable": UIResizable;
    "ui-resizable-panel": UIResizablePanel;
    "ui-resizable-handle": UIResizableHandle;
  }
}

export { UIResizable, UIResizableHandle, UIResizablePanel };
