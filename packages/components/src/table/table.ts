import { LitElement, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * An unstyled semantic table root.
 *
 * @tag ui-table
 * @summary Groups caption, row groups, rows, and cells as tabular data.
 *
 * @example Project status table
 * <ui-table label="Project status" row-count="4" column-count="3">
 *   <ui-table-caption slot="caption">Project status</ui-table-caption>
 *   <ui-table-header>
 *     <ui-table-row row-index="1">
 *       <ui-table-head column-index="1">Project</ui-table-head>
 *       <ui-table-head column-index="2">Status</ui-table-head>
 *       <ui-table-head column-index="3">Owner</ui-table-head>
 *     </ui-table-row>
 *   </ui-table-header>
 *   <ui-table-body>
 *     <ui-table-row row-index="2">
 *       <ui-table-cell column-index="1">Billing migration</ui-table-cell>
 *       <ui-table-cell column-index="2">Active</ui-table-cell>
 *       <ui-table-cell column-index="3">Finance</ui-table-cell>
 *     </ui-table-row>
 *     <ui-table-row row-index="3">
 *       <ui-table-cell column-index="1">Invoice reconciliation</ui-table-cell>
 *       <ui-table-cell column-index="2">Review</ui-table-cell>
 *       <ui-table-cell column-index="3">Operations</ui-table-cell>
 *     </ui-table-row>
 *     <ui-table-row row-index="4">
 *       <ui-table-cell column-index="1">Archive import</ui-table-cell>
 *       <ui-table-cell column-index="2">Paused</ui-table-cell>
 *       <ui-table-cell column-index="3">Records</ui-table-cell>
 *     </ui-table-row>
 *   </ui-table-body>
 * </ui-table>
 *
 * @slot caption - The table caption.
 * @slot - Row groups belonging to the table.
 * @csspart root - Compatibility alias for the semantic table surface.
 * @csspart table - The semantic table surface.
 * @csspart caption - The authored caption binding.
 * @csspart children - Compatibility alias for the authored row-group collection.
 * @csspart rowgroups - The authored header and body row-group collection.
 *
 * @mashnode root table
 * @mashnode caption title root
 * @mashnode children children root
 * @mashnode row-count row-count root
 * @mashnode column-count column-count root
 * @mashnode label label root
 * @mashrole part root table root
 * @mashrole part table table root
 * @mashrole slot caption title caption
 * @mashrole part caption title caption
 * @mashrole slot default children children
 * @mashrole part children children children
 * @mashrole part rowgroups children children
 */
export class UITable extends LitElement {
  static override properties = {
    rowCount: { type: Number, attribute: "row-count", reflect: true },
    columnCount: { type: Number, attribute: "column-count", reflect: true },
    label: { type: String, reflect: true },
  };

  /** Total logical row count, including virtualized rows not currently rendered. */
  declare rowCount: number;
  /** Total logical column count, including virtualized columns not currently rendered. */
  declare columnCount: number;
  /** Accessible name for the table. */
  declare label: string;

  constructor() {
    super();
    this.rowCount = 0;
    this.columnCount = 0;
    this.label = "";
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`
      <div
        part="root table"
        role="table"
        aria-label=${this.label || nothing}
        aria-rowcount=${this.rowCount > 0 ? this.rowCount : nothing}
        aria-colcount=${this.columnCount > 0 ? this.columnCount : nothing}
      >
        <slot name="caption" part="caption"></slot>
        <slot part="children rowgroups"></slot>
      </div>
    `;
  }
}

abstract class UITableRowGroup extends LitElement {
  static override styles = baseStyles;

  protected abstract groupPart: "header" | "body";

  protected override render(): TemplateResult {
    return html`
      <div part=${`root rowgroup ${this.groupPart}`} role="rowgroup">
        <slot part="children rows"></slot>
      </div>
    `;
  }
}

/**
 * The unstyled header row group of a table.
 *
 * @tag ui-table-header
 * @summary Groups table header rows.
 * @slot - Header rows.
 * @csspart root - Compatibility alias for the semantic header row group.
 * @csspart rowgroup - The semantic row-group container shared by header and body.
 * @csspart header - The header-group realization.
 * @csspart children - Compatibility alias for the authored row collection.
 * @csspart rows - The authored header-row collection.
 * @mashnode root header
 * @mashnode children children root
 * @mashrole part root header root
 * @mashrole part rowgroup header root
 * @mashrole part header header root
 * @mashrole slot default children children
 * @mashrole part children children children
 * @mashrole part rows children children
 */
export class UITableHeader extends UITableRowGroup {
  protected groupPart = "header" as const;
}

/**
 * The unstyled body row group of a table.
 *
 * @tag ui-table-body
 * @summary Groups table data rows.
 * @slot - Data rows.
 * @csspart root - Compatibility alias for the semantic body row group.
 * @csspart rowgroup - The semantic row-group container shared by header and body.
 * @csspart body - The body-group realization.
 * @csspart children - Compatibility alias for the authored row collection.
 * @csspart rows - The authored data-row collection.
 * @mashnode root group
 * @mashnode children children root
 * @mashrole part root group root
 * @mashrole part rowgroup group root
 * @mashrole part body group root
 * @mashrole slot default children children
 * @mashrole part children children children
 * @mashrole part rows children children
 */
export class UITableBody extends UITableRowGroup {
  protected groupPart = "body" as const;
}

/**
 * An unstyled semantic table row.
 *
 * @tag ui-table-row
 * @summary Groups cells at one logical row index.
 * @slot - Header or data cells.
 * @csspart root - Compatibility alias for the semantic row.
 * @csspart row - The semantic row container.
 * @csspart children - Compatibility alias for the authored cell collection.
 * @csspart cells - The authored header- or data-cell collection.
 * @mashnode root row
 * @mashnode children children root
 * @mashnode row-index row-index root
 * @mashrole part root row root
 * @mashrole part row row root
 * @mashrole slot default children children
 * @mashrole part children children children
 * @mashrole part cells children children
 */
export class UITableRow extends LitElement {
  static override properties = {
    rowIndex: { type: Number, attribute: "row-index", reflect: true },
  };

  /** One-based accessibility index in the complete logical table. */
  declare rowIndex: number;

  constructor() {
    super();
    this.rowIndex = 0;
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`
      <div part="root row" role="row" aria-rowindex=${this.rowIndex > 0 ? this.rowIndex : nothing}>
        <slot part="children cells"></slot>
      </div>
    `;
  }
}

abstract class UITableCellBase extends LitElement {
  static override properties = {
    columnIndex: { type: Number, attribute: "column-index", reflect: true },
  };

  /** One-based accessibility index in the complete logical table. */
  declare columnIndex: number;

  protected abstract cellRole: "columnheader" | "cell";
  protected abstract cellParts: string;

  constructor() {
    super();
    this.columnIndex = 0;
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`
      <div
        part=${`root ${this.cellParts}`}
        role=${this.cellRole}
        aria-colindex=${this.columnIndex > 0 ? this.columnIndex : nothing}
      >
        <slot part="content"></slot>
      </div>
    `;
  }
}

/**
 * An unstyled table column header.
 *
 * @tag ui-table-head
 * @summary Labels one table column.
 * @slot - Header content.
 * @csspart root - Compatibility alias for the semantic column header.
 * @csspart head - Compatibility alias for the column-header realization.
 * @csspart column-header - The semantic column-header cell.
 * @csspart content - The authored header content binding.
 * @mashnode root header
 * @mashnode content content root
 * @mashnode column-index column-index root
 * @mashrole part root header root
 * @mashrole part head header root
 * @mashrole part column-header header root
 * @mashrole slot default content content
 * @mashrole part content content content
 */
export class UITableHead extends UITableCellBase {
  protected cellRole = "columnheader" as const;
  protected cellParts = "head column-header";
}

/**
 * An unstyled table data cell.
 *
 * @tag ui-table-cell
 * @summary Realizes one value at a row and column position.
 * @slot - Cell content.
 * @csspart root - Compatibility alias for the semantic data cell.
 * @csspart cell - The data-cell realization.
 * @csspart content - The authored cell content binding.
 * @mashnode root cell
 * @mashnode content content root
 * @mashnode column-index column-index root
 * @mashrole part root cell root
 * @mashrole slot default content content
 * @mashrole part content content content
 */
export class UITableCell extends UITableCellBase {
  protected cellRole = "cell" as const;
  protected cellParts = "cell";
}

/**
 * An unstyled table caption.
 *
 * @tag ui-table-caption
 * @summary Names or describes a table.
 * @slot - Caption content.
 * @csspart root - Compatibility alias for the semantic caption.
 * @csspart caption - The semantic caption container.
 * @csspart title - The authored title binding.
 * @mashnode root title
 * @mashnode title title root
 * @mashrole part root title root
 * @mashrole part caption title root
 * @mashrole slot default title title
 * @mashrole part title title title
 */
export class UITableCaption extends LitElement {
  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<div part="root caption"><slot part="title"></slot></div>`;
  }
}
