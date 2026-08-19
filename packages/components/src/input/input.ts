import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The native input modes Mash exposes as a stable cross-platform contract. */
export type InputType = "text" | "email" | "password" | "search" | "tel" | "url";

/** The physical scale of an input control. */
export type InputSize = "small" | "medium" | "large";

/**
 * A single-line, form-associated text entry control.
 *
 * The native input remains the focus target and owns text editing semantics;
 * the custom element owns Mash's tokenized surface plus form participation
 * across the shadow boundary.
 *
 * @tag ui-input
 * @summary A tokenized, single-line text input.
 *
 * @example Search input
 * <div class="demo button-showcase-row">
 *   <ui-input type="search" placeholder="Search the workspace" label="Search"></ui-input>
 * </div>
 *
 * @slot prefix - Optional content before the input, such as a search icon.
 * @slot suffix - Optional content after the input, such as a keyboard shortcut.
 *
 * @csspart control - The native `<input>` that receives text entry and focus.
 * @csspart prefix - The wrapper around the `prefix` slot.
 * @csspart suffix - The wrapper around the `suffix` slot.
 */
export class UIInput extends LitElement {
  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String, reflect: true },
    name: { type: String, reflect: true },
    type: { type: String, reflect: true },
    size: { type: String, reflect: true },
    placeholder: { type: String, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readonly: { type: Boolean, reflect: true },
  };

  /** Current text value, submitted with the containing form. */
  declare value: string;
  /** Form field name. */
  declare name: string;
  /** Native text-entry mode. */
  declare type: InputType;
  /** Physical scale. */
  declare size: InputSize;
  /** Hint shown when the field is empty. */
  declare placeholder: string;
  /** Accessible name when the input has no external label. */
  declare label: string;
  /** Prevents focus and text entry. */
  declare disabled: boolean;
  /** Allows focus and selection but prevents edits. */
  declare readonly: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.value = "";
    this.name = "";
    this.type = "text";
    this.size = "medium";
    this.placeholder = "";
    this.label = "";
    this.disabled = false;
    this.readonly = false;
    this.#internals = this.attachInternals();
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        min-inline-size: calc(var(--space-container-inline) + var(--space-container-inline));

        --_padding-inline: var(--space-control-inline);
        --_padding-block: var(--space-control-block);
        --_font-size: var(--type-body-font-size);
        --_line-height: var(--type-body-line-height);
      }

      :host([size="small"]) {
        --_padding-inline: var(--space-control-inline-small);
        --_padding-block: var(--space-control-block-small);
        --_font-size: var(--type-label-font-size);
        --_line-height: var(--type-label-line-height);
      }

      :host([size="large"]) {
        --_padding-inline: var(--space-control-inline-large);
        --_padding-block: var(--space-control-block-large);
        --_font-size: var(--type-label-large-font-size);
        --_line-height: var(--type-label-large-line-height);
      }

      .field {
        display: flex;
        flex: 1 1 auto;
        align-items: center;
        min-inline-size: 0;
        border: var(--border-hairline) solid var(--color-border-strong);
        border-radius: var(--radius-control);
        background: var(--color-surface);
        color: var(--color-text);
        transition:
          border-color var(--duration-control) var(--easing-control),
          box-shadow var(--duration-control) var(--easing-control);
      }

      .field:focus-within {
        border-color: var(--color-focus-ring);
        box-shadow: 0 0 0 var(--border-focus-ring) var(--color-focus-ring);
      }

      :host([disabled]) .field {
        background: var(--color-surface-sunken);
        color: var(--color-text-disabled);
      }

      .control {
        flex: 1 1 auto;
        inline-size: 100%;
        min-inline-size: 0;
        border: 0;
        outline: 0;
        padding: var(--_padding-block) var(--_padding-inline);
        background: transparent;
        color: inherit;
        font: inherit;
        font-family: var(--type-body-font-family);
        font-size: var(--_font-size);
        font-weight: var(--type-body-font-weight);
        line-height: var(--_line-height);
      }

      .control::placeholder {
        color: var(--color-text-muted);
        opacity: 1;
      }

      .control:disabled {
        cursor: not-allowed;
      }

      .prefix,
      .suffix {
        display: inline-flex;
        flex: none;
        align-items: center;
        color: var(--color-text-muted);
      }

      .prefix {
        margin-inline-start: var(--_padding-inline);
      }

      .suffix {
        margin-inline-end: var(--_padding-inline);
      }
    `,
  ];

  #onInput = (event: Event): void => {
    this.value = (event.currentTarget as HTMLInputElement).value;
  };

  formResetCallback(): void {
    this.value = this.getAttribute("value") ?? "";
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("value") || changed.has("name") || changed.has("disabled")) {
      this.#internals.setFormValue(this.disabled || !this.name ? null : this.value);
    }
  }

  protected override render(): TemplateResult {
    return html`
      <span class="field">
        <span part="prefix" class="prefix"><slot name="prefix"></slot></span>
        <input
          part="control"
          class="control"
          .value=${this.value}
          type=${this.type}
          placeholder=${this.placeholder}
          aria-label=${this.label || nothing}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          @input=${this.#onInput}
        />
        <span part="suffix" class="suffix"><slot name="suffix"></slot></span>
      </span>
    `;
  }
}
