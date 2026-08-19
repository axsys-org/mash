import { type TemplateResult } from "lit";

import { UIOverlay } from "../internal/overlay.js";

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
 *
 * @csspart backdrop - The dismissal boundary behind the menu.
 * @csspart popup - The semantic context menu surface.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<{ open: boolean }>} ui-context-menu-open-change - Emitted after user interaction requests a new open state.
 * @fires {CustomEvent<{ value: string }>} ui-context-menu-select - Emitted when a menu item is selected.
 */
export class UIContextMenu extends UIOverlay {
  protected readonly overlayRole = "menu";
  protected override readonly triggerAction = "contextmenu";

  constructor() {
    super();
    this.addEventListener("ui-menu-item-select", this.#onItemSelect);
  }

  protected override emitOpenChange(open: boolean): void {
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>("ui-context-menu-open-change", {
        bubbles: true,
        composed: true,
        detail: { open },
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
    this.requestOpenChange(false);
  };

  protected override render(): TemplateResult {
    return this.renderOverlay();
  }
}
