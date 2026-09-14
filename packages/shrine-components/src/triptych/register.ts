import "@mash/ui/scroll-area/register";

import { ShrineTriptych } from "./triptych.js";

if (!customElements.get("sh-triptych")) {
  customElements.define("sh-triptych", ShrineTriptych);
}

declare global {
  interface HTMLElementTagNameMap {
    "sh-triptych": ShrineTriptych;
  }
}

export * from "./triptych.js";
