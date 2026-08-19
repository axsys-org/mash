import { type TemplateResult } from "lit";

import { UICheckable } from "../internal/checkable.js";

/**
 * A form-associated radio option.
 *
 * `ui-radio` owns one native radio control. Place sibling options in
 * `ui-radio-group` when they represent one choice: the group supplies the
 * shared label, Arrow-key navigation, single-selection policy, and a single
 * portable value event. The component has no visual recipe of its own.
 *
 * @tag ui-radio
 * @summary Selects one value from a radio group.
 *
 * @example Project visibility
 * <ui-radio-group name="visibility" value="team" label="Visibility">
 *   <ui-radio value="private">Private</ui-radio>
 *   <ui-radio value="team">Team</ui-radio>
 * </ui-radio-group>
 *
 * @slot - Visible label for the option.
 *
 * @csspart root - The native label wrapper.
 * @csspart control - The native radio receiving focus and input.
 * @csspart label - The projected option label.
 *
 * @cssstate checked - Matches `:state(checked)` while selected.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ checked: boolean, value: string }>} ui-radio-change - Emitted after the user selects this option.
 */
export class UIRadio extends UICheckable {
  protected readonly changeEventName = "ui-radio-change";
  protected readonly controlRole = null;
  protected override readonly inputType = "radio";

  protected override render(): TemplateResult {
    return this.renderCheckable();
  }
}
