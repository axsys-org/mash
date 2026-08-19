import { LitElement, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

let fieldId = 0;

/**
 * A labelled form-field frame for one authored control.
 *
 * Put a native input, or a Mash form-associated control such as `ui-input`,
 * in the `control` slot. The field transfers its text label to an unlabelled
 * Mash input and wires ordinary native controls with `for`/`aria-describedby`.
 * Error visibility is a semantic state, not an alternate visual component.
 *
 * @tag ui-field
 * @summary Labels, describes, and reports validity for one form control.
 *
 * @example Project name
 * <ui-field label="Project name" description="Visible to your workspace.">
 *   <ui-input slot="control" name="project-name"></ui-input>
 * </ui-field>
 *
 * @slot control - One native or Mash form control.
 * @slot description - Optional supporting guidance.
 * @slot error - Optional validation message, visible when `invalid`.
 *
 * @csspart root - The field frame.
 * @csspart label - The native label element.
 * @csspart description - The supporting-text region.
 * @csspart error - The live validation-message region.
 *
 * @cssstate invalid - Matches `:state(invalid)` while an error is active.
 */
export class UIField extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
    description: { type: String, reflect: true },
    error: { type: String, reflect: true },
    invalid: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
  };

  /** Visible, accessible label for the field control. */
  declare label: string;
  /** Supporting guidance shown beneath the control. */
  declare description: string;
  /** Validation message shown when invalid. */
  declare error: string;
  /** Whether the field currently has a validation error. */
  declare invalid: boolean;
  /** Marks the associated native control as required when supported. */
  declare required: boolean;

  readonly #internals: ElementInternals;
  readonly #controlId = `ui-field-control-${++fieldId}`;
  readonly #descriptionId = `ui-field-description-${fieldId}`;
  readonly #errorId = `ui-field-error-${fieldId}`;

  constructor() {
    super();
    this.label = "";
    this.description = "";
    this.error = "";
    this.invalid = false;
    this.required = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  #syncControl = (): void => {
    const control = this.querySelector<HTMLElement>(":scope > [slot='control']");
    if (!control) return;
    control.id ||= this.#controlId;
    if (control.localName === "ui-input") {
      const input = control as HTMLElement & { label?: string; required?: boolean };
      if (!input.label) input.label = this.label;
      if (this.required) input.required = true;
    } else if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement ||
      control instanceof HTMLTextAreaElement
    ) {
      if (this.required) control.required = true;
      control.setAttribute(
        "aria-describedby",
        [this.description ? this.#descriptionId : "", this.invalid ? this.#errorId : ""]
          .filter(Boolean)
          .join(" "),
      );
    } else {
      control.setAttribute("aria-label", control.getAttribute("aria-label") || this.label);
    }
  };

  protected override updated(): void {
    if (this.invalid) this.#internals.states.add("invalid");
    else this.#internals.states.delete("invalid");
    this.#syncControl();
  }

  protected override render(): TemplateResult {
    return html`
      <div part="root">
        ${
          this.label
            ? html`<label part="label" for=${this.#controlId}
                >${this.label}${this.required ? " *" : ""}</label
              >`
            : nothing
        }
        <slot name="control" @slotchange=${this.#syncControl}></slot>
        ${
          this.description
            ? html`<div part="description" id=${this.#descriptionId}>
                <slot name="description">${this.description}</slot>
              </div>`
            : html`<slot name="description"></slot>`
        }
        ${
          this.invalid
            ? html`<div part="error" id=${this.#errorId} role="alert">
                <slot name="error">${this.error}</slot>
              </div>`
            : nothing
        }
      </div>
    `;
  }
}
