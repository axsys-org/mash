import { UIShimmer } from "./shimmer.js";

if (!customElements.get("ui-shimmer")) {
  customElements.define("ui-shimmer", UIShimmer);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-shimmer": UIShimmer;
  }
}

export { UIShimmer };
