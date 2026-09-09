import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";
import { motionExamples } from "./motion.js";

const pane = (text: string) => `<div class="mash-panel">${text}</div>`;

export const utilityExamples: Record<string, CatalogExample[]> = {
  "ui-gesture-binding": [
    {
      ...sample(
        "Shortcut binding",
        `<ui-button id="shortcut-target">Run action</ui-button><ui-gesture-binding for="shortcut-target" gesture="key" command="sample.run" shortcut="Primary+Enter"></ui-gesture-binding><ui-kbd command="sample.run" shortcut="Primary+Enter"></ui-kbd><output id="gesture-result">Focus the button and use the shortcut.</output>`,
      ),
      script: `document.querySelector("#shortcut-target").addEventListener("mash-command", () => { document.querySelector("#gesture-result").textContent = "Action received"; });`,
    },
  ],
  "ui-clipboard": [
    sample(
      "Copy",
      `<div class="mash-row"><code>npm install @mash/ui</code><ui-clipboard value="npm install @mash/ui" label="Copy install command"></ui-clipboard></div>`,
    ),
  ],
  "ui-motion": motionExamples,
  "ui-stagger": [motionExamples[4]!],
  "ui-reveal": [
    {
      ...sample(
        "Reveal",
        `<ui-button id="toggle-reveal" size="small">Toggle details</ui-button><ui-reveal id="details" open>${pane("Measured content expands and collapses with its natural height.")}</ui-reveal>`,
      ),
      script: `document.querySelector("#toggle-reveal").addEventListener("click", () => {
  const details = document.querySelector("#details");
  details.open = !details.open;
});`,
    },
  ],
  "ui-draggable": [
    sample(
      "Drag",
      `<div class="mash-panel" style="min-height: 18rem; position: relative"><ui-draggable containment="parent"><ui-card><strong slot="title">Move me</strong><p>Drag this card within the canvas.</p></ui-card></ui-draggable></div>`,
    ),
  ],
  "ui-path": [
    sample(
      "Breadcrumb",
      `<ui-path path="/workspace/projects/website"><span slot="title">Website</span></ui-path>`,
    ),
    sample(
      "Overflow",
      `<ui-path path="/workspace/projects/website/design/components/buttons"><span slot="title">Buttons</span></ui-path>`,
    ),
  ],
  "ui-navigation-menu": [
    sample(
      "Navigation",
      `<ui-navigation-menu label="Project"><div class="mash-row"><ui-link href="#overview">Overview</ui-link><ui-link href="#activity">Activity</ui-link><ui-link href="#settings">Settings</ui-link></div></ui-navigation-menu>`,
    ),
    sample(
      "Sidebar",
      `<ui-navigation-menu label="Workspace"><div class="mash-stack"><strong>Workspace</strong><ui-link href="#inbox">Inbox</ui-link><ui-link href="#projects">Projects</ui-link><ui-collapsible open><span slot="trigger">Recent</span><div class="mash-stack"><ui-link href="#website">Website</ui-link><ui-link href="#docs">Documentation</ui-link></div></ui-collapsible><ui-separator></ui-separator><ui-link href="#settings">Settings</ui-link></div></ui-navigation-menu>`,
    ),
  ],
  "ui-resizable": [
    sample(
      "Split panels",
      `<ui-resizable label="Resizable panels"><ui-resizable-panel size="220" min="100">${pane("Sidebar")}</ui-resizable-panel><ui-resizable-handle label="Resize sidebar"></ui-resizable-handle><ui-resizable-panel min="160">${pane("Content")}</ui-resizable-panel></ui-resizable>`,
    ),
    sample(
      "Vertical",
      `<ui-resizable orientation="vertical" label="Vertical panels" style="height: 20rem"><ui-resizable-panel size="140" min="60">${pane("Editor")}</ui-resizable-panel><ui-resizable-handle label="Resize editor"></ui-resizable-handle><ui-resizable-panel min="60">${pane("Console")}</ui-resizable-panel></ui-resizable>`,
    ),
  ],
  "ui-scroll-area": [
    sample(
      "Scrolling",
      `<ui-scroll-area label="Notes" style="height: 20rem"><div class="mash-stack">${Array.from({ length: 16 }, (_, i) => pane(`Note ${i + 1}`)).join("\n")}</div></ui-scroll-area>`,
    ),
  ],
  "ui-intl-formatter": [
    sample(
      "Formats",
      `<div class="mash-row mash-wrap"><ui-intl-formatter kind="currency" value="1299.5" currency="USD" locale="en-US"></ui-intl-formatter><ui-intl-formatter kind="date" value="2026-09-08" locale="en-US"></ui-intl-formatter><ui-intl-formatter kind="number" value="1234567" locale="de-DE"></ui-intl-formatter></div>`,
    ),
  ],
  "ui-file-upload": [
    {
      ...sample(
        "Files",
        `<ui-file-upload id="files" label="Choose files" multiple max-files="4"><ui-icon slot="prefix" name="action.upload" label=""></ui-icon>Choose files<span slot="description">Up to four files</span><output slot="selection" id="selection">No files selected</output></ui-file-upload>`,
      ),
      script: `const files = document.querySelector("#files");
files.addEventListener("change", () => {
  document.querySelector("#selection").textContent = [...files.files].map(file => file.name).join(", ") || "No files selected";
});`,
    },
  ],
  "sh-triptych": [
    sample(
      "Layout",
      `<sh-triptych><div slot="sidebar" class="mash-stack"><strong>Workspace</strong><ui-link href="#projects">Projects</ui-link><ui-link href="#settings">Settings</ui-link></div><ui-path slot="locator" path="/projects/website"><span slot="title">Website</span></ui-path><div slot="content" class="mash-panel">Page content</div><strong slot="inspector-locator">Properties</strong><ui-field slot="inspector" label="Title"><ui-input slot="control" value="Website"></ui-input></ui-field></sh-triptych>`,
    ),
  ],
  "sh-tree": [
    sample(
      "History",
      `<sh-tree><ui-tree slot="tree" label="History"><ui-tree-item value="head" title="Update components" current selected data-shrine-lane="0" data-shrine-parents="previous"></ui-tree-item><ui-tree-item value="previous" title="Review foundations" data-shrine-lane="0" data-shrine-parents="base"></ui-tree-item><ui-tree-item value="base" title="Create project" data-shrine-lane="0"></ui-tree-item></ui-tree></sh-tree>`,
    ),
  ],
};
