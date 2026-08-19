import { type TemplateResult } from "lit";

import { UIOverlay } from "../internal/overlay.js";

/**
 * A modal dialog with managed focus and a slotted trigger.
 *
 * Put the activator in `slot="trigger"`; arbitrary title, message, controls,
 * and form content belong in the default slot. The application may set `open`
 * directly, while user actions emit a portable state-change event.
 *
 * @tag ui-dialog
 * @summary Opens a modal, focus-contained dialog surface.
 *
 * @example Rename project
 * <ui-dialog label="Rename project">
 *   <ui-button slot="trigger">Rename</ui-button>
 *   <ui-field label="Name"><ui-input slot="control" name="name"></ui-input></ui-field>
 * </ui-dialog>
 *
 * @slot trigger - Control that opens or closes the dialog.
 * @slot - Dialog content.
 * @slot close - Direct action control or action region that closes the dialog after completion or cancellation.
 *
 * @csspart backdrop - The dismissal boundary behind the popup.
 * @csspart popup - The semantic dialog surface.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<{ open: boolean }>} ui-dialog-open-change - Emitted after user interaction requests a new open state.
 */
export class UIDialog extends UIOverlay {
  protected readonly overlayRole = "dialog";
  protected override readonly modal = true;

  protected override emitOpenChange(open: boolean): void {
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>("ui-dialog-open-change", {
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
