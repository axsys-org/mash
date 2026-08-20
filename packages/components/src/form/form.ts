import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A native form boundary for slotted Mash or platform controls.
 *
 * The component leaves normal browser submission intact. It adds a cancellable
 * `ui-form-submit` event so an application can take over submission without
 * duplicating validation or `FormData` collection mechanics.
 *
 * @tag ui-form
 * @summary Hosts form-associated controls and exposes a cancellable submit event.
 *
 * @example Project creation
 * <ui-form>
 *   <ui-input name="project-name" label="Project name"></ui-input>
 *   <ui-button type="submit">Create project</ui-button>
 * </ui-form>
 *
 * @slot - Form-associated controls and submit controls.
 *
 * @csspart root - The native form element.
 * @csspart children - The authored form-control collection.
 *
 * @fires {CustomEvent<{ formData: FormData }>} ui-form-submit - Cancellable event emitted after native validation and before browser submission.
 *
 * @mashnode root root
 * @mashnode children children root
 * @mashrole slot default children children
 */
export class UIForm extends LitElement {
  static override properties = {
    action: { type: String, reflect: true },
    method: { type: String, reflect: true },
    novalidate: { type: Boolean, reflect: true },
  };

  /** Submission destination. Empty keeps browser-default navigation. */
  declare action: string;
  /** Native HTTP submission method. */
  declare method: "get" | "post" | "dialog";
  /** Skips browser constraint validation when true. */
  declare novalidate: boolean;

  constructor() {
    super();
    this.action = "";
    this.method = "get";
    this.novalidate = false;
  }

  static override styles = baseStyles;

  #onSubmit = (event: SubmitEvent): void => {
    const form = event.currentTarget as HTMLFormElement;
    const dispatched = this.dispatchEvent(
      new CustomEvent<{ formData: FormData }>("ui-form-submit", {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { formData: new FormData(form) },
      }),
    );
    if (!dispatched) event.preventDefault();
  };

  protected override render(): TemplateResult {
    return html`<form
      part="root"
      action=${this.action}
      method=${this.method}
      ?novalidate=${this.novalidate}
      @submit=${this.#onSubmit}
    >
      <slot part="children"></slot>
    </form>`;
  }
}
