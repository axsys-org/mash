import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { selectCollection, type CollectionSelectionAction } from "../selection/collection.js";
import type { UITreeItem } from "../tree-item/tree-item.js";

export type TreeSelectionReason = "keyboard" | "pointer" | "imperative";
export type TreeScrollAlignment = "center" | "end" | "nearest" | "start";

export interface TreeSelectionDetail {
  value: string;
  index: number;
  reason: TreeSelectionReason;
}

export interface TreeSelectionChangeDetail {
  values: readonly string[];
  anchor: string | null;
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
 * By default the tree requests selection from its owner. Opt into single or
 * multiple selection to let it manage selectedValues. Items supply reflected state and
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
 * @fires {CustomEvent<TreeSelectionChangeDetail>} ui-tree-selection-change - Reports managed selection after a user action.
 * @fires {CustomEvent<TreeToggleDetail>} ui-tree-toggle - Reports a child expansion request at the tree boundary.
 * @fires {CustomEvent<TreeRevealDetail>} ui-tree-reveal - Requests ancestor expansion and scroll reveal for an identified item.
 *
 * @mashnode root root
 * @mashnode children children root
 * @mashnode label label root
 * @mashnode selection-follows-focus selection-follows-focus root
 * @mashnode selection-mode selection-mode root
 * @mashnode selection-change change root
 * @mashrole event ui-tree-selection-change change selection-change
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
    selectionMode: { type: String, attribute: "selection-mode", reflect: true },
    selectedValues: { attribute: false },
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

  /** Request preserves owner-managed selection; single/multiple manage selectedValues. */
  declare selectionMode: "request" | "single" | "multiple";
  /** Selected identities in managed mode. Assign a new array to update externally. */
  declare selectedValues: readonly string[];
  #selectionAnchor: string | null = null;
  #lastSelection: readonly string[] | undefined;

  readonly #internals: ElementInternals;
  #typeahead = "";
  #typeaheadTimer: number | undefined;
  readonly #collectionObserver = new MutationObserver(() => {
    this.#syncSelection();
    this.#syncTabStops();
  });

  constructor() {
    super();
    this.label = "Tree";
    this.selectionMode = "request";
    this.selectedValues = [];
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
    this.#syncSelection();
    this.#syncTabStops();
  };

  #onFocusIn = (event: FocusEvent): void => {
    const item = event
      .composedPath()
      .find(
        (node): node is UITreeItem =>
          node instanceof HTMLElement && node.localName === "ui-tree-item",
      );
    if (item && item.closest("ui-tree") === this) {
      this.#internals.states.add("focused");
      this.#syncTabStops(item);
    }
  };

  #onFocusOut = (event: FocusEvent): void => {
    if (event.relatedTarget instanceof Element && event.relatedTarget.closest("ui-tree") === this)
      return;
    this.#internals.states.delete("focused");
  };

  #syncSelection(): void {
    if (this.selectionMode === "request") return;
    const values = new Set(
      this.selectionMode === "single" ? this.selectedValues.slice(0, 1) : this.selectedValues,
    );
    for (const item of this.#items()) item.selected = values.has(item.identity);
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("selectionMode") || changed.has("selectedValues")) {
      if (this.selectionMode === "single" && this.selectedValues.length > 1)
        this.selectedValues = this.selectedValues.slice(0, 1);
      if (changed.has("selectedValues") && this.selectedValues !== this.#lastSelection)
        this.#selectionAnchor = this.selectedValues[0] ?? null;
      this.#syncSelection();
      this.#syncTabStops();
    }
  }

  #select(action: CollectionSelectionAction, reason: TreeSelectionReason): void {
    const state = selectCollection(
      { values: this.selectedValues, anchor: this.#selectionAnchor },
      this.#visibleItems().map((item) => item.identity),
      action,
    );
    this.#selectionAnchor = state.anchor;
    if (
      state.values.length === this.selectedValues.length &&
      state.values.every((value, index) => this.selectedValues[index] === value)
    )
      return;
    this.selectedValues = state.values;
    this.#lastSelection = state.values;
    this.#syncSelection();
    this.dispatchEvent(
      new CustomEvent<TreeSelectionChangeDetail>("ui-tree-selection-change", {
        bubbles: true,
        composed: true,
        detail: { values: [...state.values], anchor: state.anchor, reason },
      }),
    );
  }

  #requestSelection(
    item: UITreeItem,
    reason: TreeSelectionReason,
    modifiers: {
      shiftKey?: boolean;
      ctrlKey?: boolean;
      metaKey?: boolean;
    } = {},
    toggle = false,
  ): void {
    if (item.disabled) return;
    const items = this.#visibleItems();
    if (this.selectionMode !== "request") {
      const multiple = this.selectionMode === "multiple";
      const type =
        multiple && modifiers.shiftKey
          ? "range"
          : multiple && (toggle || modifiers.ctrlKey || modifiers.metaKey)
            ? "toggle"
            : "replace";
      this.#select(
        {
          type,
          value: item.identity,
          additive: Boolean(modifiers.ctrlKey || modifiers.metaKey),
        },
        reason,
      );
    }
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
    if (item && item.closest("ui-tree") === this)
      this.#requestSelection(item, "pointer", (event as CustomEvent).detail ?? {});
  };

  #onItemToggle = (event: Event): void => {
    const item = event
      .composedPath()
      .find(
        (node): node is UITreeItem =>
          node instanceof HTMLElement && node.localName === "ui-tree-item",
      );
    if (!item || item.closest("ui-tree") !== this) return;
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
    if (!item || item.closest("ui-tree") !== this) return;
    const control = item.shadowRoot?.querySelector<HTMLElement>("[part='control']");
    if (!control || !event.composedPath().includes(control)) return;

    const items = this.#visibleItems();
    const index = items.indexOf(item);
    if (index < 0) return;

    const multiple = this.selectionMode === "multiple";
    if (multiple && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      this.#select({ type: "all" }, "keyboard");
      return;
    }
    let target: UITreeItem | undefined;
    switch (event.key) {
      case "ArrowDown":
        target =
          items[multiple ? Math.min(index + 1, items.length - 1) : (index + 1) % items.length];
        break;
      case "ArrowUp":
        target =
          items[multiple ? Math.max(index - 1, 0) : (index - 1 + items.length) % items.length];
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
        this.#requestSelection(item, "keyboard", event, multiple && event.key === " ");
        if (item.activation !== "split" && item.branch && (!multiple || event.key === "Enter"))
          item.requestExpansion(!item.expanded);
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
    if (target && (multiple ? event.shiftKey : this.selectionFollowsFocus)) {
      if (multiple && !this.#selectionAnchor) this.#selectionAnchor = item.identity;
      this.#requestSelection(target, "keyboard", event);
    }
  };

  /** Returns the current visible-order index for a stable item identity. */
  indexOf(value: string): number {
    return this.#visibleItems().findIndex((item) => item.identity === value);
  }

  /** Moves the tree's roving focus to an identified visible item. */
  focusItem(
    value: string,
    select = this.selectionMode !== "multiple" && this.selectionFollowsFocus,
  ): boolean {
    const item = this.#visibleItems().find((candidate) => candidate.identity === value);
    if (!item) return false;
    this.#syncTabStops(item);
    item.focusControl();
    if (select) this.#requestSelection(item, "imperative");
    return true;
  }

  /** Scrolls an identified item into the nearest owning viewport. */
  scrollToItem(value: string, alignment: TreeScrollAlignment = "nearest"): boolean {
    const item = this.#items().find((candidate) => candidate.identity === value);
    if (!item) return false;
    item.scrollIntoView({ block: alignment, inline: "nearest" });
    return true;
  }

  /** Requests disclosure of collapsed ancestors, then announces the reveal target. */
  revealItem(value: string, alignment: TreeScrollAlignment = "nearest"): boolean {
    const item = this.#items().find((candidate) => candidate.identity === value);
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
        detail: {
          value,
          ancestors: ancestors.map((ancestor) => ancestor.identity),
          alignment,
        },
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
        aria-multiselectable=${String(this.selectionMode === "multiple")}
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
