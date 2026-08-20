import { LitElement, html, type TemplateResult } from "lit";

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

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<span
      part="root"
      class="separator"
      role="separator"
      aria-orientation=${this.orientation}
    ></span>`;
  }
}
