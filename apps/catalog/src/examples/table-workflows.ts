import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const invoice = `<ui-table label="Invoice summary" row-count="6" column-count="4"><ui-table-caption slot="caption">September · Services</ui-table-caption><ui-table-header><ui-table-row row-index="1"><ui-table-head rowspan="2" column-index="1">Service</ui-table-head><ui-table-head colspan="2" column-index="2">Usage</ui-table-head><ui-table-head rowspan="2" column-index="4">Amount</ui-table-head></ui-table-row><ui-table-row row-index="2"><ui-table-head column-index="2">Quantity</ui-table-head><ui-table-head column-index="3">Rate</ui-table-head></ui-table-row></ui-table-header><ui-table-body>${[
  ["Design review", "12", "$90.00", "$1,080.00"],
  ["Implementation", "24", "$120.00", "$2,880.00"],
  ["Support", "4", "$60.00", "$240.00"],
]
  .map(
    (values, i) =>
      `<ui-table-row row-index="${i + 3}">${values.map((value, c) => `<ui-table-cell column-index="${c + 1}" ${c ? 'style="font-variant-numeric:tabular-nums"' : ""}>${value}</ui-table-cell>`).join("")}</ui-table-row>`,
  )
  .join(
    "",
  )}<ui-table-row row-index="6"><ui-table-head scope="row" colspan="3" column-index="1">Total</ui-table-head><ui-table-cell column-index="4"><strong>$4,200.00</strong></ui-table-cell></ui-table-row></ui-table-body></ui-table>`;
const headings = `<ui-table-header><ui-table-row row-index="1"><ui-table-head column-index="1">Project</ui-table-head><ui-table-head column-index="2">Owner</ui-table-head><ui-table-head column-index="3">Status</ui-table-head><ui-table-head column-index="4">Budget</ui-table-head></ui-table-row></ui-table-header>`;
const records = [
  ["Website", "Alex", "Ready", 2400],
  ["Documentation", "Sam", "Review", 1200],
  ["Components", "Morgan", "Draft", 4800],
  ["Mobile", "Jordan", "Ready", 3200],
];
const rows = records
  .map(
    (row, r) =>
      `<ui-table-row row-index="${r + 2}"><ui-table-head scope="row" column-index="1">${row[0]}</ui-table-head><ui-table-cell column-index="2"><div class="mash-row"><ui-avatar size="small" alt="${row[1]}">${String(row[1])[0]}</ui-avatar>${row[1]}</div></ui-table-cell><ui-table-cell column-index="3"><ui-badge tone="${row[2] === "Ready" ? "positive" : row[2] === "Review" ? "warning" : "neutral"}">${row[2]}</ui-badge></ui-table-cell><ui-table-cell column-index="4"><ui-intl-formatter kind="currency" currency="USD" value="${row[3]}"></ui-intl-formatter></ui-table-cell></ui-table-row>`,
  )
  .join("");

const invoiceRows = [
  ["INV001", "Paid", "Credit Card", "250.00", "2026-01-15"],
  ["INV002", "Pending", "PayPal", "150.00", "2026-02-01"],
  ["INV003", "Unpaid", "Bank Transfer", "350.00", "2026-02-15"],
  ["INV004", "Paid", "Credit Card / Visa", "450.00", "2026-03-01"],
  ["INV005", "Paid", "PayPal", "550.00", "2026-03-15"],
  ["INV006", "Pending", "Bank Transfer", "200.00", "2026-04-01"],
  ["INV007", "Unpaid", "Credit Card", "300.00", "2026-04-15"],
];
const invoiceGallery = (bordered: boolean) =>
  `<style>.invoice-table ui-table-caption{caption-side:bottom}.invoice-table ui-table-caption::part(root){font:inherit;color:var(--color-text-muted);text-align:center;padding:12px}.invoice-table ui-table-head::part(root){font-weight:400;color:var(--color-text-muted)}.invoice-table [column-index="4"]::part(root),.invoice-table [column-index="5"]::part(root){text-align:end;font-variant-numeric:tabular-nums}.invoice-table ui-badge::part(root){border:1px solid currentColor;border-radius:2px;background:transparent;font-size:12px;line-height:16px;padding:0 5px;color:var(--color-text-muted)}.invoice-table ui-badge[tone="positive"]::part(root){color:var(--color-positive-text)}.invoice-table ui-badge[tone="warning"]::part(root){color:var(--color-warning-text)}.invoice-table ui-badge[tone="critical"]::part(root){color:var(--color-critical-text)}.invoice-table .invoice-total::part(row){background:var(--color-surface-hover)}${bordered ? ".invoice-table ui-table-body ui-table-row:nth-child(even)::part(row){background:var(--color-surface-hover)}" : ".invoice-table::part(table){border:0;border-radius:0}"}</style><ui-table class="invoice-table" label="Recent invoices" row-count="9" column-count="5"><ui-table-caption slot="caption">A list of your recent invoices.</ui-table-caption><ui-table-header><ui-table-row row-index="1"><ui-table-head column-index="1">Invoice</ui-table-head><ui-table-head column-index="2" colspan="2">Status</ui-table-head><ui-table-head column-index="4">Amount</ui-table-head><ui-table-head column-index="5">Date</ui-table-head></ui-table-row></ui-table-header><ui-table-body>${invoiceRows.map((values, index) => `<ui-table-row row-index="${index + 2}">${values.map((value, column) => `<ui-table-cell column-index="${column + 1}">${column === 1 ? `<ui-badge tone="${value === "Paid" ? "positive" : value === "Pending" ? "warning" : "critical"}">${value}</ui-badge>` : column === 3 ? "$" + value : value}</ui-table-cell>`).join("")}</ui-table-row>`).join("")}<ui-table-row class="invoice-total" row-index="9"><ui-table-head scope="row" column-index="1" colspan="4">Total</ui-table-head><ui-table-cell column-index="5">$2,250.00</ui-table-cell></ui-table-row></ui-table-body></ui-table>`;

export const tableWorkflowExamples: Record<string, CatalogExample[]> = {
  "ui-table": [
    sample(
      "Invoices",
      invoiceGallery(false),
      "Grouped status columns, numeric alignment, a total, and a caption share one semantic table.",
    ),
    sample(
      "Bordered invoices",
      invoiceGallery(true),
      "A framed, striped table uses the same content and semantics.",
    ),
    sample(
      "Grouped invoice",
      invoice,
      "Grouped headings and totals use real column and row spans. Counts and positions describe the complete table to assistive technology.",
    ),
    sample(
      "Borders and density",
      `<div class="mash-stack">${["compact", "regular", "spacious"].map((density) => `<ui-data-table label="${density} invoice" density="${density}">${invoice}</ui-data-table>`).join("")}</div>`,
      "Use the data-table density recipe for consistent cell rhythm across numeric and text content.",
    ),
  ],
  "ui-data-table": [
    {
      ...sample(
        "Column layout",
        `<style>#column-grid ui-table::part(table){table-layout:fixed}#column-grid ui-table-head::part(root){width:var(--example-column-width,160px)}#column-grid ui-table-cell::part(root){width:var(--example-column-width,160px);background:var(--example-row-fill,transparent)}#column-grid ui-draggable{display:inline-block}#column-grid [data-resize]{float:right;cursor:col-resize;touch-action:none}#column-grid [data-resize]::part(root){padding:0 5px}#column-grid [data-reorder]::part(root){padding:0}#column-grid [data-reorder]:state(dragging)::part(root){background:var(--color-surface-raised);outline:1px solid var(--color-border)}</style><div class="mash-stack" style="width:100%"><div class="mash-row"><ui-button id="reset-columns" size="small">Reset columns</ui-button><ui-checkbox id="stripe">Striped rows</ui-checkbox></div><ui-data-table id="column-grid" label="Adjustable project columns" selection="cell"><ui-table label="Projects" row-count="5" column-count="4">${headings}<ui-table-body>${rows}</ui-table-body></ui-table><output slot="footer" id="column-status">Drag a heading to reorder. Drag its separator to resize.</output></ui-data-table></div>`,
        "Column content retains its DOM when moved. Arrow keys resize a focused separator; Alt+Arrow moves a focused heading. Escape cancels a drag.",
      ),
      script: `const grid = document.querySelector("#column-grid"), table = grid.querySelector("ui-table");
const keys = ["Project", "Owner", "Status", "Budget"], widths = new Map(keys.map(key => [key, 160])); let order = [...keys];
const rows = [...table.querySelectorAll("ui-table-row")];
rows.forEach(row => [...row.children].forEach((cell,index) => cell.dataset.column = keys[index]));
const headers = [...table.querySelectorAll("ui-table-header ui-table-head")];
let active;
const apply = () => {
  for (const row of rows) { const cells = new Map([...row.children].map(cell => [cell.dataset.column, cell])); for (const [index,key] of order.entries()) { const cell = cells.get(key); cell.columnIndex = index + 1; cell.style.setProperty("--example-column-width", widths.get(key) + "px"); if(row.children[index] !== cell) { if(row.moveBefore) row.moveBefore(cell,row.children[index] || null); else row.insertBefore(cell,row.children[index] || null); } } }
  table.style.minWidth = order.reduce((sum,key) => sum + widths.get(key),0) + "px";
  if (active) grid.selected = active.row + ":" + (order.indexOf(active.key) + 1);
  for (const header of headers) { const handle = header.querySelector("[role='separator']"); handle.setAttribute("aria-valuenow", String(widths.get(header.dataset.column))); }
  document.querySelector("#column-status").textContent = order.map(key => key + " " + widths.get(key) + "px").join(" · ");
};
grid.addEventListener("ui-data-table-select", event => { grid.selected = event.detail.key; if(event.detail.columnIndex) active = {row:event.detail.rowIndex, key:order[event.detail.columnIndex - 1]}; });
for (const header of headers) {
  const key = header.dataset.column, title = header.textContent;
  header.replaceChildren();
  const drag = document.createElement("ui-draggable"); drag.axis = "x"; drag.containment = "none"; drag.threshold = 4; drag.dataset.reorder = "";
  const label = document.createElement("span"); label.textContent = title; label.tabIndex = 0; label.setAttribute("aria-label", "Move " + title + " column"); drag.append(label);
  label.addEventListener("keydown", event => { if(!event.altKey || !["ArrowLeft","ArrowRight"].includes(event.key)) return; event.preventDefault(); const index = order.indexOf(key), target = Math.max(0, Math.min(order.length - 1,index + (event.key === "ArrowLeft" ? -1 : 1))); order.splice(index,1); order.splice(target,0,key); apply(); label.focus(); });
  drag.addEventListener("ui-drag-end", event => { if(!event.detail.cancelled) { const others = headers.filter(item => item !== header).sort((a,b) => order.indexOf(a.dataset.column) - order.indexOf(b.dataset.column)); const target = others.find(item => { const rect = item.shadowRoot.querySelector("[part~='root']").getBoundingClientRect(); return event.detail.pointer.x < rect.x + rect.width/2; }); order = order.filter(item => item !== key); order.splice(target ? order.indexOf(target.dataset.column) : order.length,0,key); apply(); } drag.resetPosition(); });
  const resize = document.createElement("ui-draggable"); resize.axis = "x"; resize.containment = "none"; resize.controlled = true; resize.dataset.resize = "";
  const handle = document.createElement("span"); handle.textContent = "│"; handle.tabIndex = 0; handle.setAttribute("role","separator"); handle.setAttribute("aria-label","Resize " + title + " column"); handle.setAttribute("aria-orientation","vertical"); handle.setAttribute("aria-valuemin","100"); handle.setAttribute("aria-valuemax","360"); resize.append(handle); let origin = 160;
  resize.addEventListener("ui-drag-start", () => origin = widths.get(key));
  resize.addEventListener("ui-drag", event => { widths.set(key, Math.max(100,Math.min(360,Math.round(origin + event.detail.delta.x)))); apply(); });
  resize.addEventListener("ui-drag-end", event => { if(event.detail.cancelled) widths.set(key,origin); apply(); });
  handle.addEventListener("keydown", event => { const next = event.key === "Home" ? 100 : event.key === "End" ? 360 : event.key === "ArrowLeft" ? widths.get(key) - 10 : event.key === "ArrowRight" ? widths.get(key) + 10 : null; if(next === null) return; event.preventDefault(); widths.set(key,Math.max(100,Math.min(360,next))); apply(); handle.focus(); });
  header.append(drag,resize);
}
document.querySelector("#reset-columns").onclick = () => { order = [...keys]; keys.forEach(key => widths.set(key,160)); apply(); };
document.querySelector("#stripe").addEventListener("change",event=> { rows.slice(1).forEach((row,index)=> { row.style.setProperty("--example-row-fill",event.target.checked && index % 2 ? "var(--color-surface-hover)" : "transparent"); }); });
apply();`,
    },

    {
      ...sample(
        "Selection bands",
        `<ui-data-table id="bands" label="Team projects" selection="cell"><ui-toolbar slot="toolbar" label="Selection settings"><ui-select id="axis" label="Selection mode" value="cell" size="small"><ui-option value="cell">Cells</ui-option><ui-option value="row">Rows</ui-option><ui-option value="column">Columns</ui-option><ui-option value="none">Read only</ui-option></ui-select><ui-button id="clear" size="small">Clear selection</ui-button></ui-toolbar><ui-table label="Team projects" row-count="5" column-count="4">${headings}<ui-table-body>${rows}</ui-table-body></ui-table><output slot="footer" id="selection" aria-live="polite">Select a cell, row heading, or column heading. Shift extends a range.</output></ui-data-table>`,
        "Click or use the arrow keys; Shift extends the active selection. Row and column headings select whole bands while retaining the current selection mode.",
      ),
      script: `const grid = document.querySelector("#bands"); const result = document.querySelector("#selection"); grid.addEventListener("ui-data-table-select", event => { grid.selected = event.detail.key; const range = event.detail.range; result.textContent = "Selection " + event.detail.key + " · " + (range.rowStart === null ? "all rows" : "rows " + range.rowStart + "–" + range.rowEnd) + " · " + (range.columnStart === null ? "all columns" : "columns " + range.columnStart + "–" + range.columnEnd); }); document.querySelector("#axis").addEventListener("ui-select-change", event => { grid.selection = event.detail.value; grid.selected = ""; result.textContent = "Selection cleared"; }); document.querySelector("#clear").onclick = () => { grid.selected = ""; result.textContent = "Selection cleared"; };`,
    },
    {
      ...sample(
        "Paged records",
        `<ui-data-table id="records" label="Record browser" selection="row"><ui-toolbar slot="toolbar" label="Record tools"><ui-select id="count" size="small" label="Record count" value="10000">${[100, 500, 5000, 10000, 1000000].map((count) => `<ui-option value="${count}">${count.toLocaleString()} records</ui-option>`).join("")}</ui-select><ui-button id="refresh" size="small">Refresh</ui-button><ui-button id="export" size="small">Export page</ui-button><ui-button id="fail" size="small">Try failed request</ui-button></ui-toolbar><ui-table label="Records" column-count="4"><ui-table-header><ui-table-row row-index="1"><ui-table-head column-index="1"><ui-button size="small" variant="ghost" id="sort">Record ↕</ui-button></ui-table-head><ui-table-head column-index="2">Owner</ui-table-head><ui-table-head column-index="3">Status</ui-table-head><ui-table-head column-index="4">Amount</ui-table-head></ui-table-row></ui-table-header><ui-table-body></ui-table-body></ui-table><ui-spinner slot="loading" label="Loading records"></ui-spinner><ui-alert slot="empty" id="error" tone="critical" hidden><strong slot="title">Records could not load</strong>Use Refresh to retry.</ui-alert><div slot="footer" class="mash-stack"><ui-pagination id="pages" label="Record pages" total-pages="500"></ui-pagination><output id="page-status" aria-live="polite"></output></div></ui-data-table>`,
        "Browse up to a million logical records with twenty rendered rows per page. Sorting retains the selected record identity. Export creates a real CSV for the current page; requests demonstrate loading and retry.",
      ),
      script: `const grid = document.querySelector("#records"); const table = grid.querySelector("ui-table"); const body = grid.querySelector("ui-table-body"); const pages = document.querySelector("#pages"); const status = document.querySelector("#page-status"); let count = 10000, page = 1, direction = 0, selected = null, request = 0, current = [];
const owners = ["Alex", "Sam", "Morgan", "Jordan"];
const idAt = index => direction === -1 ? count - index : index + 1;
const render = async (fail = false) => {
  const version = ++request; grid.loading = true; grid.empty = false; document.querySelector("#error").hidden = true; pages.disabled = true;
  await new Promise(resolve => setTimeout(resolve, 280)); if (version !== request) return;
  grid.loading = false; pages.disabled = false; grid.empty = fail; document.querySelector("#error").hidden = !fail;
  if (fail) { status.textContent = "Request failed. Your selection is retained."; return; }
  pages.currentPage = page; pages.totalPages = Math.ceil(count / 20); table.rowCount = count + 1;
  current = Array.from({length:Math.min(20, count - (page - 1) * 20)}, (_, offset) => { const id = idAt((page - 1) * 20 + offset); return {id, owner:owners[id % owners.length], state:id % 3 === 0 ? "Review" : "Ready", amount:id * 7.25}; });
  body.replaceChildren(...current.map((record, offset) => {
    const row = document.createElement("ui-table-row"); row.rowIndex = (page - 1) * 20 + offset + 2; row.dataset.id = String(record.id);
    ["Record " + record.id.toLocaleString(), record.owner, record.state, record.amount.toLocaleString("en-US", {style:"currency",currency:"USD"})].forEach((value,index) => { const cell = document.createElement("ui-table-cell"); cell.columnIndex = index + 1; cell.textContent = value; row.append(cell); }); return row;
  }));
  const active = [...body.children].find(row => Number(row.dataset.id) === selected); grid.selected = active ? String(active.rowIndex) : "";
  status.textContent = "Page " + page.toLocaleString() + " of " + pages.totalPages.toLocaleString() + (selected ? " · Selected record " + selected.toLocaleString() : " · No selection");
};
grid.addEventListener("ui-data-table-select", event => { grid.selected = event.detail.key; const row = [...body.children].find(row => row.rowIndex === event.detail.rowIndex); selected = Number(row.dataset.id); status.textContent = "Selected record " + selected.toLocaleString(); });
pages.addEventListener("ui-page-change", event => { page = event.detail.page; render(); });
document.querySelector("#count").addEventListener("ui-select-change", event => { count = Number(event.detail.value); page = 1; if (selected > count) selected = null; render(); });
document.querySelector("#sort").onclick = () => { direction = direction === 0 ? 1 : direction === 1 ? -1 : 0; grid.querySelector("ui-table-head").sort = direction === 1 ? "ascending" : direction === -1 ? "descending" : "none"; render(); };
document.querySelector("#refresh").onclick = () => render(); document.querySelector("#fail").onclick = () => render(true);
document.querySelector("#export").onclick = () => { const csv = ["Record,Owner,Status,Amount", ...current.map(record => [record.id,record.owner,record.state,record.amount].join(","))].join("\\r\\n"); const url = URL.createObjectURL(new Blob([csv], {type:"text/csv"})); const link = document.createElement("a"); link.href = url; link.download = "records-page-" + page + ".csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); status.textContent = "Exported " + current.length + " records"; };
render();`,
    },
  ],
};
