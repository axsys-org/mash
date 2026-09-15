import { LitElement, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

let fieldId = 0;

interface FieldContextControl extends HTMLElement {
  label?: string;
  required?: boolean;
  _setFieldContext(context: { description: string; invalid: boolean }): void;
}

/**
 * A labelled form-field frame for one authored control.
 *
 * Put a native input, or a Mash form-associated control such as `ui-input`,
 * in the `control` slot. The field transfers its text label to an unlabelled
 * Mash input and keeps that inherited name in sync until the control receives
 * its own nonempty label. Ordinary native controls use `for`/`aria-describedby`.
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
 * @slot label - Authored field label; the `label` attribute is the compatibility fallback.
 * @slot control - One native or Mash form control.
 * @slot description - Optional supporting guidance.
 * @slot error - Optional validation message, visible when `invalid`.
 *
 * @csspart root - The field frame.
 * @csspart label - The native label element.
 * @csspart control - The authored control realization.
 * @csspart description - The supporting-text region.
 * @csspart error - The live validation-message region.
 *
 * @cssstate invalid - Matches `:state(invalid)` while an error is active.
 * @cssstate required - Matches `:state(required)` when the associated value is required.
 *
 * @mashnode root root
 * @mashnode label label root
 * @mashnode control control root
 * @mashnode description description root
 * @mashnode error error root
 * @mashnode invalid invalid root
 * @mashnode required required root
 */
export class UIField extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
    description: { type: String, reflect: true },
    error: { type: String, reflect: true },
    invalid: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
    _hasLabel: { type: Boolean, state: true },
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

  declare private _hasLabel: boolean;

  readonly #internals: ElementInternals;
  readonly #providedLabels = new WeakMap<FieldContextControl, string>();
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
    this._hasLabel = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  get #labelText(): string {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="label"]');
    const authored = slot
      ?.assignedNodes()
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
    return authored || this.label;
  }

  #syncLabel = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    this._hasLabel = slot.assignedNodes().length > 0;
    this.#syncControl();
  };

  #syncControl = (): void => {
    const control = this.querySelector<HTMLElement>(":scope > [slot='control']");
    if (!control) return;
    control.id ||= this.#controlId;
    const candidates = [control, ...control.querySelectorAll<HTMLElement>("*")];
    const mashControl = candidates.find(
      (candidate): candidate is FieldContextControl =>
        typeof (candidate as Partial<FieldContextControl>)._setFieldContext === "function",
    );
    if (mashControl) {
      const currentLabel = mashControl.label ?? mashControl.getAttribute("label") ?? "";
      const providedLabel = this.#providedLabels.get(mashControl);
      const ownsLabel =
        // Lit may already have reflected the control's empty default. Attribute
        // presence alone cannot distinguish that from an authored name.
        (mashControl.hasAttribute("label") &&
          Boolean(currentLabel.trim()) &&
          currentLabel !== providedLabel) ||
        Boolean(mashControl.querySelector(":scope > [slot='label']"));
      if (!ownsLabel && "label" in mashControl) {
        const label = this.#labelText;
        mashControl.label = label;
        this.#providedLabels.set(mashControl, label);
      } else {
        this.#providedLabels.delete(mashControl);
      }
      if ("required" in mashControl) mashControl.required = this.required;
      mashControl._setFieldContext({
        description: [this.description, this.invalid ? this.error : ""].filter(Boolean).join(" "),
        invalid: this.invalid,
      });
    } else if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement ||
      control instanceof HTMLTextAreaElement
    ) {
      control.required = this.required;
      control.setAttribute("aria-label", control.getAttribute("aria-label") || this.#labelText);
      control.setAttribute(
        "aria-description",
        [this.description, this.invalid ? this.error : ""].filter(Boolean).join(" "),
      );
      control.setAttribute("aria-invalid", this.invalid ? "true" : "false");
      control.setAttribute(
        "aria-describedby",
        [this.description ? this.#descriptionId : "", this.invalid ? this.#errorId : ""]
          .filter(Boolean)
          .join(" "),
      );
    } else {
      control.setAttribute("aria-label", control.getAttribute("aria-label") || this.#labelText);
    }
  };

  #focusControl = (): void => {
    const control = this.querySelector<HTMLElement>(":scope > [slot='control']");
    const target = control
      ? ([control, ...control.querySelectorAll<HTMLElement>("*")].find(
          (candidate) =>
            typeof (candidate as Partial<FieldContextControl>)._setFieldContext === "function",
        ) ?? control)
      : null;
    target?.focus();
  };

  protected override updated(): void {
    if (this.invalid) this.#internals.states.add("invalid");
    else this.#internals.states.delete("invalid");
    if (this.required) this.#internals.states.add("required");
    else this.#internals.states.delete("required");
    this.#syncControl();
  }

  protected override render(): TemplateResult {
    return html`
      <div part="root">
        <label
          part="label"
          for=${this.#controlId}
          ?hidden=${!this.label && !this._hasLabel}
          @click=${this.#focusControl}
        >
          <slot name="label" @slotchange=${this.#syncLabel}
            >${this.label}${this.required ? " *" : ""}</slot
          >
        </label>
        <slot part="control" name="control" @slotchange=${this.#syncControl}></slot>
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
