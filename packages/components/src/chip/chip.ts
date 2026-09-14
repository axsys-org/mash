import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * One removable selected value in a multiple-value control.
 *
 * The owning Combobox persists the value collection. `ui-chip` only
 * exposes its label/remove anatomy and reports a removal request.
 *
 * @tag ui-chip
 * @summary Represents one removable value in a multiple selection.
 *
 * @example Selected owner
 * <ui-chip value="maya">Maya <button slot="remove">Remove</button></ui-chip>
 *
 * @slot - The selected value label.
 * @slot remove - A control that requests removal of this value.
 *
 * @csspart root - The selected-value chip.
 * @csspart label - The authored value label.
 * @csspart remove - The authored remove action.
 *
 * @cssstate disabled - Matches `:state(disabled)` while removal is unavailable.
 * @cssstate readonly - Matches `:state(readonly)` while removal is not permitted.
 *
 * @fires {CustomEvent<{ value: string }>} ui-chip-remove - Requests removal from the owning value collection.
 *
 * @mashnode root chip
 * @mashnode label label root
 * @mashnode remove remove root
 * @mashrole part root chip root
 * @mashrole slot default label label
 * @mashrole event ui-chip-remove remove remove
 */
export class UIChip extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readonly: { type: Boolean, reflect: true },
  };

  /** Stable value represented by this chip. */
  declare value: string;
  /** Prevents focus and removal. */
  declare disabled: boolean;
  /** Allows focus but prevents removal. */
  declare readonly: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.value = "";
    this.disabled = false;
    this.readonly = false;
    this.#internals = this.attachInternals();
    this.addEventListener("click", this.#onComposedClick);
  }

  static override styles = [
    baseStyles,
    css`
      [part="label"],
      [part="remove"] {
        display: contents;
      }
    `,
  ];

  protected override updated(changed: PropertyValues<this>): void {
    for (const state of ["disabled", "readonly"] as const) {
      if (!changed.has(state)) continue;
      if (this[state]) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
  }

  #requestRemove(): void {
    if (this.disabled || this.readonly) return;
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-chip-remove", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  }

  #onComposedClick = (event: MouseEvent): void => {
    const remove = this.querySelector<HTMLElement>(":scope > [slot=remove]");
    if (!remove || !event.composedPath().includes(remove)) return;
    event.preventDefault();
    this.#requestRemove();
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Backspace" && event.key !== "Delete") return;
    event.preventDefault();
    event.stopPropagation();
    this.#requestRemove();
  };

  protected override render(): TemplateResult {
    return html`
      <span
        part="root"
        tabindex="-1"
        aria-disabled=${this.disabled ? "true" : undefined}
        aria-readonly=${this.readonly ? "true" : undefined}
        @keydown=${this.#onKeydown}
      >
        <span part="label"><slot></slot></span>
        <span part="remove"><slot name="remove"></slot></span>
      </span>
    `;
  }
}
