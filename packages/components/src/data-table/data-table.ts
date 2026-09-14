import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { dispatchCommand, type GestureKind, type GestureSource } from "../gesture/gesture.js";
import {
  UITable,
  UITableCell,
  UITableHead,
  UITableRow,
  type UITableCell as UITableCellType,
} from "../table/table.js";

export type DataTableSelection = "none" | "row" | "column" | "cell";
export type DataTableDensity = "compact" | "regular" | "spacious";
export type DataTableInteractionReason = "keyboard" | "pointer" | "imperative";
export type DataTableEditReason = DataTableInteractionReason | "submit" | "reset" | "escape";

export interface DataTableCoordinate {
  columnIndex: number | null;
  key: string;
  rowIndex: number | null;
}

export interface DataTableSelectionRange {
  anchor: DataTableCoordinate;
  columnEnd: number | null;
  columnStart: number | null;
  focus: DataTableCoordinate;
  rowEnd: number | null;
  rowStart: number | null;
}

export interface DataTableSelectionDetail extends DataTableCoordinate {
  extended: boolean;
  reason: DataTableInteractionReason;
  range: DataTableSelectionRange;
  selection: DataTableSelection;
}

export interface DataTableActivationDetail extends DataTableCoordinate {
  reason: DataTableInteractionReason;
}

export interface DataTableEditDetail extends DataTableCoordinate {
  reason: DataTableEditReason;
}

export interface DataTableEditCommitDetail extends DataTableEditDetail {
  form: HTMLFormElement | null;
}

type SelectableTablePart = UITableCell | UITableHead | UITableRow;
type ActiveDataTableSelection = Exclude<DataTableSelection, "none">;

interface DataTableSelectionCandidate {
  part: SelectableTablePart;
  selection: ActiveDataTableSelection;
}

interface ParsedDataTableSelection {
  range: DataTableSelectionRange;
  selection: ActiveDataTableSelection;
}

/**
 * A controlled behavior and composition shell for authored Mash tables.
 *
 * `ui-data-table` does not own columns, row rendering, editor types, menus,
 * chips, data mutation, or virtualization. It coordinates a slotted `ui-table`,
 * exposes roving cell/row/column focus, and emits semantic selection, activation,
 * and edit-lifecycle requests. Applications remain free to compose any Mash
 * component inside a table cell or the shared editor region.
 *
 * @tag ui-data-table
 * @summary Adds controlled selection and composition regions to an authored ui-table.
 *
 * @example Selectable cells
 * <ui-data-table label="Project metrics" selection="cell" selected="2:2">
 *   <ui-toolbar slot="toolbar" label="Table tools"></ui-toolbar>
 *   <ui-table label="Project metrics" row-count="2" column-count="2"></ui-table>
 *   <output slot="footer">1 cell selected</output>
 * </ui-data-table>
 *
 * @slot toolbar - Controls that act on the complete data surface.
 * @slot - One authored `ui-table`; ordinary light-DOM composition remains visible.
 * @slot empty - Empty-state content shown when `empty` is true.
 * @slot loading - Loading-state content shown while `loading` is true.
 * @slot editor - One parent-authored editor, commonly a native form, for the controlled cell key.
 * @slot footer - Pagination, selection status, totals, or other trailing composition.
 *
 * @csspart root - The complete data-table composition boundary.
 * @csspart toolbar - The authored toolbar binding.
 * @csspart viewport - The overflow and table-content boundary.
 * @csspart table - The authored table binding.
 * @csspart empty - The authored empty-state binding.
 * @csspart loading - The authored loading-state binding.
 * @csspart editor - The authored editor binding, visible while `editing` is non-empty.
 * @csspart footer - The authored footer binding.
 *
 * @cssstate empty - Matches while the parent reports an empty data source.
 * @cssstate loading - Matches while the parent reports an in-flight data source.
 * @cssstate has-selection - Matches while the controlled `selected` key is non-empty.
 * @cssstate cell-selection - Matches while cell selection is active.
 * @cssstate row-selection - Matches while row selection is active.
 * @cssstate column-selection - Matches while column selection is active.
 * @cssstate editing - Matches while the parent reports an active editor coordinate.
 *
 * @fires {CustomEvent<DataTableSelectionDetail>} ui-data-table-select - Requests a new controlled selection key.
 * @fires {CustomEvent<DataTableActivationDetail>} ui-data-table-activate - Requests editing or another primary action for a cell.
 * @fires {CustomEvent<DataTableEditDetail>} ui-data-table-edit-request - Requests that the parent begin editing an authored editable cell.
 * @fires {CustomEvent<DataTableEditCommitDetail>} ui-data-table-edit-commit - Reports submission of the authored editor without mutating parent data.
 * @fires {CustomEvent<DataTableEditDetail>} ui-data-table-edit-cancel - Reports reset, Escape, or an imperative cancellation request.
 *
 * @mashnode root root
 * @mashnode toolbar toolbar root
 * @mashnode viewport viewport root
 * @mashnode table table viewport
 * @mashnode empty empty root
 * @mashnode loading loading root
 * @mashnode editor editor root
 * @mashnode footer footer root
 * @mashnode selection selection root
 * @mashnode selected selected root
 * @mashnode select select root
 * @mashnode activate activate root
 * @mashnode edit-request edit-request editor
 * @mashnode edit-commit edit-commit editor
 * @mashnode edit-cancel edit-cancel editor
 * @mashrole slot toolbar toolbar toolbar
 * @mashrole slot default table table
 * @mashrole slot empty empty empty
 * @mashrole slot loading loading loading
 * @mashrole slot editor editor editor
 * @mashrole slot footer footer footer
 * @mashrole event ui-data-table-select select select
 * @mashrole event ui-data-table-activate activate activate
 * @mashrole event ui-data-table-edit-request edit-request edit-request
 * @mashrole event ui-data-table-edit-commit edit-commit edit-commit
 * @mashrole event ui-data-table-edit-cancel edit-cancel edit-cancel
 */
export class UIDataTable extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
    selection: { type: String, reflect: true },
    density: { type: String, reflect: true },
    selected: { type: String, reflect: true },
    editing: {
      reflect: true,
      converter: {
        fromAttribute: (value: string | null): string => value ?? "",
        toAttribute: (value: string): string | null => value || null,
      },
    },
    loading: { type: Boolean, reflect: true },
    empty: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Accessible name for the composed data surface. */
  declare label: string;
  /** Parent-owned selection granularity. */
  declare selection: DataTableSelection;
  /** Physical row and cell density without changing semantic table structure. */
  declare density: DataTableDensity;
  /**
   * Parent-owned key or `anchor..focus` range. Cell ranges use
   * `row:column..row:column`; row and column ranges use `index..index`.
   * A cell-selectable grid prefixes title-selected bands with `row:` or
   * `column:` so the selected axis remains explicit.
   */
  declare selected: string;
  /** Parent-owned editable cell identity in `row:column` form. */
  declare editing: string;
  /** Reports that data is currently loading without replacing authored table content. */
  declare loading: boolean;
  /** Replaces the table viewport with the authored empty state. */
  declare empty: boolean;
  /** Prevents selection and activation requests. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;
  readonly #collectionObserver = new MutationObserver(() => this.#syncCollection());

  constructor() {
    super();
    this.label = "Data table";
    this.selection = "cell";
    this.density = "regular";
    this.selected = "";
    this.editing = "";
    this.loading = false;
    this.empty = false;
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("submit", this.#onSubmit);
    this.addEventListener("reset", this.#onReset);
    this.#collectionObserver.observe(this, {
      attributes: true,
      attributeFilter: ["row-index", "column-index", "hidden"],
      childList: true,
      subtree: true,
    });
  }

  override disconnectedCallback(): void {
    this.removeEventListener("submit", this.#onSubmit);
    this.removeEventListener("reset", this.#onReset);
    this.#collectionObserver.disconnect();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this.#syncCollection();
  }

  protected override updated(changed: PropertyValues<this>): void {
    for (const state of ["empty", "loading"] as const) {
      if (this[state]) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
    if (this.selected) this.#internals.states.add("has-selection");
    else this.#internals.states.delete("has-selection");
    if (this.editing) this.#internals.states.add("editing");
    else this.#internals.states.delete("editing");
    const activeSelection = this.#currentSelection()?.selection ?? this.selection;
    for (const mode of ["cell", "row", "column"] as const) {
      const state = `${mode}-selection`;
      if (activeSelection === mode) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
    if (
      changed.has("selection") ||
      changed.has("selected") ||
      changed.has("editing") ||
      changed.has("disabled") ||
      changed.has("empty")
    ) {
      this.#syncCollection();
    }
  }

  get table(): UITable | undefined {
    return this.querySelector<UITable>(":scope > ui-table") ?? undefined;
  }

  get #rows(): UITableRow[] {
    return [...this.querySelectorAll<UITableRow>("ui-table-row")].filter(
      (part) => !part.closest("[hidden]"),
    );
  }

  get #heads(): UITableHead[] {
    return [...this.querySelectorAll<UITableHead>("ui-table-head")].filter(
      (part) => !part.closest("[hidden]"),
    );
  }

  get #cells(): UITableCell[] {
    return [...this.querySelectorAll<UITableCell>("ui-table-cell")].filter(
      (part) => !part.closest("[hidden]"),
    );
  }

  #rowIndex(element: Element): number {
    return element.closest<UITableRow>("ui-table-row")?.rowIndex ?? 0;
  }

  #coordinate(
    element: SelectableTablePart,
    selection: ActiveDataTableSelection,
  ): DataTableCoordinate {
    if (element instanceof UITableRow) {
      return { rowIndex: element.rowIndex || null, columnIndex: null, key: `${element.rowIndex}` };
    }
    const columnIndex = element.columnIndex;
    if (selection === "column") {
      return { rowIndex: null, columnIndex: columnIndex || null, key: `${columnIndex}` };
    }
    const rowIndex = this.#rowIndex(element) || (element instanceof UITableHead ? 1 : 0);
    if (selection === "row") {
      return { rowIndex: rowIndex || null, columnIndex: null, key: `${rowIndex}` };
    }
    const key = `${rowIndex}:${columnIndex}`;
    return { rowIndex: rowIndex || null, columnIndex: columnIndex || null, key };
  }

  #coordinateFromKey(
    key: string,
    selection: ActiveDataTableSelection,
  ): DataTableCoordinate | undefined {
    if (!key) return undefined;
    if (selection === "cell") {
      const [rowText, columnText, ...extra] = key.split(":");
      const rowIndex = Number(rowText);
      const columnIndex = Number(columnText);
      if (extra.length > 0 || !Number.isInteger(rowIndex) || !Number.isInteger(columnIndex)) {
        return undefined;
      }
      return { rowIndex, columnIndex, key: `${rowIndex}:${columnIndex}` };
    }
    const index = Number(key);
    if (!Number.isInteger(index)) return undefined;
    return selection === "column"
      ? { rowIndex: null, columnIndex: index, key: `${index}` }
      : { rowIndex: index, columnIndex: null, key: `${index}` };
  }

  #rangeBetween(anchor: DataTableCoordinate, focus: DataTableCoordinate): DataTableSelectionRange {
    const rows = [anchor.rowIndex, focus.rowIndex].filter(
      (value): value is number => value !== null,
    );
    const columns = [anchor.columnIndex, focus.columnIndex].filter(
      (value): value is number => value !== null,
    );
    return {
      anchor,
      focus,
      rowStart: rows.length === 2 ? Math.min(...rows) : (rows[0] ?? null),
      rowEnd: rows.length === 2 ? Math.max(...rows) : (rows[0] ?? null),
      columnStart: columns.length === 2 ? Math.min(...columns) : (columns[0] ?? null),
      columnEnd: columns.length === 2 ? Math.max(...columns) : (columns[0] ?? null),
    };
  }

  #currentSelection(): ParsedDataTableSelection | undefined {
    let value = this.selected;
    let selection = this.selection;
    if (value.startsWith("row:")) {
      selection = "row";
      value = value.slice("row:".length);
    } else if (value.startsWith("column:")) {
      selection = "column";
      value = value.slice("column:".length);
    }
    if (selection === "none") return undefined;
    const [anchorKey, focusKey = anchorKey, ...extra] = value.split("..");
    if (extra.length > 0) return undefined;
    const anchor = this.#coordinateFromKey(anchorKey ?? "", selection);
    const focus = this.#coordinateFromKey(focusKey ?? "", selection);
    return anchor && focus ? { selection, range: this.#rangeBetween(anchor, focus) } : undefined;
  }

  #editingCoordinate(): DataTableCoordinate | undefined {
    return this.#coordinateFromKey(this.editing, "cell");
  }

  #contains(range: DataTableSelectionRange | undefined, coordinate: DataTableCoordinate): boolean {
    if (!range) return false;
    const rowMatches =
      coordinate.rowIndex === null ||
      (range.rowStart !== null &&
        range.rowEnd !== null &&
        coordinate.rowIndex >= range.rowStart &&
        coordinate.rowIndex <= range.rowEnd);
    const columnMatches =
      coordinate.columnIndex === null ||
      (range.columnStart !== null &&
        range.columnEnd !== null &&
        coordinate.columnIndex >= range.columnStart &&
        coordinate.columnIndex <= range.columnEnd);
    return rowMatches && columnMatches;
  }

  #candidateFromPath(path: EventTarget[]): DataTableSelectionCandidate | undefined {
    const element = path.find(
      (node): node is SelectableTablePart =>
        node instanceof UITableCell || node instanceof UITableHead || node instanceof UITableRow,
    );
    if (!element) return undefined;
    if (this.selection === "cell") {
      if (element instanceof UITableCell) return { part: element, selection: "cell" };
      if (element instanceof UITableHead && element.scope !== "none") {
        return { part: element, selection: element.scope };
      }
      return undefined;
    }
    if (this.selection === "row") {
      const row =
        element instanceof UITableRow
          ? element
          : (element.closest<UITableRow>("ui-table-row") ?? undefined);
      const rowIndex =
        row?.rowIndex ?? (element instanceof UITableHead ? this.#rowIndex(element) : 0);
      const part =
        element instanceof UITableHead && element.scope === "row"
          ? element
          : (this.#heads.find(
              (head) => head.scope === "row" && this.#rowIndex(head) === rowIndex,
            ) ?? row);
      return part ? { part, selection: "row" } : undefined;
    }
    if (this.selection === "column") {
      if (element instanceof UITableHead && element.scope === "column") {
        return { part: element, selection: "column" };
      }
      const columnIndex = element instanceof UITableRow ? 0 : element.columnIndex;
      const part = this.#heads.find(
        (head) => head.scope === "column" && head.columnIndex === columnIndex,
      );
      return part ? { part, selection: "column" } : undefined;
    }
    return undefined;
  }

  #orderedCandidates(selection: ActiveDataTableSelection): SelectableTablePart[] {
    if (selection === "row") {
      const rowHeaders = this.#heads.filter(
        (head) => head.scope === "row" && this.#rowIndex(head) > 1,
      );
      return rowHeaders.length > 0 ? rowHeaders : this.#rows.filter((row) => row.rowIndex > 1);
    }
    if (selection === "column") return this.#heads.filter((head) => head.scope === "column");
    if (selection === "cell") return this.#cells;
    return [];
  }

  #syncCollection(): void {
    const table = this.table;
    if (table) table.interactive = this.selection !== "none";
    const rows = this.#rows;
    const heads = this.#heads;
    const cells = this.#cells;
    const current = this.#currentSelection();
    const activeSelection =
      current?.selection ?? (this.selection === "none" ? undefined : this.selection);
    const range = current?.range;
    for (const row of rows) {
      row.selected =
        activeSelection === "row" && this.#contains(range, this.#coordinate(row, "row"));
    }
    for (const head of heads) {
      head.interactive = this.selection !== "none";
      const axis = head.scope === "row" ? "row" : "column";
      const coordinate = this.#coordinate(head, axis);
      head.selected =
        head.scope !== "none" && activeSelection === axis && this.#contains(range, coordinate);
      head.active =
        head.scope !== "none" && activeSelection === axis && coordinate.key === range?.focus.key;
    }
    for (const cell of cells) {
      cell.interactive = this.selection !== "none";
      const coordinate = this.#coordinate(cell, "cell");
      const cellSelected = activeSelection === "cell" && this.#contains(range, coordinate);
      const columnCoordinate = this.#coordinate(cell, "column");
      const columnSelected =
        activeSelection === "column" && this.#contains(range, columnCoordinate);
      cell.selected = cellSelected || columnSelected;
      cell.active = activeSelection === "cell" && coordinate.key === range?.focus.key;
      cell.toggleAttribute("data-editing", coordinate.key === this.editing);
    }

    const candidates = activeSelection ? this.#orderedCandidates(activeSelection) : [];
    const selected = activeSelection
      ? candidates.find(
          (candidate) => this.#coordinate(candidate, activeSelection).key === range?.focus.key,
        )
      : undefined;
    const active = selected ?? candidates[0];
    for (const candidate of [...rows, ...heads, ...cells]) {
      candidate.tabIndex = !this.disabled && !this.empty && candidate === active ? 0 : -1;
    }
  }

  #emitSelection(
    candidate: DataTableSelectionCandidate,
    reason: DataTableInteractionReason,
    extended = false,
    originalEvent?: Event,
  ): void {
    if (this.disabled || this.selection === "none") return;
    const focus = this.#coordinate(candidate.part, candidate.selection);
    const current = this.#currentSelection();
    const anchor =
      extended && current?.selection === candidate.selection ? current.range.anchor : focus;
    const range = this.#rangeBetween(anchor, focus);
    const rawKey = anchor.key === focus.key ? focus.key : `${anchor.key}..${focus.key}`;
    const key =
      candidate.selection === this.selection ? rawKey : `${candidate.selection}:${rawKey}`;
    const detail: DataTableSelectionDetail = {
      ...focus,
      key,
      extended,
      range,
      reason,
      selection: candidate.selection,
    };
    this.dispatchEvent(
      new CustomEvent<DataTableSelectionDetail>("ui-data-table-select", {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
    dispatchCommand(this, extended ? "selection.extend" : "selection.set", {
      data: detail,
      gesture: this.#gestureForReason(reason),
      originalEvent,
      source: this.#sourceForReason(reason),
    });
  }

  #emitActivation(
    cell: UITableCellType,
    reason: DataTableInteractionReason,
    originalEvent?: Event,
  ): void {
    if (this.disabled) return;
    const coordinate = this.#coordinate(cell, "cell");
    this.dispatchEvent(
      new CustomEvent<DataTableActivationDetail>("ui-data-table-activate", {
        bubbles: true,
        composed: true,
        detail: { ...coordinate, reason },
      }),
    );
    dispatchCommand(this, "selection.activate", {
      data: { ...coordinate, reason },
      gesture: this.#gestureForReason(reason),
      originalEvent,
      source: this.#sourceForReason(reason),
    });
    if (cell.editable) this.#emitEditRequest(cell, reason, originalEvent);
  }

  #emitEditRequest(
    cell: UITableCellType,
    reason: DataTableInteractionReason,
    originalEvent?: Event,
  ): void {
    const detail: DataTableEditDetail = { ...this.#coordinate(cell, "cell"), reason };
    this.dispatchEvent(
      new CustomEvent<DataTableEditDetail>("ui-data-table-edit-request", {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
    dispatchCommand(this, "editor.open", {
      data: detail,
      gesture: this.#gestureForReason(reason),
      originalEvent,
      source: this.#sourceForReason(reason),
    });
  }

  #emitEditCommit(form: HTMLFormElement | null, reason: DataTableEditReason): boolean {
    const coordinate = this.#editingCoordinate();
    if (!coordinate || this.disabled) return false;
    const detail: DataTableEditCommitDetail = { ...coordinate, form, reason };
    this.dispatchEvent(
      new CustomEvent<DataTableEditCommitDetail>("ui-data-table-edit-commit", {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
    dispatchCommand(this, "editor.commit", {
      data: { ...coordinate, reason },
      gesture: "command",
      source: "imperative",
    });
    return true;
  }

  #emitEditCancel(reason: DataTableEditReason): boolean {
    const coordinate = this.#editingCoordinate();
    if (!coordinate || this.disabled) return false;
    const detail: DataTableEditDetail = { ...coordinate, reason };
    this.dispatchEvent(
      new CustomEvent<DataTableEditDetail>("ui-data-table-edit-cancel", {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
    dispatchCommand(this, "editor.cancel", {
      data: detail,
      gesture: reason === "escape" ? "key" : "command",
      source: reason === "escape" ? "keyboard" : "imperative",
    });
    return true;
  }

  #gestureForReason(reason: DataTableInteractionReason): GestureKind {
    if (reason === "keyboard") return "key";
    if (reason === "pointer") return "press";
    return "command";
  }

  #sourceForReason(reason: DataTableInteractionReason): GestureSource {
    if (reason === "keyboard") return "keyboard";
    if (reason === "pointer") return "pointer";
    return "imperative";
  }

  #onClick = (event: MouseEvent): void => {
    const candidate = this.#candidateFromPath(event.composedPath());
    if (!candidate) return;
    this.#emitSelection(candidate, "pointer", event.shiftKey, event);
    // Native click focus settles after the click listener. Restore the roving
    // endpoint once that default action and the controlled selection request
    // have both completed.
    queueMicrotask(() => candidate.part.focus());
  };

  #onDoubleClick = (event: MouseEvent): void => {
    const cell = event
      .composedPath()
      .find((node): node is UITableCell => node instanceof UITableCell);
    if (cell) this.#emitActivation(cell, "pointer", event);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    const fromEditor = event
      .composedPath()
      .some((node) => node instanceof HTMLElement && node.getAttribute("slot") === "editor");
    if (fromEditor && event.key === "Escape") {
      event.preventDefault();
      this.#emitEditCancel("escape");
      return;
    }
    const candidate = this.#candidateFromPath(event.composedPath());
    if (!candidate) return;
    if (
      (event.key === "Enter" || event.key === "F2") &&
      candidate.selection === "cell" &&
      candidate.part instanceof UITableCell
    ) {
      event.preventDefault();
      this.#emitActivation(candidate.part, "keyboard", event);
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      this.#emitSelection(candidate, "keyboard", event.shiftKey, event);
      return;
    }

    const ordered = this.#orderedCandidates(candidate.selection);
    const index = ordered.indexOf(candidate.part);
    if (index < 0) return;
    let target: SelectableTablePart | undefined;
    if (event.key === "Home") target = ordered[0];
    else if (event.key === "End") target = ordered.at(-1);
    else if (candidate.selection === "row") {
      if (event.key === "ArrowUp") target = ordered[Math.max(0, index - 1)];
      if (event.key === "ArrowDown") target = ordered[Math.min(ordered.length - 1, index + 1)];
    } else if (candidate.selection === "column") {
      if (event.key === "ArrowLeft") target = ordered[Math.max(0, index - 1)];
      if (event.key === "ArrowRight") target = ordered[Math.min(ordered.length - 1, index + 1)];
    } else {
      const coordinate = this.#coordinate(candidate.part, "cell");
      if (event.key === "ArrowLeft") {
        target = this.#cells.find(
          (cell) =>
            this.#rowIndex(cell) === coordinate.rowIndex &&
            cell.columnIndex === (coordinate.columnIndex ?? 0) - 1,
        );
      }
      if (event.key === "ArrowRight" || event.key === "Tab") {
        const step = event.shiftKey && event.key === "Tab" ? -1 : 1;
        target = ordered[index + step];
      }
      if (event.key === "ArrowUp") {
        target = this.#cells.find(
          (cell) =>
            this.#rowIndex(cell) === (coordinate.rowIndex ?? 0) - 1 &&
            cell.columnIndex === coordinate.columnIndex,
        );
      }
      if (event.key === "ArrowDown") {
        target = this.#cells.find(
          (cell) =>
            this.#rowIndex(cell) === (coordinate.rowIndex ?? 0) + 1 &&
            cell.columnIndex === coordinate.columnIndex,
        );
      }
    }
    if (!target) return;
    event.preventDefault();
    target.focus();
    this.#emitSelection(
      { part: target, selection: candidate.selection },
      "keyboard",
      event.shiftKey && event.key !== "Tab",
      event,
    );
  };

  #onSubmit = (event: Event): void => {
    const form = event
      .composedPath()
      .find(
        (node): node is HTMLFormElement =>
          node instanceof HTMLFormElement && node.getAttribute("slot") === "editor",
      );
    if (!form) return;
    event.preventDefault();
    this.#emitEditCommit(form, "submit");
  };

  #onReset = (event: Event): void => {
    const editor = event
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && node.getAttribute("slot") === "editor",
      );
    if (editor) this.#emitEditCancel("reset");
  };

  /** Requests a controlled selection by logical row/column index. */
  requestSelection(
    rowIndex: number | null,
    columnIndex: number | null = null,
    reason: DataTableInteractionReason = "imperative",
    extended = false,
  ): boolean {
    if (this.selection === "none") return false;
    const selection = this.selection;
    const part = this.#orderedCandidates(selection).find((candidate) => {
      const coordinate = this.#coordinate(candidate, selection);
      return coordinate.rowIndex === rowIndex && coordinate.columnIndex === columnIndex;
    });
    if (!part) return false;
    this.#emitSelection({ part, selection }, reason, extended);
    return true;
  }

  /** Moves roving focus to a logical cell without changing parent-owned selection. */
  focusCell(rowIndex: number, columnIndex: number): boolean {
    const cell = this.#cells.find(
      (candidate) =>
        this.#rowIndex(candidate) === rowIndex && candidate.columnIndex === columnIndex,
    );
    if (!cell) return false;
    for (const candidate of this.#orderedCandidates("cell"))
      candidate.tabIndex = candidate === cell ? 0 : -1;
    cell.focus();
    return true;
  }

  /** Requests that the parent open its authored editor for an editable cell. */
  requestEdit(
    rowIndex: number,
    columnIndex: number,
    reason: DataTableInteractionReason = "imperative",
  ): boolean {
    const cell = this.#cells.find(
      (candidate) =>
        this.#rowIndex(candidate) === rowIndex &&
        candidate.columnIndex === columnIndex &&
        candidate.editable,
    );
    if (!cell || this.disabled) return false;
    this.#emitEditRequest(cell, reason);
    return true;
  }

  /** Reports a commit request for the controlled editor without changing `editing`. */
  commitEdit(form: HTMLFormElement | null = null): boolean {
    return this.#emitEditCommit(form, "imperative");
  }

  /** Reports a cancellation request for the controlled editor without changing `editing`. */
  cancelEdit(): boolean {
    return this.#emitEditCancel("imperative");
  }

  protected override render(): TemplateResult {
    return html`
      <section
        part="root"
        aria-label=${this.label || nothing}
        aria-busy=${this.loading ? "true" : nothing}
        @click=${this.#onClick}
        @dblclick=${this.#onDoubleClick}
        @keydown=${this.#onKeydown}
      >
        <div part="toolbar"><slot name="toolbar"></slot></div>
        <div part="viewport" ?hidden=${this.empty}>
          <slot part="table" @slotchange=${this.#syncCollection}></slot>
        </div>
        <div part="empty" ?hidden=${!this.empty}><slot name="empty"></slot></div>
        <div part="loading" ?hidden=${!this.loading} aria-live="polite">
          <slot name="loading"></slot>
        </div>
        <div part="editor" ?hidden=${!this.editing}><slot name="editor"></slot></div>
        <div part="footer"><slot name="footer"></slot></div>
      </section>
    `;
  }
}
