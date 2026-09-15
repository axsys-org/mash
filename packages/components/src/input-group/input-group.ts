import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import type { InputSize } from "../input/input.js";

/** Typography of the primary input, independent of surrounding action labels. */
export type InputGroupTypography = "body" | "code";

/**
 * Groups one form control with optional leading and trailing content.
 *
 * `ui-input-group` supplies only anatomy. It neither draws a control surface
 * nor supplies spacing; a recipe decides how a prefix, control, and suffix
 * should look together. This keeps a bare `ui-input` genuinely native while
 * preserving a reusable structure for search icons, units, and shortcuts.
 * `size` establishes an inherited size context. `typography="code"` changes
 * only the primary input's font; `touch-target` reserves an actual 44px native
 * input on coarse pointers. Give interactive adornments their own target policy.
 * `invalid` is an authored visual signal, not a replacement for native validity.
 *
 * @tag ui-input-group
 * @summary Groups a control with optional prefix and suffix content.
 *
 * @example Search field
 * <ui-input-group id="project-search-group">
 *   <ui-icon slot="prefix" name="action.search" label=""></ui-icon>
 *   <ui-input slot="control" type="search" label="Search"></ui-input>
 *   <ui-kbd slot="suffix" command="workspace.search" shortcut="Primary+K"></ui-kbd>
 * </ui-input-group>
 * <ui-gesture-binding for="project-search-group" gesture="key" shortcut="Primary+K" command="workspace.search"></ui-gesture-binding>
 *
 * @example Compact address editor
 * <ui-input-group size="small" typography="code" touch-target>
 *   <ui-input slot="control" label="Path" value="/projects/current"></ui-input>
 *   <ui-button slot="suffix" size="small" variant="ghost" touch-target>Open</ui-button>
 * </ui-input-group>
 *
 * @slot prefix - Optional content before the control.
 * @slot control - Exactly one native or Mash form control.
 * @slot suffix - Optional content after the control.
 *
 * @csspart root - The group wrapper.
 * @csspart prefix - The wrapper around the `prefix` slot.
 * @csspart prefix-separator - The optional boundary between prefix and control.
 * @csspart control - The wrapper around the primary `control` slot.
 * @csspart suffix-separator - The optional boundary between control and suffix.
 * @csspart suffix - The wrapper around the `suffix` slot.
 *
 * @cssstate has-prefix - Matches while authored prefix content is present.
 * @cssstate has-control - Matches while the required control content is present.
 * @cssstate has-suffix - Matches while authored suffix content is present.
 *
 * @mashnode root root
 * @mashnode prefix prefix root
 * @mashnode prefix-separator separator root
 * @mashnode control control root
 * @mashnode suffix-separator separator root
 * @mashnode suffix suffix root
 * @mashnode size size root
 * @mashaxis size control-size
 * @mashnode typography typography control
 * @mashnode touchTarget touch-target control
 * @mashnode invalid invalid control
 * @mashrole slot prefix prefix prefix
 * @mashrole slot control control control
 * @mashrole slot suffix suffix suffix
 */
export class UIInputGroup extends LitElement {
  static override properties = {
    size: { type: String, reflect: true },
    typography: { type: String, reflect: true },
    touchTarget: { type: Boolean, attribute: "touch-target", reflect: true },
    invalid: { type: Boolean, reflect: true },
    _hasPrefix: { type: Boolean, state: true },
    _hasControl: { type: Boolean, state: true },
    _hasSuffix: { type: Boolean, state: true },
  };

  /** Physical scale inherited by the primary control and unsized adornments. */
  declare size: InputSize;
  /** Primary input typography; action labels retain their own body font. */
  declare typography: InputGroupTypography;
  /** Reserves a real 44px minimum primary input target on coarse pointers. */
  declare touchTarget: boolean;
  /** Authored visual invalid state; native/Mash child validity is also styled automatically. */
  declare invalid: boolean;
  declare private _hasPrefix: boolean;
  declare private _hasControl: boolean;
  declare private _hasSuffix: boolean;
  readonly #internals: ElementInternals;
  readonly #visibilityObserver = new MutationObserver(() => this.#syncSlots());

  constructor() {
    super();
    this.size = "inherit";
    this.typography = "body";
    this.touchTarget = false;
    this.invalid = false;
    this._hasPrefix = false;
    this._hasControl = false;
    this._hasSuffix = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#visibilityObserver.observe(this, {
      attributes: true,
      attributeFilter: ["hidden", "slot"],
      childList: true,
      subtree: true,
    });
    void this.updateComplete.then(() => {
      if (this.isConnected) this.#syncSlots();
    });
  }

  override disconnectedCallback(): void {
    this.#visibilityObserver.disconnect();
    super.disconnectedCallback();
  }

  #syncSlots = (): void => {
    for (const slot of this.renderRoot.querySelectorAll<HTMLSlotElement>("slot")) {
      this.#syncSlot(slot);
    }
  };

  #syncSlot(slot: HTMLSlotElement): void {
    const hasContent = slot.assignedNodes({ flatten: true }).some((node) => {
      if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
      return node instanceof Element && !node.hasAttribute("hidden");
    });
    if (slot.name === "prefix") {
      this._hasPrefix = hasContent;
      if (hasContent) this.#internals.states.add("has-prefix");
      else this.#internals.states.delete("has-prefix");
    } else if (slot.name === "control") {
      this._hasControl = hasContent;
      if (hasContent) this.#internals.states.add("has-control");
      else this.#internals.states.delete("has-control");
    } else if (slot.name === "suffix") {
      this._hasSuffix = hasContent;
      if (hasContent) this.#internals.states.add("has-suffix");
      else this.#internals.states.delete("has-suffix");
    }
  }

  #onSlotChange = (event: Event): void => this.#syncSlot(event.target as HTMLSlotElement);

  protected override render(): TemplateResult {
    return html`
      <span part="root">
        <span part="prefix" ?hidden=${!this._hasPrefix}>
          <slot name="prefix" @slotchange=${this.#onSlotChange}></slot>
        </span>
        <span part="prefix-separator" ?hidden=${!this._hasPrefix} aria-hidden="true"></span>
        <span part="control" ?hidden=${!this._hasControl}
          ><slot name="control" @slotchange=${this.#onSlotChange}></slot
        ></span>
        <span part="suffix-separator" ?hidden=${!this._hasSuffix} aria-hidden="true"></span>
        <span part="suffix" ?hidden=${!this._hasSuffix}>
          <slot name="suffix" @slotchange=${this.#onSlotChange}></slot>
        </span>
      </span>
    `;
  }
}
