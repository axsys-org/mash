import { UIPath } from "./path.js";

// If this component composes elements from another package, import their
// register modules here too, so that importing this one is sufficient:
//
//   import "@mash/ui/button/register";

if (!customElements.get("ui-path")) {
  customElements.define("ui-path", UIPath);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-path": UIPath;
  }
}

export { UIPath };

export * from "./path.js";
