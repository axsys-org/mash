import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A horizontal application command bar that owns Arrow-key movement.
 *
 * Slot `ui-menu` elements or ordinary command controls into the bar. Menubar
 * does not restyle them; it provides the composite-widget role and movement
 * needed when command menus appear as a top-level system surface.
 *
 * @tag ui-menubar
 * @summary Groups top-level command controls into a menubar.
 *
 * @example App commands
 * <ui-menubar label="Application commands">
 *   <ui-menu label="File"><ui-button slot="trigger">File</ui-button></ui-menu>
 *   <ui-menu label="Edit"><ui-button slot="trigger">Edit</ui-button></ui-menu>
 * </ui-menubar>
 *
 * @slot - Top-level menus or command controls.
 *
 * @csspart root - The semantic menubar container.
 */
export class UIMenubar extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
  static override properties = { label: { type: String, reflect: true } };

  /** Accessible name for the menubar. */
  declare label: string;

  constructor() {
    super();
    this.label = "Menu bar";
  }
  static override styles = baseStyles;

  #items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(":scope > *")].filter(
      (item) => !item.hasAttribute("disabled"),
    );
  }

  #onKeydown = (event: KeyboardEvent): void => {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    )
      return;
    const items = this.#items();
    if (!items.length) return;
    const source = event
      .composedPath()
      .find((node) => node instanceof HTMLElement && items.includes(node));
    const index = Math.max(0, items.indexOf(source as HTMLElement));
    const target =
      event.key === "Home"
        ? items[0]
        : event.key === "End"
          ? items.at(-1)
          : items[(index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
    event.preventDefault();
    target?.focus();
  };

  protected override render(): TemplateResult {
    return html`<div
      part="root"
      role="menubar"
      aria-label=${this.label}
      @keydown=${this.#onKeydown}
    >
      <slot></slot>
    </div>`;
  }
}
