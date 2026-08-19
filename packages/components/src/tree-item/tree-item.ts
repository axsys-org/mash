import { LitElement, css, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The physical scale of a tree item row. */
export type TreeItemSize = "small" | "medium";

/**
 * An expandable row inside `ui-tree`.
 *
 * Set `path` for the canonical Shrine namespace label, or `title` for a
 * human-readable label. Without either, the default slot becomes the label.
 * Child `ui-tree-item` elements belong in the `children` slot, which keeps
 * deep and sparse hierarchies structural rather than flattening them into a
 * path string.
 *
 * `expanded`, `selected`, and `current` are deliberately reflected rather
 * than owned by the tree: a consuming application chooses selection,
 * persistence, and navigation while this primitive supplies the interaction
 * surface.
 *
 * @tag ui-tree-item
 * @summary A selectable tree row with optional nested children and path labels.
 *
 * @example Shrine hierarchy
 * <ui-tree label="Shrine namespaces">
 *   <ui-tree-item path="/shrine" expanded>
 *     <ui-tree-item slot="children" path="/shrine/axiomatic" title="Axiomatic"></ui-tree-item>
 *   </ui-tree-item>
 * </ui-tree>
 *
 * @slot - Fallback item label when no path or title is supplied.
 * @slot icon - Optional leading glyph or icon.
 * @slot children - Nested `ui-tree-item` elements belonging to this branch.
 *
 * @csspart control - The native button carrying tree-item semantics.
 * @csspart disclosure - The branch disclosure indicator.
 * @csspart icon - The wrapper around the fallback `icon` slot.
 * @csspart label - The wrapper around the fallback default slot.
 * @csspart children - The nested child group.
 *
 * @fires {CustomEvent<{ expanded: boolean }>} ui-tree-item-toggle - Emitted after a branch opens or closes.
 * @fires {CustomEvent<void>} ui-tree-item-select - Emitted when the row is activated. Selection remains parent-owned.
 */
export class UITreeItem extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    path: { type: String, reflect: true },
    title: { type: String, reflect: true },
    expanded: { type: Boolean, reflect: true },
    current: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    _hasChildren: { type: Boolean, state: true },
  };

  /** Canonical Shrine namespace path. */
  declare path: string;
  /** Human-readable label, rendered by `ui-path` with a path. */
  declare title: string;
  /** Whether the nested child group is visible. Meaningful only when the `children` slot is filled. */
  declare expanded: boolean;
  /** Whether this node identifies the current location. */
  declare current: boolean;
  /** Whether the parent workflow has selected this item. */
  declare selected: boolean;
  /** Prevents activation and disclosure. */
  declare disabled: boolean;
  /** Physical scale. */
  declare size: TreeItemSize;

  declare private _hasChildren: boolean;

  constructor() {
    super();
    this.path = "";
    this.title = "";
    this.expanded = false;
    this.current = false;
    this.selected = false;
    this.disabled = false;
    this.size = "medium";
    this._hasChildren = false;
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-inline-size: 0;

        --_padding-block: var(--space-control-block-small);
        --_padding-inline: var(--space-control-inline-small);
        --_font-size: var(--type-label-font-size);
        --_line-height: var(--type-label-line-height);
        --_background: transparent;
        --_foreground: var(--color-text);
      }

      :host([size="small"]) {
        --_padding-block: var(--border-hairline);
        --_padding-inline: var(--space-control-block-small);
        --_font-size: var(--type-label-small-font-size);
        --_line-height: var(--type-label-small-line-height);
      }

      :host([current]),
      :host([selected]) {
        --_background: color-mix(in oklab, var(--color-action) 14%, transparent);
        --_foreground: var(--color-action);
      }

      :host([disabled]) {
        --_foreground: var(--color-text-disabled);
      }

      .control {
        display: grid;
        grid-template-columns: auto auto minmax(0, 1fr);
        align-items: center;
        inline-size: 100%;
        min-inline-size: 0;
        margin: 0;
        border: 0;
        border-radius: var(--radius-control);
        padding: var(--_padding-block) var(--_padding-inline);
        background: var(--_background);
        color: var(--_foreground);
        font-family: var(--type-label-font-family);
        font-size: var(--_font-size);
        font-weight: var(--type-label-font-weight);
        line-height: var(--_line-height);
        text-align: start;
        cursor: pointer;
      }

      .control:hover:not(:disabled) {
        background: color-mix(in oklab, var(--color-action) 8%, transparent);
      }

      :host([current]) .control:hover:not(:disabled),
      :host([selected]) .control:hover:not(:disabled) {
        background: color-mix(in oklab, var(--color-action) 20%, transparent);
      }

      .control:focus-visible {
        outline: var(--border-focus-ring) solid var(--color-focus-ring);
        outline-offset: var(--border-focus-ring-offset);
      }

      .control:disabled {
        cursor: not-allowed;
      }

      .disclosure {
        display: inline-grid;
        place-items: center;
        inline-size: var(--space-control-inline-small);
        block-size: var(--space-control-inline-small);
        color: var(--color-text-muted);
        transition: transform var(--duration-control) var(--easing-control);
      }

      :host([expanded]) .disclosure {
        transform: rotate(90deg);
      }

      .disclosure[hidden] {
        visibility: hidden;
      }

      .icon,
      .label,
      ui-path {
        min-inline-size: 0;
      }

      .icon {
        display: inline-flex;
        margin-inline-start: var(--space-control-gap);
        margin-inline-end: var(--space-control-gap);
        color: var(--color-text-muted);
      }

      ui-path {
        grid-column: 2 / -1;
      }

      .label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .children {
        display: grid;
        gap: var(--space-control-gap);
        min-inline-size: 0;
        margin-inline-start: var(--space-container-inline);
        border-inline-start: var(--border-hairline) solid var(--color-border);
        padding-inline-start: var(--space-control-inline-small);
      }

      .children[hidden] {
        display: none;
      }

      @media (forced-colors: active) {
        :host([current]) .control,
        :host([selected]) .control {
          outline: var(--border-hairline) solid CanvasText;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .disclosure {
          transition: none;
        }
      }
    `,
  ];

  #onChildrenChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    this._hasChildren = slot.assignedElements({ flatten: true }).length > 0;
  };

  #toggle(): void {
    if (this.disabled || !this._hasChildren) return;
    this.expanded = !this.expanded;
    this.dispatchEvent(
      new CustomEvent<{ expanded: boolean }>("ui-tree-item-toggle", {
        bubbles: true,
        composed: true,
        detail: { expanded: this.expanded },
      }),
    );
  }

  #onActivate = (): void => {
    if (this.disabled) return;
    this.#toggle();
    this.dispatchEvent(new CustomEvent("ui-tree-item-select", { bubbles: true, composed: true }));
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "ArrowRight" && this._hasChildren && !this.expanded) {
      event.preventDefault();
      this.#toggle();
    } else if (event.key === "ArrowLeft" && this.expanded) {
      event.preventDefault();
      this.#toggle();
    }
  };

  private renderLabel(): TemplateResult {
    if (this.path || this.title) {
      return html`
        <ui-path
          path=${this.path}
          title=${this.title || nothing}
          size="small"
          ?current=${this.current}
          ?selected=${this.selected}
        >
          <slot name="icon" slot="icon"></slot>
        </ui-path>
      `;
    }

    return html`
      <span part="icon" class="icon"><slot name="icon"></slot></span>
      <span part="label" class="label"><slot></slot></span>
    `;
  }

  protected override render(): TemplateResult {
    const visibleChildren = this._hasChildren && this.expanded;

    return html`
      <button
        part="control"
        class="control"
        type="button"
        role="treeitem"
        aria-current=${this.current ? "page" : nothing}
        aria-expanded=${this._hasChildren ? String(this.expanded) : nothing}
        aria-selected=${this.selected ? "true" : "false"}
        ?disabled=${this.disabled}
        @click=${this.#onActivate}
        @keydown=${this.#onKeydown}
      >
        <span part="disclosure" class="disclosure" aria-hidden="true" ?hidden=${!this._hasChildren}
          >▸</span
        >
        ${this.renderLabel()}
      </button>
      <div part="children" class="children" role="group" ?hidden=${!visibleChildren}>
        <slot name="children" @slotchange=${this.#onChildrenChange}></slot>
      </div>
    `;
  }
}
