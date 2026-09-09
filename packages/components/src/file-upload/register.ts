import { UIFileUpload } from "./file-upload.js";

/** Registers `<ui-file-upload>` without registering any unrelated component. */
if (!customElements.get("ui-file-upload")) {
  customElements.define("ui-file-upload", UIFileUpload);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-file-upload": UIFileUpload;
  }
}

export { UIFileUpload };

export * from "./file-upload.js";
