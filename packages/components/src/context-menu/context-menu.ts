import { type TemplateResult } from "lit";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIAnchoredOverlay,
} from "../internal/overlay.js";

/**
 * A context-triggered command menu.
 *
 * The trigger opens with the platform context-menu gesture and preserves the
 * normal menu-item selection contract. A catalogue can position the popup at
 * the pointer; its semantic command and keyboard behaviour are shared.
 *
 * @tag ui-context-menu
 * @summary Opens a command menu from a context-menu gesture.
 *
 * @example Project row context menu
 * <ui-context-menu label="Project actions">
 *   <span slot="trigger">Billing migration</span>
 *   <ui-menu-item value="copy-path">Copy path</ui-menu-item>
 * </ui-context-menu>
 *
 * @slot trigger - Surface that receives the context-menu gesture.
 * @slot - `ui-menu-item` commands.
 * @slot close - Optional control that dismisses the menu.
 *
 * @csspart trigger - The authored trigger realization.
 * @csspart backdrop - The dismissal boundary behind the menu.
 * @csspart positioner - The renderer-owned anchor-relative placement boundary.
 * @csspart popup - The semantic context menu surface.
 * @csspart actions - The authored context-menu commands.
 * @csspart close - The authored close action realization.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-context-menu-open-change - Emitted after user interaction requests a new open state and reports why.
 * @fires {CustomEvent<{ value: string }>} ui-context-menu-select - Emitted when a menu item is selected.
 *
 * @mashnode trigger trigger
 * @mashnode backdrop backdrop
 * @mashnode positioner positioner backdrop
 * @mashnode placement placement positioner
 * @mashnode align align positioner
 * @mashnode offset offset positioner
 * @mashnode collision-padding collision-padding positioner
 * @mashnode popup popup positioner
 * @mashnode actions actions popup
 * @mashnode close close popup
 * @mashrole slot default actions actions
 */
export class UIContextMenu extends UIAnchoredOverlay {
  protected readonly overlayRole = "menu";
  protected override readonly triggerAction = "contextmenu";
  protected override readonly authoredContentPart = "actions";

  constructor() {
    super();
    this.addEventListener("ui-menu-item-select", this.#onItemSelect);
  }

  protected override emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-context-menu-open-change", {
        bubbles: true,
        composed: true,
        detail: { open, reason },
      }),
    );
  }

  #onItemSelect = (event: Event): void => {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-context-menu-select", {
        bubbles: true,
        composed: true,
        detail: { value },
      }),
    );
    this.requestOpenChange(false, "select");
  };

  protected override render(): TemplateResult {
    return this.renderOverlay();
  }
}
