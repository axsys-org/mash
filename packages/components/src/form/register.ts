import { UIForm } from "./form.js";

if (!customElements.get("ui-form")) {
  customElements.define("ui-form", UIForm);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-form": UIForm;
  }
}

export { UIForm };

export * from "./form.js";
