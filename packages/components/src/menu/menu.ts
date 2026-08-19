import { type TemplateResult } from "lit";

import { UIOverlay } from "../internal/overlay.js";
import type { UIMenuItem } from "../menu-item/menu-item.js";

/**
 * A triggerable menu of command items with Arrow-key navigation.
 *
 * Use `ui-menu-item` values for commands. The menu emits selection but does
 * not embed routing, mutation, or application-specific close policy.
 *
 * @tag ui-menu
 * @summary Opens an Arrow-key navigable command menu.
 *
 * @example Project actions
 * <ui-menu label="Project actions">
 *   <ui-button slot="trigger" variant="secondary">Actions</ui-button>
 *   <ui-menu-item value="rename">Rename</ui-menu-item>
 *   <ui-menu-item value="archive">Archive</ui-menu-item>
 * </ui-menu>
 *
 * @slot trigger - Control that opens or closes the menu.
 * @slot - `ui-menu-item` commands.
 *
 * @csspart backdrop - The dismissal boundary behind the menu.
 * @csspart popup - The semantic menu surface.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<{ open: boolean }>} ui-menu-open-change - Emitted after user interaction requests a new open state.
 * @fires {CustomEvent<{ value: string }>} ui-menu-select - Emitted when a menu item is selected.
 */
export class UIMenu extends UIOverlay {
  protected readonly overlayRole = "menu";

  constructor() {
    super();
    this.addEventListener("ui-menu-item-select", this.#onItemSelect);
  }

  protected override emitOpenChange(open: boolean): void {
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>("ui-menu-open-change", {
        bubbles: true,
        composed: true,
        detail: { open },
      }),
    );
  }

  #items(): UIMenuItem[] {
    return [...this.querySelectorAll<UIMenuItem>(":scope > ui-menu-item")].filter(
      (item) => !item.disabled,
    );
  }

  protected override handleOverlayKeydown(event: KeyboardEvent): boolean {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    )
      return false;
    const items = this.#items();
    if (items.length === 0) return false;
    const active = this.shadowRoot?.activeElement;
    const source = (active?.getRootNode() as ShadowRoot | undefined)?.host;
    const index = Math.max(0, items.indexOf(source as UIMenuItem));
    const target =
      event.key === "Home"
        ? items[0]
        : event.key === "End"
          ? items.at(-1)
          : items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
    event.preventDefault();
    target?.focus();
    return true;
  }

  #onItemSelect = (event: Event): void => {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-menu-select", {
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
