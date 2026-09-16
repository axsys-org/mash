import { html, type PropertyValues, type TemplateResult } from "lit";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIAnchoredOverlay,
} from "../internal/overlay.js";
import type { AnchoredPositionConfig } from "../internal/anchored-position.js";
import { MenuCollectionController } from "../internal/menu-collection.js";
import type { UIMenuItem } from "../menu-item/menu-item.js";

/** The Apple-aligned row and surface density of a menu. */
export type MenuDensity = "regular" | "compact" | "mini";
/** How the menu resolves its inline measure between the catalogue's bounds. */
export type MenuSizing = "content" | "fixed" | "stretch";

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
 *   <ui-menu-item value="rename">Rename<ui-kbd slot="shortcut" command="project.rename" shortcut="Primary+R"></ui-kbd></ui-menu-item>
 *   <ui-menu-item value="archive">Archive</ui-menu-item>
 * </ui-menu>
 *
 * @slot trigger - Control that opens or closes the menu.
 * @slot header - Persistent non-command content shown before the scrollable command viewport.
 * @slot - `ui-menu-item` commands.
 * @slot footer - Persistent non-command content shown after the scrollable command viewport.
 * @slot close - Optional control that dismisses the menu.
 *
 * @csspart trigger - The authored trigger realization.
 * @csspart backdrop - The dismissal boundary behind the menu.
 * @csspart positioner - The renderer-owned anchor-relative placement boundary.
 * @csspart popup - The semantic menu surface.
 * @csspart material - The isolated visual material layer behind menu content.
 * @csspart header - The authored persistent content before the command viewport.
 * @csspart scroll-area - The composed Mash scroll controller.
 * @csspart viewport - The native viewport owned by that scroll controller.
 * @csspart block-scrollbar - The activity-revealed vertical scroll control.
 * @csspart block-track - The vertical scroll track.
 * @csspart block-thumb - The vertical scroll indicator.
 * @csspart actions - The authored menu commands.
 * @csspart footer - The authored persistent content after the command viewport.
 * @csspart close - The authored close action realization.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate present - Matches while the popup is rendered, including exit motion.
 * @cssstate entering - Matches while the popup is entering.
 * @cssstate active - Matches after enter motion settles.
 * @cssstate exiting - Matches while the popup is exiting.
 * @cssstate reduced-motion - Matches `:state(reduced-motion)` when the environment suppresses motion.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 * @cssstate nested - Matches when a menu item owns this menu as a submenu.
 * @cssstate has-header - Matches when persistent header chrome is authored.
 * @cssstate has-footer - Matches when persistent footer chrome is authored.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-menu-open-change - Emitted after user interaction requests a new open state and reports why.
 * @fires {CustomEvent<{ value: string }>} ui-menu-select - Emitted when a menu item is selected.
 *
 * @mashnode trigger trigger
 * @mashnode backdrop backdrop
 * @mashnode positioner positioner backdrop
 * @mashnode placement placement positioner
 * @mashnode align align positioner
 * @mashnode offset offset positioner
 * @mashnode collision-padding collision-padding positioner
 * @mashnode popup popup positioner
 * @mashnode material material popup
 * @mashnode header header popup
 * @mashnode viewport viewport popup
 * @mashnode actions actions viewport
 * @mashnode footer footer popup
 * @mashnode close close popup
 * @mashnode density density popup
 * @mashnode sizing sizing popup
 * @mashnode nested nested popup
 * @mashnode present present popup
 * @mashnode entering entering popup
 * @mashnode active active popup
 * @mashnode exiting exiting popup
 * @mashnode reduced-motion reduced-motion popup
 * @mashrole slot header header header
 * @mashrole slot default actions actions
 * @mashrole slot footer footer footer
 */
export class UIMenu extends UIAnchoredOverlay {
  static override properties = {
    ...UIAnchoredOverlay.properties,
    density: { type: String, reflect: true },
    sizing: { type: String, reflect: true },
    nested: { type: Boolean, reflect: true },
    submenuOpenDelay: { type: Number, attribute: "submenu-open-delay", reflect: true },
    submenuCloseDelay: { type: Number, attribute: "submenu-close-delay", reflect: true },
  };

  /** Menu surface and row density. */
  declare density: MenuDensity;
  /** Whether the popup fits content, holds its density width, or stretches within the catalogue bound. */
  declare sizing: MenuSizing;
  /** Whether a parent menu item owns this menu as a submenu. */
  declare nested: boolean;
  /** Fine-pointer hover dwell before a branch submenu opens. */
  declare submenuOpenDelay: number;
  /** Pointer-corridor grace period before a submenu closes. */
  declare submenuCloseDelay: number;

  readonly #collection = new MenuCollectionController(this);

  protected readonly overlayRole = "menu";
  protected override readonly authoredContentPart = "actions";
  protected override readonly pointerOpenFocus = "popup";

  constructor() {
    super();
    this.density = "regular";
    this.sizing = "content";
    this.nested = false;
    this.submenuOpenDelay = 175;
    this.submenuCloseDelay = 280;
    this.addEventListener("ui-menu-item-select", this.#onItemSelect);
    this.addEventListener("ui-menu-item-submenu-change", this.#onSubmenuChange);
    this.addEventListener("pointerover", this.#onPointerOver);
    this.addEventListener("pointermove", this.#onPointerMove);
    this.addEventListener("pointerout", this.#onPointerOut);
    this.addEventListener("keydown", this.#onTriggerKeydown);
  }

  override disconnectedCallback(): void {
    this.#collection.destroy();
    super.disconnectedCallback();
  }

  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    this.#syncChromeSlots();
  }

  protected override emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-menu-open-change", {
        bubbles: true,
        composed: true,
        detail: { open, reason },
      }),
    );
  }

  protected override renderAuthoredContent(): TemplateResult {
    return html`
      <div part="header" role="presentation">
        <slot name="header" @slotchange=${this.#onChromeSlotChange}></slot>
      </div>
      <ui-scroll-area
        part="scroll-area"
        orientation="vertical"
        mode="scrolling"
        size="medium"
        viewport-tabindex="-1"
        viewport-role="presentation"
        exportparts="root:scroll-root,viewport:viewport,block-scrollbar:block-scrollbar,block-track:block-track,block-thumb:block-thumb,inline-scrollbar:inline-scrollbar,corner:scroll-corner"
      >
        <div part="actions"><slot></slot></div>
      </ui-scroll-area>
      <div part="footer" role="presentation">
        <slot name="footer" @slotchange=${this.#onChromeSlotChange}></slot>
      </div>
    `;
  }

  protected override renderPopupMaterial(): TemplateResult {
    return html`<span part="material" aria-hidden="true"></span>`;
  }

  protected override positioningConfig(): AnchoredPositionConfig {
    const config = super.positioningConfig();
    const nested = this.nested || this.hasAttribute("nested");
    if (!nested || (this.placement !== "left" && this.placement !== "right")) return config;
    const popup = this.renderRoot.querySelector<HTMLElement>("[part='popup']");
    const shell = Number.parseFloat(
      popup
        ? getComputedStyle(popup).paddingBlockStart
        : getComputedStyle(this).getPropertyValue("--space-menu-shell"),
    );
    return Number.isFinite(shell) ? { ...config, crossAxisOffset: -shell } : config;
  }

  #setChromeState(name: "header" | "footer", active: boolean): void {
    const state = `has-${name}`;
    if (active) this.overlayInternals.states.add(state);
    else this.overlayInternals.states.delete(state);
  }

  #hasAssignedChrome(name: "header" | "footer"): boolean {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>(`slot[name="${name}"]`);
    return (
      slot?.assignedNodes({ flatten: true }).some((node) => {
        if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
        return true;
      }) ?? false
    );
  }

  #syncChromeSlots(): void {
    this.#setChromeState("header", this.#hasAssignedChrome("header"));
    this.#setChromeState("footer", this.#hasAssignedChrome("footer"));
  }

  #onChromeSlotChange = (): void => this.#syncChromeSlots();

  #parentItem(): UIMenuItem | null {
    return this.parentElement?.localName === "ui-menu-item"
      ? (this.parentElement as UIMenuItem)
      : null;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!changed.has("open") && !changed.has("disabled")) return;
    for (const trigger of this.querySelectorAll<HTMLElement>(":scope > [slot='trigger']")) {
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", String(this.open));
    }
  }

  protected override handleOverlayKeydown(event: KeyboardEvent): boolean {
    if (event.key === "Tab") {
      this.releaseFocusReturn();
      this.requestOpenChange(false, "keyboard");
      return true;
    }
    return this.#collection.handleKeydown(event, {
      nested: this.nested,
      parentItem: () => this.#parentItem(),
      dismissNested: () => this.requestOpenChange(false, "keyboard"),
    });
  }

  #onTriggerKeydown = (event: KeyboardEvent): void => {
    if (!this.eventIsWithinSlot(event, "trigger")) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    event.stopPropagation();
    this.requestOpenChange(true, "keyboard", "first");
    void this.updateComplete.then(() => {
      const items = this.#collection.items();
      items[event.key === "ArrowDown" ? 0 : items.length - 1]?.focus();
    });
  };

  #onItemSelect = (event: Event): void => {
    const item = event.target as UIMenuItem;
    const detail = (event as CustomEvent<{ value: string; checked?: boolean; kind?: string }>)
      .detail;
    if (item.closest("ui-menu") === this) {
      this.dispatchEvent(
        new CustomEvent<typeof detail>("ui-menu-select", {
          bubbles: true,
          composed: true,
          detail,
        }),
      );
    }
    this.requestOpenChange(false, "select");
  };

  #onSubmenuChange = (event: Event): void => {
    const item = event.target as UIMenuItem;
    const { open } = (event as CustomEvent<{ open: boolean }>).detail;
    if (!open || item.parentElement !== this) return;
    this.#collection.suppressHoverSelection();
    this.#collection.dismissSiblingSubmenus(item);
  };

  #updatePointerHover = (event: PointerEvent): void => {
    const item = this.#collection.itemFromEvent(event) as UIMenuItem | undefined;
    if (!item || item.parentElement !== this) return;
    const preservesSiblingSubmenu = item.shouldPreserveSiblingSubmenuForPointer(event);
    this.#collection.suppressHoverSelection(preservesSiblingSubmenu ? item : null);
    if (preservesSiblingSubmenu || item.hasSubmenu) return;
    this.#collection.dismissSiblingSubmenus(item);
  };

  #onPointerOver = (event: PointerEvent): void => this.#updatePointerHover(event);

  #onPointerMove = (event: PointerEvent): void => this.#updatePointerHover(event);

  #onPointerOut = (event: PointerEvent): void => {
    const related = event.relatedTarget;
    if (related instanceof Node && this.contains(related)) return;
    this.#collection.suppressHoverSelection();
  };

  protected override render(): TemplateResult {
    return this.renderOverlay();
  }
}
