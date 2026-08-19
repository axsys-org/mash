import { LitElement, css, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A semantic container for a hierarchy of `ui-tree-item` elements.
 *
 * The tree owns the collection boundary and accessible name. Tree item state
 * belongs to each `ui-tree-item`, so domain selection and loading rules can
 * remain in the application rather than accumulating in the shared primitive.
 *
 * @tag ui-tree
 * @summary Groups expandable tree items into an accessible hierarchy.
 *
 * @example Workspace tree
 * <ui-tree label="Workspace files">
 *   <ui-tree-item expanded>
 *     <span slot="icon" aria-hidden="true">▣</span>src
 *     <ui-tree-item slot="children"><span slot="icon" aria-hidden="true">•</span>main.ts</ui-tree-item>
 *     <ui-tree-item slot="children"><span slot="icon" aria-hidden="true">•</span>styles.css</ui-tree-item>
 *   </ui-tree-item>
 * </ui-tree>
 *
 * @slot - One or more `ui-tree-item` elements.
 *
 * @csspart root - The semantic tree container.
 */
export class UITree extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
  };

  /** Accessible name for the tree. */
  declare label: string;

  constructor() {
    super();
    this.label = "";
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .tree {
        display: grid;
        gap: var(--space-control-gap);
        min-inline-size: 0;
      }
    `,
  ];

  protected override render(): TemplateResult {
    return html`
      <div part="root" class="tree" role="tree" aria-label=${this.label || nothing}>
        <slot></slot>
      </div>
    `;
  }
}
