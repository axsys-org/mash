import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The reading direction for a toolbar. */
export type ToolbarOrientation = "horizontal" | "vertical";

/**
 * A labelled toolbar with Arrow-key movement between authored controls.
 *
 * Toolbar items remain ordinary buttons, links, toggles, or application
 * controls; Mash does not force an item wrapper. The toolbar finds focusable
 * direct descendants and handles the composite-widget navigation contract.
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
 */
export class UIToolbar extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    label: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
  };

  /** Accessible name for the toolbar. */
  declare label: string;
  /** Logical Arrow-key axis. */
  declare orientation: ToolbarOrientation;

  constructor() {
    super();
    this.label = "Tools";
    this.orientation = "horizontal";
  }

  static override styles = baseStyles;

  #items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(":scope > *")].filter((item) => {
      if (item.hasAttribute("disabled") || item.getAttribute("aria-disabled") === "true")
        return false;
      return item.matches(
        "button, a[href], input, select, textarea, ui-toggle, ui-button, ui-checkbox, ui-switch",
      );
    });
  }

  #onKeydown = (event: KeyboardEvent): void => {
    const previous = this.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const next = this.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    if (event.key !== previous && event.key !== next && event.key !== "Home" && event.key !== "End")
      return;
    const items = this.#items();
    if (items.length === 0) return;
    let target: HTMLElement;
    if (event.key === "Home") target = items[0]!;
    else if (event.key === "End") target = items.at(-1)!;
    else {
      const source = event
        .composedPath()
        .find((node) => node instanceof HTMLElement && items.includes(node));
      const index = Math.max(0, items.indexOf(source as HTMLElement));
      target = items[(index + (event.key === next ? 1 : -1) + items.length) % items.length]!;
    }
    event.preventDefault();
    target.focus();
  };

  protected override render(): TemplateResult {
    return html`<div
      part="root"
      role="toolbar"
      aria-label=${this.label}
      aria-orientation=${this.orientation}
      @keydown=${this.#onKeydown}
    >
      <slot></slot>
    </div>`;
  }
}
