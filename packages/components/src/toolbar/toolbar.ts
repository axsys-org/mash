import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The reading direction for a toolbar. */
export type ToolbarOrientation = "horizontal" | "vertical";

/**
 * A labelled toolbar with Arrow-key movement between authored controls.
 *
 * Toolbar items remain ordinary buttons, links, toggles, or application
 * controls; Mash does not force an item wrapper. It owns composite keyboard
 * behavior only. Screen placement is deliberately a recipe/layout concern:
 * an application can dock this same toolbar on any edge without changing its
 * semantic or focus contract.
 *
 * @tag ui-toolbar
 * @summary Groups related controls into an Arrow-key navigable toolbar.
 *
 * @example Editor controls
 * <ui-toolbar label="Formatting tools">
 *   <ui-toggle>Bold</ui-toggle>
 *   <ui-toggle>Italic</ui-toggle>
 * </ui-toolbar>
 *
 * @slot - Focusable toolbar controls.
 *
 * @csspart root - The semantic toolbar container.
 * @csspart actions - The authored toolbar-control collection.
 *
 * @mashnode root root
 * @mashnode actions actions root
 * @mashrole slot default actions actions
 */
export class UIToolbar extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    label: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    loopFocus: { type: Boolean, attribute: "loop-focus", reflect: true },
  };

  /** Accessible name for the toolbar. */
  declare label: string;
  /** Logical Arrow-key axis. */
  declare orientation: ToolbarOrientation;
  /** Whether Arrow-key navigation wraps from the last item to the first. */
  declare loopFocus: boolean;

  constructor() {
    super();
    this.label = "Tools";
    this.orientation = "horizontal";
    this.loopFocus = true;
  }

  static override styles = baseStyles;

  protected override firstUpdated(): void {
    this.#syncTabStops();
  }

  #allItems(): HTMLElement[] {
    const focusable =
      "button, a[href], input, select, textarea, ui-button, ui-toggle, ui-checkbox, ui-switch, ui-input, ui-select";
    return [...this.children].flatMap((child) => {
      if (!(child instanceof HTMLElement)) return [];
      if (child.matches(focusable)) return [child];
      const trigger = child.querySelector<HTMLElement>(":scope > [slot='trigger']");
      return trigger?.matches(focusable) ? [trigger] : [];
    });
  }

  #items(): HTMLElement[] {
    return this.#allItems().filter((item) => {
      if (item.hasAttribute("disabled") || item.getAttribute("aria-disabled") === "true")
        return false;
      return true;
    });
  }

  #syncTabStops(preferred?: HTMLElement): void {
    const enabled = this.#items();
    const active =
      (preferred && enabled.includes(preferred) ? preferred : undefined) ??
      enabled.find((item) => item.tabIndex === 0) ??
      enabled[0];
    for (const item of this.#allItems()) item.tabIndex = item === active ? 0 : -1;
  }

  #onSlotChange = (): void => {
    this.#syncTabStops();
  };

  #onFocusIn = (event: FocusEvent): void => {
    const items = this.#items();
    const item = event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && items.includes(node));
    if (item) this.#syncTabStops(item);
  };

  #textEntryAllowsMove(event: KeyboardEvent, previous: string, next: string): boolean {
    const entry = event
      .composedPath()
      .find(
        (node): node is HTMLInputElement | HTMLTextAreaElement =>
          node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement,
      );
    if (!entry) return true;
    if (event.key !== previous && event.key !== next) return false;
    const start = entry.selectionStart ?? 0;
    const end = entry.selectionEnd ?? start;
    if (start !== end) return false;
    return event.key === previous ? start === 0 : end === entry.value.length;
  }

  #onKeydown = (event: KeyboardEvent): void => {
    const rtl = getComputedStyle(this).direction === "rtl";
    const previous =
      this.orientation === "horizontal" ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
    const next =
      this.orientation === "horizontal" ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
    if (event.key !== previous && event.key !== next && event.key !== "Home" && event.key !== "End")
      return;
    const items = this.#items();
    if (items.length === 0) return;
    if (!this.#textEntryAllowsMove(event, previous, next)) return;
    let target: HTMLElement;
    if (event.key === "Home") target = items[0]!;
    else if (event.key === "End") target = items.at(-1)!;
    else {
      const source = event
        .composedPath()
        .find((node) => node instanceof HTMLElement && items.includes(node));
      const index = items.indexOf(source as HTMLElement);
      if (index < 0) return;
      const nextIndex = index + (event.key === next ? 1 : -1);
      if (!this.loopFocus && (nextIndex < 0 || nextIndex >= items.length)) return;
      target = items[(nextIndex + items.length) % items.length]!;
    }
    event.preventDefault();
    this.#syncTabStops(target);
    target.focus();
  };

  protected override render(): TemplateResult {
    return html`<div
      part="root"
      role="toolbar"
      aria-label=${this.label}
      aria-orientation=${this.orientation}
      @keydown=${this.#onKeydown}
      @focusin=${this.#onFocusIn}
    >
      <slot part="actions" @slotchange=${this.#onSlotChange}></slot>
    </div>`;
  }
}
