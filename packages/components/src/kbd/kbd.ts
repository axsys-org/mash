import { LitElement, html, nothing, type TemplateResult } from "lit";

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
 * @csspart value - The authored key or shortcut value.
 *
 * @mashnode root root
 * @mashnode value value root
 * @mashnode command command root
 * @mashnode shortcut shortcut root
 * @mashrole slot default value value
 */
export class UIKbd extends LitElement {
  static override properties = {
    command: { type: String, reflect: true },
    shortcut: { type: String, reflect: true },
  };

  /** Semantic command this hint advertises; execution belongs to a gesture binding. */
  declare command: string;
  /** Machine-readable portable chord shared with the gesture binding. */
  declare shortcut: string;

  constructor() {
    super();
    this.command = "";
    this.shortcut = "";
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`
      <kbd
        part="root"
        data-command=${this.command || nothing}
        data-shortcut=${this.shortcut || nothing}
      >
        <slot part="value"></slot>
      </kbd>
    `;
  }
}
