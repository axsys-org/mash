import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The physical scale a recipe may apply to a tree item. */
export type TreeItemSize = "small" | "medium";
/** The structural kind of a tree item. */
export type TreeItemKind = "file" | "folder";

/**
 * A selectable row inside `ui-tree` with optional nested children.
 *
 * The item exposes a stable anatomy and emits selection/expansion requests;
 * it never chooses colors, spacing, icons, indentation, or a visual path
 * treatment. `expanded`, `selected`, and `current` are parent-owned reflected
 * inputs so an application can persist them without reconciling hidden local
 * state.
 *
 * @tag ui-tree-item
 * @summary A controllable tree row with optional nested children.
 *
 * @example Shrine hierarchy
 * <ui-tree label="Shrine namespaces">
 *   <ui-tree-item kind="folder" path="/shrine" title="Shrine" expanded>
 *     <ui-tree-item slot="children" kind="file" path="/shrine/axiomatic" title="Axiomatic"></ui-tree-item>
 *   </ui-tree-item>
 * </ui-tree>
 *
 * @slot - Fallback item label when no path or title is supplied.
 * @slot label - Authored item label; `title`, `path`, and the default slot are fallbacks.
 * @slot disclosure - Optional branch-state glyph inside the row control.
 * @slot icon - Optional leading glyph or icon.
 * @slot meta - Optional secondary information after the label.
 * @slot actions - Optional trailing actions.
 * @slot children - Nested `ui-tree-item` elements belonging to this branch.
 *
 * @csspart root - The item's row container.
 * @csspart control - The selectable tree-item control.
 * @csspart disclosure - The stable leading branch-state cell inside the row control.
 * @csspart icon - The wrapper around the `icon` slot.
 * @csspart label - The title, path fallback, or default-slot label.
 * @csspart meta - The optional secondary `meta` slot.
 * @csspart actions - The wrapper around the `actions` slot.
 * @csspart children - The nested child group.
 *
 * @cssstate expanded - Matches `:state(expanded)` while the child group is visible.
 * @cssstate current - Matches `:state(current)` when this is the current location.
 * @cssstate selected - Matches `:state(selected)` when parent state selects this item.
 * @cssstate disabled - Matches `:state(disabled)` while activation is unavailable.
 *
 * @fires {CustomEvent<{ expanded: boolean }>} ui-tree-item-toggle - Requests a new expansion state.
 * @fires {CustomEvent<void>} ui-tree-item-select - Emitted when the row is activated.
 *
 * @mashrole attribute title label label
 * @mashrole slot default label label
 * @mashfallback slot disclosure literal "▸"
 * @mashfallback slot label bindings attribute:title attribute:path slot:default
 * @mashnode root root
 * @mashnode value value root
 * @mashnode parent parent root
 * @mashnode level level root
 * @mashnode disclosure disclosure root
 * @mashnode control control root
 * @mashnode label label control
 * @mashnode path path label
 * @mashnode icon icon control
 * @mashnode meta meta control
 * @mashnode actions actions root
 * @mashnode children children root
 * @mashnode kind kind root
 * @mashnode size size root
 * @mashnode expanded expanded children
 * @mashnode current current control
 * @mashnode selected selected control
 * @mashnode disabled disabled root
 * @mashnode select select control
 * @mashrole attribute parent-value parent parent
 */
export class UITreeItem extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String, reflect: true },
    parentValue: { type: String, attribute: "parent-value", reflect: true },
    level: { type: Number, reflect: true },
    path: { type: String, reflect: true },
    title: { type: String, reflect: true },
    kind: { type: String, reflect: true },
    expanded: { type: Boolean, reflect: true },
    current: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    _hasChildren: { type: Boolean, state: true },
  };

  /** Canonical Shrine namespace path. */
  declare path: string;
  /** Stable renderer-neutral item identity; falls back to path, title, or label text. */
  declare value: string;
  /** Stable parent identity for flattened or virtual renderer realizations. */
  declare parentValue: string;
  /** Explicit one-based semantic depth; zero infers depth from authored nesting. */
  declare level: number;
  /** Human-readable label. */
  declare title: string;
  /** Structural kind, including lazy folders with no assigned children yet. */
  declare kind: TreeItemKind;
  /** Whether the nested child group is visible. */
  declare expanded: boolean;
  /** Whether this node identifies the current location. */
  declare current: boolean;
  /** Whether the parent workflow has selected this item. */
  declare selected: boolean;
  /** Prevents activation and disclosure. */
  declare disabled: boolean;
  /** Physical scale a recipe may apply. */
  declare size: TreeItemSize;

  declare private _hasChildren: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.value = "";
    this.parentValue = "";
    this.level = 0;
    this.path = "";
    this.title = "";
    this.kind = "file";
    this.expanded = false;
    this.current = false;
    this.selected = false;
    this.disabled = false;
    this.size = "medium";
    this._hasChildren = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  protected override updated(changed: PropertyValues<this>): void {
    for (const state of ["expanded", "current", "selected", "disabled"] as const) {
      if (!changed.has(state)) continue;
      if (this[state]) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
  }

  /** Whether this item may reveal a child group. */
  get branch(): boolean {
    return this.kind === "folder" || this._hasChildren;
  }

  /** Direct nested children, in authored order. */
  get childItems(): UITreeItem[] {
    return [...this.children].filter(
      (child): child is UITreeItem =>
        child instanceof HTMLElement &&
        child.localName === "ui-tree-item" &&
        child.getAttribute("slot") === "children",
    );
  }

  /** The owning branch, when this item is nested. */
  get parentItem(): UITreeItem | undefined {
    const parent = this.parentElement?.closest<UITreeItem>("ui-tree-item");
    if (parent) return parent;
    if (!this.parentValue) return undefined;
    const tree = this.closest("ui-tree");
    return [...(tree?.querySelectorAll<UITreeItem>("ui-tree-item") ?? [])].find(
      (candidate) => candidate !== this && candidate.identity === this.parentValue,
    );
  }

  /** Stable identity consumed by selection, expansion, and reveal requests. */
  get identity(): string {
    return this.value || this.path || this.title || this.accessibleLabel;
  }

  /** Focuses the unified selectable and expandable row. */
  focusControl(): void {
    this.renderRoot.querySelector<HTMLButtonElement>("[part='control']")?.focus();
  }

  /** Assigns this item as the tree's one sequential keyboard stop. */
  setTabbable(tabbable: boolean): void {
    const control = this.renderRoot.querySelector<HTMLButtonElement>("[part='control']");
    if (control) control.tabIndex = tabbable ? 0 : -1;
  }

  /** Text used by the owning tree's typeahead navigation. */
  get accessibleLabel(): string {
    const authored =
      this.querySelector<HTMLElement>(":scope > [slot='label']")?.textContent?.trim();
    return authored || this.title || this.path || this.textContent?.trim() || "";
  }

  /** Requests the parent-controlled expansion state. */
  requestExpansion(expanded: boolean): void {
    if (this.disabled || !this.branch || this.expanded === expanded) return;
    this.dispatchEvent(
      new CustomEvent<{ expanded: boolean }>("ui-tree-item-toggle", {
        bubbles: true,
        composed: true,
        detail: { expanded },
      }),
    );
  }

  #onChildrenChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    this._hasChildren = slot
      .assignedElements({ flatten: true })
      .some((element) => element.localName === "ui-tree-item");
  };

  #onActivate = (): void => {
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent("ui-tree-item-select", { bubbles: true, composed: true }));
    if (this.branch) this.requestExpansion(!this.expanded);
  };

  #siblings(): UITreeItem[] {
    const tree = this.closest("ui-tree");
    if (this.parentValue && tree) {
      return [...tree.querySelectorAll<UITreeItem>("ui-tree-item")].filter(
        (candidate) => candidate.parentValue === this.parentValue,
      );
    }
    const parent = this.parentElement;
    if (!parent) return [this];
    return [...parent.children].filter(
      (child): child is UITreeItem =>
        child instanceof HTMLElement && child.localName === "ui-tree-item",
    );
  }

  #level(): number {
    if (this.level > 0) return Math.trunc(this.level);
    let level = 1;
    let parent = this.parentItem;
    while (parent) {
      level += 1;
      parent = parent.parentItem;
    }
    return level;
  }

  #renderLabel(): TemplateResult {
    const label = this.title || this.path;
    // A composed tree item commonly contains indentation whitespace, named
    // icon/meta slots, and nested children in its light DOM. Any one of those
    // would count as default-slot content and suppress a fallback. An explicit
    // title/path is therefore authoritative; the default slot is reserved for
    // genuinely label-only items.
    return html`
      <span part="label">
        <slot name="label">${label || html`<slot></slot>`}</slot>
      </span>
    `;
  }

  protected override render(): TemplateResult {
    const childrenVisible = this.branch && this.expanded;
    const siblings = this.#siblings();
    const position = siblings.indexOf(this) + 1;

    return html`
      <div part="root">
        <button
          part="control"
          type="button"
          role="treeitem"
          tabindex="0"
          aria-current=${this.current ? "page" : nothing}
          aria-expanded=${this.branch ? String(this.expanded) : nothing}
          aria-level=${this.#level()}
          aria-posinset=${position}
          aria-setsize=${siblings.length}
          aria-selected=${this.selected ? "true" : "false"}
          ?disabled=${this.disabled}
          @click=${this.#onActivate}
        >
          <span part="disclosure" aria-hidden="true" data-branch=${String(this.branch)}>
            ${
              this.branch
                ? html`<slot name="disclosure">${this.expanded ? "▾" : "▸"}</slot>`
                : nothing
            }
          </span>
          <span part="icon"><slot name="icon"></slot></span>
          ${this.#renderLabel()}
          <span part="meta"><slot name="meta"></slot></span>
        </button>
        <span part="actions"><slot name="actions"></slot></span>
      </div>
      <div part="children" role="group" ?hidden=${!childrenVisible}>
        <slot name="children" @slotchange=${this.#onChildrenChange}></slot>
      </div>
    `;
  }
}
