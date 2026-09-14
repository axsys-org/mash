import "../menu/register.js";
import "../tab-panel/register.js";
import "../tab/register.js";
import { UITabs } from "./tabs.js";

if (!customElements.get("ui-tabs")) {
  customElements.define("ui-tabs", UITabs);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-tabs": UITabs;
  }
}

export { UITabs };

export * from "./tabs.js";
