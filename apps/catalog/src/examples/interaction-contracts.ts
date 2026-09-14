import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

export const maskedInputExample: CatalogExample = {
  ...sample(
    "Formatted values",
    `<form id="contact-form" class="mash-stack" style="inline-size:min(100%,30rem)"><ui-field label="Phone" description="Formatting stays in the field. The form receives ten digits."><ui-input slot="control" name="phone" label="Phone" mask="(###) ###-####" inputmode="tel" autocomplete="tel-national" value="4155550123" placeholder="(415) 555-0123"></ui-input></ui-field><ui-field label="Reference" description="Three letters followed by four digits. Try pasting ABC-1234."><ui-input slot="control" name="reference" label="Reference" mask="AAA-####" value="ABC1234" placeholder="ABC-1234"></ui-input></ui-field><div class="mash-row"><ui-button type="submit" variant="primary">Read form values</ui-button><ui-button type="reset" variant="ghost">Reset</ui-button></div></form><output id="raw-values" aria-live="polite"></output>`,
    "Edit in the middle, select and replace, or backspace across a separator. Native text selection remains available.",
  ),
  scoped: true,
  script: `const form = root.querySelector("#contact-form");
const output = root.querySelector("#raw-values");
const report = () => { output.textContent = [...new FormData(form)].map(([key, value]) => key + ": " + value).join(" · "); };
form.addEventListener("input", report, { signal });
form.addEventListener("submit", event => { event.preventDefault(); report(); }, { signal });
form.addEventListener("reset", () => requestAnimationFrame(() => { if (!signal.aborted) report(); }), { signal });
report();`,
};

export const treeSelectionExample: CatalogExample = {
  ...sample(
    "Multiple selection",
    `<div class="mash-stack" style="inline-size:min(100%,32rem)"><ui-toolbar label="Selection actions"><ui-button id="select-files" variant="ghost">Select visible</ui-button><ui-button id="clear-files" variant="ghost">Clear</ui-button><ui-kbd shortcut="Space" appearance="plain"></ui-kbd><span class="mash-muted">toggle</span></ui-toolbar><ui-tree id="selection-tree" label="Project files" selection-mode="multiple"><ui-tree-item value="design" title="Design" kind="folder" expanded><ui-icon slot="icon" name="object.folder"></ui-icon><ui-tree-item slot="children" value="principles" title="Principles.md"><ui-icon slot="icon" name="object.document"></ui-icon></ui-tree-item><ui-tree-item slot="children" value="tokens" title="Tokens.json"><ui-icon slot="icon" name="object.document"></ui-icon></ui-tree-item></ui-tree-item><ui-tree-item value="src" title="Source" kind="folder"><ui-icon slot="icon" name="object.folder"></ui-icon><ui-tree-item slot="children" value="app" title="App.ts"></ui-tree-item></ui-tree-item><ui-tree-item value="readme" title="Readme.md"><ui-icon slot="icon" name="object.document"></ui-icon></ui-tree-item><ui-tree-item value="locked" title="Workspace.lock" disabled><ui-badge slot="meta">Read only</ui-badge></ui-tree-item></ui-tree><output id="file-selection" aria-live="polite">No files selected</output></div>`,
    "Space toggles; Shift extends a range; Command/Ctrl-click adds a row. Arrow keys move focus without discarding selection. Use a folder’s disclosure to expand it.",
  ),
  scoped: true,
  script: `const tree = root.querySelector("#selection-tree");
const output = root.querySelector("#file-selection");
tree.addEventListener("ui-tree-toggle", event => { const item = [...tree.querySelectorAll("ui-tree-item")].find(item => item.identity === event.detail.value); if (item) item.expanded = event.detail.expanded; }, { signal });
tree.addEventListener("ui-tree-selection-change", event => { output.textContent = event.detail.values.length ? event.detail.values.length + " selected · " + event.detail.values.join(", ") : "No files selected"; }, { signal });
root.querySelector("#clear-files").addEventListener("click", () => { tree.selectedValues = []; output.textContent = "No files selected"; }, { signal });
root.querySelector("#select-files").addEventListener("click", () => { tree.selectedValues = [...tree.querySelectorAll("ui-tree-item")].filter(item => tree.indexOf(item.identity) >= 0).map(item => item.identity); output.textContent = tree.selectedValues.length + " selected"; }, { signal });`,
};

export const listSelectionExample: CatalogExample = {
  ...sample(
    "Selection across a filtered list",
    `<style>.selection-list{outline:none}.selection-list [role=option]{display:flex;align-items:center;gap:var(--space-control-inline);padding:var(--space-control-inline);border-radius:var(--radius-control);cursor:default;user-select:none}.selection-list [aria-selected=true]{background:var(--color-selection);color:var(--color-on-selection)}.selection-list:focus-visible [data-focused]{outline:2px solid var(--color-focus-ring);outline-offset:-2px}.selection-list [role=option] span{flex:1}.selection-list ui-icon{font-size:var(--layout-dimension-glyph)}</style><div class="mash-stack" style="inline-size:min(100%,32rem)"><ui-input id="collection-filter" type="search" label="Filter documents" placeholder="Filter documents" clean-on-escape></ui-input><ui-toolbar label="Bulk selection"><ui-button id="collection-all" variant="ghost">Select visible</ui-button><ui-button id="collection-clear" variant="ghost">Clear</ui-button><output id="collection-count" aria-live="polite"></output></ui-toolbar><ui-scroll-area style="block-size:18rem"><div class="selection-list" id="selection-list" role="listbox" aria-multiselectable="true" aria-label="Documents" tabindex="0"></div></ui-scroll-area><span class="mash-muted">Shift selects a range · Space toggles · Filtering retains picks</span></div>`,
  ),
  scoped: true,
  script: `const { selectCollection } = await import("@mash/ui/selection");
if (signal.aborted) return;
const documents = ["Design principles", "Design tokens", "Interaction notes", "Keyboard shortcuts", "Meeting notes", "Project brief", "Release notes", "Research findings", "Review checklist", "Style guide"];
const list = root.querySelector("#selection-list"), search = root.querySelector("#collection-filter");
let selection = { values: [], anchor: null }, order = [], focused = null;
function render() {
  order = documents.map((title, index) => String(index)).filter(id => documents[Number(id)].toLowerCase().includes(search.value.toLowerCase()));
  if (!order.includes(focused)) focused = order[0] ?? null;
  list.replaceChildren(...order.map(id => {
    const row = document.createElement("div"); row.id = "document-" + id; row.dataset.value = id; row.setAttribute("role", "option"); row.setAttribute("aria-selected", String(selection.values.includes(id))); row.toggleAttribute("data-focused", id === focused);
    const icon = document.createElement("ui-icon"); icon.name = "object.document"; icon.label = "";
    const label = document.createElement("span"); label.textContent = documents[Number(id)]; row.append(icon, label);
    if (selection.values.includes(id)) { const check = document.createElement("ui-icon"); check.name = "action.confirm"; check.label = ""; row.append(check); }
    return row;
  }));
  if (focused) list.setAttribute("aria-activedescendant", "document-" + focused); else list.removeAttribute("aria-activedescendant");
  root.querySelector("#collection-count").textContent = selection.values.length + " selected · " + order.length + " visible";
}
function apply(action) { selection = selectCollection(selection, order, action); render(); }
list.addEventListener("click", event => { const row = event.target.closest("[data-value]"); if (!row) return; focused = row.dataset.value; apply({ type: event.shiftKey ? "range" : event.ctrlKey || event.metaKey ? "toggle" : "replace", value: focused, additive: event.ctrlKey || event.metaKey }); list.focus(); }, { signal });
list.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") { event.preventDefault(); apply({ type: "all" }); return; }
  if (event.key === " " && focused !== null) { event.preventDefault(); apply({ type: event.shiftKey ? "range" : "toggle", value: focused }); return; }
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || !order.length) return;
  event.preventDefault(); if (!selection.anchor) selection = { ...selection, anchor: focused };
  const index = order.indexOf(focused); focused = order[event.key === "Home" ? 0 : event.key === "End" ? order.length - 1 : Math.max(0, Math.min(order.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))];
  if (event.shiftKey) apply({ type: "range", value: focused }); else render();
  list.querySelector("[data-focused]")?.scrollIntoView({ block: "nearest" });
}, { signal });
search.addEventListener("input", render, { signal });
root.querySelector("#collection-all").addEventListener("click", () => apply({ type: "all" }), { signal });
root.querySelector("#collection-clear").addEventListener("click", () => apply({ type: "clear" }), { signal });
render();`,
};
