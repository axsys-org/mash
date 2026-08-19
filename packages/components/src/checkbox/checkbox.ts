import { type TemplateResult } from "lit";

import { UICheckable } from "../internal/checkable.js";

/**
 * A native-form checkbox with a portable Mash behaviour contract.
 *
 * The definition contains form association, keyboard behaviour, reflected
 * state, and stable parts. It intentionally carries no visual recipe: import
 * `@mash/ui/catalogue/mash.css` to apply Mash's token-driven appearance, or
 * supply a different catalogue for another product or renderer.
 *
 * @tag ui-checkbox
 * @summary Selects an independent boolean option.
 *
 * @example Form option
 * <div class="demo button-showcase-row">
 *   <ui-checkbox name="updates" checked>Email me release notes</ui-checkbox>
 * </div>
 *
 * @slot - Visible label for the option.
 *
 * @csspart root - The native label wrapper.
 * @csspart control - The native checkbox receiving focus and input.
 * @csspart label - The projected option label.
 *
 * @cssstate checked - Matches `:state(checked)` while selected.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ checked: boolean }>} ui-checkbox-change - Emitted after user interaction changes selection.
 */
export class UICheckbox extends UICheckable {
  protected readonly changeEventName = "ui-checkbox-change";
  protected readonly controlRole = null;

  protected override render(): TemplateResult {
    return this.renderCheckable();
  }
}
