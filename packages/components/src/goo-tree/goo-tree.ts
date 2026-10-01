import type WaTree from "@awesome.me/webawesome/dist/components/tree/tree.js";
import type WaTreeItem from "@awesome.me/webawesome/dist/components/tree-item/tree-item.js";

export type GooTreeSelection = "none" | "single" | "multiple";
export interface GooTreeToggleDetail {
  subject: string;
  expanded: boolean;
}
export interface GooTreeSelectDetail {
  subjects: string[];
}
export interface GooTreeLazyLoadDetail {
  subject: string;
}

/**
 * A subject-based event adapter around one caller-owned Web Awesome tree.
 * WA owns focus, keyboard traversal, ARIA, and immediate interaction state.
 * Goo owns the nested DOM, presentation, and durable selection/disclosure.
 *
 * @tag goo-tree
 * @summary Adapts a Web Awesome tree to Goo subject-based interaction signals.
 * @attr {string} selection - single (default), multiple, or none.
 * @slot - One wa-tree with nested wa-tree-item elements carrying subject attributes.
 * @csspart root - Neutral wrapper; style the caller-owned WA elements directly.
 * @fires goo-tree-toggle - Disclosure changed; detail { subject, expanded }.
 * @fires goo-tree-select - Selection changed; detail { subjects } in DOM order.
 * @fires goo-tree-lazy-load - Materialization requested; detail { subject }.
 * @mashnode root root
 * @mashnode children children root
 * @mashnode toggle toggle root
 * @mashnode select select root
 * @mashnode load load root
 * @mashrole part root root root
 * @mashrole slot default children children
 * @mashrole event goo-tree-toggle toggle toggle
 * @mashrole event goo-tree-select select select
 * @mashrole event goo-tree-lazy-load load load
 * @example Caller-owned hierarchy
 * <goo-tree selection="single">
 *   <wa-tree aria-label="Files">
 *     <wa-tree-item subject="/src" expanded>
 *       <span>src</span>
 *       <wa-tree-item subject="/src/main.js">main.js</wa-tree-item>
 *       <wa-tree-item subject="/src/lib" branch lazy>lib</wa-tree-item>
 *     </wa-tree-item>
 *   </wa-tree>
 * </goo-tree>
 */
export class GooTree extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["selection"];
  }

  private tree: WaTree | undefined;
  private slotGate: HTMLSlotElement | undefined;
  private generation = 0;
  private queued = false;
  private lastError: string | undefined;
  // Event deduplication only: the DOM remains the sole hierarchy/state source.
  private readonly lastToggle = new WeakMap<WaTreeItem, boolean>();
  private readonly observer = new MutationObserver(() => {
    this.restoreInitialDisclosure();
    this.scheduleRefresh();
  });

  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML = `<style>
      :host { display: block; }
      :host([hidden]) { display: none; }
    </style><div part="root"><slot></slot></div>`;
  }

  connectedCallback(): void {
    this.restoreInitialDisclosure();
    this.addEventListener("wa-expand", this.onToggle);
    this.addEventListener("wa-collapse", this.onToggle);
    this.addEventListener("wa-selection-change", this.onSelect);
    this.addEventListener("wa-lazy-load", this.onLazyLoad);
    this.observer.observe(this, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["subject", "branch", "lazy"],
    });
    this.scheduleRefresh();
  }

  disconnectedCallback(): void {
    for (const item of this.items()) this.lastToggle.delete(item);
    this.generation++;
    this.observer.disconnect();
    this.detachGate();
    this.tree = undefined;
    this.removeEventListener("wa-expand", this.onToggle);
    this.removeEventListener("wa-collapse", this.onToggle);
    this.removeEventListener("wa-selection-change", this.onSelect);
    this.removeEventListener("wa-lazy-load", this.onLazyLoad);
  }

  attributeChangedCallback(): void {
    this.scheduleRefresh();
  }

  private get mode(): GooTreeSelection {
    const value = this.getAttribute("selection");
    return value === "none" || value === "multiple" ? value : "single";
  }

  private scheduleRefresh(): void {
    if (!this.isConnected || this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      if (this.isConnected) void this.refresh();
    });
  }

  private restoreInitialDisclosure(): void {
    // WA clears nested expansion during connection. Preserve the caller's
    // declarative value across that first update only; no durable state copy.
    for (const item of this.querySelectorAll<WaTreeItem>("wa-tree-item")) {
      if (item.hasUpdated || item.closest("goo-tree") !== this) continue;
      const expanded = item.hasAttribute("expanded");
      // Connected innerHTML can run the wrapper's callback before descendants
      // have upgraded, so read updateComplete in the next microtask.
      void Promise.resolve()
        .then(() => item.updateComplete)
        .then(() => {
          if (!this.isConnected || !this.contains(item)) return;
          this.lastToggle.set(item, expanded);
          const changed = item.expanded !== expanded;
          item.expanded = expanded;
          // WA skips its animation/lazy watcher for initial properties.
          if (!changed && expanded && item.lazy && !item.loading) item.handleExpandAnimation();
        });
    }
  }

  private async refresh(): Promise<void> {
    const generation = ++this.generation;
    const trees = Array.from(this.children).filter((el) => el.localName === "wa-tree") as WaTree[];
    const tree = trees.length === 1 ? trees[0] : undefined;
    if (this.tree !== tree) {
      this.detachGate();
      this.tree = tree;
    }
    if (!tree) {
      this.report("goo-tree requires exactly one direct wa-tree child");
      return;
    }
    tree.selection = this.mode === "multiple" ? "multiple" : "single";
    await tree.updateComplete;
    if (!this.isConnected || generation !== this.generation) return;
    if (!this.slotGate) {
      // A bubbling listener on the WA slot runs after consumer controls but
      // before WA's row handlers. Never block the control's target/default action.
      this.slotGate = tree.defaultSlot;
      this.slotGate.addEventListener("click", this.gateInteraction);
      this.slotGate.addEventListener("keydown", this.gateInteraction);
    }
    const items = this.items();
    await Promise.all(items.map((item) => item.updateComplete));
    if (!this.isConnected || generation !== this.generation) return;
    const subjects = new Set<string>();
    let error: string | undefined;
    for (const item of items) {
      const subject = item.getAttribute("subject");
      if (!subject) error ??= "goo-tree wa-tree-item requires a nonempty subject";
      else if (subjects.has(subject))
        error ??= `duplicate goo-tree subject: ${JSON.stringify(subject)}`;
      else subjects.add(subject);

      // WA 3.14 exposes these typed state properties. Keep this small version-
      // pinned bridge: branch is a capability hint, never a fabricated child or
      // a lazy request. Also finish empty lazy results (no slotchange occurs).
      item.isLeaf =
        !item.hasAttribute("branch") && !item.lazy && item.getChildrenItems().length === 0;
      item.handleExpandedChange();
      if (!item.lazy && item.loading) item.loading = false;
      if (this.mode === "none") item.selected = false;
      if (!this.lastToggle.has(item)) this.lastToggle.set(item, item.expanded);
    }
    if (error) this.report(error);
    else this.lastError = undefined;
  }

  private items(): WaTreeItem[] {
    return Array.from(this.tree?.querySelectorAll<WaTreeItem>("wa-tree-item") ?? []).filter(
      (item) => item.closest("wa-tree") === this.tree,
    );
  }

  private ownedItem(event: Event): WaTreeItem | undefined {
    const item = event.target;
    return item instanceof HTMLElement &&
      item.localName === "wa-tree-item" &&
      item.closest("wa-tree") === this.tree &&
      item.closest("goo-tree") === this
      ? (item as WaTreeItem)
      : undefined;
  }

  private emitToggle(item: WaTreeItem): void {
    const subject = item.getAttribute("subject");
    if (!subject || this.lastToggle.get(item) === item.expanded) return;
    this.lastToggle.set(item, item.expanded);
    this.dispatchEvent(
      new CustomEvent<GooTreeToggleDetail>("goo-tree-toggle", {
        bubbles: true,
        composed: true,
        detail: { subject, expanded: item.expanded },
      }),
    );
  }

  private readonly onToggle = (event: Event): void => {
    const item = this.ownedItem(event);
    if (item && event.type === "wa-expand" && !item.expanded) {
      // WA's loading-complete path animates expansion even if Goo collapsed the
      // item while loading. Let WA cancel that animation and render collapse.
      item.handleExpandAnimation();
      return;
    }
    if (item) this.emitToggle(item);
  };

  private readonly onLazyLoad = (event: Event): void => {
    const item = this.ownedItem(event);
    const subject = item?.getAttribute("subject");
    if (!item || !subject) return;
    this.emitToggle(item);
    this.dispatchEvent(
      new CustomEvent<GooTreeLazyLoadDetail>("goo-tree-lazy-load", {
        bubbles: true,
        composed: true,
        detail: { subject },
      }),
    );
  };

  private readonly onSelect = (event: Event): void => {
    if (event.target !== this.tree || this.mode === "none") return;
    const subjects = this.items()
      .filter((item) => item.selected)
      .map((item) => item.getAttribute("subject"))
      .filter((subject): subject is string => !!subject);
    this.dispatchEvent(
      new CustomEvent<GooTreeSelectDetail>("goo-tree-select", {
        bubbles: true,
        composed: true,
        detail: { subjects },
      }),
    );
  };

  private readonly gateInteraction = (event: Event): void => {
    const path = event.composedPath();
    const itemIndex = path.findIndex(
      (target) => target instanceof Element && target.localName === "wa-tree-item",
    );
    if (itemIndex < 0) return;
    const item = path[itemIndex] as WaTreeItem;
    const contentPath = path.slice(0, itemIndex);
    // WA's own checkbox/twisty is in the item's shadow root, not its light DOM.
    const inContent = contentPath.some((target) => target instanceof Node && item.contains(target));
    const interactive =
      inContent &&
      contentPath.some(
        (target) =>
          target instanceof Element &&
          target.matches(
            'button, a[href], input, textarea, select, summary, [contenteditable]:not([contenteditable="false"]), [tabindex], [role="button"], [role="link"], [data-goo-tree-interactive]',
          ),
      );
    const disclosure =
      !inContent &&
      contentPath.some(
        (target) => target instanceof Element && target.part.contains("expand-button"),
      );
    const selectionGesture =
      event.type === "click" ? !disclosure : ["Enter", " "].includes((event as KeyboardEvent).key);
    if (interactive || (this.mode === "none" && selectionGesture)) event.stopPropagation();
  };

  private detachGate(): void {
    this.slotGate?.removeEventListener("click", this.gateInteraction);
    this.slotGate?.removeEventListener("keydown", this.gateInteraction);
    this.slotGate = undefined;
  }

  private report(message: string): void {
    if (message !== this.lastError) console.warn(message);
    this.lastError = message;
  }
}
