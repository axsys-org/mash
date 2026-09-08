import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** How much visual weight the button carries. Orthogonal to {@link ButtonTone}. */
export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "danger"
  | "warning"
  | "success"
  | "info"
  | "quiet"
  | "ghost"
  | "link"
  | "text";

/** The button's physical scale. Inherit uses the surrounding data-mash-size context. */
export type ButtonSize =
  "inherit" | "xs" | "xsmall" | "sm" | "small" | "md" | "medium" | "lg" | "large";

/** What the button's action *means*. Orthogonal to {@link ButtonVariant}. */
export type ButtonTone = "accent" | "neutral" | "info" | "positive" | "warning" | "critical";

/** How the button behaves inside a form. Mirrors the native `<button type>` attribute. */
export type ButtonType = "button" | "submit" | "reset";

/**
 * A button.
 *
 * Two independent axes describe every button in the system. `variant` controls
 * emphasis — how loudly it asks to be pressed. `tone` controls meaning — what
 * kind of thing happens when it is. They compose freely: a `ghost` `critical`
 * button is a low-emphasis destructive action, and needs no special casing.
 *
 * Status variants map directly onto semantic tones: `danger`, `warning`,
 * `success`, and `info` are accepted as aliases for Mash meaning roles;
 * `primary`, `secondary`, `ghost`, `link`, and `text` are emphasis variants.
 * The older Mash name `quiet` remains as an alias for `ghost`.
 *
 * The element is form-associated, so a `submit` button submits its containing
 * form even though the real `<button>` lives inside a shadow root.
 *
 * The component intentionally exposes no visual CSS contract of its own. A
 * catalogue recipe can interpret its stable parts and reflected state with any
 * token system, while an application can omit that recipe and keep the native
 * control behaviour.
 *
 * @tag ui-button
 * @summary Triggers an action. The primary interactive control of the system.
 *
 * @example Variants
 * <div data-mash-catalogue="mash" class="mash-row mash-wrap" data-mash-size="small">
 *   <ui-button>Default</ui-button>
 *   <ui-button variant="primary">Primary</ui-button>
 *   <ui-button variant="secondary">Secondary</ui-button>
 *   <ui-button variant="ghost">Ghost</ui-button>
 *   <ui-button variant="link">Link</ui-button>
 * </div>
 *
 * @example Meaning
 * <div data-mash-catalogue="mash" class="mash-row mash-wrap" data-mash-size="small">
 *   <ui-button tone="positive">Success</ui-button>
 *   <ui-button tone="warning">Warning</ui-button>
 *   <ui-button tone="critical">Danger</ui-button>
 *   <ui-button tone="info">Information</ui-button>
 * </div>
 *
 * @slot - The button's label.
 * @slot prefix - Content placed before the label, typically an icon. Hidden while loading.
 * @slot suffix - Content placed after the label, typically a chevron or badge.
 *
 * @csspart control - The native `<button>`. The styling escape hatch of last resort.
 * @csspart prefix - The wrapper around the `prefix` slot.
 * @csspart label - The wrapper around the default slot.
 * @csspart suffix - The wrapper around the `suffix` slot.
 * @csspart caret - The dropdown caret, present only while `dropdown-caret` is set.
 * @csspart spinner - The loading indicator, present only while `loading` is set.
 *
 * @cssstate loading - Matches `:state(loading)` while an async action is in flight.
 * @cssstate selected - Matches `:state(selected)` while an owning composite keeps the action selected.
 * @cssstate pressed - Matches `:state(pressed)` while the button is actively held down.
 * @cssstate disabled - Matches `:state(disabled)` while activation is unavailable.
 *
 * @fires {PointerEvent} click - The button's behavioural output. Retargeted to the
 *   host, so listeners attach to `<ui-button>` directly. Suppressed entirely while
 *   `disabled` or `loading`.
 *
 * @mashnode control control
 * @mashnode prefix prefix control
 * @mashnode label label control
 * @mashnode suffix suffix control
 * @mashnode caret caret suffix
 * @mashnode spinner spinner control
 * @mashnode variant variant control
 * @mashnode size size control
 * @mashaxis size control-size
 * @mashnode tone tone control
 * @mashnode compact compact control
 * @mashnode outline outline control
 * @mashnode dropdownCaret dropdown-caret suffix
 * @mashnode disabled disabled control
 * @mashnode loading loading control
 * @mashnode selected selected control
 * @mashnode pressed pressed control
 * @mashnode type type control
 * @mashnode name name control
 * @mashnode value value control
 * @mashnode activate activate control
 * @mashrole slot default label label
 */
export class UIButton extends LitElement {
  /** Lets the element participate in form submission and reset from inside its shadow root. */
  static formAssociated = true;

  /**
   * Focus is delegated to the inner `<button>`, so `buttonEl.focus()`,
   * tab order and `:focus-visible` all behave as if the host were the control.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    tone: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
    compact: { type: Boolean, reflect: true },
    outline: { type: Boolean, reflect: true },
    dropdownCaret: { type: Boolean, attribute: "dropdown-caret", reflect: true },
    type: { type: String, reflect: true },
    name: { type: String, reflect: true },
    value: { type: String, reflect: true },
    _hasPrefix: { type: Boolean, state: true },
    _hasSuffix: { type: Boolean, state: true },
  };

  /** Visual emphasis. */
  declare variant: ButtonVariant;
  /** Physical scale; inherit follows the nearest data-mash-size context. */
  declare size: ButtonSize;
  /** Semantic meaning of the action. */
  declare tone: ButtonTone;
  /** Prevents interaction and removes the button from the tab order. */
  declare disabled: boolean;
  /** Shows a spinner and suppresses interaction while an action is in flight. */
  declare loading: boolean;
  /** Parent-controlled presentation state for persistent triggers such as an open popover. */
  declare selected: boolean;
  /** Reduces the inline padding while preserving the current size tier. */
  declare compact: boolean;
  /** Draws an outlined treatment that can combine with any tone. */
  declare outline: boolean;
  /** Adds the built-in dropdown caret after any authored suffix content. */
  declare dropdownCaret: boolean;
  /** Form behaviour, mirroring native `<button type>`. */
  declare type: ButtonType;
  /** Form control name, submitted with the form. */
  declare name: string;
  /** Form control value, submitted with the form. */
  declare value: string;
  declare private _hasPrefix: boolean;
  declare private _hasSuffix: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.variant = "default";
    this.size = "inherit";
    this.tone = "accent";
    this.disabled = false;
    this.loading = false;
    this.selected = false;
    this.compact = false;
    this.outline = false;
    this.dropdownCaret = false;
    this.type = "button";
    this.name = "";
    this.value = "";
    this._hasPrefix = false;
    this._hasSuffix = false;

    this.#internals = this.attachInternals();

    // Both listeners live on the host, and the order is deliberate.
    //
    // The capture listener runs first and drops the event entirely when the
    // button is inert — the inner button's own `disabled` cannot stop a click
    // that landed on the host, or one dispatched by `.click()`.
    //
    // Activation then listens in the bubble phase, again on the host, so that
    // it sees every click the same way: one that started on the inner button
    // and bubbled up, and one dispatched directly at the host. Binding it to
    // the inner button instead would silently ignore the latter.
    this.addEventListener("click", this.#onHostClick, { capture: true });
    this.addEventListener("click", this.#onActivate);
  }

  static override styles = baseStyles;

  /** True when the button cannot currently be activated. */
  get #inert(): boolean {
    return this.disabled || this.loading;
  }

  #onHostClick = (event: MouseEvent): void => {
    if (!this.#inert) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #onActivate = (): void => {
    if (this.#inert) return;

    // The inner <button> is `type="button"`, so nothing happens implicitly.
    // Form behaviour is driven explicitly through ElementInternals, which is
    // the only way to reach the form across a shadow boundary.
    const form = this.#internals.form;
    if (!form) return;

    if (this.type === "submit") form.requestSubmit();
    else if (this.type === "reset") form.reset();
  };

  #setPressed = (pressed: boolean): void => {
    if (pressed && !this.#inert) this.#internals.states.add("pressed");
    else this.#internals.states.delete("pressed");
  };

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const hasContent = slot.assignedNodes({ flatten: true }).length > 0;
    if (slot.name === "prefix") this._hasPrefix = hasContent;
    else if (slot.name === "suffix") this._hasSuffix = hasContent;
  };

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("loading")) {
      if (this.loading) this.#internals.states.add("loading");
      else this.#internals.states.delete("loading");
    }
    if (changed.has("disabled")) {
      if (this.disabled) this.#internals.states.add("disabled");
      else this.#internals.states.delete("disabled");
    }
    if (changed.has("selected")) {
      if (this.selected) this.#internals.states.add("selected");
      else this.#internals.states.delete("selected");
    }

    // A button that goes inert mid-press must not stay stuck in :state(pressed).
    if ((changed.has("disabled") || changed.has("loading")) && this.#inert) {
      this.#internals.states.delete("pressed");
    }
  }

  protected override render(): TemplateResult {
    const hasSuffix = this._hasSuffix || this.dropdownCaret;

    return html`
      <button
        part="control"
        class="control"
        type="button"
        ?disabled=${this.#inert}
        aria-busy=${this.loading ? "true" : "false"}
        @pointerdown=${() => this.#setPressed(true)}
        @pointerup=${() => this.#setPressed(false)}
        @pointercancel=${() => this.#setPressed(false)}
        @pointerleave=${() => this.#setPressed(false)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === " " || e.key === "Enter") this.#setPressed(true);
        }}
        @keyup=${() => this.#setPressed(false)}
        @blur=${() => this.#setPressed(false)}
      >
        <span part="prefix" class="prefix" ?hidden=${!this.loading && !this._hasPrefix}>
          ${
            this.loading
              ? html`<span part="spinner" class="spinner" aria-hidden="true"></span>`
              : html`<slot name="prefix" @slotchange=${this.#onSlotChange}></slot>`
          }
        </span>

        <span part="label" class="label"><slot></slot></span>

        <span part="suffix" class="suffix" ?hidden=${!hasSuffix}>
          <slot name="suffix" @slotchange=${this.#onSlotChange}></slot>
          ${
            this.dropdownCaret
              ? html`<span part="caret" class="caret" aria-hidden="true"></span>`
              : nothing
          }
        </span>
      </button>
    `;
  }
}
