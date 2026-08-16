import { LitElement, css, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** How the card separates itself from what is behind it. */
export type CardElevation = "flat" | "raised";

/**
 * A surface that groups related content.
 *
 * `elevation` is the only axis, and it means different things per theme by
 * design: the light theme reads elevation as a shadow, while the dark theme
 * steps the surface lighter, because a soft shadow is invisible on a dark
 * canvas. Both are driven from theme tokens, so the component itself does not
 * know which theme it is in.
 *
 * @tag ui-card
 * @summary Groups related content on a surface.
 *
 * @slot - The card's main content.
 * @slot header - Optional header region, above the content.
 * @slot footer - Optional footer region, below the content. Typically actions.
 *
 * @csspart header - The header region. Present only when the `header` slot is filled.
 * @csspart content - The default-slot region.
 * @csspart footer - The footer region. Present only when the `footer` slot is filled.
 *
 * @cssproperty [--card-padding=var(--space-container-block) var(--space-container-inline)] -
 *   Padding applied to each region. Public because full-bleed content is a real
 *   layout need — a card wrapping an edge-to-edge image sets `--card-padding: 0`
 *   and manages spacing itself. This is the exception that earns a public
 *   property, not a general-purpose spacing knob.
 */
export class UICard extends LitElement {
  static override properties = {
    elevation: { type: String, reflect: true },
    _hasHeader: { type: Boolean, state: true },
    _hasFooter: { type: Boolean, state: true },
  };

  /** Whether the card sits flat against the canvas or lifts off it. */
  declare elevation: CardElevation;

  declare private _hasHeader: boolean;
  declare private _hasFooter: boolean;

  constructor() {
    super();
    this.elevation = "flat";
    this._hasHeader = false;
    this._hasFooter = false;
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;

        --_padding: var(--card-padding, var(--space-container-block) var(--space-container-inline));
        --_background: var(--color-surface);
        --_shadow: none;

        background-color: var(--_background);
        border: var(--border-hairline) solid var(--color-border);
        border-radius: var(--radius-container);
        box-shadow: var(--_shadow);
        color: var(--color-text);

        font-family: var(--type-body-font-family);
        font-size: var(--type-body-font-size);
        font-weight: var(--type-body-font-weight);
        line-height: var(--type-body-line-height);
      }

      /* The theme decides what "raised" looks like. --color-surface-raised is
         the same as --color-surface in the light theme and a lighter step in
         the dark theme, while --color-shadow is nearly invisible in dark. The
         component states both and lets the tokens resolve it. */
      :host([elevation="raised"]) {
        --_background: var(--color-surface-raised);
        --_shadow: 0 1px 2px var(--color-shadow), 0 4px 12px var(--color-shadow);
      }

      .region {
        padding: var(--_padding);
      }

      .region[hidden] {
        display: none;
      }

      .header {
        border-block-end: var(--border-hairline) solid var(--color-border);
      }

      .footer {
        border-block-start: var(--border-hairline) solid var(--color-border);
      }

      @media (forced-colors: active) {
        :host {
          border-color: CanvasText;
        }

        /* Shadows are dropped in forced-colors mode, so elevation has to be
           carried by the border instead or the card loses its edge entirely. */
        :host([elevation="raised"]) {
          border-width: var(--border-strong);
        }
      }
    `,
  ];

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const filled = slot.assignedNodes({ flatten: true }).length > 0;
    if (slot.name === "header") this._hasHeader = filled;
    else if (slot.name === "footer") this._hasFooter = filled;
  };

  protected override render(): TemplateResult {
    return html`
      <div part="header" class="region header" ?hidden=${!this._hasHeader}>
        <slot name="header" @slotchange=${this.#onSlotChange}></slot>
      </div>

      <div part="content" class="region content">
        <slot></slot>
      </div>

      <div part="footer" class="region footer" ?hidden=${!this._hasFooter}>
        <slot name="footer" @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}
