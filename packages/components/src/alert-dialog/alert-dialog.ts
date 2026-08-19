import { type TemplateResult } from "lit";

import { UIOverlay } from "../internal/overlay.js";

/**
 * A modal dialog for an interruptive acknowledgement or confirmation.
 *
 * Unlike a visual warning card, this component moves focus and uses
 * `alertdialog` semantics. Use ordinary `ui-dialog` for non-urgent editing or
 * inspection flows.
 *
 * @tag ui-alert-dialog
 * @summary Opens a focus-contained alert dialog requiring acknowledgement.
 *
 * @example Delete record
 * <ui-alert-dialog label="Delete this record?">
 *   <ui-button slot="trigger" tone="critical">Delete</ui-button>
 *   <p>This cannot be undone.</p>
 *   <ui-button tone="critical">Delete record</ui-button>
 * </ui-alert-dialog>
 *
 * @slot trigger - Control that opens or closes the alert dialog.
 * @slot - Alert-dialog content and response actions.
 * @slot close - Direct action control or action region that closes the alert dialog after acknowledgement.
 *
 * @csspart backdrop - The dismissal boundary behind the popup.
 * @csspart popup - The semantic alert dialog surface.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<{ open: boolean }>} ui-alert-dialog-open-change - Emitted after user interaction requests a new open state.
 */
export class UIAlertDialog extends UIOverlay {
  protected readonly overlayRole = "alertdialog";
  protected override readonly modal = true;

  protected override emitOpenChange(open: boolean): void {
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>("ui-alert-dialog-open-change", {
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
