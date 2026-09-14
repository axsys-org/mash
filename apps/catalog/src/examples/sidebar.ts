import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";
import { sidebarWorkbench, sidebarWorkbenchScript } from "./sidebar-workspace.js";

const style = `<style>
.sidebar-demo{height:38rem;width:100%;border:1px solid var(--color-border);border-radius:var(--radius-container);overflow:clip}.sidebar-demo>ui-sidebar{height:100%}.sidebar-header,.sidebar-footer{display:grid;gap:var(--mash-size-gap)}.sidebar-account::part(control){justify-content:start;width:100%}.sidebar-account{width:100%}.sidebar-header ui-input{width:100%}.sidebar-row{display:flex;align-items:center;gap:var(--mash-size-gap);min-width:0}.sidebar-row>strong{flex:1;min-width:0}.sidebar-row ui-avatar{flex:none}.sidebar-small{font-size:var(--mash-size-caption);color:var(--color-text-muted)}.sidebar-page{display:grid;gap:1rem;max-width:42rem;margin:auto}.sidebar-page{padding:1.5rem 1rem}.sidebar-page [data-document-title]::part(control){border:0;background:transparent;box-shadow:none;font-size:1.75rem;font-weight:550;letter-spacing:-.025em;padding:0}.sidebar-page [data-editor]::part(control){border:0;background:transparent;box-shadow:none;font-size:.9375rem;line-height:1.75;padding:0}.sidebar-page [data-result]{font-size:.75rem;color:var(--color-text-muted)}.sidebar-page ui-textarea{width:100%}.sidebar-page ui-textarea::part(control){min-height:12rem;resize:vertical}.sidebar-controls{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;width:100%}.sidebar-controls ui-select{min-width:8rem}.sidebar-footer ui-alert::part(root){padding:.625rem}.sidebar-menu-actions{display:flex;align-items:center;gap:2px}.sidebar-menu-actions ui-button::part(control){padding:0;min-width:24px;min-height:24px}.sidebar-menu-actions ui-icon{font-size:16px}.sidebar-demo ui-tree-item::part(label-content){max-width:100%}.sidebar-empty{padding:1rem;color:var(--color-text-muted)}.sidebar-horizontal{display:flex;align-items:center;gap:.5rem}.sidebar-horizontal ui-menu{flex:1}.sidebar-horizontal .sidebar-account{width:100%}
</style>`;
const menu = `<ui-menu><ui-button class="sidebar-account" slot="trigger" dropdown-caret><ui-icon slot="prefix" name="object.folder" label=""></ui-icon><span data-workspace-name>Acme workspace</span></ui-button><ui-menu-item value="Studio">Studio</ui-menu-item><ui-menu-item value="Research">Research</ui-menu-item><ui-menu-item value="Personal">Personal</ui-menu-item></ui-menu>`;
const header = (horizontal = false) =>
  `<div slot="header" class="sidebar-header"><div class="${horizontal ? "sidebar-horizontal" : ""}">${menu}${horizontal ? '<ui-button data-new size="compact" aria-label="New document"><ui-icon name="action.add" label=""></ui-icon></ui-button>' : ""}</div><ui-input data-search label="Search navigation" placeholder="Search documents…"></ui-input>${horizontal ? "" : '<ui-button data-new variant="ghost"><ui-icon slot="prefix" name="action.add" label=""></ui-icon>New document</ui-button>'}</div>`;
const action = `<span slot="actions" class="sidebar-menu-actions"><ui-menu><ui-button slot="trigger" size="compact" variant="ghost" aria-label="Document actions"><ui-icon name="navigation.more.horizontal" label=""></ui-icon></ui-button><ui-menu-item value="rename">Rename</ui-menu-item><ui-menu-item value="duplicate">Duplicate</ui-menu-item><ui-menu-item value="archive">Archive</ui-menu-item></ui-menu></span>`;
const documents = [
  "Release checklist",
  "Navigation study",
  "Team notes",
  "Interaction details",
  "A longer document title that should remain readable",
  "Accessibility review",
];
const navigation = (rich = false) =>
  `<nav slot="navigation" class="mash-sidebar-nav" aria-label="Workspace documents"><ui-tree label="Workspace documents"><ui-tree-item kind="folder" title="Workspace" value="workspace" expanded>${documents.map((title, index) => `<ui-tree-item slot="children" kind="file" title="${title}" value="doc-${index}" ${index === 0 ? "selected current" : ""}><ui-icon slot="icon" name="object.document" label=""></ui-icon>${rich ? action : ""}</ui-tree-item>`).join("")}</ui-tree-item><ui-tree-item kind="folder" title="Shared" value="shared"><ui-tree-item slot="children" kind="folder" title="Design system" value="design"><ui-tree-item slot="children" kind="file" title="Tokens and materials" value="tokens"></ui-tree-item><ui-tree-item slot="children" kind="file" title="Component inventory" value="inventory"></ui-tree-item></ui-tree-item><ui-tree-item slot="children" kind="file" title="Planning notes" value="planning"></ui-tree-item></ui-tree-item></ui-tree><p class="sidebar-empty" hidden>No matching documents.</p></nav>`;
const footer = (callout = false, horizontal = false) =>
  `<div slot="footer" class="sidebar-footer">${callout ? '<ui-alert tone="neutral" closable><strong slot="title">A little more room</strong>Resize the edge to find your preferred width.</ui-alert>' : ""}<div class="${horizontal ? "sidebar-horizontal" : "sidebar-row"}"><ui-menu><ui-button slot="trigger" class="sidebar-account" variant="ghost" dropdown-caret><ui-avatar slot="prefix" alt="Alex Morgan" size="small"></ui-avatar>Alex Morgan</ui-button><ui-menu-item value="profile">Your profile</ui-menu-item><ui-menu-item value="preferences">Preferences</ui-menu-item></ui-menu><ui-button data-settings size="compact" variant="ghost" aria-label="Workspace settings"><ui-icon name="action.settings" label=""></ui-icon></ui-button></div></div>`;
const page = `<strong slot="content-header" data-title>Release checklist</strong><div class="sidebar-page"><div class="sidebar-row"><span class="sidebar-small">WORKSPACE / NOTES</span><span class="sidebar-small">Private draft</span></div><ui-input data-document-title label="Document title" value="Release checklist"></ui-input><ui-textarea data-editor label="Document notes" value="Keep the first release focused.\n\nMake navigation clear, preserve drafts, and give every control room to breathe."></ui-textarea><section data-preferences hidden class="mash-stack"><strong>Workspace preferences</strong><ui-input label="Display name" value="Alex Morgan"></ui-input><ui-switch label="Activity notifications" checked></ui-switch></section><output data-result aria-live="polite">Your draft stays here when the sidebar closes.</output></div>`;
const workspace = (attrs = "", rich = false, horizontal = false, callout = false) =>
  `<div class="sidebar-demo"><ui-sidebar data-mash-size="default" mobile-breakpoint="520" persist="false" ${attrs}>${header(horizontal)}${navigation(rich)}${footer(callout, horizontal)}${page}</ui-sidebar></div>`;
const script = `document.querySelectorAll("ui-sidebar:not(#workbench)").forEach(sidebar=>{
 const result=sidebar.querySelector("[data-result]"), title=sidebar.querySelector("[data-document-title]"), editor=sidebar.querySelector("[data-editor]"), tree=sidebar.querySelector("ui-tree"), drafts=new Map();let active="doc-0",count=0;
 const report=text=>{if(result)result.textContent=text;};
 const select=(value,label)=>{if(editor&&title)drafts.set(active,{title:title.value,body:editor.value});active=value;tree?.querySelectorAll("ui-tree-item").forEach(item=>{item.selected=item.value===value;item.current=item.selected;});const saved=drafts.get(value);if(title)title.value=saved?.title||label;if(editor)editor.value=saved?.body||"Start writing here…";sidebar.querySelectorAll("[data-title],[data-page-title]").forEach(node=>node.textContent=saved?.title||label);report("Opened "+label);if(sidebar.mobile)sidebar.hide();};
 tree?.addEventListener("ui-tree-toggle",event=>{const item=[...tree.querySelectorAll("ui-tree-item")].find(node=>node.value===event.detail.value);if(item)item.expanded=event.detail.expanded;});
 tree?.addEventListener("ui-tree-select",event=>{const item=[...tree.querySelectorAll("ui-tree-item")].find(node=>node.value===event.detail.value);if(item&&item.kind!=="folder")select(item.value,item.title);});
 title?.addEventListener("input",()=>{sidebar.querySelectorAll("[data-title],[data-page-title]").forEach(node=>node.textContent=title.value);const item=[...tree.querySelectorAll("ui-tree-item")].find(node=>node.value===active);if(item)item.title=title.value;report("Title updated");});
 sidebar.querySelector("[data-search]")?.addEventListener("input",event=>{const query=event.target.value.toLowerCase();let matches=0;tree.querySelectorAll('ui-tree-item[kind="file"]').forEach(item=>{item.hidden=!item.title.toLowerCase().includes(query);if(!item.hidden)matches++;});if(query)tree.querySelectorAll('ui-tree-item[kind="folder"]').forEach(item=>item.expanded=true);sidebar.querySelector(".sidebar-empty").hidden=matches!==0;});
 sidebar.querySelectorAll("[data-new]").forEach(button=>button.addEventListener("click",()=>{const item=document.createElement("ui-tree-item");item.slot="children";item.kind="file";item.value="new-"+(++count);item.title="Untitled "+count;const folder=tree.querySelector('ui-tree-item[value="workspace"]');folder.append(item);folder.expanded=true;select(item.value,item.title);}));
 sidebar.addEventListener("ui-menu-select",event=>{const value=event.detail.value;if(["Studio","Research","Personal"].includes(value)){sidebar.querySelector("[data-workspace-name]").textContent=value;report("Switched to "+value);}else if(value==="archive"){const item=event.target.closest("ui-tree-item");if(item){item.hidden=true;if(item.value===active){const next=[...tree.querySelectorAll('ui-tree-item[kind="file"]')].find(node=>!node.hidden);if(next)select(next.value,next.title);}report(item.title+" archived");}}else if(value==="duplicate"){const item=event.target.closest("ui-tree-item");if(item){const copy=item.cloneNode(true);copy.value="copy-"+(++count);copy.title=item.title+" copy";copy.selected=false;copy.current=false;drafts.set(copy.value,{title:copy.title,body:item.value===active?editor.value:drafts.get(item.value)?.body||"Start writing here…"});item.parentElement.append(copy);report("Duplicated "+item.title);}}else if(value==="rename"){const item=event.target.closest("ui-tree-item");if(item)select(item.value,item.title);title?.focus();}else {const settings=sidebar.querySelector("[data-preferences]");if(settings){settings.hidden=false;settings.scrollIntoView({block:"nearest"});}report(value==="profile"?"Edit your display name":"Workspace preferences opened");}});

 sidebar.querySelector("[data-settings]")?.addEventListener("click",()=>{const settings=sidebar.querySelector("[data-preferences]");if(settings){settings.hidden=!settings.hidden;report(settings.hidden?"Settings closed":"Workspace settings opened");}});
 sidebar.addEventListener("ui-sidebar-resize",event=>report("Sidebar width · "+Math.round(event.detail.width)+"px"));
});`;
const demo = (name: string, code: string, description: string, extra = ""): CatalogExample => ({
  ...sample(name, style + code, description),
  script: script + extra,
  stageLayout: "fill",
});

export const sidebarExamples: CatalogExample[] = [
  demo(
    "Workspace",
    `<div class="sidebar-controls"><ui-select id="sidebar-variant" label="Surface" value="sidebar"><ui-option value="sidebar">Sidebar</ui-option><ui-option value="floating">Floating</ui-option><ui-option value="inset">Inset</ui-option></ui-select><ui-select id="sidebar-side" label="Side" value="left"><ui-option value="left">Left</ui-option><ui-option value="right">Right</ui-option></ui-select><ui-select id="sidebar-peek" label="Collapsed edge" value="none"><ui-option value="none">No peek</ui-option><ui-option value="hover">Hover peek</ui-option><ui-option value="click">Click peek</ui-option></ui-select><ui-select id="sidebar-density" label="Size" value="default"><ui-option value="default">Default</ui-option><ui-option value="compact">Compact</ui-option></ui-select><ui-switch id="sidebar-rail" label="Resize rail" checked></ui-switch><ui-switch id="sidebar-border" label="Border" checked></ui-switch></div>${sidebarWorkbench}`,
    "Start a conversation, switch projects, or search with the header action. Drag the inner edge to resize; [ toggles navigation without interrupting typing.",
    `const layout=document.querySelector("ui-sidebar");document.querySelector("#sidebar-density").addEventListener("ui-select-change",event=>layout.dataset.mashSize=event.detail.value);["variant","side","peek"].forEach(name=>document.querySelector("#sidebar-"+name).addEventListener("ui-select-change",event=>layout[name]=event.detail.value));document.querySelector("#sidebar-rail").addEventListener("ui-switch-change",event=>layout.rail=event.detail.checked);document.querySelector("#sidebar-border").addEventListener("ui-switch-change",event=>layout.bordered=event.detail.checked);` +
      sidebarWorkbenchScript,
  ),
  ...(["floating", "inset"] as const).map((variant) =>
    demo(
      variant === "floating" ? "Floating surface" : "Inset content",
      workspace(`variant="${variant}"`, false, false, true),
      variant === "floating"
        ? "An elevated navigation card with independent header, scrolling content, and footer."
        : "The content becomes the card. Navigation stays quiet on the surrounding surface.",
    ),
  ),
  demo(
    "Right sidebar",
    workspace('side="right"', false, true),
    "The rail, resize direction, mobile drawer, and ] shortcut follow the right edge.",
  ),
  demo(
    "Nesting and row actions",
    workspace("", true),
    "Expand Shared, then Design system. Each row owns its actions; keyboard focus reveals them too. Search, rename, duplicate, and archive use the same navigation.",
  ),
  demo(
    "Header, footer and callouts",
    workspace("", false, true, true),
    "Compose horizontal account actions, a search field, and a dismissible alert without adding layout-only component wrappers.",
  ),
  demo(
    "Peek on hover",
    workspace('default-open="false" peek="hover"'),
    "Rest on the edge or toggle to preview navigation. Leaving dismisses it; clicking the toggle pins it. Peek does not resize the document or write a preference.",
  ),
  demo(
    "Peek on click",
    workspace('default-open="false" peek="click"'),
    "Click the edge to reveal navigation over the document. Escape or a press outside dismisses it; the desktop state stays collapsed.",
  ),
  demo(
    "Mobile drawer",
    `<div class="sidebar-controls"><ui-button id="sidebar-mobile">Use mobile layout</ui-button><ui-button id="sidebar-desktop">Use desktop layout</ui-button></div>${workspace('id="responsive-sidebar"')}`,
    "Below the available-width breakpoint the same authored navigation becomes a modal drawer. Toggle modes to verify that document edits survive.",
    `const responsive=document.querySelector("#responsive-sidebar");document.querySelector("#sidebar-mobile").addEventListener("click",()=>responsive.mobileBreakpoint=10000);document.querySelector("#sidebar-desktop").addEventListener("click",()=>responsive.mobileBreakpoint=0);`,
  ),
  demo(
    "Controlled state and persistence",
    `<div class="sidebar-controls"><ui-switch id="controlled-open" label="Desktop open" checked></ui-switch><ui-switch id="sidebar-persist" label="Remember desktop state"></ui-switch><ui-button id="forget-sidebar">Forget preference</ui-button><output id="preference-result">Persistence is off.</output></div>${workspace('id="controlled-sidebar" open="true" storage-key="mash-sidebar-demo"')}`,
    "The application owns open state. Persistence is opt-in in this demo; mobile and peek never change the saved desktop preference.",
    `const controlled=document.querySelector("#controlled-sidebar"),toggle=document.querySelector("#controlled-open"),out=document.querySelector("#preference-result");toggle.addEventListener("ui-switch-change",()=>controlled.open=toggle.checked);controlled.addEventListener("ui-sidebar-open-change",event=>{if(event.detail.mode!=="desktop")return;controlled.open=event.detail.open;toggle.checked=event.detail.open;out.textContent=controlled.persist?"Remembered · "+(event.detail.open?"open":"closed"):"Application state updated";});document.querySelector("#sidebar-persist").addEventListener("ui-switch-change",event=>{controlled.persist=event.detail.checked;out.textContent=controlled.persist?"The next desktop change will be remembered.":"Persistence is off.";});document.querySelector("#forget-sidebar").addEventListener("click",()=>{document.cookie="mash-sidebar-demo=; Path=/; Max-Age=0; SameSite=Lax";out.textContent="Saved preference removed.";});`,
  ),
  demo(
    "Loading navigation",
    `<ui-switch id="sidebar-loading" label="Loading navigation"></ui-switch>${workspace().replace('<nav slot="navigation"', `<div slot="navigation" data-loading-placeholder hidden role="status" aria-label="Loading navigation" class="mash-stack" style="padding:.5rem">${[70, 88, 58, 76, 92, 64].map((width) => `<div class="sidebar-row" style="height:2.25rem"><ui-skeleton style="width:1rem;height:1rem;flex:none"></ui-skeleton><ui-skeleton style="height:.75rem;width:${width}%"></ui-skeleton></div>`).join("")}</div><nav slot="navigation"`)}`,
    "The same scroll region can hold skeleton rows while data loads. Header, footer, and the document remain usable; switching back preserves navigation state.",
    `document.querySelector("#sidebar-loading").addEventListener("ui-switch-change",event=>{const sidebar=document.querySelector("ui-sidebar");sidebar.querySelector("[data-loading-placeholder]").hidden=!event.detail.checked;sidebar.querySelector("nav").hidden=event.detail.checked;});`,
  ),
  demo(
    "Settings composition",
    `<ui-dialog id="sidebar-settings" label="Workspace settings" style="--layout-dimension-dialog:58rem"><ui-button slot="trigger">Open workspace settings</ui-button><div style="height:27rem"><ui-sidebar collapsible="none" persist="false" width="11rem" min-width="144" data-mash-size="compact"><strong slot="header">Workspace</strong><ui-motion slot="navigation" class="mash-hover settings-nav" motion="none"><span slot="underlay" class="mash-hover-highlight" aria-hidden="true"></span><div class="mash-stack">${["General", "Appearance", "Notifications", "Privacy"].map((label) => `<ui-button data-hover-item data-settings-section="${label}" variant="ghost">${label}</ui-button>`).join("")}</div></ui-motion><strong slot="content-header" id="settings-title">General</strong><div class="mash-stack"><ui-input label="Workspace name" value="Acme workspace"></ui-input><ui-switch label="Sync changes" checked></ui-switch><ui-select label="Default visibility" value="team"><ui-option value="team">Team</ui-option><ui-option value="private">Private</ui-option></ui-select><p id="settings-explanation">Workspace details and sharing defaults.</p></div></ui-sidebar></div><ui-button slot="close">Done</ui-button></ui-dialog>`,
    "A static column inside the existing dialog. The navigation composes the shared hover-motion underlay; the dialog owns focus and dismissal.",
    `const nav=document.querySelector(".settings-nav");nav.trackHover({highlight:nav.querySelector("[slot=underlay]"),axis:"vertical"});nav.querySelectorAll("[data-settings-section]").forEach(button=>button.addEventListener("click",()=>{document.querySelector("#settings-title").textContent=button.dataset.settingsSection;document.querySelector("#settings-explanation").textContent=({General:"Workspace details and sharing defaults.",Appearance:"Theme and presentation preferences for this workspace.",Notifications:"Choose which activity should get your attention.",Privacy:"Keep workspace information within your chosen audience."})[button.dataset.settingsSection];}));`,
  ),
];
