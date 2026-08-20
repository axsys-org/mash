import { LitElement, html, type TemplateResult } from "lit";

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
 * @csspart value - The authored status value.
 *
 * @mashnode root root
 * @mashnode value value root
 * @mashrole slot default value value
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

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<span part="root" class="badge"><slot part="value"></slot></span>`;
  }
}
