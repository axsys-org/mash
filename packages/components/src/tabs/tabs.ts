import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";

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
 * @csspart overflow-select - Native chooser listing complete tab labels.
 * @csspart announcement - Visually hidden reorder announcement.
 * @mashnode overflow control strip
 * @mashnode overflow-select control overflow
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
  declare size: "inherit" | "xsmall" | "small" | "medium" | "large";
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
  }

  static override styles = [
    baseStyles,
    css`
      [part="overflow"] {
        position: relative;
        flex: none;
      }
      [part="overflow-select"] {
        position: absolute;
        inset: 0;
        opacity: 0;
        width: 100%;
        cursor: pointer;
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
  #drag: {
    tab: UITab;
    x: number;
    y: number;
    index: number;
    active: boolean;
    pointerId: number;
    capture: HTMLElement | null;
    abort: AbortController;
  } | null = null;
  #suppressClick = false;

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
    if (list)
      this._overflowed =
        this.orientation === "vertical"
          ? list.scrollHeight > list.clientHeight + 1
          : list.scrollWidth > list.clientWidth + 1;
  }

  protected override firstUpdated(): void {
    this.#size.observe(this.renderRoot.querySelector('[part="list"]')!);
    this.#measureOverflow();
  }

  #onOverflow = (event: Event): void => {
    const value = (event.target as HTMLSelectElement).value;
    const tab = this.#tabs().find((candidate) => candidate.value === value && !candidate.disabled);
    if (!tab) return;
    this.select(value);
    tab.focus();
    tab.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  #pointerDown = (event: PointerEvent): void => {
    if (this.#drag && event.pointerId !== this.#drag.pointerId) return;
    const tab = event
      .composedPath()
      .find((node) => node instanceof HTMLElement && node.localName === "ui-tab") as
      UITab | undefined;
    if (
      !this.reorderable ||
      event.button !== 0 ||
      !tab ||
      tab.parentElement !== this ||
      tab.disabled ||
      event
        .composedPath()
        .some((node) => node instanceof HTMLElement && node.getAttribute("part") === "close")
    )
      return;
    this.#endDrag();
    this.#suppressClick = false;
    const abort = new AbortController();
    this.#drag = {
      tab,
      x: event.clientX,
      y: event.clientY,
      index: this.getOrder().indexOf(tab.value),
      active: false,
      pointerId: event.pointerId,
      capture: null,
      abort,
    };
    this.ownerDocument.addEventListener("pointermove", this.#pointerMove, { signal: abort.signal });
    this.ownerDocument.addEventListener("pointerup", this.#pointerUp, { signal: abort.signal });
    this.ownerDocument.addEventListener("pointercancel", this.#pointerCancel, {
      signal: abort.signal,
    });
    this.ownerDocument.addEventListener("keydown", this.#cancelDrag, { signal: abort.signal });
  };

  #pointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
      const list = this.renderRoot.querySelector<HTMLElement>('[part="list"]')!;
      try {
        list.setPointerCapture(drag.pointerId);
        drag.capture = list;
        list.addEventListener("lostpointercapture", this.#pointerCancel, {
          signal: drag.abort.signal,
        });
      } catch {
        // Synthetic events have no active pointer to capture; document listeners still work.
      }
    }
    drag.active = true;
    drag.tab.dataset.dragging = "";
    event.preventDefault();
    const vertical = this.orientation === "vertical";
    const rtl = !vertical && getComputedStyle(this).direction === "rtl";
    const coordinate = vertical ? event.clientY : event.clientX;
    const remaining = this.#tabs().filter((tab) => tab !== drag.tab);
    this.#tabs().forEach((tab) => {
      delete tab.dataset.dropBefore;
      delete tab.dataset.dropAfter;
    });
    const before = remaining.find((tab) => {
      const bounds = tab.getBoundingClientRect();
      const middle = vertical ? bounds.top + bounds.height / 2 : bounds.left + bounds.width / 2;
      return rtl ? coordinate > middle : coordinate < middle;
    });
    const order = this.getOrder().filter((value) => value !== drag.tab.value);
    drag.index = before ? order.indexOf(before.value) : order.length;
    if (before) before.dataset.dropBefore = "";
    else if (remaining.at(-1)) remaining.at(-1)!.dataset.dropAfter = "";
    const list = this.renderRoot.querySelector<HTMLElement>('[part="list"]')!;
    const bounds = list.getBoundingClientRect();
    if (vertical)
      list.scrollTop +=
        coordinate < bounds.top + 24 ? -16 : coordinate > bounds.bottom - 24 ? 16 : 0;
    else
      list.scrollLeft +=
        coordinate < bounds.left + 24 ? -16 : coordinate > bounds.right - 24 ? 16 : 0;
  };

  #pointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.active) {
      this.#suppressClick = true;
      this.reorder(drag.tab.value, drag.index);
      void drag.tab.updateComplete.then(() => drag.tab.focus());
    }
    this.#endDrag();
  };

  #pointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.#drag?.pointerId) this.#endDrag();
  };

  #cancelDrag = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !this.#drag?.active) return;
    event.preventDefault();
    this.#endDrag();
  };

  #endDrag = (): void => {
    const drag = this.#drag;
    this.#drag = null;
    if (drag?.active) this.#suppressClick = true;
    drag?.abort.abort();
    if (drag?.capture?.hasPointerCapture(drag.pointerId))
      drag.capture.releasePointerCapture(drag.pointerId);
    this.#tabs().forEach((tab) => {
      delete tab.dataset.dragging;
      delete tab.dataset.dropBefore;
      delete tab.dataset.dropAfter;
    });
  };

  #captureClick = (event: Event): void => {
    if (!this.#suppressClick) return;
    this.#suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
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
    this.#endDrag();
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
    void this.updateComplete.then(() => this.#measureOverflow());
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
          @pointerdown=${this.#pointerDown}
          @click=${{ handleEvent: this.#captureClick, capture: true }}
        >
          <slot part="tab" name="tab" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <span part="overflow" ?hidden=${!this._overflowed}>
          <span aria-hidden="true">⌄</span>
          <select
            part="overflow-select"
            aria-label=${`Choose tab in ${this.label}`}
            @change=${this.#onOverflow}
          >
            ${this.#tabs().map((tab) => html`<option value=${tab.value} ?selected=${tab.value === this.value} ?disabled=${tab.disabled}>${tab.accessibleLabel}</option>`)}
          </select>
        </span>
        <slot part="suffix" name="suffix"></slot>
      </div>
      <span part="announcement" role="status" aria-live="polite">${this._announcement}</span>
      <div part="panels">
        <slot part="panel" name="panel" @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}
