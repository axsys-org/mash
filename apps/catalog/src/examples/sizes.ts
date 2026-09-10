import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const toolbar = `<ui-toolbar label="Workspace actions" class="mash-wrap">
  <ui-button id="size-new"><ui-icon slot="prefix" name="action.add" label=""></ui-icon>New document</ui-button>
  <ui-input id="size-search" label="Find documents" placeholder="Find documents…"></ui-input>
  <ui-select id="size-status" label="Document status" value="all"><ui-option value="all">All documents</ui-option><ui-option value="draft">Drafts</ui-option><ui-option value="published">Published</ui-option></ui-select>
  <ui-menu label="Document actions"><ui-button slot="trigger" dropdown-caret>Actions</ui-button><ui-menu-item value="duplicate">Duplicate document</ui-menu-item><ui-menu-item value="archive">Archive document</ui-menu-item></ui-menu>
</ui-toolbar>`;

export const sizeExamples: CatalogExample[] = [
  {
    ...sample(
      "Size context",
      `<style>.size-workspace{width:100%;display:grid;gap:var(--space-group-block)}.size-workspace ui-toolbar{width:100%}.size-workspace ui-toolbar::part(root){flex-wrap:wrap;width:100%}.size-workspace ui-toolbar ui-button{flex:none}.size-workspace ui-input{flex:1 1 12rem}.size-workspace ui-select{min-width:9rem}.size-heading{font-size:var(--mash-size-display);font-weight:var(--type-heading-font-weight);margin:0}.size-caption{font-size:var(--mash-size-caption);color:var(--color-text-muted)}.size-summary{margin:0;font-size:var(--mash-size-body)}.size-row{display:flex;align-items:center;justify-content:space-between;gap:var(--mash-size-gap);min-height:var(--mash-size-control)}</style>
<div class="mash-row mash-wrap"><ui-select id="size-choice" label="Workspace size" value="default"><ui-option value="default">Default · 36px</ui-option><ui-option value="compact">Compact · 28px</ui-option></ui-select><output id="size-result" aria-live="polite">Default · edits stay in place</output></div>
<section id="size-workspace" data-mash-size="default" class="size-workspace mash-panel" aria-label="Resizable workspace">
  <div><p class="size-heading">Documents</p><span class="size-caption">Everything your team is working on.</span></div>
  ${toolbar}
  <ui-tabs variant="segmented" value="recent" label="Document view"><ui-tab slot="tab" value="recent">Recent</ui-tab><ui-tab slot="tab" value="shared">Shared</ui-tab><ui-tab slot="tab" value="saved">Saved</ui-tab><ui-tab-panel slot="panel" value="recent"><ui-card><strong slot="title">Release checklist</strong><span slot="description">Edited just now · Design team</span><ui-badge slot="value" tone="positive">Ready</ui-badge><p slot="content" class="size-summary">A considered first release, with room to grow.</p><div slot="footer" class="size-row"><ui-switch label="Available offline" checked></ui-switch><ui-button variant="primary" id="size-open">Open document</ui-button></div></ui-card></ui-tab-panel><ui-tab-panel slot="panel" value="shared">Shared documents appear here.</ui-tab-panel><ui-tab-panel slot="panel" value="saved">Save a document to keep it close.</ui-tab-panel></ui-tabs>
  <ui-accordion bordered><ui-accordion-item title="What changes with the size?" open><p class="size-summary">Control height, text, icons, spacing, menu rows, and segmented tabs share one step. Change the size above while editing the search field—its value and the selected tab stay intact.</p></ui-accordion-item></ui-accordion>
</section>`,
      "One attribute sizes the composed region. Open Actions or the status selector to compare popup rows with their triggers.",
    ),
    script: `const workspace=document.querySelector("#size-workspace"), result=document.querySelector("#size-result");document.querySelector("#size-choice").addEventListener("ui-select-change",event=>{workspace.dataset.mashSize=event.detail.value;result.textContent=(event.detail.value==="compact"?"Compact":"Default")+" · edits stay in place";});let count=0;document.querySelector("#size-new").addEventListener("click",()=>{result.textContent="New document "+(++count)+" created";});document.querySelector("#size-open").addEventListener("click",()=>{result.textContent="Release checklist opened";});workspace.addEventListener("ui-menu-select",event=>{result.textContent=event.detail.value==="archive"?"Document archived":"Document duplicated";});`,
  },
  sample(
    "Nested size overrides",
    `<div class="mash-stack mash-panel" data-mash-size="compact" style="width:100%">
  <strong>Compact workspace</strong><div class="mash-row mash-wrap"><ui-button>Inherited · 28px</ui-button><ui-button size="default" variant="primary">Pinned · 36px</ui-button><ui-input size="default" label="Pinned default input" placeholder="Always default"></ui-input></div>
  <ui-card size="default"><strong slot="title">Default detail panel</strong><span slot="description">A nested boundary restores every role, including spacing and type.</span><div slot="content" class="mash-row mash-wrap"><ui-button>Inherited · 36px</ui-button><ui-button size="compact">Pinned · 28px</ui-button><ui-switch size="compact" label="Compact toggle" checked></ui-switch></div></ui-card>
  <div class="mash-row mash-wrap"><ui-button>Back to compact · 28px</ui-button><ui-badge>Scoped locally</ui-badge></div>
</div>`,
    "Use data-mash-size on any region, or size on supported components. The closest boundary wins; per-instance sizes override their surrounding context.",
  ),
  sample(
    "Type and spacing roles",
    `<div class="mash-grid" style="width:100%">${["default", "compact"].map((step) => `<section data-mash-size="${step}" class="mash-panel mash-stack"><strong>${step === "default" ? "Default" : "Compact"}</strong>${["display", "title", "subtitle", "body", "caption"].map((role) => `<div style="font-size:var(--mash-size-${role});line-height:1.4">${role[0]!.toUpperCase() + role.slice(1)} <span style="color:var(--color-text-muted)">Aa</span></div>`).join("")}<div class="mash-row"><ui-icon name="object.folder" label="Folder"></ui-icon><span>Icon and text stay balanced</span></div></section>`).join("")}</div>`,
    "Compose custom content with the same public CSS roles. All dimensions use rem and respect the root font size.",
  ),
];
