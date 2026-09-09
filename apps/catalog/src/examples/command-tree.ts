import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const commandRows = `<ui-icon slot="search-prefix" name="action.search" label=""></ui-icon>
  <ui-kbd slot="search-suffix" shortcut="Escape" appearance="plain"></ui-kbd>
  <section role="group" aria-label="Workspace"><span data-command-heading>Workspace</span>
    <ui-command-item value="new" keywords="create document note"><ui-icon slot="icon" name="action.add" label=""></ui-icon>New document<span slot="description">Create an editable draft in this workspace</span></ui-command-item>
    <ui-command-item value="readonly" keywords="edit lock unlock readonly"><ui-icon slot="icon" name="status.information" label=""></ui-icon>Toggle read-only<span slot="description">Protect or unlock the current draft</span></ui-command-item>
    <ui-command-item value="delete" disabled><ui-icon slot="icon" name="action.delete" label=""></ui-icon>Delete workspace<span slot="description">Only workspace owners can delete it</span></ui-command-item>
  </section>
  <section role="group" aria-label="Documents"><span data-command-heading>Documents</span>
    <ui-command-item value="notes" keywords="meeting team"><ui-icon slot="icon" name="object.document" label=""></ui-icon>Meeting notes<span slot="description">Notes from the latest design review</span><ui-badge slot="shortcut" variant="secondary">Draft</ui-badge></ui-command-item>
    <ui-command-item value="plan" keywords="release roadmap"><ui-icon slot="icon" name="object.document" label=""></ui-icon>Release plan<span slot="description">Milestones and the next release</span></ui-command-item>
  </section>
  <div slot="empty" class="mash-stack"><strong>No matching commands</strong><span>Try “new”, “meeting”, or “release”.</span><ui-button id="clear-query" variant="ghost" size="small">Clear search</ui-button></div>
  <div slot="footer" class="mash-row mash-wrap"><ui-kbd shortcut="ArrowUp" appearance="plain"></ui-kbd><ui-kbd shortcut="ArrowDown" appearance="plain"></ui-kbd><span>Navigate</span><ui-kbd shortcut="Enter" appearance="plain"></ui-kbd><span>Run</span><span>Esc clears search</span></div>`;
const draft = `<ui-card><strong slot="title" id="document-title">Meeting notes</strong><ui-textarea id="document-editor" label="Document content" value="Discuss the navigation and review the new controls." rows="4"></ui-textarea><output slot="footer" id="command-result" aria-live="polite">Editable · changes stay in this preview</output></ui-card>`;
const commandOwner = `const palette = document.querySelector("#commands");
const editor = document.querySelector("#document-editor");
const title = document.querySelector("#document-title");
const documents = new Map([["notes", {title: "Meeting notes", text: editor.value}], ["plan", {title: "Release plan", text: "Polish the controls, review accessibility, then ship."}]]);
let current = "notes";
let count = 0;
let locked = false;
function run(value) {
  documents.get(current).text = editor.value;
  if (value === "readonly") { locked = !locked; editor.readonly = locked; }
  else {
    if (value === "new") {
      value = "draft-" + ++count;
      documents.set(value, {title: "Untitled " + count, text: ""});
      const item = document.createElement("ui-command-item");
      Object.assign(item, {value, textContent: "Untitled " + count, keywords: "document draft"});
      palette.querySelector('[aria-label="Documents"]').append(item);
    }
    const entry = documents.get(value);
    if (!entry) return;
    current = value;
    title.textContent = entry.title;
    editor.value = entry.text;
  }
  document.querySelector("#command-result").textContent = (locked ? "Read-only" : "Editable") + " · " + title.textContent;
}
palette.addEventListener("ui-command-select", event => {
  run(event.detail.value);
  const dialog = document.querySelector("#command-dialog");
  if (dialog) dialog.open = false;
});
document.querySelector("#clear-query").addEventListener("click", () => { palette.query = ""; palette.focus(); });`;

export const commandExamples: CatalogExample[] = [
  {
    ...sample(
      "Commands",
      `<ui-command id="commands" label="Quick actions" placeholder="Search actions and documents…">${commandRows}</ui-command>${draft}`,
      "Search words in any order. Commands create documents, switch retained drafts, and lock editing. Pointer and keyboard share one active row.",
    ),
    script: commandOwner,
  },
  {
    ...sample(
      "Command dialog",
      `<div id="command-workspace" class="mash-stack" tabindex="-1"><ui-dialog id="command-dialog" label="Quick actions"><ui-button slot="trigger" outline>Open commands <ui-kbd shortcut="Primary+K" appearance="plain"></ui-kbd></ui-button><span slot="title">Quick actions</span><ui-command id="commands" label="Quick actions" placeholder="Search actions and documents…">${commandRows}</ui-command></ui-dialog><ui-gesture-binding for="command-workspace" gesture="key" command="commands.open" shortcut="Primary+K"></ui-gesture-binding>${draft}</div>`,
      "Use the button or Primary+K while working in this preview. Running a command closes the dialog; reopening preserves the query and your document edits.",
    ),
    script:
      commandOwner +
      `
const dialog = document.querySelector("#command-dialog");
document.querySelector("#command-workspace").addEventListener("mash-command", event => {
  if (event.detail.command === "commands.open" && event.detail.phase === "ended") {
    dialog.open = !dialog.open;
    if (dialog.open) dialog.updateComplete.then(() => palette.focus());
  }
});
dialog.addEventListener("ui-dialog-open-change", event => { if (event.detail.open) dialog.updateComplete.then(() => palette.focus()); });`,
  },
];

const treeMarkup = `<ui-tree id="files" label="Project files"><ui-tree-item title="Project" value="project" kind="folder" expanded>
  <ui-tree-item slot="children" title="README.md" value="readme" selected></ui-tree-item>
  <ui-tree-item slot="children" title="src" value="src" kind="folder" expanded><ui-tree-item slot="children" title="app.ts" value="app"></ui-tree-item><ui-tree-item slot="children" title="theme.css" value="theme"></ui-tree-item></ui-tree-item>
  <ui-tree-item slot="children" title="Archived" value="archive" disabled></ui-tree-item>
</ui-tree-item></ui-tree>`;
const treeOwner = `const tree = document.querySelector("#files");
const items = [...tree.querySelectorAll("ui-tree-item")];
tree.addEventListener("ui-tree-toggle", event => {
  const item = items.find(item => item.value === event.detail.value);
  if (item) item.expanded = event.detail.expanded;
});
tree.addEventListener("ui-tree-select", event => {
  items.forEach(item => { item.selected = item.value === event.detail.value; });
});`;
export const treeExamples: CatalogExample[] = [
  {
    ...sample(
      "Tree",
      `${treeMarkup}<ui-card><strong slot="title" id="file-title">README.md</strong><ui-textarea id="file-editor" label="File content" value="Welcome to the project." rows="4"></ui-textarea></ui-card>`,
      "Click a folder or use Left and Right to collapse and expand it. Choose a file to edit; folder state and file drafts survive navigation.",
    ),
    script:
      treeOwner +
      `
const editor = document.querySelector("#file-editor");
const drafts = new Map([["readme", "Welcome to the project."], ["app", "export const ready = true;"], ["theme", ":root { color-scheme: light dark; }"]]);
let current = "readme";
tree.addEventListener("ui-tree-select", event => {
  if (!drafts.has(event.detail.value)) return;
  drafts.set(current, editor.value);
  current = event.detail.value;
  document.querySelector("#file-title").textContent = items.find(item => item.value === current).title;
  editor.value = drafts.get(current);
});`,
  },
  {
    ...sample(
      "Expand and reveal",
      `<div class="mash-row mash-wrap"><ui-button id="collapse-all" outline>Collapse all</ui-button><ui-button id="expand-all" outline>Expand all</ui-button><ui-button id="reveal-file" variant="ghost">Reveal theme.css</ui-button></div>${treeMarkup}<output id="tree-result" aria-live="polite">Folders remember their expansion independently.</output>`,
      "The owner applies expansion requests. Reveal opens the ancestor chain and focuses the identified file; collapsing keeps its selection.",
    ),
    script:
      treeOwner +
      `
document.querySelector("#collapse-all").addEventListener("click", () => items.forEach(item => { if (item.branch) item.expanded = false; }));
document.querySelector("#expand-all").addEventListener("click", () => items.forEach(item => { if (item.branch) item.expanded = true; }));
document.querySelector("#reveal-file").addEventListener("click", async () => {
  tree.revealItem("theme");
  await Promise.all(items.map(item => item.updateComplete));
  tree.focusItem("theme");
  document.querySelector("#tree-result").textContent = "Revealed Project / src / theme.css";
});`,
  },
];
