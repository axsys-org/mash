import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import type { UIRadio } from "../radio/radio.js";

/** The reading direction for a group of radio options. */
export type RadioGroupOrientation = "horizontal" | "vertical";

/**
 * Coordinates a mutually exclusive set of `ui-radio` options.
 *
 * The group makes the selection model explicit: it owns the selected `value`,
 * assigns its form `name` to options, implements Arrow-key navigation, and
 * emits one group-level change event. Options stay useful on their own, but a
 * choice list should use this element instead of recreating grouping policy.
 *
 * @tag ui-radio-group
 * @summary Coordinates a labelled, single-selection radio group.
 *
 * @example Project visibility
 * <ui-radio-group name="visibility" value="team" label="Visibility">
 *   <ui-radio value="private">Private</ui-radio>
 *   <ui-radio value="team">Team</ui-radio>
 * </ui-radio-group>
 *
 * @slot - `ui-radio` options.
 *
 * @csspart root - The semantic radiogroup container.
 *
 * @fires {CustomEvent<{ value: string }>} ui-radio-group-change - Emitted after the selected option changes.
 */
export class UIRadioGroup extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    label: { type: String, reflect: true },
    name: { type: String, reflect: true },
    value: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Accessible name for the group. */
  declare label: string;
  /** Form key assigned to each option. */
  declare name: string;
  /** Value of the currently selected option. */
  declare value: string;
  /** Logical Arrow-key axis. */
  declare orientation: RadioGroupOrientation;
  /** Prevents selection changes throughout the group. */
  declare disabled: boolean;

  constructor() {
    super();
    this.label = "Options";
    this.name = "";
    this.value = "";
    this.orientation = "vertical";
    this.disabled = false;
  }

  static override styles = baseStyles;

  #radios(): UIRadio[] {
    return [...this.querySelectorAll<UIRadio>(":scope > ui-radio")];
  }

  #syncOptions(): void {
    for (const radio of this.#radios()) {
      if (this.name) radio.name = this.name;
      radio.checked = radio.value === this.value;
      radio.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("name") || changed.has("value") || changed.has("disabled")) {
      this.#syncOptions();
    }
  }

  #onSlotChange = (): void => this.#syncOptions();

  #select(radio: UIRadio): void {
    if (this.disabled || radio.disabled || !radio.value) return;
    const changed = this.value !== radio.value;
    this.value = radio.value;
    this.#syncOptions();
    if (changed) {
      this.dispatchEvent(
        new CustomEvent<{ value: string }>("ui-radio-group-change", {
          bubbles: true,
          composed: true,
          detail: { value: this.value },
        }),
      );
    }
  }

  #onRadioChange = (event: Event): void => {
    const radio = event.target;
    if (radio instanceof HTMLElement && radio.localName === "ui-radio") {
      this.#select(radio as UIRadio);
    }
  };

  #onKeydown = (event: KeyboardEvent): void => {
    const previous = this.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const next = this.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    if (event.key !== previous && event.key !== next) return;
    const radios = this.#radios().filter((radio) => !radio.disabled);
    if (radios.length === 0) return;
    const source = event
      .composedPath()
      .find((node) => node instanceof HTMLElement && node.localName === "ui-radio");
    const index = Math.max(0, radios.indexOf(source as UIRadio));
    const delta = event.key === next ? 1 : -1;
    const target = radios[(index + delta + radios.length) % radios.length]!;
    event.preventDefault();
    this.#select(target);
    target.focus();
  };

  protected override render(): TemplateResult {
    return html`
      <div
        part="root"
        role="radiogroup"
        aria-label=${this.label}
        aria-orientation=${this.orientation}
        aria-disabled=${this.disabled ? "true" : "false"}
        @keydown=${this.#onKeydown}
        @ui-radio-change=${this.#onRadioChange}
      >
        <slot @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}
