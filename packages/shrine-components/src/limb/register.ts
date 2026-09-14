import { ShrineLimb } from "./limb.js";

import "../pail/register.js";
import "../slot/register.js";

if (!customElements.get("sh-limb")) {
  customElements.define("sh-limb", ShrineLimb);
}

declare global {
  interface HTMLElementTagNameMap {
    "sh-limb": ShrineLimb;
  }
}

export { ShrineLimb };

export * from "./limb.js";
