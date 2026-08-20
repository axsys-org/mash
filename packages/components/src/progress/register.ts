import { UIProgress } from "./progress.js";

/** Registers `<ui-progress>` without registering any unrelated component. */
if (!customElements.get("ui-progress")) {
  customElements.define("ui-progress", UIProgress);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-progress": UIProgress;
  }
}

export { UIProgress };
