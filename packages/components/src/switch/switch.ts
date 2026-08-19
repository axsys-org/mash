import { type TemplateResult } from "lit";

import { UICheckable } from "../internal/checkable.js";

/**
 * A binary setting exposed with switch semantics.
 *
 * Like `ui-checkbox`, this is a behaviour-only definition. A Mash catalogue
 * styles its stable parts, while another product can present the same state and
 * event contract in its own visual language.
 *
 * @tag ui-switch
 * @summary Turns a binary setting on or off.
 *
 * @example Setting
 * <div class="demo button-showcase-row">
 *   <ui-switch name="desktop-notifications" checked>Desktop notifications</ui-switch>
 * </div>
 *
 * @slot - Visible label for the setting.
 *
 * @csspart root - The native label wrapper.
 * @csspart control - The native checkbox exposed as a `switch`.
 * @csspart label - The projected setting label.
 *
 * @cssstate checked - Matches `:state(checked)` while on.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ checked: boolean }>} ui-switch-change - Emitted after user interaction changes the setting.
 */
export class UISwitch extends UICheckable {
  protected readonly changeEventName = "ui-switch-change";
  protected readonly controlRole = "switch";

  protected override render(): TemplateResult {
    return this.renderCheckable();
  }
}
