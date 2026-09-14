import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const collection = (
  name: string,
  count: number,
  columns: number,
  description: string,
): CatalogExample => ({
  ...sample(
    name,
    `<div class="mash-stack"><ui-toolbar label="Collection navigation"><ui-button id="first" size="small">First</ui-button><ui-button id="fifty" size="small">Row 50</ui-button><ui-button id="middle" size="small">Middle</ui-button><ui-button id="last" size="small">Last</ui-button><ui-number-field id="target" label="Go to row" required min="1" max="${count}" value="1" style="width:9rem"></ui-number-field><ui-button id="go" size="small">Go</ui-button></ui-toolbar><ui-virtual-list id="collection" label="${name}" overscan="2" style="width:100%"></ui-virtual-list><output id="range" aria-live="polite"></output></div>`,
    description,
  ),
  script: `const list = document.querySelector("#collection");
const count = ${count};
list.source = {
  count, size: 34, columns: ${columns}, columnSize: 144,
  render(row, column) {
    const cell = document.createElement("span");
    cell.textContent = column === 0 ? "Record " + (row + 1).toLocaleString() : "Cell " + (row + 1) + " · " + (column + 1);
    cell.style.cssText = "white-space:nowrap;font-variant-numeric:tabular-nums";
    return cell;
  }
};
const target = document.querySelector("#target");
const go = document.querySelector("#go");
const validTarget = () => Number.isInteger(target.value) && target.value >= 1 && target.value <= count;
const showRange = () => {
  if (!validTarget()) { document.querySelector("#range").textContent = "Enter a row from 1 to " + count.toLocaleString() + " to navigate."; return; }
  const [start, end] = list.visibleRange;
  document.querySelector("#range").textContent = "Rows " + (start + 1).toLocaleString() + "–" + end.toLocaleString() + " of " + count.toLocaleString() + " · " + list.children.length + " mounted rows";
};
list.addEventListener("ui-visible-range-change", showRange);
document.querySelector("#first").onclick = () => list.scrollToItem(0, "start");
document.querySelector("#fifty").disabled = count < 50;
document.querySelector("#fifty").onclick = () => { if (count >= 50) list.scrollToItem(49, "start"); };
document.querySelector("#middle").onclick = () => list.scrollToItem(Math.floor(count / 2), "center");
document.querySelector("#last").onclick = () => list.scrollToBottom();
target.addEventListener("ui-number-field-input", () => { go.disabled = !validTarget(); showRange(); });
go.onclick = () => { if (!validTarget()) { showRange(); return; } list.scrollToItem(target.value - 1, "center"); };
list.updateComplete.then(showRange);`,
});

export const collectionExamples: Record<string, CatalogExample[]> = {
  "ui-virtual-list": [
    collection(
      "Large collection",
      5_000,
      30,
      "Scroll in either direction. Only the visible rows and columns are constructed; navigation targets logical records.",
    ),
    collection(
      "Wide collection",
      100,
      100,
      "A wide collection uses the same bounded window for its columns. Pan horizontally to inspect later fields.",
    ),
    collection(
      "Half a million rows",
      500_000,
      100,
      "Jump across 50 million logical cells without creating 50 million elements. The footer reports the mounted window.",
    ),
    collection(
      "Short collection",
      5,
      10,
      "Small datasets use the same rendering and targeting contract, with no unnecessary vertical scroll.",
    ),
    {
      ...sample(
        "Variable rows",
        `<div class="mash-stack"><div class="mash-row"><ui-button id="top" size="small">First</ui-button><ui-button id="bottom" size="small">Last</ui-button></div><ui-virtual-list id="variable" label="Variable activity">${Array.from({ length: 50 }, (_, i) => `<ui-virtual-item size="${i % 3 === 0 ? 88 : 48}"><div class="mash-stack" style="gap:2px"><strong>Activity ${i + 1}</strong>${i % 3 === 0 ? '<span class="mash-muted">A longer update with retained authored content.</span><ui-input size="small" label="Activity note" placeholder="Write a note…"></ui-input>' : '<span class="mash-muted">Project updated</span>'}</div></ui-virtual-item>`).join("")}</ui-virtual-list></div>`,
        "Authored rows can have different extents. Their content remains mounted and retains edits when scrolled away; use a data source for extreme collections.",
      ),
      script: `const list = document.querySelector("#variable"); document.querySelector("#top").onclick = () => list.scrollToItem(0, "start"); document.querySelector("#bottom").onclick = () => list.scrollToBottom();`,
    },
    {
      ...sample(
        "Horizontal cards",
        `<div class="mash-stack"><div class="mash-row"><ui-button id="start" size="small">First card</ui-button><ui-button id="end" size="small">Last card</ui-button></div><ui-virtual-list orientation="horizontal" id="cards" label="Project cards" style="width:100%"></ui-virtual-list></div>`,
        "The same collection can virtualize along one horizontal axis. Card construction stays bounded as you move.",
      ),
      script: `const list = document.querySelector("#cards"); list.source = { count: 1000, size: 240, render(index) { const card = document.createElement("ui-card"); const title = document.createElement("strong"); title.slot = "title"; title.textContent = "Project " + (index + 1); card.append(title, "A compact project card."); card.style.cssText = "margin:8px;min-height:110px"; return card; } }; document.querySelector("#start").onclick = () => list.scrollToItem(0); document.querySelector("#end").onclick = () => list.scrollToBottom();`,
    },
  ],
};
