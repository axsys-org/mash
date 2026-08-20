import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A pressable on/off control.
 *
 * It is intentionally just a semantic native button plus reflected state. The
 * Mash catalogue owns presentation through `::part(control)`; no visual choice
 * is baked into the interaction primitive.
 *
 * @tag ui-toggle
 * @summary Toggles an independent pressed state.
 *
 * @example Formatting control
 * <div class="demo button-showcase-row">
 *   <ui-toggle pressed>Bold</ui-toggle>
 * </div>
 *
 * @slot - Toggle label or icon content.
 *
 * @csspart control - The native button that owns keyboard interaction.
 * @csspart label - The authored toggle label.
 *
 * @cssstate pressed - Matches `:state(pressed)` while active.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ pressed: boolean }>} ui-toggle-change - Emitted after activation changes the pressed state.
 *
 * @mashnode control control
 * @mashnode label label control
 * @mashrole slot default label label
 */
export class UIToggle extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    pressed: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    value: { type: String, reflect: true },
  };

  static override styles = baseStyles;

  /** Whether the toggle is active. */
  declare pressed: boolean;
  /** Prevents activation. */
  declare disabled: boolean;
  /** Optional application-level value, used by a parent toggle group. */
  declare value: string;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.pressed = false;
    this.disabled = false;
    this.value = "";
    this.#internals = this.attachInternals();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("pressed") || changed.has("disabled")) {
      const states = this.#internals.states;
      if (this.pressed) states.add("pressed");
      else states.delete("pressed");
      if (this.disabled) states.add("disabled");
      else states.delete("disabled");
    }
  }

  #onClick = (): void => {
    if (this.disabled) return;
    this.pressed = !this.pressed;
    this.dispatchEvent(
      new CustomEvent<{ pressed: boolean }>("ui-toggle-change", {
        bubbles: true,
        composed: true,
        detail: { pressed: this.pressed },
      }),
    );
  };

  protected override render(): TemplateResult {
    return html`
      <button
        part="control"
        type="button"
        aria-pressed=${this.pressed ? "true" : "false"}
        ?disabled=${this.disabled}
        @click=${this.#onClick}
      >
        <slot part="label"></slot>
      </button>
    `;
  }
}
