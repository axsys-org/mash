import { UIImage } from "./image.js";

/** Registers `<ui-image>` without registering any unrelated component. */
if (!customElements.get("ui-image")) {
  customElements.define("ui-image", UIImage);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-image": UIImage;
  }
}

export { UIImage };

export * from "./image.js";
