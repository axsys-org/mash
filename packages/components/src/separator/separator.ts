import { LitElement, css, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The direction a separator divides content. */
export type SeparatorOrientation = "horizontal" | "vertical";

/**
 * A non-interactive visual and semantic boundary between related regions.
 *
 * @tag ui-separator
 * @summary Separates adjacent regions of content.
 *
 * @example Directions
 * <div class="demo button-showcase-row">
 *   <span>Before</span><ui-separator orientation="vertical"></ui-separator><span>After</span>
 * </div>
 *
 * @csspart root - The visible rule.
 */
export class UISeparator extends LitElement {
  static override properties = {
    orientation: { type: String, reflect: true },
  };

  /** Direction of the boundary. */
  declare orientation: SeparatorOrientation;

  constructor() {
    super();
    this.orientation = "horizontal";
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }

      :host([orientation="vertical"]) {
        display: inline-flex;
        align-self: stretch;
      }

      .separator {
        display: block;
        inline-size: 100%;
        block-size: var(--border-hairline);
        background: var(--color-border);
      }

      :host([orientation="vertical"]) .separator {
        inline-size: var(--border-hairline);
        block-size: 100%;
      }
    `,
  ];

  protected override render(): TemplateResult {
    return html`<span
      part="root"
      class="separator"
      role="separator"
      aria-orientation=${this.orientation}
    ></span>`;
  }
}
