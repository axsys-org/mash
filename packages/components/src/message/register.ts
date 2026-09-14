import { UIMessage } from "./message.js";
if (!customElements.get("ui-message")) customElements.define("ui-message", UIMessage);
export * from "./message.js";
declare global {
  interface HTMLElementTagNameMap {
    "ui-message": UIMessage;
  }
}
