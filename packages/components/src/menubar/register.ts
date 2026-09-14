import "../menu/register.js";
import { UIMenubar } from "./menubar.js";

if (!customElements.get("ui-menubar")) customElements.define("ui-menubar", UIMenubar);

declare global {
  interface HTMLElementTagNameMap {
    "ui-menubar": UIMenubar;
  }
}

export { UIMenubar };

export * from "./menubar.js";
