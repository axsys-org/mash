import { LitElement, css, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * Marks a keyboard shortcut or key name.
 *
 * @tag ui-kbd
 * @summary Displays a keyboard shortcut using Mash's compact code typography.
 *
 * @example Keyboard shortcut
 * <p class="demo">Press <ui-kbd>⌘ K</ui-kbd> to open command search.</p>
 *
 * @slot - The key or shortcut text.
 *
 * @csspart root - The visible keyboard-key surface.
 */
export class UIKbd extends LitElement {
  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
      }

      kbd {
        display: inline-flex;
        align-items: center;
        min-block-size: calc(var(--space-control-block) + var(--space-control-block));
        padding-inline: var(--space-control-block-small);
        border: var(--border-hairline) solid var(--color-border-strong);
        border-radius: var(--radius-control);
        background: var(--color-surface-raised);
        box-shadow: 0 var(--border-hairline) 0 var(--color-border);
        color: var(--color-text);
        font-family: var(--type-code-font-family);
        font-size: var(--type-code-font-size);
        font-weight: var(--type-code-font-weight);
        line-height: var(--type-code-line-height);
        white-space: nowrap;
      }
    `,
  ];

  protected override render(): TemplateResult {
    return html`<kbd part="root"><slot></slot></kbd>`;
  }
}
