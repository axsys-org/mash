import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import type { UIToggle } from "../toggle/toggle.js";

/** Selection policy for a toggle group. */
export type ToggleGroupMode = "single" | "multiple";
/** The reading direction for a toggle group. */
export type ToggleGroupOrientation = "horizontal" | "vertical";

/**
 * Coordinates related `ui-toggle` controls as a single- or multi-select set.
 *
 * The group deliberately owns only selection policy and roving Arrow-key
 * focus. It never paints the children; a catalogue can arrange its stable
 * `root` part as a segmented control, toolbar cluster, or another context.
 *
 * @tag ui-toggle-group
 * @summary Coordinates a group of pressed-state toggles.
 *
 * @example Text alignment
 * <ui-toggle-group mode="single" value="center" label="Text alignment">
 *   <ui-toggle value="left">Left</ui-toggle>
 *   <ui-toggle value="center">Center</ui-toggle>
 *   <ui-toggle value="right">Right</ui-toggle>
 * </ui-toggle-group>
 *
 * @slot - `ui-toggle` controls.
 *
 * @csspart root - The semantic group container.
 * @csspart children - The authored toggle collection.
 * @cssstate disabled - Matches `:state(disabled)` while activation is unavailable.
 *
 * @fires {CustomEvent<{ values: string[] }>} ui-toggle-group-change - Emitted after the active value set changes.
 *
 * @mashnode root root
 * @mashnode children children root
 * @mashnode disabled disabled root
 * @mashrole slot default children children
 */
export class UIToggleGroup extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    label: { type: String, reflect: true },
    mode: { type: String, reflect: true },
    value: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Accessible name for the group. */
  declare label: string;
  /** Whether one or many items can be active. */
  declare mode: ToggleGroupMode;
  /** Selected value for single-select mode. */
  declare value: string;
  /** Logical Arrow-key axis. */
  declare orientation: ToggleGroupOrientation;
  /** Prevents activation throughout the group. */
  declare disabled: boolean;

  readonly #groupChildren = new Set<UIToggle>();
  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.label = "Options";
    this.mode = "single";
    this.value = "";
    this.orientation = "horizontal";
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  #toggles(): UIToggle[] {
    return [...this.querySelectorAll<UIToggle>(":scope > ui-toggle")];
  }

  #syncOptions(): void {
    const children = this.#toggles();
    for (const child of this.#groupChildren) {
      if (!children.includes(child)) {
        child._setGroupDisabled(false);
        this.#groupChildren.delete(child);
      }
    }
    for (const toggle of children) {
      this.#groupChildren.add(toggle);
      toggle._setGroupDisabled(this.disabled);
      if (this.mode === "single") toggle.pressed = toggle.value === this.value;
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("value") || changed.has("mode") || changed.has("disabled")) {
      this.#syncOptions();
    }
    if (changed.has("disabled")) {
      if (this.disabled) this.#internals.states.add("disabled");
      else this.#internals.states.delete("disabled");
    }
  }

  #onSlotChange = (): void => this.#syncOptions();

  #emitChange(): void {
    this.dispatchEvent(
      new CustomEvent<{ values: string[] }>("ui-toggle-group-change", {
        bubbles: true,
        composed: true,
        detail: {
          values: this.#toggles()
            .filter((toggle) => toggle.pressed)
            .map((toggle) => toggle.value),
        },
      }),
    );
  }

  #onToggleChange = (event: Event): void => {
    const toggle = event.target;
    if (!(toggle instanceof HTMLElement) || toggle.localName !== "ui-toggle" || this.disabled)
      return;
    const option = toggle as UIToggle;
    if (!this.#toggles().includes(option)) return;
    if (this.mode === "single") {
      this.value = option.pressed ? option.value : "";
      this.#syncOptions();
    }
    this.#emitChange();
  };

  #onKeydown = (event: KeyboardEvent): void => {
    const rtl = getComputedStyle(this).direction === "rtl";
    const previous =
      this.orientation === "horizontal" ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
    const next =
      this.orientation === "horizontal" ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
    if (event.key !== previous && event.key !== next) return;
    const options = this.#toggles().filter((toggle) => !toggle.disabled);
    if (options.length === 0) return;
    const source = event
      .composedPath()
      .find((node) => node instanceof HTMLElement && node.localName === "ui-toggle");
    const index = Math.max(0, options.indexOf(source as UIToggle));
    const target =
      options[(index + (event.key === next ? 1 : -1) + options.length) % options.length]!;
    event.preventDefault();
    target.focus();
  };

  protected override render(): TemplateResult {
    return html`
      <div
        part="root"
        role="group"
        aria-label=${this.label}
        aria-orientation=${this.orientation}
        aria-disabled=${this.disabled ? "true" : "false"}
        @keydown=${this.#onKeydown}
        @ui-toggle-change=${this.#onToggleChange}
      >
        <slot part="children" @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}
