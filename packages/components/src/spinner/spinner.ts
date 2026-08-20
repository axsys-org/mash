import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The physical scale of a spinner. */
export type SpinnerSize = "small" | "medium" | "large";

/**
 * An indeterminate loading indicator.
 *
 * @tag ui-spinner
 * @summary Announces and displays an indeterminate loading state.
 *
 * @example Loading
 * <div class="demo button-showcase-row">
 *   <ui-spinner size="small"></ui-spinner>
 *   <ui-spinner></ui-spinner>
 *   <ui-spinner size="large" label="Refreshing workspace"></ui-spinner>
 * </div>
 *
 * @csspart root - The accessible loading indicator.
 * @csspart indicator - The rotating visual ring.
 */
export class UISpinner extends LitElement {
  static override properties = {
    size: { type: String, reflect: true },
    label: { type: String, reflect: true },
  };

  /** Physical scale. */
  declare size: SpinnerSize;
  /** Accessible description of the loading operation. */
  declare label: string;

  constructor() {
    super();
    this.size = "medium";
    this.label = "Loading";
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<span part="root" role="status" aria-label=${this.label}
      ><span part="indicator" class="spinner"></span
    ></span>`;
  }
}
