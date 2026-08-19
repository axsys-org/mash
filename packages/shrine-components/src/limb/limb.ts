import { LitElement, css, html, type TemplateResult } from "lit";

/**
 * One labelled value in a Shrine record.
 *
 * @tag sh-limb
 * @summary Aligns one Shrine slot label with its value pail.
 *
 * @example Status limb
 * <sh-limb>
 *   <sh-slot slot="slot" title="status"></sh-slot>
 *   <sh-pail slot="value" text="active"></sh-pail>
 * </sh-limb>
 *
 * @slot slot - The `sh-slot` label for this limb.
 * @slot value - The `sh-pail` value for this limb.
 *
 * @csspart root - The limb's two-column row.
 * @csspart slot - The label column.
 * @csspart value - The value column.
 */
export class ShrineLimb extends LitElement {
  static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
    }

    :host([hidden]) {
      display: none !important;
    }

    .limb {
      display: grid;
      grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
      gap: var(--space-inline);
      align-items: baseline;
    }

    .slot,
    .value {
      min-inline-size: 0;
    }

    @media (max-width: 520px) {
      .limb {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-control-gap);
      }
    }
  `;

  protected override render(): TemplateResult {
    return html`
      <div part="root" class="limb">
        <div part="slot" class="slot"><slot name="slot"></slot></div>
        <div part="value" class="value"><slot name="value"></slot></div>
      </div>
    `;
  }
}
