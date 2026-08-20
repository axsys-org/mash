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
