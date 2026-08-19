import { type TemplateResult } from "lit";

import { UIOverlay } from "../internal/overlay.js";

/**
 * A hover/focus preview surface for an existing trigger link or control.
 *
 * Preview cards expose rich but non-essential context. They are deliberately
 * non-modal and do not move focus; an action-heavy preview should use a
 * popover instead.
 *
 * @tag ui-preview-card
 * @summary Reveals non-interruptive rich context on hover or focus.
 *
 * @example Project preview
 * <ui-preview-card label="Billing migration preview">
 *   <a slot="trigger" href="/projects/billing">Billing migration</a>
 *   <strong>Billing migration</strong><p>Active project</p>
 * </ui-preview-card>
 *
 * @slot trigger - Link or control that reveals the preview.
 * @slot - Preview content.
 *
 * @csspart backdrop - The pointer-dismissal boundary behind the preview.
 * @csspart popup - The semantic preview surface.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<{ open: boolean }>} ui-preview-card-open-change - Emitted after hover or focus requests a new open state.
 */
export class UIPreviewCard extends UIOverlay {
  protected readonly overlayRole = "dialog";
  protected override readonly triggerAction = "hover";
  protected override readonly movesFocus = false;

  protected override emitOpenChange(open: boolean): void {
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>("ui-preview-card-open-change", {
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
