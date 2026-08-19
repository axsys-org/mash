import { type TemplateResult } from "lit";

import { UIOverlay } from "../internal/overlay.js";

/**
 * A non-modal disclosure surface anchored to a slotted trigger.
 *
 * Popovers support interactive content without trapping focus. Dismissal by
 * Escape or an outside backdrop interaction remains consistent with dialogs.
 *
 * @tag ui-popover
 * @summary Opens a non-modal interactive disclosure surface.
 *
 * @example Project actions
 * <ui-popover label="Project actions">
 *   <ui-button slot="trigger" variant="secondary">Actions</ui-button>
 *   <ui-button variant="quiet">Duplicate</ui-button>
 * </ui-popover>
 *
 * @slot trigger - Control that opens or closes the popover.
 * @slot - Popover content.
 * @slot close - Direct action control or action region that closes the popover.
 *
 * @csspart backdrop - The dismissal boundary behind the popup.
 * @csspart popup - The semantic popover surface.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<{ open: boolean }>} ui-popover-open-change - Emitted after user interaction requests a new open state.
 */
export class UIPopover extends UIOverlay {
  protected readonly overlayRole = "dialog";

  protected override emitOpenChange(open: boolean): void {
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>("ui-popover-open-change", {
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
