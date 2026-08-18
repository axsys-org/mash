import { LitElement, css, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A navigable Shrine tree surface.
 *
 * The tree is intentionally compositional: direct children are
 * `<ui-tree-item>` elements, and an item can own another level through its
 * `children` slot. That keeps deeply nested structures and empty intermediate
 * namespaces explicit instead of flattening paths into a presentation-only
 * list.
 *
 * @tag ui-tree
 * @summary Groups expandable Shrine tree items.
 *
 * @slot - Tree items.
 * @csspart root - The tree region.
 *
 * @example Shrine hierarchy
 * <ui-tree label="Shrine namespaces">
 *   <ui-tree-item path="/shrine" expanded>
 *     <ui-tree-item slot="children" path="/shrine/axiomatic" expanded>
 *       <ui-tree-item slot="children" path="/shrine/axiomatic/foundry"></ui-tree-item>
 *     </ui-tree-item>
 *   </ui-tree-item>
 * </ui-tree>
 */
export class UITree extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
  };

  /** Accessible name for the tree region. */
  declare label: string;

  constructor() {
    super();
    this.label = "Shrine tree";
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
        padding: var(--space-control-block) 0;

        background: var(--color-surface);
        border: var(--border-hairline) solid var(--color-border);
        border-radius: var(--radius-container);
      }

      ::slotted(ui-tree-item) {
        display: block;
      }

      /* Style from semantic tokens only; indentation belongs to each item's
         explicit children group so depth remains legible on arbitrarily deep
         trees. */
    `,
  ];

  protected override render(): TemplateResult {
    return html`
      <div part="root" class="root" role="tree" aria-label=${this.label}>
        <slot></slot>
      </div>
    `;
  }
}
