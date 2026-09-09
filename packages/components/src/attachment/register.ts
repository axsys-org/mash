import { UIAttachment } from "./attachment.js";
if (!customElements.get("ui-attachment")) customElements.define("ui-attachment", UIAttachment);
export * from "./attachment.js";
declare global {
  interface HTMLElementTagNameMap {
    "ui-attachment": UIAttachment;
  }
}
