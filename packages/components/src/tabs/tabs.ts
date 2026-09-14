import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";

import { DragController, type DragEventDetail } from "../drag/drag.js";
import { ReorderMotionController } from "../internal/reorder-motion.js";
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
 * @mashnode size size root
 * @mashaxis size control-size
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
 * @slot prefix - Controls before the tab strip.
 * @slot suffix - Controls after the tab strip.
 * @csspart prefix - Controls before the tab strip.
 * @csspart suffix - Controls after the tab strip.
 * @csspart strip - The scrollable tab strip and adjacent controls.
 * @mashnode strip strip root
 * @mashnode prefix prefix strip
 * @mashnode suffix suffix strip
 * @slot tab - `ui-tab` controls.
 * @slot panel - `ui-tab-panel` content regions.
 *
 * @csspart list - The semantic tablist.
 * @csspart tab - The authored tab-control collection.
 * @csspart panels - The panel container.
 * @csspart panel - The authored tab-panel collection.
 *
 * @csspart overflow - Overflow chooser affordance.
 * @csspart overflow-trigger - Opens the complete tab list.
 * @csspart overflow-popup - Scrollable tab chooser surface.
 * @csspart overflow-item - A tab chooser command.
 * @csspart announcement - Visually hidden reorder announcement.
 * @mashnode overflow control strip
 * @mashnode overflow-trigger control overflow
 * @mashnode overflow-popup popup overflow
 * @mashnode overflow-item item overflow-popup
 * @mashnode announcement status root
 * @fires {CustomEvent<{ previous: string[], order: string[] }>} ui-tabs-reorder - Reports the previous and current tab order; restore with setOrder(previous).
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
    reorderable: { type: Boolean, reflect: true },
    stretched: { type: Boolean, reflect: true },
    _overflowed: { state: true },
    _announcement: { state: true },
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
  };

  /** Enable pointer dragging and Alt+Shift+Arrow reordering. */
  declare reorderable: boolean;
  /** Distribute horizontal tabs equally across the available strip. */
  declare stretched: boolean;
  private _overflowed = false;
  private _announcement = "";

  /** Value of the selected tab and panel. */
  declare value: string;
  /** Accessible name for the tablist. */
  declare label: string;
  /** Treatment shared by the tab controls. */
  declare variant: "default" | "underline" | "pill" | "outline" | "segmented";
  /** Control size; inherit follows the surrounding size context. */
  declare size: "inherit" | "default" | "compact" | "xsmall" | "small" | "medium" | "large";
  /** Logical Arrow-key axis. */
  declare orientation: "horizontal" | "vertical";

  constructor() {
    super();
    this.reorderable = false;
    this.stretched = false;
    this.variant = "default";
    this.size = "inherit";
    this.value = "";
    this.label = "Tabs";
    this.orientation = "horizontal";
    this.addEventListener("ui-tab-select", this.#onTabSelect as EventListener);
    this.addEventListener("ui-drag-start", this.#dragStart as EventListener);
    this.addEventListener("ui-drag", this.#dragMove as EventListener);
    this.addEventListener("ui-drag-end", this.#dragEnd as EventListener);
  }

  static override styles = [
    baseStyles,
    css`
      [part="overflow"] {
        position: relative;
        flex: none;
      }
      [part="overflow-trigger"] {
        font: inherit;
        cursor: pointer;
      }
      ui-menu::part(viewport) {
        overflow: auto;
        max-block-size: 320px;
      }
      ui-menu-item {
        display: block;
      }
      ui-menu-item::part(control) {
        display: flex;
        align-items: center;
        width: 100%;
        font: inherit;
        text-align: start;
      }
      ui-menu-item::part(label) {
        flex: 1;
      }
      ui-menu-item::part(selection) {
        width: 18px;
        flex: none;
      }
      ui-menu-item[checked]::part(control) {
        font-weight: 600;
      }
      ui-menu-item[disabled]::part(control) {
        opacity: 0.5;
      }
      [part="list"] {
        scrollbar-width: none;
      }
      [part="announcement"] {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
      }
    `,
  ];

  #size = new ResizeObserver(() => this.#measureOverflow());
  #controllers = new Map<UITab, DragController>();
  #motion = new ReorderMotionController(this);
  #drag: {
    tab: UITab;
    index: number;
    tabs: UITab[];
    rects: Map<UITab, DOMRect>;
    scroll: number;
    scale: number;
  } | null = null;

  /** Snapshot authored tab order, including hidden tabs. Panels are never moved. */
  getOrder(): string[] {
    return [...this.querySelectorAll<UITab>(":scope > ui-tab[slot='tab']")].map((tab) => tab.value);
  }

  /** Restore a complete permutation of current tab values. Invalid orders leave the DOM untouched. */
  setOrder(order: readonly string[]): boolean {
    const previous = this.getOrder();
    if (
      order.length !== previous.length ||
      new Set(order).size !== order.length ||
      order.some((value) => !previous.includes(value))
    )
      return false;
    if (order.every((value, index) => previous[index] === value)) return true;
    const tabs = new Map(
      [...this.querySelectorAll<UITab>(":scope > ui-tab[slot='tab']")].map((tab) => [
        tab.value,
        tab,
      ]),
    );
    const focusRoot = this.getRootNode() as Document | ShadowRoot;
    const focusedTab = [...tabs.values()].find((tab) => tab === focusRoot.activeElement);
    let focused: HTMLElement | null = focusedTab ?? null;
    while (focused?.shadowRoot?.activeElement instanceof HTMLElement)
      focused = focused.shadowRoot.activeElement;
    // Moving only tab controls retains every authored panel and its live descendants.
    let before: Node | null = null;
    for (let index = order.length - 1; index >= 0; index--) {
      const value = order[index]!;
      const tab = tabs.get(value)!;
      if (this.moveBefore && tab.isConnected) this.moveBefore(tab, before);
      else this.insertBefore(tab, before);
      before = tab;
    }
    this.#syncSelection();
    focused?.focus({ preventScroll: true });
    this.dispatchEvent(
      new CustomEvent("ui-tabs-reorder", {
        bubbles: true,
        composed: true,
        detail: { previous, order: [...order] },
      }),
    );
    return true;
  }

  /** Move a tab to a zero-based position. Returns false for an unknown value or invalid position. */
  reorder(value: string, index: number): boolean {
    const order = this.getOrder();
    const source = order.indexOf(value);
    if (source < 0 || !Number.isInteger(index) || index < 0 || index >= order.length) return false;
    order.splice(source, 1);
    order.splice(index, 0, value);
    const changed = this.setOrder(order);
    if (changed && source !== index) {
      const tab = this.#tabs().find((candidate) => candidate.value === value);
      this._announcement = `${tab?.accessibleLabel || value} moved to position ${index + 1} of ${order.length}`;
    }
    return changed;
  }

  #measureOverflow(): void {
    const list = this.renderRoot.querySelector<HTMLElement>('[part="list"]');
    if (!list) return;
    const vertical = this.orientation === "vertical";
    const rtl = !vertical && getComputedStyle(this).direction === "rtl";
    const extent = vertical
      ? list.scrollHeight - list.clientHeight
      : list.scrollWidth - list.clientWidth;
    const offset = vertical ? list.scrollTop : Math.abs(list.scrollLeft);
    this._overflowed = extent > 1;
    const start = offset > 1 ? "transparent" : "black";
    const end = offset < extent - 1 ? "transparent" : "black";
    list.style.maskImage = `linear-gradient(${vertical ? "to bottom" : rtl ? "to left" : "to right"}, ${start}, black 18px, black calc(100% - 18px), ${end})`;
  }

  protected override firstUpdated(): void {
    this.#size.observe(this.renderRoot.querySelector('[part="list"]')!);
    this.#measureOverflow();
  }

  #onOverflow = (event: CustomEvent<{ value: string }>): void => {
    const tab = this.#tabs().find(
      (candidate) => candidate.value === event.detail.value && !candidate.disabled,
    );
    if (!tab) return;
    this.select(tab.value);
    // The menu restores trigger focus on close; move to the chosen tab afterwards.
    requestAnimationFrame(() => {
      tab.focus();
      tab.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };

  #syncDrags(): void {
    if (!this.isConnected) return;
    const tabs = this.#tabs();
    for (const [tab, controller] of this.#controllers) {
      if (!this.reorderable || !tabs.includes(tab) || tab.disabled) {
        controller.destroy();
        this.#controllers.delete(tab);
        this.#motion.reset(tab);
      }
    }
    const list = this.renderRoot.querySelector<HTMLElement>('[part="list"]');
    if (!this.reorderable || !list) return;
    for (const tab of tabs) {
      if (tab.disabled || this.#controllers.has(tab)) continue;
      const handle = tab.shadowRoot?.querySelector<HTMLElement>('[part="control"]');
      if (!handle) continue;
      const controller = new DragController(tab, {
        handle,
        threshold: 6,
        controlled: true,
        containment: false,
        axis: this.orientation === "vertical" ? "y" : "x",
        autoScroll: {
          target: list,
          sensitivity: 28,
          speed: 240,
          ...(this.orientation === "vertical" ? { minX: 0, maxX: 0 } : { minY: 0, maxY: 0 }),
        },
      });
      this.#controllers.set(tab, controller);
    }
  }

  #dragStart = (event: CustomEvent<DragEventDetail>): void => {
    const tab = event.target as UITab;
    if (this.#controllers.get(tab) !== event.detail.controller) return;
    if (this.#drag) {
      event.preventDefault();
      return;
    }
    this.#motion.reset();
    const tabs = this.#tabs();
    const list = this.renderRoot.querySelector<HTMLElement>('[part="list"]')!;
    this.#drag = {
      tab,
      tabs,
      index: this.getOrder().indexOf(tab.value),
      rects: new Map(tabs.map((item) => [item, item.getBoundingClientRect()])),
      scroll: this.orientation === "vertical" ? list.scrollTop : list.scrollLeft,
      scale: list.getBoundingClientRect().width / list.offsetWidth || 1,
    };
    tab.dataset.dragging = "";
  };

  #dragMove = (event: CustomEvent<DragEventDetail>): void => {
    const drag = this.#drag;
    if (!drag || event.target !== drag.tab) return;
    const vertical = this.orientation === "vertical";
    const rtl = !vertical && getComputedStyle(this).direction === "rtl";
    const list = this.renderRoot.querySelector<HTMLElement>('[part="list"]')!;
    const scrollDelta = (vertical ? list.scrollTop : list.scrollLeft) - drag.scroll;
    const point =
      (vertical ? event.detail.pointer.y : event.detail.pointer.x) + scrollDelta * drag.scale;
    const remaining = drag.tabs.filter((tab) => tab !== drag.tab);
    const before = remaining.find((tab) => {
      const rect = drag.rects.get(tab)!;
      const middle = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
      return rtl ? point > middle : point < middle;
    });
    const order = this.getOrder().filter((value) => value !== drag.tab.value);
    drag.index = before ? order.indexOf(before.value) : order.length;
    const preview = [...remaining];
    preview.splice(before ? preview.indexOf(before) : preview.length, 0, drag.tab);
    const first = drag.rects.get(drag.tabs[0]!)!;
    const second = drag.rects.get(drag.tabs[1]!);
    const gap = second
      ? vertical
        ? second.top - first.bottom
        : rtl
          ? first.left - second.right
          : second.left - first.right
      : 0;
    let cursor = vertical ? first.top : rtl ? first.right : first.left;
    for (const tab of preview) {
      const rect = drag.rects.get(tab)!;
      const size = vertical ? rect.height : rect.width;
      const offset = (cursor - (vertical ? rect.top : rtl ? rect.right : rect.left)) / drag.scale;
      if (tab !== drag.tab) this.#motion.move(tab, vertical ? 0 : offset, vertical ? offset : 0);
      cursor += (rtl ? -1 : 1) * (size + gap);
    }
    const delta =
      (vertical ? event.detail.delta.y : event.detail.delta.x) / drag.scale + scrollDelta;
    this.#motion.move(drag.tab, vertical ? 0 : delta, vertical ? delta : 0, true);
  };

  #dragEnd = (event: CustomEvent<DragEventDetail>): void => {
    const drag = this.#drag;
    if (!drag || event.target !== drag.tab) return;
    this.#drag = null;
    const visual = new Map(drag.tabs.map((tab) => [tab, tab.getBoundingClientRect()]));
    this.#motion.reset();
    delete drag.tab.dataset.dragging;
    if (!event.detail.cancelled) this.reorder(drag.tab.value, drag.index);
    event.detail.controller.position = { x: 0, y: 0 };
    for (const tab of drag.tabs) {
      if (tab.parentElement !== this) continue;
      const previous = visual.get(tab)!;
      const next = tab.getBoundingClientRect();
      this.#motion.move(
        tab,
        (previous.left - next.left) / drag.scale,
        (previous.top - next.top) / drag.scale,
        true,
      );
      this.#motion.move(tab, 0, 0);
    }
    if (!event.detail.cancelled)
      void drag.tab.updateComplete.then(() => drag.tab.focus({ preventScroll: true }));
  };

  #previousTabs: UITab[] = [];
  #observer = new MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          record.target === this ||
          (record.target instanceof Element ? record.target : record.target.parentElement)?.closest(
            "ui-tab",
          )?.parentElement === this,
      )
    )
      this.#syncSelection();
  });

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated)
      void this.updateComplete.then(() => {
        if (this.isConnected) {
          this.#size.observe(this.renderRoot.querySelector('[part="list"]')!);
          this.#syncSelection();
        }
      });
    this.#observer.observe(this, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["disabled", "value", "hidden", "label"],
    });
  }

  override disconnectedCallback(): void {
    this.#observer.disconnect();
    this.#size.disconnect();
    this.#previousTabs = [];
    for (const controller of this.#controllers.values()) controller.destroy();
    this.#controllers.clear();
    this.#motion.destroy();
    super.disconnectedCallback();
  }

  #tabs(): UITab[] {
    return [...this.querySelectorAll<UITab>(":scope > ui-tab[slot='tab']")].filter(
      (tab) => !tab.hidden,
    );
  }

  #panels(): UITabPanel[] {
    return [...this.querySelectorAll<UITabPanel>(":scope > ui-tab-panel[slot='panel']")];
  }

  #syncSelection(): void {
    const tabs = this.#tabs();
    if (!tabs.some((tab) => tab.value === this.value && !tab.disabled)) {
      const previousIndex = this.#previousTabs.findIndex((tab) => tab.value === this.value);
      const candidates = tabs.filter((tab) => !tab.disabled);
      this.value =
        candidates[Math.min(Math.max(0, previousIndex), candidates.length - 1)]?.value ?? "";
      if (previousIndex >= 0 && this.ownerDocument.activeElement === this.ownerDocument.body) {
        const target = tabs.find((tab) => tab.value === this.value);
        void target?.updateComplete.then(() => target.focus());
      }
    }
    this.#previousTabs
      .filter((tab) => !tabs.includes(tab))
      .forEach((tab) => this.#size.unobserve(tab));
    tabs
      .filter((tab) => !this.#previousTabs.includes(tab))
      .forEach((tab) => this.#size.observe(tab));
    this.#previousTabs = tabs;
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.#measureOverflow();
      this.#syncDrags();
    });
    const tabByValue = new Map(tabs.map((tab) => [tab.value, tab]));
    for (const panel of this.#panels()) {
      panel.id ||= `ui-tab-panel-${++tabPanelId}`;
      const tab = tabByValue.get(panel.value);
      panel.selected = panel.value === this.value;
      panel.label = tab?.accessibleLabel || this.label;
      if (tab) tab.controls = panel.id;
    }
    for (const [index, tab] of tabs.entries()) {
      tab.selected = tab.value === this.value;
      tab.position = index + 1;
      tab.setSize = tabs.length;
      tab.requestUpdate();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("value")) this.#syncSelection();
    if (changed.has("reorderable") || changed.has("orientation")) {
      for (const controller of this.#controllers.values()) controller.destroy();
      this.#controllers.clear();
      this.#syncDrags();
    }
  }

  #onSlotChange = (): void => this.#syncSelection();

  /** Select an enabled tab through the same event path as pointer and keyboard activation. */
  select(value: string): boolean {
    if (!this.#tabs().some((tab) => tab.value === value && !tab.disabled)) return false;
    if (value === this.value) return true;
    this.value = value;
    this.#syncSelection();
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-tabs-change", {
        bubbles: true,
        composed: true,
        detail: { value },
      }),
    );
    return true;
  }

  #onTabSelect = (event: Event): void => {
    if ((event.target as Element).parentElement !== this) return;
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    this.select(value);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if ((event.target as Element).closest("ui-tabs") !== this) return;
    const rtl = getComputedStyle(this).direction === "rtl";
    const previous =
      this.orientation === "horizontal" ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
    const next =
      this.orientation === "horizontal" ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
    if (event.key !== previous && event.key !== next && event.key !== "Home" && event.key !== "End")
      return;
    const tabs = this.#tabs().filter((tab) => !tab.disabled);
    if (tabs.length === 0) return;
    const source = event
      .composedPath()
      .find((node) => node instanceof HTMLElement && node.localName === "ui-tab") as
      UITab | undefined;
    if (this.reorderable && event.altKey && event.shiftKey && source && !source.disabled) {
      event.preventDefault();
      const order = this.getOrder();
      const index =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? order.length - 1
            : Math.max(
                0,
                Math.min(
                  order.length - 1,
                  order.indexOf(source.value) + (event.key === next ? 1 : -1),
                ),
              );
      this.reorder(source.value, index);
      void source.updateComplete.then(() => {
        source.focus();
        source.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
      return;
    }
    let target: UITab;
    if (event.key === "Home") target = tabs[0]!;
    else if (event.key === "End") target = tabs.at(-1)!;
    else {
      const index = Math.max(0, tabs.indexOf(source as UITab));
      target = tabs[(index + (event.key === next ? 1 : -1) + tabs.length) % tabs.length]!;
    }
    event.preventDefault();
    this.select(target.value);
    target.focus();
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  protected override render(): TemplateResult {
    return html`
      <div part="strip">
        <slot part="prefix" name="prefix"></slot>
        <div
          part="list"
          role="tablist"
          aria-label=${this.label}
          aria-orientation=${this.orientation}
          @keydown=${this.#onKeydown}
          @scroll=${this.#measureOverflow}
        >
          <slot part="tab" name="tab" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <ui-menu
          part="overflow"
          ?hidden=${!this._overflowed}
          label=${`Choose tab in ${this.label}`}
          align="end"
          density="compact"
          exportparts="popup:overflow-popup"
          @ui-menu-select=${this.#onOverflow}
        >
          <button
            slot="trigger"
            part="overflow-trigger"
            type="button"
            aria-label=${`Choose tab in ${this.label}`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="m4 6 4 4 4-4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          ${this.#tabs().map((tab) => html`<ui-menu-item value=${tab.value} kind="radio" ?checked=${tab.value === this.value} ?disabled=${tab.disabled} exportparts="control:overflow-item">${tab.accessibleLabel}</ui-menu-item>`)}
        </ui-menu>
        <slot part="suffix" name="suffix"></slot>
      </div>
      <span part="announcement" role="status" aria-live="polite">${this._announcement}</span>
      <div part="panels">
        <slot part="panel" name="panel" @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}
