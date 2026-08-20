import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * Groups one form control with optional leading and trailing content.
 *
 * `ui-input-group` supplies only anatomy. It neither draws a control surface
 * nor supplies spacing; a recipe decides how a prefix, control, and suffix
 * should look together. This keeps a bare `ui-input` genuinely native while
 * preserving a reusable structure for search icons, units, and shortcuts.
 *
 * @tag ui-input-group
 * @summary Groups a control with optional prefix and suffix content.
 *
 * @example Search field
 * <ui-input-group>
 *   <span slot="prefix" aria-hidden="true">⌕</span>
 *   <ui-input slot="control" type="search" label="Search"></ui-input>
 *   <ui-kbd slot="suffix">⌘ K</ui-kbd>
 * </ui-input-group>
 *
 * @slot prefix - Optional content before the control.
 * @slot control - Exactly one native or Mash form control.
 * @slot suffix - Optional content after the control.
 *
 * @csspart root - The group wrapper.
 * @csspart prefix - The wrapper around the `prefix` slot.
 * @csspart control - The wrapper around the primary `control` slot.
 * @csspart suffix - The wrapper around the `suffix` slot.
 *
 * @mashnode root root
 * @mashnode prefix prefix root
 * @mashnode control control root
 * @mashnode suffix suffix root
 */
export class UIInputGroup extends LitElement {
  static override properties = {
    _hasPrefix: { type: Boolean, state: true },
    _hasSuffix: { type: Boolean, state: true },
  };

  declare private _hasPrefix: boolean;
  declare private _hasSuffix: boolean;

  constructor() {
    super();
    this._hasPrefix = false;
    this._hasSuffix = false;
  }

  static override styles = baseStyles;

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const hasContent = slot.assignedNodes({ flatten: true }).length > 0;
    if (slot.name === "prefix") this._hasPrefix = hasContent;
    else if (slot.name === "suffix") this._hasSuffix = hasContent;
  };

  protected override render(): TemplateResult {
    return html`
      <span part="root">
        <span part="prefix" ?hidden=${!this._hasPrefix}>
          <slot name="prefix" @slotchange=${this.#onSlotChange}></slot>
        </span>
        <span part="control"><slot name="control"></slot></span>
        <span part="suffix" ?hidden=${!this._hasSuffix}>
          <slot name="suffix" @slotchange=${this.#onSlotChange}></slot>
        </span>
      </span>
    `;
  }
}
