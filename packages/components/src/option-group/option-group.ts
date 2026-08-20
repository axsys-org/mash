import { LitElement, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

let optionGroupId = 0;

/**
 * An accessible labelled subset of options inside a selection collection.
 *
 * The group owns only the relationship between its label and children. Select,
 * Combobox, and Autocomplete continue to own selection and keyboard state.
 *
 * @tag ui-option-group
 * @summary Groups related options under one semantic label.
 *
 * @example People group
 * <ui-option-group label="People">
 *   <ui-option value="maya">Maya</ui-option>
 * </ui-option-group>
 *
 * @slot - The grouped `ui-option` children.
 * @slot label - An authored group label; falls back to the `label` attribute.
 *
 * @csspart root - The semantic option group.
 * @csspart label - The group label.
 * @csspart children - The grouped option collection.
 *
 * @mashnode root group
 * @mashnode label label root
 * @mashnode children children root
 * @mashrole part root group root
 * @mashrole slot default children children
 */
export class UIOptionGroup extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
  };

  /** Accessible and fallback-visible label for this group. */
  declare label: string;

  readonly #labelId = `ui-option-group-label-${++optionGroupId}`;

  constructor() {
    super();
    this.label = "";
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`
      <div part="root" role="group" aria-labelledby=${this.#labelId}>
        <div part="label" id=${this.#labelId}>
          <slot name="label">${this.label || nothing}</slot>
        </div>
        <slot part="children"></slot>
      </div>
    `;
  }
}
