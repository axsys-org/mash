import { UIToastStack } from "./toast-stack.js";

if (!customElements.get("ui-toast-stack")) customElements.define("ui-toast-stack", UIToastStack);

declare global {
  interface HTMLElementTagNameMap {
    "ui-toast-stack": UIToastStack;
  }
}

export { UIToastStack };

export * from "./toast-stack.js";
