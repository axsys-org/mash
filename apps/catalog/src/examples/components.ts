import { sidebarExamples } from "./sidebar.js";
import { controlExamples } from "./controls.js";
import { finalControlExamples } from "./final-control-examples.js";
import { navigationOverlayExamples } from "./navigation-overlays.js";
import { editorExamples } from "./editor.js";
import { menuExtensionExamples } from "./menu-extensions.js";
import { workflowExamples } from "./workflows.js";
import { mergeControlStateExamples } from "./control-states.js";
import { tableWorkflowExamples } from "./table-workflows.js";
import { mergeSelectionExamples, selectionExamples } from "./selection.js";
import { layoutPatternExamples } from "./layout-patterns.js";
import { feedbackExamples } from "./feedback.js";
import { collectionExamples } from "./collections.js";
import { displayExamples } from "./display.js";
import { treeExamples } from "./command-tree.js";
import { dateExamples } from "./dates.js";
import { colorExamples } from "./colors.js";
import { menuExamples } from "./menus.js";
import { refinements } from "./refinements.js";
import { patternExamples } from "./patterns.js";
import type { CatalogExample } from "../examples.js";
import { navigationExamples } from "./navigation.js";
import { utilityExamples } from "./utility.js";
import { tableExamples } from "./tables.js";
import { dataExamples } from "./data.js";
import { conversationExamples } from "./conversation.js";
import { sample } from "./shared.js";

const radio = `<ui-radio-group label="Visibility" name="visibility" value="team">
  <ui-radio value="private">Private</ui-radio>
  <ui-radio value="team">Team</ui-radio>
  <ui-radio value="public" disabled>Public</ui-radio>
</ui-radio-group>`;
const checks = `<ui-checkbox-group label="Notifications">
  <ui-checkbox value="releases" checked>Releases</ui-checkbox>
  <ui-checkbox value="reviews">Reviews</ui-checkbox>
  <ui-checkbox value="billing" disabled>Billing</ui-checkbox>
</ui-checkbox-group>`;
const fields = `<ui-field label="Project name" description="Visible to your team." required>
  <ui-input slot="control" name="name" placeholder="Project name" required></ui-input>
</ui-field>
<ui-field label="Description">
  <ui-textarea slot="control" name="description" rows="3" placeholder="A short description"></ui-textarea>
</ui-field>`;
const menu = `<ui-menu label="Edit">
  <ui-button slot="trigger">Edit</ui-button>
  <ui-menu-item value="copy">Copy<ui-kbd slot="shortcut">⌘C</ui-kbd></ui-menu-item>
  <ui-menu-item value="paste" disabled>Paste</ui-menu-item>
  <ui-separator></ui-separator>
  <ui-menu-item kind="checkbox" checked value="wrap">Word wrap</ui-menu-item>
  <ui-menu-item value="delete" tone="critical">Delete</ui-menu-item>
</ui-menu>`;
const table = `<ui-table label="Projects" row-count="4" column-count="3">
  <ui-table-caption slot="caption">Projects</ui-table-caption>
  <ui-table-header><ui-table-row row-index="1">
    <ui-table-head column-index="1">Name</ui-table-head>
    <ui-table-head column-index="2">Status</ui-table-head>
    <ui-table-head column-index="3">Owner</ui-table-head>
  </ui-table-row></ui-table-header>
  <ui-table-body>
    <ui-table-row row-index="2"><ui-table-cell column-index="1">Website</ui-table-cell><ui-table-cell column-index="2"><ui-badge tone="positive">Ready</ui-badge></ui-table-cell><ui-table-cell column-index="3">Alex</ui-table-cell></ui-table-row>
    <ui-table-row row-index="3"><ui-table-cell column-index="1">Documentation</ui-table-cell><ui-table-cell column-index="2"><ui-badge tone="warning">Review</ui-badge></ui-table-cell><ui-table-cell column-index="3">Sam</ui-table-cell></ui-table-row>
    <ui-table-row row-index="4"><ui-table-cell column-index="1">Components</ui-table-cell><ui-table-cell column-index="2"><ui-badge tone="neutral">Draft</ui-badge></ui-table-cell><ui-table-cell column-index="3">Morgan</ui-table-cell></ui-table-row>
  </ui-table-body>
</ui-table>`;

/** Focused, executable public compositions. No stage-only styles or application controllers. */
export const componentExamples: Record<string, CatalogExample[]> = {
  "ui-sidebar": sidebarExamples,
  ...utilityExamples,
  ...dataExamples,
  ...tableExamples,
  ...conversationExamples,
  "sh-myth": [
    sample(
      "Record",
      `<sh-myth kind="Project" title="Website" path="/projects/website">
  <sh-limb><sh-slot slot="slot" title="status"></sh-slot><sh-pail slot="value" text="active"></sh-pail></sh-limb>
  <sh-limb><sh-slot slot="slot" title="owner"></sh-slot><sh-pail slot="value" text="Alex"></sh-pail></sh-limb>
</sh-myth>`,
    ),
  ],
  "ui-number-field": [
    sample(
      "Number",
      `<ui-number-field label="Seats" value="3" min="1" max="20"></ui-number-field>`,
    ),
  ],
  "ui-otp-field": [
    sample(
      "Verification code",
      `<ui-otp-field label="Verification code" length="6"></ui-otp-field>`,
    ),
  ],
  "ui-meter": [
    sample(
      "Capacity",
      `<ui-meter label="Capacity" value="72" min="0" max="100" low="30" high="80" optimum="100"></ui-meter>`,
    ),
  ],
  "ui-checkbox": [
    sample(
      "States",
      `<ui-checkbox checked>Checked</ui-checkbox>
<ui-checkbox>Unchecked</ui-checkbox>
<ui-checkbox indeterminate>Mixed</ui-checkbox>
<ui-checkbox checked disabled>Disabled</ui-checkbox>`,
    ),
  ],
  "ui-checkbox-group": [sample("Multiple choices", checks)],
  "ui-radio": [sample("Single choice", radio)],
  "ui-radio-group": [sample("Single choice", radio)],
  "ui-switch": [
    sample(
      "States",
      `<ui-switch checked>Notifications</ui-switch>
<ui-switch>Automatic updates</ui-switch>
<ui-switch checked disabled>Managed setting</ui-switch>`,
    ),
  ],
  "ui-textarea": [
    sample(
      "Textarea",
      `<ui-textarea label="Notes" rows="3" placeholder="Add notes"></ui-textarea>`,
    ),
    sample(
      "States",
      `<ui-textarea label="Readonly notes" rows="3" readonly value="Text can still be selected and copied."></ui-textarea>
<ui-textarea label="Unavailable notes" rows="3" disabled value="Unavailable"></ui-textarea>`,
    ),
  ],
  "ui-field": [
    sample("Field", fields),
    sample(
      "Validation",
      `<ui-field label="Project slug" error="This slug is already in use." invalid required>
  <ui-input slot="control" name="slug" value="website"></ui-input>
</ui-field>`,
    ),
  ],
  "ui-fieldset": [
    sample("Related fields", `<ui-fieldset legend="Project">${fields}</ui-fieldset>`),
  ],
  "ui-form": [selectionExamples["ui-form"]![0]!],
  "ui-autocomplete": [
    sample(
      "Suggestions",
      `<ui-autocomplete label="Language" placeholder="Find a language">
  <ui-option value="css">CSS</ui-option><ui-option value="html">HTML</ui-option><ui-option value="typescript">TypeScript</ui-option>
  <span slot="empty">No matches</span>
</ui-autocomplete>`,
    ),
  ],
  "ui-slider": [
    sample("Slider", `<ui-slider label="Volume" value="40" min="0" max="100"></ui-slider>`),
    sample(
      "Range",
      `<ui-slider label="Range" values="[20,80]" min="0" max="100" step="5"></ui-slider>`,
    ),
  ],
  "ui-accordion": [
    sample(
      "Accordion",
      `<ui-accordion mode="single">
  <ui-accordion-item title="What is Mash?" value="about" open>A library of composable web components.</ui-accordion-item>
  <ui-accordion-item title="How do themes work?" value="themes">Semantic tokens follow the nearest theme boundary.</ui-accordion-item>
  <ui-accordion-item title="Can I customize it?" value="custom">Use public slots, CSS parts, and semantic tokens.</ui-accordion-item>
</ui-accordion>`,
    ),
    {
      ...sample(
        "Interactive panels",
        `<ui-accordion mode="multiple" bordered><ui-accordion-item title="What can a panel contain?" value="content" open><div class="mash-stack"><p>Panels can contain inputs, independent controls, nested disclosures, or a composed preview. These controls keep their values when the panel closes.</p><ui-input id="panel-title" label="Preview title" value="Weekly review"></ui-input><ui-switch id="panel-details" checked>Show the description</ui-switch><ui-checkbox id="panel-notify" checked>Notify collaborators</ui-checkbox><ui-card><strong slot="title" id="panel-preview-title">Weekly review</strong><p id="panel-preview-description">A focused place to review the work with your team.</p><output slot="footer" id="panel-preview-state" aria-live="polite">Collaborators will be notified.</output></ui-card></div></ui-accordion-item><ui-accordion-item title="Does closing a panel reset the form?" value="persistence"><p>No. Collapse changes visibility, while your authored content and its state stay in place. Edit the title above, close its panel, and reopen it.</p></ui-accordion-item><ui-accordion-item title="Can I use the keyboard?" value="keyboard"><p>Tab into a header and press Enter or Space to toggle it. Arrow keys move between headers; Tab reaches the controls in an expanded panel.</p></ui-accordion-item></ui-accordion>`,
        "Use the controls to update the preview, then close and reopen the panel to verify its state stays intact.",
      ),
      script: `document.querySelector("#panel-title").addEventListener("input", event => {
  document.querySelector("#panel-preview-title").textContent = event.target.value || "Untitled review";
});
document.querySelector("#panel-details").addEventListener("ui-switch-change", event => {
  document.querySelector("#panel-preview-description").hidden = !event.detail.checked;
});
document.querySelector("#panel-notify").addEventListener("ui-checkbox-change", event => {
  document.querySelector("#panel-preview-state").textContent = event.detail.checked ? "Collaborators will be notified." : "Notifications are off.";
});`,
    },
    sample(
      "Bordered",
      `<ui-accordion bordered><ui-accordion-item title="Account" value="account" open>Manage your profile and sign-in settings.</ui-accordion-item><ui-accordion-item title="Billing" value="billing">View invoices and payment methods.</ui-accordion-item><ui-accordion-item title="Managed setting" value="managed" disabled>Contact your administrator.</ui-accordion-item></ui-accordion>`,
    ),
    sample(
      "Sizes",
      ["xsmall", "small", "medium", "large"]
        .map(
          (size) =>
            `<ui-accordion size="${size}" bordered><ui-accordion-item title="${size}" open>Disclosure content</ui-accordion-item><ui-accordion-item title="Another section">More details</ui-accordion-item></ui-accordion>`,
        )
        .join("\n"),
    ),
    {
      ...sample(
        "Multiple and nested",
        `<ui-accordion id="sections" mode="multiple" bordered><ui-accordion-item title="Workspace" value="workspace" open><ui-icon slot="prefix" name="object.document" label=""></ui-icon><ui-accordion><ui-accordion-item title="Permissions" value="permissions">Only workspace members can edit.</ui-accordion-item><ui-accordion-item title="Sharing" value="sharing">Choose who can view this workspace.</ui-accordion-item></ui-accordion></ui-accordion-item><ui-accordion-item title="Notifications" value="notifications" open>Receive updates about your projects.</ui-accordion-item></ui-accordion><output id="expanded-sections" aria-live="polite">Expanded: workspace, notifications</output>`,
        "Each accordion owns its direct items. Nested disclosures keep their own open state.",
      ),
      script: `const sections = document.querySelector("#sections");
sections.addEventListener("ui-accordion-change", event => {
  if (event.target !== sections) return;
  document.querySelector("#expanded-sections").textContent = "Expanded: " + (event.detail.values.join(", ") || "none");
});`,
    },
  ],
  "ui-menu": [
    sample("Menu", menu),
    sample(
      "Navigation links",
      `<ui-menu label="Resources"><ui-button slot="trigger">Resources</ui-button><ui-menu-item href="https://example.com" target="_blank">Documentation</ui-menu-item><ui-menu-item href="#release-notes">Release notes</ui-menu-item><ui-menu-item href="#archive" disabled>Archive unavailable</ui-menu-item></ui-menu>`,
      "Use href for destinations so native link behavior, including opening in a new tab, stays available.",
    ),
    sample(
      "Density",
      `<div class="mash-row">${menu.replace('<ui-menu label="Edit">', '<ui-menu label="Regular density" density="regular">').replace('slot="trigger">Edit', 'slot="trigger">Regular')}${menu.replace('<ui-menu label="Edit">', '<ui-menu label="Compact density" density="compact">').replace('slot="trigger">Edit', 'slot="trigger">Compact')}</div>`,
    ),
    sample(
      "Labelled command groups",
      `<ui-menu label="View">
  <ui-button slot="trigger">View</ui-button><ui-menu-label>Appearance</ui-menu-label>
  <ui-menu-item kind="radio" value="comfortable" checked>Comfortable</ui-menu-item><ui-menu-item kind="radio" value="compact">Compact</ui-menu-item>
  <ui-separator></ui-separator><ui-menu-item>Export<ui-menu slot="submenu" label="Export"><ui-menu-item value="csv">CSV</ui-menu-item><ui-menu-item value="json">JSON</ui-menu-item></ui-menu></ui-menu-item>
</ui-menu>`,
    ),
    sample(
      "Icons and shortcuts",
      `<ui-menu label="File actions"><ui-button slot="trigger">File actions</ui-button><ui-menu-label>Document</ui-menu-label><ui-menu-item value="new"><ui-icon slot="prefix" name="action.add" label=""></ui-icon>New file<ui-kbd slot="shortcut" shortcut="Primary+N" appearance="plain"></ui-kbd></ui-menu-item><ui-menu-item value="search"><ui-icon slot="prefix" name="action.search" label=""></ui-icon>Find<ui-kbd slot="shortcut" shortcut="Primary+F" appearance="plain"></ui-kbd></ui-menu-item><ui-separator></ui-separator><ui-menu-item value="download"><ui-icon slot="prefix" name="action.download" label=""></ui-icon>Download</ui-menu-item><ui-menu-item value="delete" tone="critical">Delete permanently</ui-menu-item></ui-menu>`,
    ),
    sample(
      "Scrollable commands",
      `<ui-menu label="Recent documents"><ui-button slot="trigger">Recent documents</ui-button><ui-menu-label>Recently opened</ui-menu-label>${Array.from({ length: 24 }, (_, i) => `<ui-menu-item value="file-${i}">Document ${i + 1}</ui-menu-item>`).join("")}</ui-menu>`,
      "Long menus scroll inside the popup and keep the active command visible.",
    ),
  ],
  "ui-context-menu": [
    sample(
      "Context menu",
      `<ui-context-menu label="Actions">
  <div slot="trigger" class="mash-panel" tabindex="0">Right-click or press Shift+F10</div>
  <ui-menu-item value="copy">Copy</ui-menu-item><ui-menu-item value="rename">Rename</ui-menu-item><ui-menu-item value="delete" tone="critical">Delete</ui-menu-item>
</ui-context-menu>`,
    ),
  ],
  "ui-menubar": [
    sample(
      "Menubar",
      `<ui-menubar label="Application" data-mash-size="small">${menu}<ui-menu label="View"><ui-button slot="trigger">View</ui-button><ui-menu-item kind="checkbox" checked>Sidebar</ui-menu-item></ui-menu></ui-menubar>`,
    ),
  ],
  "ui-dialog": [
    sample(
      "Dialog",
      `<ui-dialog label="Edit project">
  <ui-button slot="trigger">Edit project</ui-button><strong slot="title">Edit project</strong><span slot="description">Update the project details.</span>
  ${fields}
  <ui-button slot="close" size="small">Done</ui-button>
</ui-dialog>`,
    ),
  ],
  "ui-alert-dialog": [
    sample(
      "Confirmation",
      `<ui-alert-dialog label="Delete project">
  <ui-button slot="trigger" tone="critical">Delete project</ui-button><strong slot="title">Delete project?</strong><span slot="description">This action cannot be undone.</span>
  <ui-button slot="cancel" size="small">Cancel</ui-button><ui-button slot="confirm" size="small" tone="critical">Delete</ui-button>
</ui-alert-dialog>`,
    ),
  ],
  "ui-popover": [
    sample(
      "Popover",
      `<ui-popover label="Dimensions"><ui-button slot="trigger">Dimensions</ui-button><strong slot="title">Dimensions</strong><span slot="description">Set the size of the object.</span><ui-field label="Width"><ui-input slot="control" type="number" value="320"></ui-input></ui-field><ui-button slot="close" size="small">Done</ui-button></ui-popover>`,
    ),
  ],
  "ui-table": [sample("Table", table)],
  "ui-tree": treeExamples,
  "ui-pagination": [
    {
      ...sample(
        "Pagination",
        `<ui-card><strong slot="title">Documents</strong><ol id="page-results" class="mash-list" start="11"></ol><div slot="footer" class="mash-stack"><output id="page-status" aria-live="polite"></output><ui-pagination id="document-pages" total-pages="12" current-page="3" label="Document pages"></ui-pagination></div></ui-card>`,
        "The owner updates the current page and its content together. First and last pages disable the corresponding navigation control.",
      ),
      script: `const pagination = document.querySelector("#document-pages");
const results = document.querySelector("#page-results");
const documents = Array.from({ length: 60 }, (_, index) => "Document " + (index + 1));
const pageSize = 5;
function renderPage() {
  const start = (pagination.currentPage - 1) * pageSize;
  results.start = start + 1;
  results.replaceChildren(...documents.slice(start, start + pageSize).map(name => {
    const row = document.createElement("li");
    row.textContent = name;
    return row;
  }));
  document.querySelector("#page-status").textContent = "Showing " + (start + 1) + "–" + Math.min(start + pageSize, documents.length) + " of " + documents.length;
}
pagination.addEventListener("ui-page-change", event => {
  pagination.currentPage = event.detail.page;
  renderPage();
});
renderPage();`,
    },
    {
      ...sample(
        "Page windows",
        `<div class="mash-stack"><span>Start</span><ui-pagination current-page="1" total-pages="100" visible-pages="5" label="Start of results"></ui-pagination><span>Middle</span><ui-pagination current-page="50" total-pages="100" visible-pages="7" label="Middle of results"></ui-pagination><span>End</span><ui-pagination current-page="100" total-pages="100" visible-pages="5" label="End of results"></ui-pagination><span>Unavailable</span><ui-pagination current-page="3" total-pages="12" disabled label="Unavailable results"></ui-pagination></div>`,
        "Ellipses keep long result sets compact. Each enabled paginator keeps its own page state.",
      ),
      script: `document.querySelectorAll("ui-pagination").forEach(pagination => {
  pagination.addEventListener("ui-page-change", event => { pagination.currentPage = event.detail.page; });
});`,
    },
  ],
  "ui-link": [
    sample(
      "Links",
      `<div class="mash-row"><ui-link href="#overview">Overview</ui-link><ui-link href="#settings" variant="quiet">Settings</ui-link><ui-link disabled>Unavailable</ui-link></div>`,
    ),
  ],
  ...navigationExamples,
  "ui-dock": refinements["ui-dock"]!,
  ...displayExamples,
  ...feedbackExamples,
  ...layoutPatternExamples,
  ...editorExamples,
  ...collectionExamples,
  ...dateExamples,
  ...colorExamples,
};

for (const [tag, examples] of Object.entries(patternExamples)) {
  if (controlExamples[tag]) continue;
  componentExamples[tag] = [...(componentExamples[tag] ?? []), ...examples];
}

for (const [tag, examples] of Object.entries(menuExamples)) {
  componentExamples[tag] = [...(componentExamples[tag] ?? []), ...examples];
}

mergeSelectionExamples(componentExamples, true);

for (const [tag, examples] of Object.entries(tableWorkflowExamples))
  componentExamples[tag] = [...(componentExamples[tag] ?? []), ...examples];

mergeControlStateExamples(componentExamples, true);

for (const [tag, examples] of Object.entries(workflowExamples)) {
  componentExamples[tag] = [...(componentExamples[tag] ?? []), ...examples];
}

for (const [tag, examples] of Object.entries(menuExtensionExamples)) {
  if (controlExamples[tag]) continue;
  componentExamples[tag] = [...(componentExamples[tag] ?? []), ...examples];
}

for (const [tag, examples] of Object.entries(navigationOverlayExamples)) {
  componentExamples[tag] = [...(componentExamples[tag] ?? []), ...examples];
}

for (const [tag, examples] of Object.entries(finalControlExamples)) {
  if (controlExamples[tag]) continue;
  componentExamples[tag] = [...(componentExamples[tag] ?? []), ...examples];
}

componentExamples["ui-combobox"] = controlExamples["ui-combobox"]!;
