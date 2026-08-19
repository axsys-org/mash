import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A selectable command inside `ui-menu` or `ui-context-menu`.
 *
 * Menu items remain native buttons and expose selection through an event, so
 * applications retain ownership of routing and side effects.
 *
 * @tag ui-menu-item
 * @summary A selectable menu command.
 *
 * @example Archive
 * <ui-menu-item value="archive">Archive project</ui-menu-item>
 *
 * @slot - Visible command label or icon content.
 *
 * @csspart control - The native menuitem button.
 *
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ value: string }>} ui-menu-item-select - Emitted when the command is activated.
 */
export class UIMenuItem extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
  static override properties = {
    value: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Stable command value for the containing menu. */
  declare value: string;
  /** Prevents command activation. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.value = "";
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("disabled")) return;
    if (this.disabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
  }

  #select = (): void => {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-menu-item-select", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  };

  protected override render(): TemplateResult {
    return html`<button
      part="control"
      type="button"
      role="menuitem"
      ?disabled=${this.disabled}
      @click=${this.#select}
    >
      <slot></slot>
    </button>`;
  }
}
