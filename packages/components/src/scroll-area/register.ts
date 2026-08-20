import { UIScrollArea } from "./scroll-area.js";

if (!customElements.get("ui-scroll-area")) {
  customElements.define("ui-scroll-area", UIScrollArea);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-scroll-area": UIScrollArea;
  }
}

export { UIScrollArea };
