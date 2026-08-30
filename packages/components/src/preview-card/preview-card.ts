import { type TemplateResult } from "lit";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  type OverlayTriggerAction,
  UIAnchoredOverlay,
} from "../internal/overlay.js";

/** Interaction that owns a preview card's visibility. */
export type PreviewCardTrigger = "hover" | "manual";

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
 *   <strong slot="title">Billing migration</strong><p slot="description">Active project</p>
 * </ui-preview-card>
 *
 * @slot trigger - Link or control that reveals the preview.
 * @slot title - Optional visible preview title; the `label` attribute is the fallback.
 * @slot description - Supporting preview description.
 * @slot - Preview content.
 *
 * @attr trigger - `hover` binds the authored trigger; `manual` lets an external gesture or focus owner call `show()` and `dismiss()`.
 *
 * @csspart trigger - The authored trigger realization.
 * @csspart backdrop - The pointer-dismissal boundary behind the preview.
 * @csspart positioner - The renderer-owned anchor-relative placement boundary.
 * @csspart popup - The semantic preview surface.
 * @csspart title - The visible preview title.
 * @csspart description - The supporting preview description.
 * @csspart content - The authored preview content.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-preview-card-open-change - Emitted after hover or focus requests a new open state and reports why.
 *
 * @mashnode root root
 * @mashnode trigger trigger root
 * @mashnode backdrop backdrop root
 * @mashnode positioner positioner backdrop
 * @mashnode placement placement positioner
 * @mashnode align align positioner
 * @mashnode offset offset positioner
 * @mashnode collision-padding collision-padding positioner
 * @mashnode popup popup positioner
 * @mashnode title title popup
 * @mashnode description description popup
 * @mashnode content content popup
 * @mashrole attribute label title title
 * @mashfallback slot title bindings attribute:label
 */
export class UIPreviewCard extends UIAnchoredOverlay {
  static override properties = {
    ...UIAnchoredOverlay.properties,
    openDelay: { type: Number, attribute: "open-delay", reflect: true },
    closeDelay: { type: Number, attribute: "close-delay", reflect: true },
    trigger: { type: String, reflect: true },
  };

  /** Delay in milliseconds before the preview opens. */
  declare openDelay: number;
  /** Grace period in milliseconds before the preview closes. */
  declare closeDelay: number;
  /** Interaction that controls visibility. */
  declare trigger: PreviewCardTrigger;

  protected readonly overlayRole = "dialog";
  protected override readonly triggerAction = "hover";
  protected override readonly movesFocus = false;
  protected override readonly rendersTitle = true;
  protected override readonly rendersDescription = true;
  protected override readonly rendersClose = false;

  constructor() {
    super();
    this.openDelay = 600;
    this.closeDelay = 300;
    this.trigger = "hover";
  }

  protected override interactionTriggerAction(): OverlayTriggerAction {
    return this.trigger;
  }

  protected override interactionDelay(open: boolean): number {
    return open ? this.openDelay : this.closeDelay;
  }

  protected override emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-preview-card-open-change", {
        bubbles: true,
        composed: true,
        detail: { open, reason },
      }),
    );
  }

  protected override render(): TemplateResult {
    return this.renderOverlay();
  }
}
