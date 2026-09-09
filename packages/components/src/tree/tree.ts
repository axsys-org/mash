import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import type { UITreeItem } from "../tree-item/tree-item.js";

export type TreeSelectionReason = "keyboard" | "pointer" | "imperative";
export type TreeScrollAlignment = "center" | "end" | "nearest" | "start";

export interface TreeSelectionDetail {
  value: string;
  index: number;
  reason: TreeSelectionReason;
}

export interface TreeToggleDetail {
  value: string;
  expanded: boolean;
}

export interface TreeRevealDetail {
  value: string;
  ancestors: string[];
  alignment: TreeScrollAlignment;
}

/**
 * A navigable tree surface.
 *
 * The tree owns hierarchy navigation only. Items supply reflected state and
 * request changes through events, while an opt-in recipe decides whether the
 * same structure looks like a file browser, an outline, or a compact picker.
 *
 * @tag ui-tree
 * @summary Groups expandable tree items into an accessible hierarchy.
 *
 * @example Project namespace
 * <ui-tree label="Project namespace">
 *   <ui-tree-item value="projects" kind="folder" title="Projects" expanded>
 *     <ui-tree-item slot="children" value="billing" kind="file" title="Billing migration"></ui-tree-item>
 *   </ui-tree-item>
 * </ui-tree>
 *
 * @slot - Tree items.
 * @csspart root - The semantic tree container.
 * @csspart children - The authored tree-item collection.
 * @cssstate focused - A tree row currently owns the roving keyboard focus.
 *
 * @fires {CustomEvent<TreeSelectionDetail>} ui-tree-select - Requests selection of an identified item.
 * @fires {CustomEvent<TreeToggleDetail>} ui-tree-toggle - Reports a child expansion request at the tree boundary.
 * @fires {CustomEvent<TreeRevealDetail>} ui-tree-reveal - Requests ancestor expansion and scroll reveal for an identified item.
 *
 * @mashnode root root
 * @mashnode children children root
 * @mashnode label label root
 * @mashnode selection-follows-focus selection-follows-focus root
 * @mashnode focused focused root
 * @mashnode select select root
 * @mashnode toggle toggle root
 * @mashnode reveal reveal root
 * @mashrole slot default children children
 * @mashrole event ui-tree-select select select
 * @mashrole event ui-tree-toggle toggle toggle
 * @mashrole event ui-tree-reveal reveal reveal
 */
export class UITree extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
    selectionFollowsFocus: {
      type: Boolean,
      attribute: "selection-follows-focus",
      reflect: true,
    },
  };

  /** Accessible name for the tree region. */
  declare label: string;
  /** Requests selection whenever roving keyboard focus moves to another item. */
  declare selectionFollowsFocus: boolean;

  readonly #internals: ElementInternals;
  #typeahead = "";
  #typeaheadTimer: number | undefined;
  readonly #collectionObserver = new MutationObserver(() => this.#syncTabStops());

  constructor() {
    super();
    this.label = "Tree";
    this.selectionFollowsFocus = true;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  protected override firstUpdated(): void {
    this.#syncTabStops();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#collectionObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["expanded", "disabled", "hidden", "selected", "current", "parent-value"],
    });
  }

  override disconnectedCallback(): void {
    this.#collectionObserver.disconnect();
    if (this.#typeaheadTimer !== undefined) window.clearTimeout(this.#typeaheadTimer);
    super.disconnectedCallback();
  }

  #items(): UITreeItem[] {
    return [...this.querySelectorAll<UITreeItem>("ui-tree-item")].filter(
      (item) => item.closest("ui-tree") === this,
    );
  }

  #visibleItems(): UITreeItem[] {
    return this.#items().filter((item) => {
      if (item.disabled || item.hidden) return false;
      const visited = new Set<UITreeItem>([item]);
      let parent = item.parentItem;
      while (parent) {
        if (visited.has(parent) || !parent.expanded || parent.hidden) return false;
        visited.add(parent);
        parent = parent.parentItem;
      }
      return true;
    });
  }

  #syncTabStops(preferred?: UITreeItem): void {
    const items = this.#items();
    const visible = this.#visibleItems();
    const focused = items.find(
      (item) =>
        item.shadowRoot?.activeElement &&
        item.shadowRoot.activeElement === item.shadowRoot?.querySelector("[part='control']"),
    );
    let ancestor = focused;
    const visited = new Set<UITreeItem>();
    while (ancestor && !visible.includes(ancestor) && !visited.has(ancestor)) {
      visited.add(ancestor);
      ancestor = ancestor.parentItem;
    }
    const active =
      (preferred && visible.includes(preferred) ? preferred : undefined) ??
      (ancestor && visible.includes(ancestor) ? ancestor : undefined) ??
      visible.find((item) => item.selected || item.current) ??
      visible[0];
    for (const item of items) item.setTabbable(item === active);
    if (focused && !visible.includes(focused)) active?.focusControl();
  }

  #onSlotChange = (): void => {
    this.#syncTabStops();
  };

  #onFocusIn = (event: FocusEvent): void => {
    const item = event
      .composedPath()
      .find(
        (node): node is UITreeItem =>
          node instanceof HTMLElement && node.localName === "ui-tree-item",
      );
    if (item) {
      this.#internals.states.add("focused");
      this.#syncTabStops(item);
    }
  };

  #onFocusOut = (event: FocusEvent): void => {
    const root = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    this.#internals.states.delete("focused");
  };

  #requestSelection(item: UITreeItem, reason: TreeSelectionReason): void {
    if (item.disabled) return;
    const items = this.#visibleItems();
    this.dispatchEvent(
      new CustomEvent<TreeSelectionDetail>("ui-tree-select", {
        bubbles: true,
        composed: true,
        detail: { value: item.identity, index: items.indexOf(item), reason },
      }),
    );
  }

  #onItemSelect = (event: Event): void => {
    const item = event
      .composedPath()
      .find(
        (node): node is UITreeItem =>
          node instanceof HTMLElement && node.localName === "ui-tree-item",
      );
    if (item) this.#requestSelection(item, "pointer");
  };

  #onItemToggle = (event: Event): void => {
    const item = event
      .composedPath()
      .find(
        (node): node is UITreeItem =>
          node instanceof HTMLElement && node.localName === "ui-tree-item",
      );
    if (!item) return;
    this.dispatchEvent(
      new CustomEvent<TreeToggleDetail>("ui-tree-toggle", {
        bubbles: true,
        composed: true,
        detail: {
          value: item.identity,
          expanded: (event as CustomEvent<{ expanded: boolean }>).detail.expanded,
        },
      }),
    );
  };

  #onKeydown = (event: KeyboardEvent): void => {
    const item = event
      .composedPath()
      .find(
        (node): node is UITreeItem =>
          node instanceof HTMLElement && node.localName === "ui-tree-item",
      );
    if (!item) return;
    const control = item.shadowRoot?.querySelector<HTMLElement>("[part='control']");
    if (!control || !event.composedPath().includes(control)) return;

    const items = this.#visibleItems();
    const index = items.indexOf(item);
    if (index < 0) return;

    let target: UITreeItem | undefined;
    switch (event.key) {
      case "ArrowDown":
        target = items[(index + 1) % items.length];
        break;
      case "ArrowUp":
        target = items[(index - 1 + items.length) % items.length];
        break;
      case "Home":
        target = items[0];
        break;
      case "End":
        target = items.at(-1);
        break;
      case "ArrowRight":
        if (item.branch && !item.expanded) item.requestExpansion(true);
        else if (item.branch && item.expanded)
          target = items.find((candidate) => candidate.parentItem === item);
        else return;
        break;
      case "ArrowLeft":
        if (item.branch && item.expanded) item.requestExpansion(false);
        else if (item.parentItem) target = item.parentItem;
        else return;
        break;
      case "Enter":
      case " ":
        this.#requestSelection(item, "keyboard");
        if (item.branch) item.requestExpansion(!item.expanded);
        event.preventDefault();
        return;
      default:
        if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) return;
        {
          window.clearTimeout(this.#typeaheadTimer);
          this.#typeahead += event.key.toLocaleLowerCase();
          this.#typeaheadTimer = window.setTimeout(() => (this.#typeahead = ""), 500);
          const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)];
          target = ordered.find((candidate) =>
            candidate.accessibleLabel.toLocaleLowerCase().startsWith(this.#typeahead),
          );
          if (!target) return;
        }
    }

    event.preventDefault();
    if (target) this.#syncTabStops(target);
    target?.focusControl();
    if (target && this.selectionFollowsFocus) this.#requestSelection(target, "keyboard");
  };

  /** Returns the current visible-order index for a stable item identity. */
  indexOf(value: string): number {
    return this.#visibleItems().findIndex((item) => item.identity === value);
  }

  /** Moves the tree's roving focus to an identified visible item. */
  focusItem(value: string, select = this.selectionFollowsFocus): boolean {
    const item = this.#visibleItems().find((candidate) => candidate.identity === value);
    if (!item) return false;
    this.#syncTabStops(item);
    item.focusControl();
    if (select) this.#requestSelection(item, "imperative");
    return true;
  }

  /** Scrolls an identified item into the nearest owning viewport. */
  scrollToItem(value: string, alignment: TreeScrollAlignment = "nearest"): boolean {
    const item = [...this.querySelectorAll<UITreeItem>("ui-tree-item")].find(
      (candidate) => candidate.identity === value,
    );
    if (!item) return false;
    item.scrollIntoView({ block: alignment, inline: "nearest" });
    return true;
  }

  /** Requests disclosure of collapsed ancestors, then announces the reveal target. */
  revealItem(value: string, alignment: TreeScrollAlignment = "nearest"): boolean {
    const item = [...this.querySelectorAll<UITreeItem>("ui-tree-item")].find(
      (candidate) => candidate.identity === value,
    );
    if (!item) return false;
    const ancestors: UITreeItem[] = [];
    let parent = item.parentItem;
    while (parent) {
      ancestors.unshift(parent);
      if (!parent.expanded) parent.requestExpansion(true);
      parent = parent.parentItem;
    }
    this.dispatchEvent(
      new CustomEvent<TreeRevealDetail>("ui-tree-reveal", {
        bubbles: true,
        composed: true,
        detail: { value, ancestors: ancestors.map((ancestor) => ancestor.identity), alignment },
      }),
    );
    this.scrollToItem(value, alignment);
    return true;
  }

  protected override render(): TemplateResult {
    return html`
      <div
        part="root"
        role="tree"
        aria-label=${this.label}
        @keydown=${this.#onKeydown}
        @focusin=${this.#onFocusIn}
        @focusout=${this.#onFocusOut}
        @ui-tree-item-select=${this.#onItemSelect}
        @ui-tree-item-toggle=${this.#onItemToggle}
      >
        <slot part="children" @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}
