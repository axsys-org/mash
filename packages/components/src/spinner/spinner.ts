import { LitElement, css, html, type TemplateResult } from "lit";

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

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;

        --_size: var(--space-container-inline);
      }

      :host([size="small"]) {
        --_size: calc(var(--space-control-block) + var(--space-control-block));
      }

      :host([size="large"]) {
        --_size: calc(var(--space-container-inline) + var(--space-container-inline));
      }

      .spinner {
        display: inline-flex;
        inline-size: var(--_size);
        block-size: var(--_size);
        border: var(--border-strong) solid var(--color-surface-sunken);
        border-inline-start-color: var(--color-action);
        border-radius: var(--radius-pill);
        animation: spin calc(var(--duration-surface) * 5) var(--easing-linear) infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(1turn);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .spinner {
          animation: none;
          border-inline-start-color: var(--color-border-strong);
        }
      }
    `,
  ];

  protected override render(): TemplateResult {
    return html`<span part="root" role="status" aria-label=${this.label}
      ><span part="indicator" class="spinner"></span
    ></span>`;
  }
}
