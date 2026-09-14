import { LitElement, css, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * An inert placeholder shape for loading layouts.
 *
 * `ui-skeleton` reserves the same authored layout space that real content will
 * occupy. It intentionally carries no progress role, label, loading state,
 * color, spacing, radius, or motion policy; those belong to the surrounding
 * workflow and the active catalogue recipe.
 *
 * @tag ui-skeleton
 * @summary Marks an inert placeholder area while content is unavailable.
 *
 * @example Placeholder line
 * <ui-skeleton style="block-size: 1rem; inline-size: 12rem;"></ui-skeleton>
 *
 * @csspart root - The inert placeholder shape.
 *
 * @mashnode root placeholder
 * @mashrole part root placeholder root
 */
export class UISkeleton extends LitElement {
  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        inline-size: 100%;
      }

      [part="root"] {
        display: block;
        inline-size: 100%;
        block-size: 100%;
        min-block-size: inherit;
        border-radius: inherit;
      }
    `,
  ];

  protected override render(): TemplateResult {
    return html`<span part="root" aria-hidden="true"></span>`;
  }
}
