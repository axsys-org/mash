import { html, type TemplateResult } from "lit";

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
 * @slot track - Optional authored content within the switch track.
 * @slot thumb - Optional authored content within the movable switch thumb.
 *
 * @csspart root - The native label wrapper.
 * @csspart control - The native checkbox exposed as a `switch`.
 * @csspart track - The independently styleable switch track.
 * @csspart thumb - The independently styleable switch thumb.
 * @csspart label - The projected setting label.
 *
 * @cssstate checked - Matches `:state(checked)` while on.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate required - Matches `:state(required)` while selection is required.
 *
 * @fires {CustomEvent<{ checked: boolean }>} ui-switch-change - Emitted after user interaction changes the setting.
 *
 * @mashnode root root
 * @mashnode control control root
 * @mashnode track track control
 * @mashnode thumb thumb track
 * @mashnode label label root
 * @mashnode checked checked control
 * @mashnode disabled disabled control
 * @mashnode required required control
 * @mashnode name name control
 * @mashnode value value control
 * @mashrole slot default label label
 */
export class UISwitch extends UICheckable {
  protected readonly changeEventName = "ui-switch-change";
  protected readonly controlRole = "switch";

  protected override renderCheckableParts(): TemplateResult {
    return html`
      <span part="track">
        <slot name="track"></slot>
        <span part="thumb"><slot name="thumb"></slot></span>
      </span>
    `;
  }

  protected override render(): TemplateResult {
    return this.renderCheckable();
  }
}
