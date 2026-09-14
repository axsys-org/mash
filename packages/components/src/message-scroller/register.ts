import { UIMessageScroller } from "./message-scroller.js";
if (!customElements.get("ui-message-scroller"))
  customElements.define("ui-message-scroller", UIMessageScroller);
export * from "./message-scroller.js";
declare global {
  interface HTMLElementTagNameMap {
    "ui-message-scroller": UIMessageScroller;
  }
}
