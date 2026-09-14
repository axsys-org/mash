import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const styles = `<style>
.command-stage{inline-size:min(100%,36rem);margin-inline:auto;display:grid;gap:1rem}.command-stage p,.command-stage output{margin:0;color:var(--color-text-muted);font-size:var(--type-label-small-font-size)}.command-stage h3{margin:0;font-size:var(--type-label-font-size)}.command-filters,.command-hints{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.command-filters ui-tabs{flex:1;min-inline-size:15rem}.command-filters ui-tabs::part(panels){display:none}.command-filters ui-tabs::part(list){border:0}.command-filters ui-tab[selected]::part(control){background:var(--color-surface-hover);color:var(--color-text)}.command-filters ui-select{inline-size:auto;min-inline-size:6rem}.command-filters #command-sort::part(trigger){border-color:transparent;background:transparent}.command-hints{gap:.3rem}.command-hints>span{margin-inline-end:.65rem}.command-hints ui-kbd{font-size:inherit}.command-stage ui-command::part(list){max-block-size:21rem}.command-person{display:flex;align-items:center;gap:.65rem}.command-person>span{display:grid;gap:.125rem}.command-person small{color:var(--color-text-muted);font-size:var(--type-label-small-font-size)}.command-preview{display:flex;align-items:center;gap:.75rem;border:1px solid var(--color-border);border-radius:var(--radius-container);padding:.75rem}.command-preview ui-icon{font-size:1.25rem}.command-preview>span{display:grid;gap:.25rem}.command-preview small{color:var(--color-text-muted)}
.command-dialog::part(backdrop){align-items:start;padding-block-start:clamp(1rem,12dvh,6rem)}.command-dialog::part(popup){padding:0;gap:0;inline-size:min(36rem,calc(100vw - 2rem));overflow:hidden}.command-dialog::part(content){gap:0}.command-dialog::part(title){display:block;position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%)}.command-dialog ui-command::part(root){border:0;border-radius:0}.command-dialog ui-command::part(list){max-block-size:min(21rem,50dvh)}.command-launcher{display:flex;justify-content:space-between;align-items:center;inline-size:100%;gap:2rem}.command-dialog ui-button{display:block;inline-size:100%}.command-dialog ui-button::part(control){inline-size:100%;justify-content:space-between}.command-dialog::part(trigger){display:block}.command-stage .command-square::part(root),.command-stage .command-square::part(highlight),.command-stage .command-square ui-command-item::part(root){border-radius:0}
</style>`;
const search = `<ui-icon slot="search-prefix" name="action.search" label=""></ui-icon>`;
const hints = `<div slot="footer" class="command-hints"><ui-kbd shortcut="ArrowUp" appearance="plain"></ui-kbd><ui-kbd shortcut="ArrowDown" appearance="plain"></ui-kbd><span>Move</span><ui-kbd shortcut="Enter" appearance="plain"></ui-kbd><span>Open</span></div>`;
const tabs = `<ui-tabs id="command-tabs" label="Command category" value="all" variant="default" size="compact"><ui-tab slot="tab" value="all">All</ui-tab><ui-tab slot="tab" value="Actions">Actions</ui-tab><ui-tab slot="tab" value="Go to">Go to</ui-tab><ui-tab slot="tab" value="Help">Help</ui-tab></ui-tabs>`;
const filters = `<ui-select id="command-sort" label="Sort commands" value="default" size="compact"><ui-option value="default">Suggested</ui-option><ui-option value="az">Name A–Z</ui-option></ui-select>`;
const data = JSON.stringify([
  {
    value: "new",
    label: "New document",
    description: "Blank page",
    icon: "action.add",
    shortcut: "Primary+N",
    keywords: ["create", "file", "note"],
    group: "Actions",
  },
  {
    value: "duplicate",
    label: "Duplicate document",
    description: "Keep the original",
    icon: "object.document",
    shortcut: "Primary+D",
    keywords: ["copy", "clipboard"],
    group: "Actions",
  },
  {
    value: "export",
    label: "Export workspace",
    description: "Owner access required",
    icon: "action.download",
    disabled: true,
    group: "Actions",
  },
  {
    value: "notes",
    label: "Team notes",
    description: "Workspace",
    icon: "object.document",
    shortcut: "Primary+1",
    keywords: ["meeting", "minutes"],
    group: "Go to",
  },
  {
    value: "plan",
    label: "Release plan",
    description: "Updated today",
    icon: "object.document",
    keywords: ["roadmap", "milestones"],
    group: "Go to",
  },
  {
    value: "settings",
    label: "Preferences",
    description: "Make it yours",
    icon: "action.settings",
    shortcut: "Primary+,",
    keywords: ["settings", "account"],
    group: "Go to",
  },
  {
    value: "keys",
    label: "Keyboard guide",
    description: "Move a little faster",
    icon: "object.keyboard",
    shortcut: "Primary+/",
    group: "Help",
  },
  {
    value: "help",
    label: "Getting started",
    description: "A short introduction",
    icon: "status.information",
    keywords: ["docs", "support"],
    group: "Help",
  },
]);
const setup = `const menu=document.querySelector("#menu");const actions=${data};menu.items=actions;`;
const report = `menu.addEventListener("ui-command-select",event=>{document.querySelector("output").textContent="Selected · "+event.detail.item.label;});`;
const demo = (
  name: string,
  body: string,
  script: string,
  description?: string,
): CatalogExample => ({
  ...sample(
    name,
    `${styles}<div class="command-stage" data-mash-size="default">${body}</div>`,
    description,
  ),
  script,
});
const palette = (extra = "", attributes = "") =>
  `<ui-command id="menu" label="Workspace commands" placeholder="Search actions, pages, and help…" ${attributes}>${search}${extra}${hints}<span slot="empty">No matches. Try a page name or an action.</span></ui-command>`;
const tabBehavior = `let category="all";const tabbar=document.querySelector("#command-tabs");const sort=document.querySelector("#command-sort");function showCategory(){let items=category==="all"?[...actions]:actions.filter(item=>item.group===category);if(sort?.value==="az")items.sort((a,b)=>a.label.localeCompare(b.label));menu.items=items;menu.suggestions=sort?.value==="az"?[]:["notes","new","settings"];}tabbar.addEventListener("ui-tabs-change",event=>{category=event.detail.value;showCategory();});sort?.addEventListener("ui-select-change",showCategory);showCategory();`;
const workspace = `<div class="command-preview"><ui-icon name="object.document" label=""></ui-icon><span><strong id="page-title">Team notes</strong><small id="page-meta">Local workspace · draft</small></span></div><ui-textarea id="page-editor" label="Page content" rows="3" value="A place for ideas, decisions, and the next steps."></ui-textarea><output aria-live="polite">Your draft stays here when you switch pages.</output>`;
const workspaceBehavior = `const editor=document.querySelector("#page-editor"),title=document.querySelector("#page-title");const pages=new Map([["notes",{label:"Team notes",text:editor.value}],["plan",{label:"Release plan",text:"Review the controls, collect feedback, and ship."}],["settings",{label:"Preferences",text:"This local preview keeps your page drafts for the session."}],["keys",{label:"Keyboard guide",text:"↑ ↓ Move through commands\\nEnter Open the active command\\nEscape Close the dialog\\nTab Move between controls"}],["help",{label:"Getting started",text:"Search by name or keyword, select a category, then open a page. New and Duplicate create editable drafts."}]]);let current="notes",count=0;menu.addEventListener("ui-command-select",event=>{pages.get(current).text=editor.value;let value=event.detail.value;if(value==="new"||value==="duplicate"){const source=pages.get(current);const duplicate=value==="duplicate";value="draft-"+(++count);const label=duplicate?source.label+" copy":"Untitled "+count;pages.set(value,{label,text:duplicate?source.text:""});actions.push({value,label,icon:"object.document",description:"Just created",group:"Go to"});}if(pages.has(value)){current=value;title.textContent=pages.get(value).label;editor.value=pages.get(value).text;}document.querySelector("output").textContent="Opened · "+title.textContent;});`;

export const commandMenuExamples: CatalogExample[] = [
  demo(
    "Command menu",
    palette(`<div slot="filters" class="command-filters">${tabs}${filters}</div>`) + workspace,
    setup +
      tabBehavior +
      workspaceBehavior +
      `menu.addEventListener("ui-command-select",showCategory);`,
    "Search, switch categories, or sort. New and Duplicate create editable pages; opening another page retains your draft.",
  ),
  demo(
    "Grouped actions",
    palette() + `<output aria-live="polite">Choose an action.</output>`,
    setup + report,
    "Data creates the same public command rows and labelled groups you can author directly. Each query word matches labels, descriptions, or keywords.",
  ),
  demo(
    "Descriptions and shortcuts",
    palette() + `<output aria-live="polite">Try “clipboard” to find Duplicate document.</output>`,
    setup + `menu.items=actions.slice(0,3);` + report,
    "Shortcut caps describe bindings; they do not install global shortcuts. Disabled actions stay visible and are skipped by keyboard and pointer.",
  ),
  demo(
    "Suggestions and recents",
    palette() + `<output aria-live="polite">Open an action to move it to Recently used.</output>`,
    setup +
      `menu.suggestions=["plan","notes"];menu.suggestionsLabel="Recently used";menu.addEventListener("ui-command-select",event=>{menu.suggestions=[event.detail.value,...menu.suggestions.filter(value=>value!==event.detail.value)].slice(0,3);menu.query="";document.querySelector("output").textContent="Opened · "+event.detail.item.label;});`,
    "Recent actions appear once, ahead of their original groups. Typing restores normal groups; clearing brings recents back.",
  ),
  demo(
    "Tabs and filters",
    palette(`<div slot="filters" class="command-filters">${tabs}${filters}</div>`) +
      `<output aria-live="polite">Filter the collection without leaving the search.</output>`,
    setup + tabBehavior + report,
    "Shared Tabs and Select compose in the filters slot. Their keyboard controls stay independent of the command list.",
  ),
  demo(
    "Global shortcut dialog",
    `<ui-dialog id="palette-dialog" class="command-dialog" label="Workspace commands"><ui-button slot="trigger" variant="secondary"><span class="command-launcher"><span>Search workspace…</span><ui-kbd id="trigger-keys" shortcut="Primary+K"></ui-kbd></span></ui-button>${palette(`<ui-kbd slot="search-suffix" shortcut="Escape" appearance="plain"></ui-kbd>`)}</ui-dialog><div class="command-filters"><ui-select id="shortcut-choice" label="Open with" value="Primary+K" size="compact"><ui-option value="Primary+K">Primary + K</ui-option><ui-option value="Primary+P">Primary + P</ui-option><ui-option value="none">Button only</ui-option></ui-select><ui-switch id="keep-open" size="compact">Keep open after selection</ui-switch></div><ui-gesture-binding id="open-binding" gesture="key" command="workspace.commands" shortcut="Primary+K" prevent-default="always"></ui-gesture-binding>${workspace}`,
    setup +
      workspaceBehavior +
      `menu.suggestions=["notes","new","settings"];menu.escapeClears=false;const dialog=document.querySelector("#palette-dialog"),binding=document.querySelector("#open-binding");binding.target=document.documentElement;document.documentElement.addEventListener("mash-command",event=>{if(event.detail.command!=="workspace.commands"||event.detail.phase!=="ended")return;dialog.open?dialog.dismiss():dialog.show();});menu.addEventListener("ui-command-select",()=>{menu.items=[...actions];if(!document.querySelector("#keep-open").checked)dialog.dismiss();});document.querySelector("#shortcut-choice").addEventListener("ui-select-change",event=>{const shortcut=event.detail.value;binding.disabled=shortcut==="none";binding.shortcut=shortcut==="none"?"":shortcut;const cap=document.querySelector("#trigger-keys");cap.hidden=shortcut==="none";cap.shortcut=binding.shortcut;});`,
    "The binding is global to this preview. The shared dialog traps focus, closes on Escape, and returns focus to its opener. Change or disable its shortcut.",
  ),
  demo(
    "Custom rows and filtering",
    palette() +
      `<div class="command-preview"><ui-avatar id="owner-avatar" initials="AM" size="small" alt="Alex Morgan"></ui-avatar><span><strong id="owner-name">Alex Morgan</strong><small>Project owner</small></span></div><output aria-live="polite">Search a person, their team, or “available”.</output>`,
    setup +
      `menu.items=[{value:"alex",label:"Alex Morgan",description:"Design",available:true,initials:"AM",shortcut:"Primary+1"},{value:"maya",label:"Maya Chen",description:"Engineering",available:true,initials:"MC"},{value:"sam",label:"Sam Rivera",description:"Design",available:false,initials:"SR"}];menu.renderItem=item=>{const row=document.createElement("span");row.className="command-person";const avatar=document.createElement("ui-avatar");avatar.initials=item.initials;avatar.alt="";avatar.size="small";const copy=document.createElement("span"),label=document.createElement("span"),detail=document.createElement("small");label.textContent=item.label;detail.textContent=item.description+" · "+(item.available?"Available":"Away");copy.append(label,detail);row.append(avatar,copy);return row;};menu.filter=(item,query)=>query.toLowerCase().trim().split(/\\s+/).every(word=>(item.label+" "+item.description+(item.available?" available":" away")).toLowerCase().includes(word));menu.addEventListener("ui-command-select",event=>{const item=event.detail.item;document.querySelector("#owner-name").textContent=item.label;const avatar=document.querySelector("#owner-avatar");avatar.initials=item.initials;avatar.alt=item.label;document.querySelector("output").textContent="Assigned · "+item.label;});`,
  ),
  demo(
    "Sizes and CSS parts",
    `<ui-switch id="compact">Compact context</ui-switch><div id="size-context" data-mash-size="default">${palette("", 'class="command-square"')}</div><p>Search, rows, icons, and caps follow one size context. The square shape is authored through CSS parts.</p><output aria-live="polite">Default · 36 px rows</output>`,
    setup +
      `menu.items=actions.slice(0,4);document.querySelector("#compact").addEventListener("ui-switch-change",event=>{document.querySelector("#size-context").dataset.mashSize=event.detail.checked?"compact":"default";document.querySelector("output").textContent=event.detail.checked?"Compact · 28 px rows":"Default · 36 px rows";});`,
  ),
];
