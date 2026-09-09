import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

export const menuExamples: Record<string, CatalogExample[]> = {
  "ui-menu": [
    {
      ...sample(
        "Document actions",
        `<div class="mash-row"><ui-menu id="document-actions" label="Document actions"><ui-button slot="trigger">Document actions</ui-button><ui-menu-label>Project brief</ui-menu-label><ui-menu-item value="duplicate"><ui-icon slot="prefix" name="action.add" label=""></ui-icon>Duplicate</ui-menu-item><ui-menu-item value="archive">Archive</ui-menu-item><ui-menu-item disabled>Publish to team</ui-menu-item><ui-separator></ui-separator><ui-menu-item>Export<ui-menu slot="submenu" label="Export format"><ui-menu-item value="json">JSON</ui-menu-item><ui-menu-item value="text">Plain text</ui-menu-item></ui-menu></ui-menu-item></ui-menu><ui-button id="reset-documents" size="small" variant="ghost">Reset documents</ui-button></div><ul id="document-list" class="mash-list"></ul><output id="document-action-result" aria-live="polite">Choose an action for Project brief.</output><pre id="document-export" hidden></pre>`,
        "Commands update the local document list. Export branches produce a readable snapshot; the disabled action is unavailable.",
      ),
      script: `const menu = document.querySelector("#document-actions");
let documents = [{ name: "Project brief", archived: false }];
function renderDocuments() {
  document.querySelector("#document-list").replaceChildren(...documents.map(document => {
    const row = window.document.createElement("li");
    row.textContent = document.name + (document.archived ? " · Archived" : " · Draft");
    return row;
  }));
}
menu.addEventListener("ui-menu-select", event => {
  const action = event.detail.value;
  if (action === "duplicate") documents.push({ name: "Project brief copy " + documents.length, archived: false });
  if (action === "archive") documents[0].archived = true;
  const preview = document.querySelector("#document-export");
  if (action === "json" || action === "text") {
    preview.hidden = false;
    preview.textContent = action === "json" ? JSON.stringify(documents, null, 2) : documents.map(item => item.name).join("\\n");
  }
  document.querySelector("#document-action-result").textContent = action === "duplicate" ? "Created a document copy." : action === "archive" ? "Project brief archived." : "Export ready: " + action;
  renderDocuments();
});
document.querySelector("#reset-documents").addEventListener("click", () => {
  documents = [{ name: "Project brief", archived: false }];
  document.querySelector("#document-export").hidden = true;
  document.querySelector("#document-action-result").textContent = "Documents reset.";
  renderDocuments();
});
renderDocuments();`,
    },
    {
      ...sample(
        "Checked view preferences",
        `<ui-menu id="view-preferences" label="View preferences"><ui-button slot="trigger">View preferences</ui-button><ui-menu-item kind="checkbox" value="descriptions" checked>Show descriptions</ui-menu-item><ui-separator></ui-separator><ui-menu-label>Spacing</ui-menu-label><ui-menu-item kind="radio" value="comfortable" checked>Comfortable</ui-menu-item><ui-menu-item kind="radio" value="compact">Compact</ui-menu-item></ui-menu><div id="view-preview" class="mash-stack"><ui-card><strong slot="title">Design review</strong><p data-description>Review the latest component changes.</p></ui-card><ui-card><strong slot="title">Release notes</strong><p data-description>Share what changed with your team.</p></ui-card></div><output id="view-result" aria-live="polite">Comfortable · descriptions visible</output>`,
        "Checkboxes toggle independently; radio choices are exclusive. Reopen the menu to see the state that produced the preview.",
      ),
      script: `let descriptions = true;
let spacing = "comfortable";
document.querySelector("#view-preferences").addEventListener("ui-menu-select", event => {
  if (event.detail.value === "descriptions") descriptions = event.detail.checked;
  else spacing = event.detail.value;
  document.querySelectorAll("[data-description]").forEach(description => { description.hidden = !descriptions; });
  document.querySelector("#view-preview").style.gap = spacing === "compact" ? "var(--space-control-block-small)" : "var(--space-container-block)";
  document.querySelector("#view-result").textContent = (spacing === "compact" ? "Compact" : "Comfortable") + " · descriptions " + (descriptions ? "visible" : "hidden");
});`,
    },
    {
      ...sample(
        "Rich command rows",
        `<ui-menu id="workspace-switcher" label="Choose workspace" sizing="fixed"><ui-button slot="trigger">Choose workspace</ui-button><div slot="header" class="mash-stack"><strong>Workspaces</strong><span>Switch the current working context.</span></div><ui-menu-item class="mash-menu-rich" value="personal"><ui-avatar slot="prefix" size="small" alt="Personal workspace">P</ui-avatar><span class="mash-stack"><strong>Personal</strong><small>Your private notes and drafts</small></span></ui-menu-item><ui-menu-item class="mash-menu-rich" value="studio"><ui-avatar slot="prefix" size="small" alt="Studio workspace">S</ui-avatar><span class="mash-stack"><strong>Studio</strong><small>Shared with your design team</small></span></ui-menu-item><ui-menu-item class="mash-menu-rich" disabled><span class="mash-stack"><strong>Archive</strong><small>Read access is being restored</small></span></ui-menu-item><span slot="footer">Two available workspaces</span></ui-menu><ui-card><strong slot="title" id="workspace-name">Personal workspace</strong><p id="workspace-description">Your private notes and drafts.</p></ui-card>`,
        "Custom labels can have an icon and supporting text while the entire row remains one keyboard action. Header and footer content stay outside the scrolling command list.",
      ),
      script: `document.querySelector("#workspace-switcher").addEventListener("ui-menu-select", event => {
  const studio = event.detail.value === "studio";
  document.querySelector("#workspace-name").textContent = studio ? "Studio workspace" : "Personal workspace";
  document.querySelector("#workspace-description").textContent = studio ? "Shared with your design team." : "Your private notes and drafts.";
});`,
    },
    {
      ...sample(
        "Anchors and sizing",
        `<div class="mash-row mash-wrap" style="justify-content: center; padding-block: var(--space-region)">${["top", "right", "bottom", "left"].map((placement) => `<ui-menu placement="${placement}" align="center" label="${placement} menu"><ui-button slot="trigger">${placement.charAt(0).toUpperCase() + placement.slice(1)}</ui-button><ui-menu-item value="${placement}">Use this placement</ui-menu-item><ui-menu-item disabled>Unavailable action</ui-menu-item></ui-menu>`).join("")}</div><div class="mash-row mash-wrap">${["content", "fixed", "stretch"].map((sizing) => `<ui-menu sizing="${sizing}" label="${sizing} sizing"><ui-button slot="trigger">${sizing.charAt(0).toUpperCase() + sizing.slice(1)} width</ui-button><ui-menu-label>Popup width</ui-menu-label><ui-menu-item value="${sizing}">A command with a longer label</ui-menu-item></ui-menu>`).join("")}</div><output id="anchor-result" aria-live="polite">Open a menu to compare its anchor and width.</output>`,
        "Placement expresses a preference. Popups shift or flip near the window edge to keep commands reachable.",
      ),
      script: `document.querySelectorAll("ui-menu").forEach(menu => menu.addEventListener("ui-menu-select", event => {
  document.querySelector("#anchor-result").textContent = "Selected: " + event.detail.value;
}));`,
    },
  ],
  "ui-context-menu": [
    {
      ...sample(
        "Context actions",
        `<ui-context-menu id="file-context" label="File actions"><article slot="trigger" id="context-file" class="mash-panel mash-stack" tabindex="0" aria-label="Project brief context target"><strong>Project brief</strong><p>Right-click anywhere in this card, or focus it and press Shift+F10.</p><span id="context-file-state">Unpinned · draft</span></article><ui-menu-item kind="checkbox" value="pin">Pin document</ui-menu-item><ui-menu-item value="complete">Mark complete</ui-menu-item><ui-menu-item value="reset">Reset document</ui-menu-item><ui-separator></ui-separator><ui-menu-item disabled>Move to managed folder</ui-menu-item></ui-context-menu><output id="context-result" aria-live="polite">The menu acts on the focused document.</output>`,
        "The pointer opens the menu at the click position. The keyboard opens it from the focused target; both paths share the same commands.",
      ),
      script: `const menu = document.querySelector("#file-context");
let pinned = false;
let complete = false;
menu.addEventListener("ui-context-menu-select", event => {
  if (event.detail.value === "pin") pinned = menu.querySelector('[value="pin"]').checked;
  if (event.detail.value === "complete") complete = true;
  if (event.detail.value === "reset") { pinned = false; complete = false; menu.querySelector('[value="pin"]').checked = false; }
  document.querySelector("#context-file-state").textContent = (pinned ? "Pinned" : "Unpinned") + " · " + (complete ? "complete" : "draft");
  document.querySelector("#context-result").textContent = "Document updated: " + event.detail.value;
});`,
    },
  ],
  "ui-dialog": [
    {
      ...sample(
        "Validated edit",
        `<ui-card><strong slot="title" id="saved-project-name">Website redesign</strong><p id="saved-project-description">A focused refresh of the public site.</p><ui-dialog id="edit-project" slot="footer" label="Edit project details"><ui-button slot="trigger">Edit details</ui-button><strong slot="title">Project details</strong><span slot="description">Save updates the card. Cancel leaves the saved values alone.</span><form id="project-edit-form" class="mash-stack"><ui-input id="project-edit-name" name="name" label="Project name" required></ui-input><ui-textarea id="project-edit-description" name="description" label="Description" rows="3"></ui-textarea><div class="mash-row"><ui-button type="submit" variant="primary">Save changes</ui-button><ui-button id="cancel-project-edit">Cancel editing</ui-button></div></form></ui-dialog></ui-card><output id="project-edit-result" aria-live="polite">No unsaved changes.</output>`,
        "Use native validation and owner-managed actions when a dialog must stay open until its form is valid. Closing returns focus to the trigger.",
      ),
      script: `const dialog = document.querySelector("#edit-project");
const name = document.querySelector("#project-edit-name");
const description = document.querySelector("#project-edit-description");
dialog.addEventListener("ui-dialog-open-change", event => {
  if (!event.detail.open) return;
  name.value = document.querySelector("#saved-project-name").textContent;
  description.value = document.querySelector("#saved-project-description").textContent;
});
document.querySelector("#project-edit-form").addEventListener("submit", event => {
  event.preventDefault();
  document.querySelector("#saved-project-name").textContent = name.value.trim();
  document.querySelector("#saved-project-description").textContent = description.value;
  document.querySelector("#project-edit-result").textContent = "Project details saved.";
  dialog.dismiss();
});
document.querySelector("#cancel-project-edit").addEventListener("click", () => {
  document.querySelector("#project-edit-result").textContent = "Changes discarded.";
  dialog.dismiss();
});`,
    },
    {
      ...sample(
        "Dismissal and nested dialogs",
        `<div class="mash-row mash-wrap"><ui-switch id="allow-escape" checked>Escape closes</ui-switch><ui-switch id="allow-outside" checked>Outside click closes</ui-switch></div><ui-dialog id="policy-dialog" label="Working draft"><ui-button slot="trigger">Open working draft</ui-button><strong slot="title">Working draft</strong><span slot="description">The controls above configure this dialog's dismissal policy.</span><ui-textarea label="Draft notes" rows="4" value="Keep this draft while trying nested confirmation."></ui-textarea><div slot="actions" class="mash-row"><ui-alert-dialog id="discard-confirmation" label="Discard draft?"><ui-button slot="trigger" tone="critical">Discard draft</ui-button><strong slot="title">Discard this draft?</strong><span slot="description">This only clears the local example.</span><ui-button slot="cancel">Keep draft</ui-button><ui-button slot="confirm" tone="critical">Confirm discard</ui-button></ui-alert-dialog></div><ui-button slot="close">Close draft</ui-button></ui-dialog><output id="dialog-policy-result" aria-live="polite">Open the draft, then try Escape or the backdrop.</output>`,
        "A nested confirmation temporarily owns focus. Cancel returns to the draft; confirmation clears it and closes both dialogs.",
      ),
      script: `const dialog = document.querySelector("#policy-dialog");
document.querySelector("#allow-escape").addEventListener("ui-switch-change", event => { dialog.closeOnEscape = event.detail.checked; });
document.querySelector("#allow-outside").addEventListener("ui-switch-change", event => { dialog.closeOnOutside = event.detail.checked; });
dialog.addEventListener("ui-dialog-open-change", event => {
  if (event.target !== dialog || event.detail.open) return;
  document.querySelector("#dialog-policy-result").textContent = "Draft closed: " + event.detail.reason;
});
document.querySelector("#discard-confirmation").addEventListener("ui-alert-dialog-confirm", () => {
  dialog.querySelector("ui-textarea").value = "";
  dialog.dismiss();
  document.querySelector("#dialog-policy-result").textContent = "Draft discarded.";
});`,
    },
  ],
  "ui-popover": [
    {
      ...sample(
        "Live display settings",
        `<div class="mash-row mash-wrap"><ui-select id="settings-placement" label="Popup placement" value="bottom">${["top", "right", "bottom", "left"].map((side) => `<ui-option value="${side}">${side.charAt(0).toUpperCase() + side.slice(1)}</ui-option>`).join("")}</ui-select><ui-popover id="display-settings" label="Display settings"><ui-button slot="trigger">Display settings</ui-button><strong slot="title">Display settings</strong><span slot="description">Changes apply immediately to the preview.</span><div class="mash-stack"><ui-switch id="show-preview-description" checked>Show description</ui-switch><ui-slider id="preview-emphasis" label="Text emphasis" min="400" max="700" step="100" value="400"></ui-slider></div><ui-button slot="close">Done</ui-button></ui-popover></div><ui-card><strong slot="title" id="settings-preview-title">Make room for the work</strong><p id="settings-preview-description">Use a popover for a small set of controls related to a nearby object.</p></ui-card><output id="settings-result" aria-live="polite">Description visible · text weight 400</output>`,
        "Place independent inputs in a popover, keeping menu rows as single commands. Choose an anchor and try changing the controls without dismissing the popup.",
      ),
      script: `const popover = document.querySelector("#display-settings");
document.querySelector("#settings-placement").addEventListener("ui-select-change", event => { popover.placement = event.detail.value; });
function updatePreview() {
  const visible = document.querySelector("#show-preview-description").checked;
  const weight = document.querySelector("#preview-emphasis").value;
  document.querySelector("#settings-preview-description").hidden = !visible;
  document.querySelector("#settings-preview-title").style.fontWeight = String(weight);
  document.querySelector("#settings-result").textContent = "Description " + (visible ? "visible" : "hidden") + " · text weight " + weight;
}
document.querySelector("#show-preview-description").addEventListener("ui-switch-change", updatePreview);
document.querySelector("#preview-emphasis").addEventListener("ui-slider-input", updatePreview);`,
    },
  ],
  "ui-alert-dialog": [
    {
      ...sample(
        "Async confirmation",
        `<div class="mash-row"><ui-alert-dialog id="archive-confirmation" label="Archive local draft?"><ui-button slot="trigger">Archive local draft</ui-button><strong slot="title">Archive this draft?</strong><span slot="description">This repeatable local task demonstrates pending, failure, retry, and completion.</span><div class="mash-stack"><ui-checkbox id="archive-failure" checked>Simulate a failed first attempt</ui-checkbox><output id="archive-progress" aria-live="polite">The draft remains available until archiving completes.</output><div class="mash-row"><ui-button id="archive-accept" variant="primary">Archive draft</ui-button><ui-button id="archive-cancel">Cancel archiving</ui-button></div></div></ui-alert-dialog><ui-button id="archive-reset" variant="ghost" size="small">Reset draft</ui-button></div><output id="archive-state" aria-live="polite">Draft is active.</output>`,
        "Actions live in the content slot so the owner can keep the dialog open while work is pending. Call dismiss() after success; the confirm slot is for actions that close immediately.",
      ),
      script: `const dialog = document.querySelector("#archive-confirmation");
const accept = document.querySelector("#archive-accept");
const cancel = document.querySelector("#archive-cancel");
let failed = false;
let pending = false;
dialog.addEventListener("ui-alert-dialog-open-change", event => {
  if (event.detail.open) document.querySelector("#archive-progress").textContent = "Ready to archive the local draft.";
});
accept.addEventListener("click", async () => {
  if (pending) return;
  pending = true;
  accept.loading = true;
  cancel.disabled = true;
  dialog.closeOnEscape = false;
  document.querySelector("#archive-progress").textContent = "Archiving…";
  await new Promise(resolve => setTimeout(resolve, 600));
  const shouldFail = document.querySelector("#archive-failure").checked && !failed;
  pending = false;
  accept.loading = false;
  cancel.disabled = false;
  dialog.closeOnEscape = true;
  if (shouldFail) {
    failed = true;
    accept.textContent = "Retry archive";
    document.querySelector("#archive-progress").textContent = "The first attempt failed. Retry to finish.";
    return;
  }
  document.querySelector("#archive-state").textContent = "Draft archived.";
  dialog.dismiss();
});
cancel.addEventListener("click", () => dialog.dismiss());
document.querySelector("#archive-reset").addEventListener("click", () => {
  failed = false;
  accept.textContent = "Archive draft";
  document.querySelector("#archive-state").textContent = "Draft is active.";
});`,
    },
  ],
};
