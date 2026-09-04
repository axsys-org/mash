import "../icon/register.js";
import { UIClipboard } from "./clipboard.js";

if (!customElements.get("ui-clipboard")) {
  customElements.define("ui-clipboard", UIClipboard);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-clipboard": UIClipboard;
  }
}

export { UIClipboard };
