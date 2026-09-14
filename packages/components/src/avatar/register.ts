import { UIAvatar } from "./avatar.js";

/** Registers `<ui-avatar>` without registering any unrelated component. */
if (!customElements.get("ui-avatar")) {
  customElements.define("ui-avatar", UIAvatar);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-avatar": UIAvatar;
  }
}

export { UIAvatar };

export * from "./avatar.js";
