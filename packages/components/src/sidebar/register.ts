import { UISidebar } from "./sidebar.js";

import "../drawer/register.js";
import "../resizable/register.js";
import "../scroll-area/register.js";
import "../icon/register.js";

if (!customElements.get("ui-sidebar")) {
  customElements.define("ui-sidebar", UISidebar);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-sidebar": UISidebar;
  }
}

export * from "./sidebar.js";
