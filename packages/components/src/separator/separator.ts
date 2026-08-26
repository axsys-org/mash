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
 * @slot prefix - Optional marker anchored to the separator's leading edge.
 * @csspart frame - The marker-and-rule composition frame.
 * @csspart prefix - The optional leading marker binding.
 * @csspart root - The visible rule.
 * @mashnode frame group root
 * @mashnode prefix prefix frame
 * @mashnode root separator frame
 * @mashrole slot prefix prefix prefix
 * @mashrole part frame group frame
 * @mashrole part prefix prefix prefix
 * @mashrole part root separator root
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
    return html`
      <span part="frame">
        <slot part="prefix" name="prefix"></slot>
        <span
          part="root"
          class="separator"
          role="separator"
          aria-orientation=${this.orientation}
        ></span>
      </span>
    `;
  }
}
