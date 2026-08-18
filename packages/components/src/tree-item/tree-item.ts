import { LitElement, css, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * One expandable node in a Shrine tree.
 *
 * Set `path` for the canonical namespace label, or `title` for a pretty label
 * while keeping the path as the accessible name. Put child items in the
 * `children` slot. Empty intermediate nodes stay visible because the tree is
 * structural rather than a flattened path string.
 *
 * @tag ui-tree-item
 * @summary Renders one expandable Shrine tree node.
 *
 * @slot - Fallback label content when no path or title is supplied.
 * @slot icon - Optional leading icon, passed to `ui-path` when a path is shown.
 * @slot children - Nested `ui-tree-item` elements.
 * @csspart root - The node region.
 * @csspart row - The node's disclosure and label row.
 * @csspart disclosure - The expand/collapse button.
 * @csspart label - The fallback label region.
 * @csspart children - The nested node group.
 */
export class UITreeItem extends LitElement {
  static override properties = {
    path: { type: String, reflect: true },
    title: { type: String, reflect: true },
    expanded: { type: Boolean, reflect: true },
    current: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    _hasChildren: { type: Boolean, state: true },
  };

  /** Canonical Shrine namespace path. */
  declare path: string;

  /** Pretty textual label, passed to `ui-path`. */
  declare title: string;

  /** Whether the nested children group is open. */
  declare expanded: boolean;

  /** Marks this node as the current location. */
  declare current: boolean;

  /** Marks this node as selected. */
  declare selected: boolean;

  /** Prevents disclosure and dims the node. */
  declare disabled: boolean;

  declare private _hasChildren: boolean;

  constructor() {
    super();
    this.path = "";
    this.title = "";
    this.expanded = false;
    this.current = false;
    this.selected = false;
    this.disabled = false;
    this._hasChildren = false;
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        max-inline-size: 100%;

        color: var(--color-text);
        font-family: var(--type-body-font-family);
        font-size: var(--type-body-font-size);
        line-height: var(--type-body-line-height);
      }

      .root {
        display: block;
        min-inline-size: 0;
      }

      .row {
        display: flex;
        align-items: center;
        min-inline-size: 0;
        gap: var(--space-control-gap);
        padding: var(--space-control-block-small) var(--space-control-inline);
        border-radius: var(--radius-control);
        transition:
          background-color var(--duration-control) var(--easing-control),
          color var(--duration-control) var(--easing-control);
      }

      .row:hover {
        background: color-mix(in oklab, var(--color-action) 8%, var(--color-surface));
      }

      :host([current]) .row,
      :host([selected]) .row {
        background: color-mix(in oklab, var(--color-action) 12%, var(--color-surface));
      }

      :host([disabled]) .row {
        color: var(--color-text-disabled);
        pointer-events: none;
      }

      .disclosure {
        display: inline-grid;
        flex: 0 0 auto;
        place-items: center;
        inline-size: 1.5rem;
        block-size: 1.5rem;
        padding: 0;

        appearance: none;
        background: transparent;
        border: 0;
        border-radius: var(--radius-control);
        color: var(--color-text-muted);
        cursor: pointer;
        font: inherit;
        transition:
          background-color var(--duration-control) var(--easing-control),
          color var(--duration-control) var(--easing-control),
          transform var(--duration-control) var(--easing-control);
      }

      .disclosure:hover {
        background: color-mix(in oklab, var(--color-action) 12%, var(--color-surface));
        color: var(--color-text);
      }

      .disclosure:focus-visible {
        outline: var(--border-focus-ring) solid var(--color-focus-ring);
        outline-offset: var(--border-focus-ring-offset);
      }

      .chevron {
        display: block;
        transform: rotate(0deg);
        transition: transform var(--duration-control) var(--easing-control);
      }

      :host([expanded]) .chevron {
        transform: rotate(90deg);
      }

      .label,
      ui-path {
        min-inline-size: 0;
        flex: 1 1 auto;
      }

      .label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .children {
        min-inline-size: 0;
        margin-inline-start: calc(1.5rem + var(--space-control-gap));
        padding-inline-start: var(--space-control-gap);
        border-inline-start: var(--border-hairline) solid var(--color-border);
      }

      .children[hidden] {
        display: none;
      }

      @media (forced-colors: active) {
        .row:hover,
        :host([current]) .row,
        :host([selected]) .row {
          outline: var(--border-hairline) solid CanvasText;
        }
      }

      /* The named children slot is the only nesting escape hatch: it keeps
         the indentation rule stable for both deep and sparse trees. */
    `,
  ];

  #onChildrenSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    this._hasChildren = slot.assignedElements({ flatten: true }).length > 0;
  };

  #toggle = (): void => {
    if (!this._hasChildren || this.disabled) return;
    this.expanded = !this.expanded;
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

    return html`<span part="label" class="label"><slot></slot></span>`;
  }

  protected override render(): TemplateResult {
    const hasDisclosure = this._hasChildren;
    const label = this.path || this.title || "Shrine node";

    return html`
      <div
        part="root"
        class="root"
        role="treeitem"
        aria-current=${this.current ? "page" : nothing}
        aria-selected=${this.selected ? "true" : nothing}
        aria-expanded=${hasDisclosure ? String(this.expanded) : nothing}
      >
        <div part="row" class="row">
          <button
            part="disclosure"
            class="disclosure"
            type="button"
            ?hidden=${!hasDisclosure}
            ?disabled=${this.disabled}
            aria-label=${this.expanded ? `Collapse ${label}` : `Expand ${label}`}
            @click=${this.#toggle}
          >
            <span class="chevron" aria-hidden="true">›</span>
          </button>
          ${this.renderLabel()}
        </div>
        <div
          part="children"
          class="children"
          role="group"
          ?hidden=${!hasDisclosure || !this.expanded}
        >
          <slot name="children" @slotchange=${this.#onChildrenSlotChange}></slot>
        </div>
      </div>
    `;
  }
}
