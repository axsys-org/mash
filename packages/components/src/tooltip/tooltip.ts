import { type TemplateResult } from "lit";

import { UIOverlay } from "../internal/overlay.js";

/**
 * A non-interruptive label shown on hover or focus.
 *
 * Tooltips never receive focus and should not contain actions. Put the
 * described control in `slot="trigger"`; use a popover for content that
 * needs keyboard interaction.
 *
 * @tag ui-tooltip
 * @summary Shows short descriptive text on trigger hover or focus.
 *
 * @example Compact action
 * <ui-tooltip label="Create project">
 *   <ui-button slot="trigger" aria-label="Create project">+</ui-button>
 *   Create project
 * </ui-tooltip>
 *
 * @slot trigger - Control described by the tooltip.
 * @slot - Short non-interactive tooltip text.
 *
 * @csspart backdrop - The pointer-dismissal boundary behind the tooltip.
 * @csspart popup - The semantic tooltip surface.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<{ open: boolean }>} ui-tooltip-open-change - Emitted after hover or focus requests a new open state.
 */
export class UITooltip extends UIOverlay {
  protected readonly overlayRole = "tooltip";
  protected override readonly triggerAction = "hover";
  protected override readonly movesFocus = false;

  protected override emitOpenChange(open: boolean): void {
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>("ui-tooltip-open-change", {
        bubbles: true,
        composed: true,
        detail: { open },
      }),
    );
  }

  protected override render(): TemplateResult {
    return this.renderOverlay();
  }
}
