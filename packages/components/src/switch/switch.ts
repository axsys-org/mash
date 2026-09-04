import { html, type TemplateResult } from "lit";

import { UICheckable } from "../internal/checkable.js";

/** The switch's physical control scale. */
export type SwitchSize = "sm" | "small" | "md" | "medium";

/** Which side the visible label occupies relative to the track. */
export type SwitchLabelSide = "left" | "right";

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
 * @example Switch sizes
 * <div class="demo button-showcase-row">
 *   <ui-switch size="small" checked>Small</ui-switch>
 *   <ui-switch size="medium" checked>Medium</ui-switch>
 *   <ui-switch size="medium" label-side="left" checked>Label left</ui-switch>
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
 * @mashnode size size control
 * @mashnode label-side label-side label
 * @mashrole slot default label label
 */
export class UISwitch extends UICheckable {
  static override properties = {
    ...UICheckable.properties,
    size: { type: String, reflect: true },
    labelSide: { type: String, attribute: "label-side", reflect: true },
  };

  /** Semantic physical scale. `sm` and `md` aliases match compact control notation. */
  declare size: SwitchSize;
  /** Places the visible label before or after the switch track. */
  declare labelSide: SwitchLabelSide;

  protected readonly changeEventName = "ui-switch-change";
  protected readonly controlRole = "switch";

  constructor() {
    super();
    this.size = "medium";
    this.labelSide = "right";
  }

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
