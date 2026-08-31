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
 * <ui-input-group id="project-search-group">
 *   <ui-icon slot="prefix" name="action.search" label=""></ui-icon>
 *   <ui-input slot="control" type="search" label="Search"></ui-input>
 *   <ui-kbd slot="suffix" command="workspace.search" shortcut="Primary+K"></ui-kbd>
 * </ui-input-group>
 * <ui-gesture-binding for="project-search-group" gesture="key" shortcut="Primary+K" command="workspace.search"></ui-gesture-binding>
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
 * @cssstate has-suffix - Matches while authored suffix content is present.
 *
 * @mashnode root root
 * @mashnode prefix prefix root
 * @mashnode prefix-separator separator root
 * @mashnode control control root
 * @mashnode suffix-separator separator root
 * @mashnode suffix suffix root
 * @mashrole slot prefix prefix prefix
 * @mashrole slot control control control
 * @mashrole slot suffix suffix suffix
 */
export class UIInputGroup extends LitElement {
  static override properties = {
    _hasPrefix: { type: Boolean, state: true },
    _hasSuffix: { type: Boolean, state: true },
  };

  declare private _hasPrefix: boolean;
  declare private _hasSuffix: boolean;
  readonly #internals: ElementInternals;

  constructor() {
    super();
    this._hasPrefix = false;
    this._hasSuffix = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const hasContent = slot.assignedNodes({ flatten: true }).length > 0;
    if (slot.name === "prefix") {
      this._hasPrefix = hasContent;
      if (hasContent) this.#internals.states.add("has-prefix");
      else this.#internals.states.delete("has-prefix");
    } else if (slot.name === "suffix") {
      this._hasSuffix = hasContent;
      if (hasContent) this.#internals.states.add("has-suffix");
      else this.#internals.states.delete("has-suffix");
    }
  };

  protected override render(): TemplateResult {
    return html`
      <span part="root">
        <span part="prefix" ?hidden=${!this._hasPrefix}>
          <slot name="prefix" @slotchange=${this.#onSlotChange}></slot>
        </span>
        <span part="prefix-separator" ?hidden=${!this._hasPrefix} aria-hidden="true"></span>
        <span part="control"><slot name="control"></slot></span>
        <span part="suffix-separator" ?hidden=${!this._hasSuffix} aria-hidden="true"></span>
        <span part="suffix" ?hidden=${!this._hasSuffix}>
          <slot name="suffix" @slotchange=${this.#onSlotChange}></slot>
        </span>
      </span>
    `;
  }
}
