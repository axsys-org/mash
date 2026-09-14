import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const formatting: CatalogExample = {
  ...sample(
    "Formatting controls",
    `<ui-toggle-group id="formatting" mode="multiple" label="Text formatting"><ui-toggle value="bold" aria-label="Bold"><strong>B</strong></ui-toggle><ui-toggle value="italic" aria-label="Italic"><em>I</em></ui-toggle><ui-toggle value="underline" aria-label="Underline"><span style="text-decoration: underline">U</span></ui-toggle></ui-toggle-group><ui-card><p id="formatted-text">Good tools get out of the way. Select a combination of formatting controls.</p></ui-card>`,
    "Independent pressed states affect the preview. Arrow keys move between controls; Space changes a selection.",
  ),
  script: `document.querySelector("#formatting").addEventListener("ui-toggle-group-change", event => {
  const active = event.detail.values;
  const preview = document.querySelector("#formatted-text");
  preview.style.fontWeight = active.includes("bold") ? "700" : "400";
  preview.style.fontStyle = active.includes("italic") ? "italic" : "normal";
  preview.style.textDecoration = active.includes("underline") ? "underline" : "none";
});`,
};
const filters: CatalogExample = {
  ...sample(
    "Multiple filters",
    `<ui-toggle-group id="type-filters" mode="multiple" label="File types"><ui-toggle value="document" pressed>Documents</ui-toggle><ui-toggle value="image" pressed>Images</ui-toggle><ui-toggle value="video">Video</ui-toggle></ui-toggle-group><ul id="filtered-files" class="mash-list"></ul><output id="filter-count" aria-live="polite"></output>`,
    "Combine filters independently. An empty selection has an explicit empty result.",
  ),
  script: `const files = [{ name: "Release notes.md", type: "document" }, { name: "Cover.png", type: "image" }, { name: "Walkthrough.mp4", type: "video" }, { name: "Proposal.pdf", type: "document" }];
const render = types => {
  const matches = files.filter(file => types.includes(file.type));
  document.querySelector("#filtered-files").replaceChildren(...matches.map(file => { const row = document.createElement("li"); row.textContent = file.name; return row; }));
  document.querySelector("#filter-count").textContent = matches.length ? matches.length + " matching files" : "No file types selected";
};
document.querySelector("#type-filters").addEventListener("ui-toggle-group-change", event => render(event.detail.values));
render(["document", "image"]);`,
};
export const controlPatternExamples: Record<string, CatalogExample[]> = {
  "ui-button": [
    sample(
      "Icons and labels",
      `<div class="mash-row mash-wrap" data-mash-size="small"><ui-button variant="primary"><ui-icon slot="prefix" name="action.add" label=""></ui-icon>New document</ui-button><ui-button><ui-icon slot="prefix" name="action.download" label=""></ui-icon>Download</ui-button><ui-button variant="ghost" aria-label="Search"><ui-icon name="action.search" label=""></ui-icon></ui-button><ui-tooltip label="Edit document"><ui-button slot="trigger" variant="ghost" aria-label="Edit document"><ui-icon name="action.edit" label=""></ui-icon></ui-button>Edit document</ui-tooltip><ui-button variant="secondary" disabled><ui-icon slot="prefix" name="action.upload" label=""></ui-icon>Upload</ui-button></div>`,
      "Icon-only actions retain an accessible name. Prefix and suffix slots keep label spacing consistent.",
    ),
    {
      ...sample(
        "Async action",
        `<div class="mash-row"><ui-button id="save-work" variant="primary"><ui-icon slot="prefix" name="action.confirm" label=""></ui-icon><span id="save-label">Save changes</span></ui-button><ui-button id="edit-again" disabled>Make another change</ui-button></div><output id="save-result" aria-live="polite">Unsaved changes</output>`,
        "Loading prevents duplicate activation. Completion has a stable label and a repeatable next action.",
      ),
      script: `const save = document.querySelector("#save-work");
const edit = document.querySelector("#edit-again");
save.addEventListener("click", async () => {
  save.loading = true; document.querySelector("#save-label").textContent = "Saving";
  document.querySelector("#save-result").textContent = "Saving your changes…";
  await new Promise(resolve => setTimeout(resolve, 900));
  save.loading = false; save.disabled = true; edit.disabled = false;
  document.querySelector("#save-label").textContent = "Saved";
  document.querySelector("#save-result").textContent = "All changes saved";
});
edit.addEventListener("click", () => { save.disabled = false; edit.disabled = true; document.querySelector("#save-label").textContent = "Save changes"; document.querySelector("#save-result").textContent = "Unsaved changes"; save.focus(); });`,
    },
    {
      ...sample(
        "Progress action",
        `<div class="mash-row"><ui-button id="export-work"><ui-progress id="export-progress" slot="prefix" aria-hidden="true" shape="circular" label="Export progress" value="0" style="inline-size: var(--layout-dimension-glyph)"></ui-progress><span id="export-label">Export report</span></ui-button><ui-button id="cancel-export" variant="ghost" disabled>Cancel</ui-button></div><output id="export-result" aria-live="polite">Ready to export</output><a id="download-report" download="report.csv" style="color: var(--color-action)" hidden>Download report.csv</a>`,
        "Determinate progress belongs to the operation. Cancel clears the timer and makes the action available again.",
      ),
      script: `const button = document.querySelector("#export-work"), cancel = document.querySelector("#cancel-export"), progress = document.querySelector("#export-progress");
let timer, downloadUrl;
const download = document.querySelector("#download-report");
button.addEventListener("click", () => {
  button.disabled = true; cancel.disabled = false; progress.value = 0; download.hidden = true;
  document.querySelector("#export-result").textContent = "Preparing report…";
  timer = setInterval(() => { progress.value += 20; document.querySelector("#export-label").textContent = "Exporting " + progress.value + "%";
    if (progress.value >= 100) { clearInterval(timer); button.disabled = false; cancel.disabled = true; document.querySelector("#export-label").textContent = "Export again"; document.querySelector("#export-result").textContent = "Report ready"; if (downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl = URL.createObjectURL(new Blob(["Document,Status\\nRelease notes,Reviewed\\nDesign notes,Ready\\n"], { type: "text/csv" })); download.href = downloadUrl; download.hidden = false; }
  }, 300);
});
cancel.addEventListener("click", () => { clearInterval(timer); button.disabled = false; cancel.disabled = true; progress.value = 0; document.querySelector("#export-label").textContent = "Export report"; document.querySelector("#export-result").textContent = "Export cancelled"; button.focus(); });`,
    },
    {
      ...sample(
        "Joined actions",
        `<div class="mash-button-group" role="group" aria-label="History"><ui-button id="previous-item" aria-label="Previous item"><ui-icon name="navigation.back" label=""></ui-icon></ui-button><ui-button id="next-item" aria-label="Next item"><ui-icon name="navigation.forward" label=""></ui-icon></ui-button></div><ui-card><strong slot="title" id="history-title">First document</strong><span id="history-position">1 of 3</span></ui-card>`,
        "Joined controls share a boundary. Each remains a separately named button with its own disabled state.",
      ),
      script: `const titles = ["First document", "Design notes", "Release checklist"];
let index = 0;
const previous = document.querySelector("#previous-item"), next = document.querySelector("#next-item");
const render = () => { previous.disabled = index === 0; next.disabled = index === titles.length - 1; document.querySelector("#history-title").textContent = titles[index]; document.querySelector("#history-position").textContent = (index + 1) + " of " + titles.length; };
previous.addEventListener("click", () => { index--; render(); }); next.addEventListener("click", () => { index++; render(); }); render();`,
    },
  ],
  "ui-toggle": [
    formatting,
    filters,
    sample(
      "Toggle sizes",
      ["xsmall", "small", "medium", "large"]
        .map(
          (size) =>
            `<div class="mash-row" data-mash-size="${size}"><ui-toggle aria-label="Pin ${size}"><ui-icon name="action.select" label=""></ui-icon></ui-toggle><ui-toggle pressed>${size}</ui-toggle><ui-toggle disabled>Unavailable</ui-toggle></div>`,
        )
        .join(""),
    ),
  ],
  "ui-toggle-group": [formatting, filters],
};
