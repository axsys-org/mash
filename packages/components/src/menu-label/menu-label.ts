import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A non-interactive section label between menu commands.
 *
 * The plain-text default is the normal fallback. Optional prefix and suffix
 * lanes let a catalogue sew in icons, badges, or other non-interactive context
 * without pretending that a heading is a selectable menu item.
 *
 * @tag ui-menu-label
 * @summary Labels a visual section inside a menu without becoming a command.
 *
 * @example Navigation section
 * <ui-menu-label>Navigate</ui-menu-label>
 *
 * @slot - Section label content.
 * @slot prefix - Optional leading context.
 * @slot suffix - Optional trailing context.
 *
 * @csspart root - The complete label row.
 * @csspart prefix - The leading context lane.
 * @csspart label - The label content.
 * @csspart suffix - The trailing context lane.
 *
 * @mashnode root menu-label
 * @mashnode prefix prefix root
 * @mashnode label label root
 * @mashnode suffix suffix root
 * @mashrole slot default label label
 * @mashrole slot prefix prefix prefix
 * @mashrole slot suffix suffix suffix
 */
export class UIMenuLabel extends LitElement {
  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = "presentation";
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`
      <span part="root">
        <span part="prefix"><slot name="prefix"></slot></span>
        <span part="label"><slot></slot></span>
        <span part="suffix"><slot name="suffix"></slot></span>
      </span>
    `;
  }
}
