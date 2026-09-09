import { UIResizable, UIResizableHandle, UIResizablePanel } from "./resizable.js";

if (!customElements.get("ui-resizable")) customElements.define("ui-resizable", UIResizable);
if (!customElements.get("ui-resizable-panel"))
  customElements.define("ui-resizable-panel", UIResizablePanel);
if (!customElements.get("ui-resizable-handle"))
  customElements.define("ui-resizable-handle", UIResizableHandle);

declare global {
  interface HTMLElementTagNameMap {
    "ui-resizable": UIResizable;
    "ui-resizable-panel": UIResizablePanel;
    "ui-resizable-handle": UIResizableHandle;
  }
}

export { UIResizable, UIResizableHandle, UIResizablePanel };

export * from "./resizable.js";
