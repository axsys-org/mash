import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const pane = (text: string) => `<div class="mash-panel">${text}</div>`;
const rows = Array.from(
  { length: 40 },
  (_, index) =>
    `<ui-virtual-item size="48"><div class="mash-row"><ui-avatar size="small" alt="Member ${index + 1}">${String(index + 1).padStart(2, "0")}</ui-avatar><span>Member ${index + 1}</span></div></ui-virtual-item>`,
).join("\n");
const swatches = `<ui-color-swatch value="#3b82f6">Blue</ui-color-swatch><ui-color-swatch value="#22c55e">Green</ui-color-swatch><ui-color-swatch value="#a855f7">Purple</ui-color-swatch>`;

export const utilityExamples: Record<string, CatalogExample[]> = {
  "ui-image": [
    sample(
      "Image",
      `<ui-image src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 320'%3E%3Crect width='640' height='320' fill='%23e2e8f0'/%3E%3Cpath d='M0 280L190 70 370 260 500 140 640 320H0Z' fill='%2394a3b8'/%3E%3C/svg%3E" alt="Illustrated mountain landscape" width="640" height="320"><span slot="placeholder">Loading…</span><span slot="error">Image unavailable</span></ui-image>`,
    ),
  ],
  "ui-gesture-binding": [
    {
      ...sample(
        "Shortcut binding",
        `<ui-button id="shortcut-target">Run action</ui-button><ui-gesture-binding for="shortcut-target" gesture="key" command="sample.run" shortcut="Primary+Enter"></ui-gesture-binding><ui-kbd command="sample.run" shortcut="Primary+Enter"></ui-kbd><output id="gesture-result">Focus the button and use the shortcut.</output>`,
      ),
      script: `document.querySelector("#shortcut-target").addEventListener("mash-command", () => { document.querySelector("#gesture-result").textContent = "Action received"; });`,
    },
  ],
  "ui-label": [
    sample(
      "Labels",
      `<ui-label text="Project name"></ui-label><ui-label text="Description" secondary="Optional"></ui-label>`,
    ),
  ],
  "ui-clipboard": [
    sample(
      "Copy",
      `<div class="mash-row"><code>npm install @mash/ui</code><ui-clipboard value="npm install @mash/ui" label="Copy install command"></ui-clipboard></div>`,
    ),
  ],
  "ui-icon": [
    sample(
      "Icons",
      `<div class="mash-row mash-wrap"><ui-icon name="action.search" label="Search"></ui-icon><ui-icon name="action.add" label="Add"></ui-icon><ui-icon name="action.dismiss" label="Close"></ui-icon><ui-icon name="action.download" label="Download"></ui-icon><ui-icon name="navigation.forward" label="Forward"></ui-icon><ui-icon name="navigation.back" label="Back"></ui-icon><ui-icon name="action.confirm" label="Confirm"></ui-icon></div>`,
    ),
  ],
  "ui-motion": [
    {
      ...sample(
        "Transitions",
        `<ui-motion id="motion" motion="fade" state="entering">${pane("Content in motion")}</ui-motion><ui-button id="replay" size="small">Replay</ui-button>`,
      ),
      script: `const motion = document.querySelector("#motion");
document.querySelector("#replay").addEventListener("click", () => {
  motion.state = "exiting";
  setTimeout(() => { motion.state = "entering"; }, 300);
});`,
    },
  ],
  "ui-stagger": [
    sample(
      "Stagger",
      `<ui-stagger step="80"><ui-motion motion="fade" state="entering">${pane("First")}</ui-motion><ui-motion motion="fade" state="entering">${pane("Second")}</ui-motion><ui-motion motion="fade" state="entering">${pane("Third")}</ui-motion></ui-stagger>`,
    ),
  ],
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
  "ui-shimmer": [sample("Shimmer", `<ui-shimmer>Preparing your response…</ui-shimmer>`)],
  "ui-skeleton": [
    sample(
      "Shapes",
      `<div class="mash-row"><ui-skeleton style="width: 2.5rem; height: 2.5rem; border-radius: 50%"></ui-skeleton><div class="mash-stack mash-fill"><ui-skeleton style="height: 1rem; width: 100%"></ui-skeleton><ui-skeleton style="height: 1rem; width: 100%"></ui-skeleton></div></div>`,
    ),
  ],
  "ui-typeset": [
    sample(
      "Text",
      `<ui-typeset><h2>A place for your ideas</h2><p>Readable type, clear structure, and <strong>useful emphasis</strong>.</p><ul><li>Keep paragraphs short.</li><li>Give links meaningful names.</li></ul><p><ui-link href="#usage">Read the usage guide</ui-link></p></ui-typeset>`,
    ),
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
  "ui-editor": [
    sample(
      "Source",
      `<ui-editor language="html" label="Component source" value="&lt;ui-button variant=&quot;primary&quot;&gt;&#10;  Save changes&#10;&lt;/ui-button&gt;"><span slot="status">HTML · 3 lines</span></ui-editor>`,
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
  "ui-color-picker": [
    sample(
      "Color",
      `<ui-color-picker label="Accent color" value="#3b82f6"><ui-button slot="trigger">Choose color</ui-button>${swatches}<ui-slider slot="hue" min="0" max="360" step="1" label="Hue"></ui-slider><ui-slider slot="saturation" min="0" max="100" label="Saturation"></ui-slider><ui-slider slot="lightness" min="0" max="100" label="Lightness"></ui-slider><ui-slider slot="alpha" min="0" max="100" label="Alpha"></ui-slider><ui-input slot="hex" label="Hex color"></ui-input><ui-button slot="close" size="small">Done</ui-button></ui-color-picker>`,
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
  "ui-virtual-list": [
    sample("Members", `<ui-virtual-list label="Members" overscan="3">${rows}</ui-virtual-list>`),
  ],
  "ui-scroll-area": [
    sample(
      "Scrolling",
      `<ui-scroll-area label="Notes" style="height: 20rem"><div class="mash-stack">${Array.from({ length: 16 }, (_, i) => pane(`Note ${i + 1}`)).join("\n")}</div></ui-scroll-area>`,
    ),
  ],
  "ui-toast-stack": [
    sample(
      "Notifications",
      `<ui-toast-stack><ui-toast open duration="0" tone="positive"><strong slot="title">Upload complete</strong>Three files are ready.</ui-toast><ui-toast open duration="0"><strong slot="title">Invitation sent</strong>Alex can now join your workspace.</ui-toast></ui-toast-stack>`,
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
