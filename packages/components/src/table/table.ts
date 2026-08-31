import { LitElement, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

export type TableSortDirection = "none" | "ascending" | "descending";
export type TableHeaderScope = "column" | "row" | "none";

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
 * @mashnode root table
 * @mashnode caption title root
 * @mashnode children children root
 * @mashnode row-count row-count root
 * @mashnode column-count column-count root
 * @mashnode label label root
 * @mashnode interactive interactive root
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
    interactive: { type: Boolean, reflect: true },
  };

  /** Total logical row count, including virtualized rows not currently rendered. */
  declare rowCount: number;
  /** Total logical column count, including virtualized columns not currently rendered. */
  declare columnCount: number;
  /** Accessible name for the table. */
  declare label: string;
  /** Uses ARIA grid semantics when an owning data-table supplies cell navigation. */
  declare interactive: boolean;

  constructor() {
    super();
    this.rowCount = 0;
    this.columnCount = 0;
    this.label = "";
    this.interactive = false;
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`
      <div
        part="root table"
        role=${this.interactive ? "grid" : "table"}
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
 * @example Project headings
 * <ui-table-header><ui-table-row><ui-table-head>Project</ui-table-head><ui-table-head>Status</ui-table-head></ui-table-row></ui-table-header>
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
 * @example Project rows
 * <ui-table-body><ui-table-row><ui-table-cell>Billing migration</ui-table-cell><ui-table-cell>Active</ui-table-cell></ui-table-row></ui-table-body>
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
 * @example One project row
 * <ui-table-row row-index="1"><ui-table-cell column-index="1">Billing migration</ui-table-cell><ui-table-cell column-index="2">Active</ui-table-cell></ui-table-row>
 * @slot - Header or data cells.
 * @csspart root - Compatibility alias for the semantic row.
 * @csspart row - The semantic row container.
 * @csspart children - Compatibility alias for the authored cell collection.
 * @csspart cells - The authored header- or data-cell collection.
 * @mashnode root row
 * @mashnode children children root
 * @mashnode row-index row-index root
 * @mashnode selected selected root
 * @mashrole part root row root
 * @mashrole part row row root
 * @mashrole slot default children children
 * @mashrole part children children children
 * @mashrole part cells children children
 */
export class UITableRow extends LitElement {
  static override properties = {
    rowIndex: { type: Number, attribute: "row-index", reflect: true },
    selected: { type: Boolean, reflect: true },
  };

  /** One-based accessibility index in the complete logical table. */
  declare rowIndex: number;
  /** Parent-controlled row selection state. */
  declare selected: boolean;

  constructor() {
    super();
    this.rowIndex = 0;
    this.selected = false;
  }

  static override styles = baseStyles;

  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector<HTMLElement>('[part~="row"]')?.focus(options);
  }

  protected override render(): TemplateResult {
    return html`
      <div
        part="root row"
        role="row"
        tabindex="-1"
        aria-rowindex=${this.rowIndex > 0 ? this.rowIndex : nothing}
        aria-selected=${this.selected ? "true" : nothing}
      >
        <slot part="children cells"></slot>
      </div>
    `;
  }
}

abstract class UITableCellBase extends LitElement {
  static override properties = {
    columnIndex: { type: Number, attribute: "column-index", reflect: true },
    interactive: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
    active: { type: Boolean, reflect: true },
    editable: { type: Boolean, reflect: true },
    sort: { type: String, reflect: true },
  };

  /** One-based accessibility index in the complete logical table. */
  declare columnIndex: number;
  /** Uses gridcell semantics when an owning data-table supplies navigation. */
  declare interactive: boolean;
  /** Parent-controlled selection state. */
  declare selected: boolean;
  /** Parent-controlled active-cell state. */
  declare active: boolean;
  /** Announces that the authored cell content may be edited. */
  declare editable: boolean;
  /** Sort state for column headers; ignored by ordinary data cells. */
  declare sort: TableSortDirection;

  protected abstract get cellRole(): "columnheader" | "rowheader" | "cell";
  protected abstract get cellParts(): string;

  constructor() {
    super();
    this.columnIndex = 0;
    this.interactive = false;
    this.selected = false;
    this.active = false;
    this.editable = false;
    this.sort = "none";
  }

  static override styles = baseStyles;

  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector<HTMLElement>('[part~="root"]')?.focus(options);
  }

  protected override render(): TemplateResult {
    return html`
      <div
        part=${`root ${this.cellParts}`}
        role=${this.interactive && this.cellRole === "cell" ? "gridcell" : this.cellRole}
        tabindex="-1"
        aria-colindex=${this.columnIndex > 0 ? this.columnIndex : nothing}
        aria-selected=${this.selected ? "true" : nothing}
        aria-readonly=${this.interactive ? (this.editable ? "false" : "true") : nothing}
        aria-sort=${this.cellRole === "columnheader" && this.sort !== "none" ? this.sort : nothing}
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
 * @example Sortable project heading
 * <ui-table-head column-index="1" sort="ascending">Project</ui-table-head>
 * @slot - Header content.
 * @csspart root - Compatibility alias for the semantic column header.
 * @csspart head - Compatibility alias for the column-header realization.
 * @csspart column-header - The semantic column-header cell.
 * @csspart row-header - The semantic row-header cell when `scope="row"`.
 * @csspart content - The authored header content binding.
 * @mashnode root header
 * @mashnode content content root
 * @mashnode column-index column-index root
 * @mashnode interactive interactive root
 * @mashnode selected selected root
 * @mashnode active active root
 * @mashnode editable editable root
 * @mashnode sort sort root
 * @mashnode scope scope root
 * @mashrole part root header root
 * @mashrole part head header root
 * @mashrole part column-header header root
 * @mashrole part row-header header root
 * @mashrole slot default content content
 * @mashrole part content content content
 */
export class UITableHead extends UITableCellBase {
  static override properties = {
    ...UITableCellBase.properties,
    scope: { type: String, reflect: true },
  };

  /** Selectable axis represented by this header; `none` is useful for a grid corner. */
  declare scope: TableHeaderScope;

  constructor() {
    super();
    this.scope = "column";
  }

  protected get cellRole(): "columnheader" | "rowheader" {
    return this.scope === "row" ? "rowheader" : "columnheader";
  }

  protected get cellParts(): string {
    return this.scope === "row" ? "head row-header" : "head column-header";
  }
}

/**
 * An unstyled table data cell.
 *
 * @tag ui-table-cell
 * @summary Realizes one value at a row and column position.
 * @example Composed status cell
 * <ui-table-cell column-index="2"><ui-badge tone="positive">Active</ui-badge></ui-table-cell>
 * @slot - Cell content.
 * @csspart root - Compatibility alias for the semantic data cell.
 * @csspart cell - The data-cell realization.
 * @csspart content - The authored cell content binding.
 * @mashnode root cell
 * @mashnode content content root
 * @mashnode column-index column-index root
 * @mashnode interactive interactive root
 * @mashnode selected selected root
 * @mashnode active active root
 * @mashnode editable editable root
 * @mashrole part root cell root
 * @mashrole slot default content content
 * @mashrole part content content content
 */
export class UITableCell extends UITableCellBase {
  protected get cellRole(): "cell" {
    return "cell";
  }

  protected get cellParts(): string {
    return "cell";
  }
}

/**
 * An unstyled table caption.
 *
 * @tag ui-table-caption
 * @summary Names or describes a table.
 * @example Project table caption
 * <ui-table-caption>Interzone projects</ui-table-caption>
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
