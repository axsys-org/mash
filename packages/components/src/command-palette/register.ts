import "../icon/register.js";
import "../kbd/register.js";
import { UICommand, UICommandItem } from "./command-palette.js";
if (!customElements.get("ui-command")) customElements.define("ui-command", UICommand);
export * from "./command-palette.js";
declare global {
  interface HTMLElementTagNameMap {
    "ui-command": UICommand;
  }
}

if (!customElements.get("ui-command-item")) customElements.define("ui-command-item", UICommandItem);
declare global {
  interface HTMLElementTagNameMap {
    "ui-command-item": UICommandItem;
  }
}
