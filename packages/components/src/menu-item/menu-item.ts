import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { InlineOverflowController } from "../internal/inline-overflow.js";
import { renderProgressiveOverflow } from "../internal/progressive-overflow.js";
import type { UIMenu } from "../menu/menu.js";

/** Accessible action semantics exposed by a menu item. */
export type MenuItemKind = "action" | "checkbox" | "radio";
/** Optional visual meaning interpreted by a catalogue recipe. */
export type MenuItemTone = "neutral" | "critical";

export interface MenuItemSubmenuChangeDetail {
  open: boolean;
}

/**
 * A selectable command or submenu branch inside `ui-menu` or `ui-context-menu`.
 *
 * The default slot remains the label fallback. Stable semantic lanes keep a
 * checkmark, leading symbol, overflowing label, shortcut, and submenu chevron
 * aligned without making any of those visual choices part of the behaviour.
 *
 * @tag ui-menu-item
 * @summary A selectable menu command or submenu branch.
 *
 * @example Archive
 * <ui-menu-item value="archive" tone="critical">Archive project</ui-menu-item>
 *
 * @example Nested command
 * <ui-menu-item value="share">
 *   Share
 *   <span slot="prefix" aria-hidden="true">↗</span>
 *   <ui-menu slot="submenu" label="Share with">
 *     <ui-menu-item value="email">Email</ui-menu-item>
 *     <ui-menu-item value="messages">Messages</ui-menu-item>
 *   </ui-menu>
 * </ui-menu-item>
 *
 * @slot - Visible command label.
 * @slot selection - Optional checked or selected indicator.
 * @slot prefix - Optional leading symbol.
 * @slot shortcut - Optional keyboard shortcut description.
 * @slot chevron - Optional submenu disclosure glyph.
 * @slot submenu - Optional nested `ui-menu` branch.
 *
 * @csspart root - The complete item and nested-menu boundary.
 * @csspart control - The native menuitem button.
 * @csspart selection - The fixed selection-indicator lane.
 * @csspart prefix - The fixed leading-symbol lane.
 * @csspart label - The label region.
 * @csspart label-viewport - The clipped label viewport.
 * @csspart label-content - The authored label content.
 * @csspart shortcut - The trailing keyboard-shortcut lane.
 * @csspart chevron - The submenu disclosure lane.
 * @csspart submenu - The authored nested-menu realization.
 * @csspart safe-triangle - The pointer-safe corridor between a branch and submenu.
 * @csspart overflow - A renderer-owned progressive overflow edge.
 * @csspart overflow-start - The logical-start overflow edge.
 * @csspart overflow-end - The logical-end overflow edge.
 *
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate checked - Matches `:state(checked)` for checked checkbox/radio items.
 * @cssstate has-selection - Matches when a selection lane is visible.
 * @cssstate has-prefix - Matches when leading content is authored.
 * @cssstate has-shortcut - Matches when a shortcut is authored.
 * @cssstate has-submenu - Matches when a nested menu is authored.
 * @cssstate submenu-open - Matches while the nested menu is visible.
 * @cssstate overflowing - Matches while the label exceeds its viewport.
 * @cssstate overflow-start - Matches when label content continues before the viewport.
 * @cssstate overflow-end - Matches when label content continues after the viewport.
 *
 * @fires {CustomEvent<{ value: string; checked: boolean; kind: MenuItemKind }>} ui-menu-item-select - Emitted when a leaf command is activated.
 * @fires {CustomEvent<MenuItemSubmenuChangeDetail>} ui-menu-item-submenu-change - Emitted when a submenu branch opens or closes.
 *
 * @mashnode root item
 * @mashnode control control root
 * @mashnode selection selection control
 * @mashnode prefix prefix control
 * @mashnode label label control
 * @mashnode label-viewport viewport label
 * @mashnode label-content content label-viewport
 * @mashnode shortcut shortcut control
 * @mashnode chevron chevron control
 * @mashnode safe-triangle safe-area root
 * @mashnode submenu submenu root
 * @mashnode kind kind control
 * @mashnode checked checked control
 * @mashnode disabled disabled control
 * @mashrole slot default label label
 * @mashrole slot selection selection selection
 * @mashrole slot prefix prefix prefix
 * @mashrole slot shortcut shortcut shortcut
 * @mashrole slot chevron chevron chevron
 * @mashrole slot submenu submenu submenu
 */
export class UIMenuItem extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    checked: { type: Boolean, reflect: true },
    kind: { type: String, reflect: true },
    tone: { type: String, reflect: true },
    _hasSelection: { type: Boolean, state: true },
    _hasPrefix: { type: Boolean, state: true },
    _hasShortcut: { type: Boolean, state: true },
    _hasSubmenu: { type: Boolean, state: true },
  };

  /** Stable command value for the containing menu. */
  declare value: string;
  /** Prevents command activation while retaining menu focus semantics. */
  declare disabled: boolean;
  /** Controlled checked state for checkbox and radio menu items. */
  declare checked: boolean;
  /** Accessible action semantics. */
  declare kind: MenuItemKind;
  /** Optional visual meaning interpreted by the active catalogue. */
  declare tone: MenuItemTone;
  declare _hasSelection: boolean;
  declare _hasPrefix: boolean;
  declare _hasShortcut: boolean;
  declare _hasSubmenu: boolean;

  readonly #internals: ElementInternals;
  readonly #overflow: InlineOverflowController;
  #submenu: UIMenu | null = null;
  #openTimer: number | undefined;
  #closeTimer: number | undefined;

  constructor() {
    super();
    this.value = "";
    this.disabled = false;
    this.checked = false;
    this.kind = "action";
    this.tone = "neutral";
    this._hasSelection = false;
    this._hasPrefix = false;
    this._hasShortcut = false;
    this._hasSubmenu = false;
    this.#internals = this.attachInternals();
    this.#overflow = new InlineOverflowController(this, this.#internals);
  }

  static override styles = baseStyles;

  get hasSubmenu(): boolean {
    return this._hasSubmenu;
  }

  get submenuOpen(): boolean {
    return Boolean(this.#submenu?.open);
  }

  override disconnectedCallback(): void {
    this.#clearTimers();
    this.#overflow.disconnect();
    this.#setSubmenu(null);
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    const viewport = this.renderRoot.querySelector<HTMLElement>("[part~='label-viewport']");
    if (viewport) this.#overflow.connect(viewport);
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("disabled")) this.#setState("disabled", this.disabled);
    if (changed.has("checked")) this.#setState("checked", this.checked);
    if (changed.has("checked") || changed.has("_hasSelection")) {
      this.#setState("has-selection", this.checked || this._hasSelection);
    }
    if (changed.has("_hasPrefix")) this.#setState("has-prefix", this._hasPrefix);
    if (changed.has("_hasShortcut")) this.#setState("has-shortcut", this._hasShortcut);
    if (changed.has("_hasSubmenu")) this.#setState("has-submenu", this._hasSubmenu);
    this.#overflow.queue("start");
  }

  /** Opens an authored submenu through its public overlay contract. */
  showSubmenu(focusFirst = false): void {
    if (this.disabled || !this.#submenu) return;
    this.#clearTimers();
    this.#submenu.show(focusFirst ? "keyboard" : "hover");
    if (focusFirst) {
      void this.#submenu.updateComplete.then(() => {
        const first = this.#submenu?.querySelector<HTMLElement>(":scope > ui-menu-item");
        first?.focus();
      });
    }
  }

  /** Dismisses the authored submenu and optionally restores focus to its branch. */
  dismissSubmenu(restoreFocus = false): void {
    this.#clearTimers();
    this.#submenu?.dismiss("keyboard");
    if (restoreFocus) this.focus();
  }

  #setState(name: string, active: boolean): void {
    if (active) this.#internals.states.add(name);
    else this.#internals.states.delete(name);
  }

  #clearTimers(): void {
    if (this.#openTimer !== undefined) window.clearTimeout(this.#openTimer);
    if (this.#closeTimer !== undefined) window.clearTimeout(this.#closeTimer);
    this.#openTimer = undefined;
    this.#closeTimer = undefined;
  }

  #scheduleOpen(): void {
    if (!this.#submenu || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (this.#closeTimer !== undefined) window.clearTimeout(this.#closeTimer);
    this.#closeTimer = undefined;
    if (this.#submenu.open || this.#openTimer !== undefined) return;
    this.#openTimer = window.setTimeout(() => {
      this.#openTimer = undefined;
      this.showSubmenu();
    }, 80);
  }

  #scheduleClose(): void {
    if (!this.#submenu?.open) return;
    if (this.#openTimer !== undefined) window.clearTimeout(this.#openTimer);
    this.#openTimer = undefined;
    if (this.#closeTimer !== undefined) window.clearTimeout(this.#closeTimer);
    this.#closeTimer = window.setTimeout(() => {
      this.#closeTimer = undefined;
      this.#submenu?.dismiss("hover");
    }, 280);
  }

  #onNamedSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const hasContent = slot.assignedNodes({ flatten: true }).some((node) => {
      if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
      return true;
    });
    if (slot.name === "selection") this._hasSelection = hasContent;
    if (slot.name === "prefix") this._hasPrefix = hasContent;
    if (slot.name === "shortcut") this._hasShortcut = hasContent;
    if (slot.name === "submenu") {
      const submenu = slot
        .assignedElements({ flatten: true })
        .find((element): element is UIMenu => element.localName === "ui-menu");
      this.#setSubmenu(submenu ?? null);
    }
  };

  #setSubmenu(submenu: UIMenu | null): void {
    if (this.#submenu === submenu) return;
    if (this.#submenu) {
      this.#submenu.removeEventListener("ui-menu-open-change", this.#onSubmenuOpenChange);
      this.#submenu.removeEventListener("pointerenter", this.#cancelClose);
      this.#submenu.removeEventListener("pointerleave", this.#onSubmenuPointerLeave);
      this.#submenu.anchorElement = null;
      this.#submenu.removeAttribute("nested");
    }
    this.#submenu = submenu;
    this._hasSubmenu = Boolean(submenu);
    if (!submenu) {
      this.#setState("submenu-open", false);
      return;
    }
    submenu.anchorElement = this.renderRoot.querySelector<HTMLElement>("[part~='control']");
    submenu.setAttribute("nested", "");
    submenu.placement = "right";
    submenu.align = "start";
    submenu.offset = 2;
    if (!submenu.label) submenu.label = this.#authoredLabel();
    submenu.addEventListener("ui-menu-open-change", this.#onSubmenuOpenChange);
    submenu.addEventListener("pointerenter", this.#cancelClose);
    submenu.addEventListener("pointerleave", this.#onSubmenuPointerLeave);
    this.#setState("submenu-open", submenu.open);
    this.requestUpdate();
  }

  #authoredLabel(): string {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>("slot:not([name])");
    return (
      slot
        ?.assignedNodes({ flatten: true })
        .map((node) => node.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim() ?? ""
    );
  }

  #onSubmenuOpenChange = (event: Event): void => {
    if (event.target !== this.#submenu) return;
    const { open } = (event as CustomEvent<{ open: boolean }>).detail;
    this.#setState("submenu-open", open);
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<MenuItemSubmenuChangeDetail>("ui-menu-item-submenu-change", {
        bubbles: true,
        composed: true,
        detail: { open },
      }),
    );
  };

  #cancelClose = (): void => {
    if (this.#closeTimer !== undefined) window.clearTimeout(this.#closeTimer);
    this.#closeTimer = undefined;
  };

  #onSubmenuPointerLeave = (event: PointerEvent): void => {
    const related = event.relatedTarget;
    if (related instanceof Node && this.contains(related)) return;
    this.#scheduleClose();
  };

  #onPointerEnter = (): void => this.#scheduleOpen();

  #onPointerLeave = (): void => this.#scheduleClose();

  #onPointerMove = (event: PointerEvent): void => {
    if (!this.#submenu?.open || event.pointerType === "touch") return;
    const popup = this.#submenu.shadowRoot?.querySelector<HTMLElement>("[part~='popup']");
    const positioner = this.#submenu.shadowRoot?.querySelector<HTMLElement>("[part~='positioner']");
    const safe = this.renderRoot.querySelector<HTMLElement>("[part~='safe-triangle']");
    if (!popup || !safe) return;
    const rect = popup.getBoundingClientRect();
    const side = positioner?.dataset.side === "left" ? "left" : "right";
    const safeLeft = side === "right" ? event.clientX - 2 : rect.right;
    const safeRight = side === "right" ? rect.left : event.clientX + 2;
    const width = Math.max(0, safeRight - safeLeft);
    if (width === 0 || rect.height === 0) return;
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    safe.style.setProperty("--_mash-safe-top", `${rect.top}px`);
    safe.style.setProperty("--_mash-safe-left", `${safeLeft}px`);
    safe.style.setProperty("--_mash-safe-width", `${width}px`);
    safe.style.setProperty("--_mash-safe-height", `${rect.height}px`);
    safe.style.setProperty("--_mash-safe-y", `${y}%`);
    this.dataset.submenuSide = side;
  };

  #select = (): void => {
    if (this.disabled) return;
    if (this.#submenu) {
      this.showSubmenu(true);
      return;
    }
    this.dispatchEvent(
      new CustomEvent<{ value: string; checked: boolean; kind: MenuItemKind }>(
        "ui-menu-item-select",
        {
          bubbles: true,
          composed: true,
          detail: { value: this.value, checked: this.checked, kind: this.kind },
        },
      ),
    );
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (!this.#submenu) return;
    if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      this.showSubmenu(true);
    } else if (event.key === "ArrowLeft" && this.#submenu.open) {
      event.preventDefault();
      event.stopPropagation();
      this.dismissSubmenu(true);
    }
  };

  protected override render(): TemplateResult {
    const role =
      this.kind === "checkbox"
        ? "menuitemcheckbox"
        : this.kind === "radio"
          ? "menuitemradio"
          : "menuitem";
    return html`
      <span part="root">
        <button
          part="control"
          type="button"
          role=${role}
          tabindex="-1"
          aria-disabled=${this.disabled ? "true" : undefined}
          aria-checked=${this.kind === "action" ? undefined : String(this.checked)}
          aria-haspopup=${this._hasSubmenu ? "menu" : undefined}
          aria-expanded=${this._hasSubmenu ? String(this.submenuOpen) : undefined}
          @click=${this.#select}
          @keydown=${this.#onKeydown}
          @pointerenter=${this.#onPointerEnter}
          @pointerleave=${this.#onPointerLeave}
          @pointermove=${this.#onPointerMove}
        >
          <span part="selection" aria-hidden="true">
            <slot name="selection" @slotchange=${this.#onNamedSlotChange}
              >${this.checked ? "✓" : nothing}</slot
            >
          </span>
          <span part="prefix" aria-hidden="true">
            <slot name="prefix" @slotchange=${this.#onNamedSlotChange}></slot>
          </span>
          <span part="label">
            <span part="label-viewport">
              <span part="label-content"><slot></slot></span>
            </span>
            ${renderProgressiveOverflow("start", this.#overflow.state.start)}
            ${renderProgressiveOverflow("end", this.#overflow.state.end)}
          </span>
          <span part="shortcut" ?hidden=${!this._hasShortcut}>
            <slot name="shortcut" @slotchange=${this.#onNamedSlotChange}></slot>
          </span>
          <span part="chevron" ?hidden=${!this._hasSubmenu} aria-hidden="true">
            <slot name="chevron">›</slot>
          </span>
        </button>
        <span part="submenu">
          <slot name="submenu" @slotchange=${this.#onNamedSlotChange}></slot>
        </span>
        <span
          part="safe-triangle"
          aria-hidden="true"
          @pointerenter=${this.#cancelClose}
          @pointerleave=${this.#onPointerLeave}
        ></span>
      </span>
    `;
  }
}
