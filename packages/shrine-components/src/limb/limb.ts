import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * One labelled value in a Shrine record.
 *
 * @tag sh-limb
 * @summary Aligns one Shrine field label with its value.
 *
 * @example Status limb
 * <sh-limb>
 *   <sh-slot slot="label" title="status"></sh-slot>
 *   <sh-pail slot="value" text="active"></sh-pail>
 * </sh-limb>
 *
 * @slot label - The `sh-slot` label for this limb.
 * @slot slot - Compatibility alias for the `label` slot.
 * @slot value - The `sh-pail` value for this limb.
 *
 * @csspart root - The limb's two-column row.
 * @csspart label - The label column.
 * @csspart slot - Compatibility alias for the `label` part.
 * @csspart value - The value column.
 */
export class ShrineLimb extends LitElement {
  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`
      <div part="root" class="limb">
        <div part="label slot" class="label">
          <slot name="label"><slot name="slot"></slot></slot>
        </div>
        <div part="value" class="value"><slot name="value"></slot></div>
      </div>
    `;
  }
}
