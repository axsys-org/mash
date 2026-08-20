import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import type { UITab } from "../tab/tab.js";
import type { UITabPanel } from "../tab-panel/tab-panel.js";

let tabPanelId = 0;

/**
 * Coordinates labelled tabs and matched content panels.
 *
 * Slotted `ui-tab` elements use `slot="tab"`; matched `ui-tab-panel`
 * elements use `slot="panel"`. This explicit anatomy lets a renderer retain
 * stable controls and panel semantics rather than guessing from arbitrary
 * content order.
 *
 * @tag ui-tabs
 * @summary Coordinates a tablist and its selected content panel.
 *
 * @example Project settings
 * <ui-tabs value="general" label="Project settings">
 *   <ui-tab slot="tab" value="general">General</ui-tab>
 *   <ui-tab slot="tab" value="members">Members</ui-tab>
 *   <ui-tab-panel slot="panel" value="general">General settings</ui-tab-panel>
 *   <ui-tab-panel slot="panel" value="members">Team members</ui-tab-panel>
 * </ui-tabs>
 *
 * @slot tab - `ui-tab` controls.
 * @slot panel - `ui-tab-panel` content regions.
 *
 * @csspart list - The semantic tablist.
 * @csspart tab - The authored tab-control collection.
 * @csspart panels - The panel container.
 * @csspart panel - The authored tab-panel collection.
 *
 * @fires {CustomEvent<{ value: string }>} ui-tabs-change - Emitted after tab selection changes.
 *
 * @mashnode root root
 * @mashnode list list root
 * @mashnode tab tab list
 * @mashnode panels panels root
 * @mashnode panel panel panels
 */
export class UITabs extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
  };

  /** Value of the selected tab and panel. */
  declare value: string;
  /** Accessible name for the tablist. */
  declare label: string;
  /** Logical Arrow-key axis. */
  declare orientation: "horizontal" | "vertical";

  constructor() {
    super();
    this.value = "";
    this.label = "Tabs";
    this.orientation = "horizontal";
  }

  static override styles = baseStyles;

  #tabs(): UITab[] {
    return [...this.querySelectorAll<UITab>(":scope > ui-tab[slot='tab']")];
  }

  #panels(): UITabPanel[] {
    return [...this.querySelectorAll<UITabPanel>(":scope > ui-tab-panel[slot='panel']")];
  }

  #syncSelection(): void {
    const tabs = this.#tabs();
    if (!tabs.some((tab) => tab.value === this.value && !tab.disabled)) {
      this.value = tabs.find((tab) => !tab.disabled)?.value ?? "";
    }
    const tabByValue = new Map(tabs.map((tab) => [tab.value, tab]));
    for (const panel of this.#panels()) {
      panel.id ||= `ui-tab-panel-${++tabPanelId}`;
      const tab = tabByValue.get(panel.value);
      panel.selected = panel.value === this.value;
      panel.label = tab?.textContent?.trim() || this.label;
      if (tab) tab.controls = panel.id;
    }
    for (const [index, tab] of tabs.entries()) {
      tab.selected = tab.value === this.value;
      tab.position = index + 1;
      tab.setSize = tabs.length;
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("value")) this.#syncSelection();
  }

  #onSlotChange = (): void => this.#syncSelection();

  #select(value: string): void {
    if (!value || value === this.value) return;
    this.value = value;
    this.#syncSelection();
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-tabs-change", {
        bubbles: true,
        composed: true,
        detail: { value },
      }),
    );
  }

  #onTabSelect = (event: Event): void => {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    this.#select(value);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    const rtl = getComputedStyle(this).direction === "rtl";
    const previous =
      this.orientation === "horizontal" ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
    const next =
      this.orientation === "horizontal" ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
    if (event.key !== previous && event.key !== next && event.key !== "Home" && event.key !== "End")
      return;
    const tabs = this.#tabs().filter((tab) => !tab.disabled);
    if (tabs.length === 0) return;
    let target: UITab;
    if (event.key === "Home") target = tabs[0]!;
    else if (event.key === "End") target = tabs.at(-1)!;
    else {
      const source = event
        .composedPath()
        .find((node) => node instanceof HTMLElement && node.localName === "ui-tab");
      const index = Math.max(0, tabs.indexOf(source as UITab));
      target = tabs[(index + (event.key === next ? 1 : -1) + tabs.length) % tabs.length]!;
    }
    event.preventDefault();
    this.#select(target.value);
    target.focus();
  };

  protected override render(): TemplateResult {
    return html`
      <div
        part="list"
        role="tablist"
        aria-label=${this.label}
        aria-orientation=${this.orientation}
        @keydown=${this.#onKeydown}
        @ui-tab-select=${this.#onTabSelect}
      >
        <slot part="tab" name="tab" @slotchange=${this.#onSlotChange}></slot>
      </div>
      <div part="panels">
        <slot part="panel" name="panel" @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}
