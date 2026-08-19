import { LitElement, css, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The semantic meaning carried by a badge. */
export type BadgeTone = "accent" | "neutral" | "positive" | "warning" | "critical";

/** The physical scale of a badge. */
export type BadgeSize = "small" | "medium";

/**
 * A compact semantic status label.
 *
 * Badges communicate stable state such as a category, count or workflow
 * outcome. They are not action controls: use `ui-button` when pressing the
 * element should do something.
 *
 * @tag ui-badge
 * @summary Labels a compact semantic status, category or count.
 *
 * @example Semantic status
 * <div class="demo button-showcase-row">
 *   <ui-badge>Default</ui-badge>
 *   <ui-badge tone="positive">Ready</ui-badge>
 *   <ui-badge tone="warning">Needs review</ui-badge>
 *   <ui-badge tone="critical">Blocked</ui-badge>
 * </div>
 *
 * @slot - The concise status text or count.
 *
 * @csspart root - The visible badge container.
 */
export class UIBadge extends LitElement {
  static override properties = {
    tone: { type: String, reflect: true },
    size: { type: String, reflect: true },
  };

  /** Semantic meaning. */
  declare tone: BadgeTone;
  /** Physical scale. */
  declare size: BadgeSize;

  constructor() {
    super();
    this.tone = "accent";
    this.size = "medium";
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;

        --_background: var(--color-action);
        --_foreground: var(--color-on-action);
        --_padding-inline: var(--space-control-inline-small);
        --_padding-block: var(--space-control-block-small);
        --_font-size: var(--type-label-small-font-size);
      }

      :host([tone="neutral"]) {
        --_background: var(--color-neutral);
        --_foreground: var(--color-on-neutral);
      }

      :host([tone="positive"]) {
        --_background: var(--color-positive);
        --_foreground: var(--color-on-positive);
      }

      :host([tone="warning"]) {
        --_background: var(--color-warning);
        --_foreground: var(--color-on-warning);
      }

      :host([tone="critical"]) {
        --_background: var(--color-critical);
        --_foreground: var(--color-on-critical);
      }

      :host([size="small"]) {
        --_padding-inline: var(--space-control-block-small);
        --_padding-block: var(--border-hairline);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        min-inline-size: 0;
        padding: var(--_padding-block) var(--_padding-inline);
        border-radius: var(--radius-pill);
        background: var(--_background);
        color: var(--_foreground);
        font-family: var(--type-label-small-font-family);
        font-size: var(--_font-size);
        font-weight: var(--type-label-small-font-weight);
        line-height: var(--type-label-small-line-height);
        white-space: nowrap;
      }
    `,
  ];

  protected override render(): TemplateResult {
    return html`<span part="root" class="badge"><slot></slot></span>`;
  }
}
