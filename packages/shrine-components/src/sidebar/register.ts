import "@mash/ui/scroll-area/register";
import { ShrineSidebar } from "./sidebar.js";

if (!customElements.get("sh-sidebar")) customElements.define("sh-sidebar", ShrineSidebar);

declare global {
  interface HTMLElementTagNameMap {
    "sh-sidebar": ShrineSidebar;
  }
}

export * from "./sidebar.js";
