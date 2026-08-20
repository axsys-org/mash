import { html, type TemplateResult } from "lit";

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
 * @slot indicator - Optional authored selection indicator content.
 *
 * @csspart root - The native label wrapper.
 * @csspart control - The native radio receiving focus and input.
 * @csspart indicator - The independently styleable selection indicator.
 * @csspart label - The projected option label.
 *
 * @cssstate checked - Matches `:state(checked)` while selected.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate required - Matches `:state(required)` while selection is required.
 *
 * @fires {CustomEvent<{ checked: boolean, value: string }>} ui-radio-change - Emitted after the user selects this option.
 *
 * @mashnode root root
 * @mashnode control control root
 * @mashnode indicator indicator control
 * @mashnode label label root
 * @mashnode checked checked control
 * @mashnode disabled disabled control
 * @mashnode required required control
 * @mashnode name name control
 * @mashnode value value control
 * @mashnode position position control
 * @mashnode set-size set-size control
 * @mashrole slot default label label
 */
export class UIRadio extends UICheckable {
  static override properties = {
    ...UICheckable.properties,
    position: { type: Number, reflect: true },
    setSize: { type: Number, attribute: "set-size", reflect: true },
  };

  /** One-based position assigned by the owning radio group. */
  declare position: number;
  /** Total option count assigned by the owning radio group. */
  declare setSize: number;

  protected readonly changeEventName = "ui-radio-change";
  protected readonly controlRole = null;
  protected override readonly inputType = "radio";

  constructor() {
    super();
    this.position = 0;
    this.setSize = 0;
  }

  protected override get collectionPosition(): number | undefined {
    return this.position > 0 ? this.position : undefined;
  }

  protected override get collectionSize(): number | undefined {
    return this.setSize > 0 ? this.setSize : undefined;
  }

  protected override renderCheckableParts(): TemplateResult {
    return html`<span part="indicator"><slot name="indicator"></slot></span>`;
  }

  protected override checkableChangeDetail(): Record<string, unknown> {
    return { checked: this.checked, value: this.value };
  }

  protected override render(): TemplateResult {
    return this.renderCheckable();
  }
}
