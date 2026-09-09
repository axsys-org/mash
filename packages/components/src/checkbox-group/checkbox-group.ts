import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import type { UICheckbox } from "../checkbox/checkbox.js";

/** The reading direction for a group of independent checkboxes. */
export type CheckboxGroupOrientation = "horizontal" | "vertical";

/**
 * Provides a labelled semantic group for independent `ui-checkbox` options.
 *
 * Individual checkboxes retain form ownership and their own values. The group
 * only contributes shared labelling, orientation, disabled policy, and an
 * aggregate event—exactly the boundary required for portable renderers.
 *
 * @tag ui-checkbox-group
 * @summary Groups related independent checkbox options.
 *
 * @example Notifications
 * <ui-checkbox-group label="Notifications">
 *   <ui-checkbox name="email">Email</ui-checkbox>
 *   <ui-checkbox name="desktop">Desktop</ui-checkbox>
 * </ui-checkbox-group>
 *
 * @slot - `ui-checkbox` options.
 *
 * @csspart root - The semantic group container.
 * @csspart children - The authored checkbox collection.
 * @cssstate disabled - Matches `:state(disabled)` while selection changes are unavailable.
 *
 * @fires {CustomEvent<{ values: string[] }>} ui-checkbox-group-change - Emitted after any child selection changes.
 *
 * @mashnode root root
 * @mashnode children children root
 * @mashnode disabled disabled root
 * @mashrole slot default children children
 */
export class UICheckboxGroup extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Accessible name for the group. */
  declare label: string;
  /** Visual and logical reading direction. */
  declare orientation: CheckboxGroupOrientation;
  /** Prevents selection changes throughout the group. */
  declare disabled: boolean;

  readonly #groupChildren = new Set<UICheckbox>();
  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.label = "Options";
    this.orientation = "vertical";
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  #checkboxes(): UICheckbox[] {
    return [...this.querySelectorAll<UICheckbox>(":scope > ui-checkbox")];
  }

  #syncOptions(): void {
    const children = this.#checkboxes();
    for (const child of this.#groupChildren) {
      if (!children.includes(child)) {
        child._setGroupDisabled(false);
        this.#groupChildren.delete(child);
      }
    }
    for (const checkbox of children) {
      this.#groupChildren.add(checkbox);
      checkbox._setGroupDisabled(this.disabled);
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("disabled")) this.#syncOptions();
    if (changed.has("disabled")) {
      if (this.disabled) this.#internals.states.add("disabled");
      else this.#internals.states.delete("disabled");
    }
  }

  #onSlotChange = (): void => this.#syncOptions();

  #onCheckboxChange = (event: Event): void => {
    if (this.disabled || !this.#checkboxes().includes(event.target as UICheckbox)) return;
    this.dispatchEvent(
      new CustomEvent<{ values: string[] }>("ui-checkbox-group-change", {
        bubbles: true,
        composed: true,
        detail: {
          values: this.#checkboxes()
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.value),
        },
      }),
    );
  };

  protected override render(): TemplateResult {
    return html`
      <div
        part="root"
        role="group"
        aria-label=${this.label}
        aria-orientation=${this.orientation}
        aria-disabled=${this.disabled ? "true" : "false"}
        @ui-checkbox-change=${this.#onCheckboxChange}
      >
        <slot part="children" @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}
