import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A native form boundary for slotted Mash or platform controls.
 *
 * The component leaves normal browser submission intact. It adds a cancellable
 * `ui-form-submit` event so an application can take over submission without
 * duplicating validation or `FormData` collection mechanics.
 *
 * Controls are placed inside a native light-DOM form, preserving platform form
 * ownership across their own shadow roots. An authored direct-child form is
 * reused; otherwise the component creates one and moves its authored nodes into
 * it without cloning them. Append new controls to either this host or its form.
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
 * @csspart root - Layout wrapper around the native form.
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
    action: { type: String, reflect: true, useDefault: true },
    method: { type: String, reflect: true, useDefault: true },
    novalidate: { type: Boolean, reflect: true, useDefault: true },
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

  static override styles = [
    baseStyles,
    css`
      slot {
        display: contents;
      }
      ::slotted(form[data-mash-form]) {
        display: contents;
      }
    `,
  ];

  #form: HTMLFormElement | null = null;
  #owned: HTMLFormElement | null = null;
  #observer = new MutationObserver(() => this.#syncForm());

  /** The native form that owns the authored controls. */
  get form(): HTMLFormElement | null {
    return this.#form;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, { childList: true });
    queueMicrotask(() => {
      if (this.isConnected) this.#syncForm();
    });
  }

  override disconnectedCallback(): void {
    this.#observer.disconnect();
    super.disconnectedCallback();
  }

  #syncForm(): void {
    let form = this.querySelector<HTMLFormElement>(":scope > form");
    if (!form) {
      form = document.createElement("form");
      form.dataset.mashForm = "";
      this.#owned = form;
      this.append(form);
    }
    if (form !== this.#form) {
      this.#form?.removeEventListener("submit", this.#onSubmit);
      this.#form = form;
      form.addEventListener("submit", this.#onSubmit);
    }
    if (form === this.#owned) {
      const children = [...this.childNodes].filter((node) => node !== form);
      for (const child of children) form.append(child);
    }
    this.#syncOptions();
  }

  #syncOptions(): void {
    if (!this.#form) return;
    if (this.#form === this.#owned || this.hasAttribute("action"))
      this.#form.setAttribute("action", this.action);
    if (this.#form === this.#owned || this.hasAttribute("method")) this.#form.method = this.method;
    if (this.#form === this.#owned || this.hasAttribute("novalidate"))
      this.#form.noValidate = this.novalidate;
  }

  protected override updated(_changed: PropertyValues<this>): void {
    this.#syncOptions();
  }

  /** Runs platform validation and submits through ui-form-submit. */
  requestSubmit(): void {
    this.#form?.requestSubmit();
  }

  /** Restores the native and form-associated controls' default values. */
  reset(): void {
    this.#form?.reset();
  }

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
    return html`<div part="root"><slot part="children"></slot></div>`;
  }
}
