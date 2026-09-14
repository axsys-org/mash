import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const records = [
  ["Website", "Alex", "Ready"],
  ["Documentation", "Sam", "Review"],
  ["Components", "Morgan", "Draft"],
  ["Mobile", "Jordan", "Ready"],
];
const table = `<ui-table label="Projects" row-count="5" column-count="3">
  <ui-table-header><ui-table-row row-index="1"><ui-table-head column-index="1">Project</ui-table-head><ui-table-head column-index="2">Owner</ui-table-head><ui-table-head column-index="3">Status</ui-table-head></ui-table-row></ui-table-header>
  <ui-table-body>${records.map((record, i) => `<ui-table-row row-index="${i + 2}">${record.map((cell, c) => `<ui-table-cell column-index="${c + 1}">${cell}</ui-table-cell>`).join("")}</ui-table-row>`).join("\n")}</ui-table-body>
</ui-table>`;
export const tableExamples: Record<string, CatalogExample[]> = {
  "ui-data-table": [
    {
      ...sample(
        "Selection and filtering",
        `<ui-data-table id="projects" label="Projects" selection="row"><ui-input id="project-filter" slot="toolbar" label="Filter projects" placeholder="Filter projects…"></ui-input>${table}<output slot="footer" id="selected-project">No selection</output><span slot="empty">No matching projects.</span></ui-data-table>`,
      ),
      script: `const grid = document.querySelector("#projects");
grid.addEventListener("ui-data-table-select", event => {
  grid.selected = event.detail.key;
  document.querySelector("#selected-project").textContent = "Selected row " + event.detail.rowIndex;
});
document.querySelector("#project-filter").addEventListener("input", event => {
  const query = event.target.value.toLowerCase();
  const rows = [...grid.querySelectorAll("ui-table-body ui-table-row")];
  rows.forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(query); });
  grid.empty = rows.every(row => row.hidden);
});`,
    },
    {
      ...sample(
        "Cell selection",
        `<ui-data-table id="cells" label="Project cells" selection="cell" selected="2:1">${table}</ui-data-table>`,
      ),
      script: `const grid = document.querySelector("#cells");
grid.addEventListener("ui-data-table-select", event => { grid.selected = event.detail.key; });`,
    },
    {
      ...sample(
        "Sorting",
        `<ui-data-table label="Sortable projects">${table.replace('<ui-table label="Projects"', '<ui-table id="sortable" label="Projects"').replace(">Project</ui-table-head>", '><ui-button size="small" variant="ghost" id="sort-project">Project ↕</ui-button></ui-table-head>')}</ui-data-table>`,
        "Sort the source collection and update the header's sort attribute so assistive technology announces the direction.",
      ),
      script: `const table = document.querySelector("#sortable");
const header = table.querySelector("ui-table-head");
const body = table.querySelector("ui-table-body");
const original = [...body.children];
document.querySelector("#sort-project").addEventListener("click", () => {
  header.sort = header.sort === "none" ? "ascending" : header.sort === "ascending" ? "descending" : "none";
  const direction = header.sort === "ascending" ? 1 : -1;
  const rows = header.sort === "none" ? original : [...body.children].sort((a, b) => direction * a.firstElementChild.textContent.localeCompare(b.firstElementChild.textContent));
  rows.forEach((row, index) => row.rowIndex = index + 2);
  body.append(...rows);
});`,
    },
    {
      ...sample(
        "Editing",
        `<ui-data-table id="editable" label="Editable projects" selection="cell" selected="2:1">${table.replaceAll("<ui-table-cell ", "<ui-table-cell editable ")}<form slot="editor" class="mash-row"><ui-input name="value" label="Cell value" required></ui-input><ui-button type="submit" variant="primary" size="small">Save</ui-button><ui-button type="reset" size="small">Cancel</ui-button></form></ui-data-table>`,
        "Double-click a cell or press F2. Save commits the authored value; Escape cancels and restores focus.",
      ),
      script: `const grid = document.querySelector("#editable");
const editor = grid.querySelector('form[slot="editor"]');
const input = editor.querySelector("ui-input");
let activeCell;
grid.addEventListener("ui-data-table-select", event => grid.selected = event.detail.key);
grid.addEventListener("ui-data-table-edit-request", event => {
  const { rowIndex, columnIndex, key } = event.detail;
  activeCell = [...grid.querySelectorAll("ui-table-cell")].find(cell => cell.columnIndex === columnIndex && cell.closest("ui-table-row").rowIndex === rowIndex);
  input.value = activeCell.textContent;
  grid.editing = key;
  grid.updateComplete.then(() => input.focus());
});
const finish = () => { grid.editing = ""; activeCell?.focus(); };
grid.addEventListener("ui-data-table-edit-commit", event => {
  activeCell.textContent = new FormData(event.detail.form).get("value");
  finish();
});
grid.addEventListener("ui-data-table-edit-cancel", finish);`,
    },
    sample(
      "Density",
      ["compact", "regular", "spacious"]
        .map(
          (density) =>
            `<div class="mash-stack"><span>${density}</span><ui-data-table label="${density} rows" density="${density}">${table}</ui-data-table></div>`,
        )
        .join("\n"),
    ),
    sample(
      "Loading and empty",
      `<ui-data-table label="Loading projects" loading><ui-spinner slot="loading" label="Loading projects"></ui-spinner></ui-data-table><ui-data-table label="Empty projects" empty><span slot="empty">No projects match your filters.</span></ui-data-table>`,
    ),
  ],
};
