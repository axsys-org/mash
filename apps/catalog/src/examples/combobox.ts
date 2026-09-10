import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const styles = `<style>
.choice-stage{width:min(100%,24rem);min-height:24rem;margin-inline:auto;padding:1.5rem 0;display:flex;flex-direction:column;gap:1rem;align-items:stretch}.choice-stage h3{font-size:1rem;font-weight:550;letter-spacing:-.015em;margin:0}.choice-stage p{margin:0;color:var(--color-text-muted);font-size:.8125rem;line-height:1.6}.choice-stage ui-combobox{width:100%}.choice-stage ui-combobox::part(popup){max-width:calc(100vw - 3rem)}.choice-stage ui-combobox::part(icon){font-size:20px}.choice-stage ui-combobox::part(viewport){max-height:16rem}.choice-stage output{font-size:.75rem;color:var(--color-text-muted);line-height:1.6}.choice-preview{display:flex;gap:.75rem;align-items:center;border-top:1px solid var(--color-border);padding-top:1rem;margin-top:auto}.choice-preview strong{font-weight:500;font-size:.8125rem}.choice-preview small{display:block;color:var(--color-text-muted);margin-top:3px}.choice-row{display:flex;align-items:center;gap:.625rem;min-width:0}.choice-row>ui-icon{font-size:20px;flex:none;color:var(--color-text-muted)}.choice-row>span{min-width:0;flex:1}.choice-row strong{display:block;font-weight:500;font-size:.8125rem;line-height:1.5}.choice-row small{display:block;font-size:.75rem;color:var(--color-text-muted);line-height:1.5}.choice-row ui-avatar{flex:none}.choice-row ui-kbd{margin-left:auto}.choice-pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:1.5rem}.choice-pair section{display:grid;align-content:start;gap:.75rem}.choice-toolbar{display:flex;gap:.75rem;flex-wrap:wrap;align-items:center}.choice-stage .choice-variants{display:grid;gap:1.25rem}.choice-stage .choice-long::part(viewport){max-height:13rem}.choice-stage .choice-shape::part(input-group),.choice-stage .choice-shape::part(popup){border-radius:1.125rem}.choice-stage .choice-shape::part(highlight){border-radius:.75rem}
</style>`;
const demo = (
  name: string,
  heading: string,
  body: string,
  script: string,
  description?: string,
): CatalogExample => ({
  ...sample(
    name,
    `${styles}<div class="choice-stage" data-mash-size="default"><h3>${heading}</h3>${body}</div>`,
    description,
  ),
  script,
});
const frameworks = JSON.stringify([
  { value: "next", label: "Next.js" },
  { value: "svelte", label: "SvelteKit" },
  { value: "nuxt", label: "Nuxt" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
  { value: "solid", label: "SolidStart" },
  { value: "qwik", label: "Qwik City" },
]);
const setup = `const combo=document.querySelector("#choice");`;
const report = `const report=()=>{document.querySelector("output").textContent=combo.multiple?(combo.values.length?combo.values.join(" · "):"Nothing selected"):(combo.value?"Selected value · "+combo.value:"Nothing selected");};combo.addEventListener("ui-combobox-change",report);report();`;
const people = JSON.stringify([
  { value: "alex", label: "Alex Morgan", team: "Design", initials: "AM" },
  { value: "maya", label: "Maya Chen", team: "Engineering", initials: "MC" },
  { value: "sam", label: "Sam Rivera", team: "Design", initials: "SR" },
  { value: "jordan", label: "Jordan Lee", team: "Research", initials: "JL" },
  { value: "taylor", label: "Taylor Kim", team: "Engineering", initials: "TK" },
]);
const peopleRenderer = `combo.renderItem=item=>{const row=document.createElement("span");row.className="choice-row";const avatar=document.createElement("ui-avatar");avatar.alt=item.label;avatar.initials=item.initials;avatar.size="small";const copy=document.createElement("span"),name=document.createElement("strong"),team=document.createElement("small");name.textContent=item.label;team.textContent=item.team;copy.append(name,team);row.append(avatar,copy);return row;};`;

export const comboboxExamples: CatalogExample[] = [
  demo(
    "Single selection",
    "Start with a framework",
    `<p>Type a name, then press Enter. The label stays readable; the form keeps its stable value.</p><ui-combobox id="choice" label="Framework" placeholder="Select a framework…" clearable></ui-combobox><output aria-live="polite"></output><div class="choice-preview"><ui-icon name="object.document" label=""></ui-icon><div><strong>New project</strong><small id="project-summary">Choose the foundation for your next project.</small></div></div>`,
    setup +
      `combo.items=${frameworks};` +
      report +
      `combo.addEventListener("ui-combobox-change",()=>{document.querySelector("#project-summary").textContent=combo.items.find(item=>item.value===combo.value)?.label||"Choose the foundation for your next project.";});`,
  ),
  demo(
    "People and custom filtering",
    "Assign a collaborator",
    `<p>Search by name or team. Try “design”.</p><ui-combobox id="choice" label="Collaborator" placeholder="Search people or teams…" clearable><ui-icon slot="icon" name="action.search" label=""></ui-icon></ui-combobox><output aria-live="polite"></output>`,
    setup +
      `combo.items=${people};` +
      peopleRenderer +
      `combo.filter=(item,query)=>(item.label+" "+item.team).toLocaleLowerCase().includes(query.toLocaleLowerCase());` +
      report,
  ),
  demo(
    "Multiple selection",
    "Build your project stack",
    `<p>Add several frameworks. Use the chip’s × to remove it, or focus a chip with ← and press Delete.</p><ui-combobox id="choice" multiple values='["next","astro"]' label="Project frameworks" placeholder="Add a framework…" clearable></ui-combobox><output aria-live="polite"></output>`,
    setup + `combo.items=${frameworks};` + report,
  ),
  demo(
    "Create from search",
    "Organize with labels",
    `<p>Type a new label and press Enter to create it. Existing labels stay available.</p><ui-combobox id="choice" multiple values='["Design"]' label="Labels" placeholder="Find or create a label…" clearable></ui-combobox><output aria-live="polite"></output>`,
    setup +
      `combo.items=["Design","Engineering","Research","Accessibility","Motion"];combo.onCreate=query=>query;` +
      report,
  ),
  demo(
    "Hide selected options",
    "Invite your team",
    `<p>Selected people leave the list. Remove a chip to make them available again.</p><ui-combobox id="choice" multiple hide-selected values='["alex","maya"]' label="Invite people" placeholder="Add someone…" clearable><span slot="empty">Everyone is invited, or no one matches your search.</span></ui-combobox><output aria-live="polite"></output>`,
    setup + `combo.items=${people};` + peopleRenderer + report,
  ),
  demo(
    "Bordered and borderless",
    "Quiet where it counts",
    `<div class="choice-pair"><section><p>Bordered · form field</p><ui-combobox label="Bordered framework" placeholder="Choose framework…" clearable></ui-combobox></section><section><p>Borderless · inline property</p><ui-combobox label="Inline framework" placeholder="Set framework…" variant="borderless" clearable value="astro"></ui-combobox></section></div><output aria-live="polite">Both fields use the same selection and keyboard behavior.</output>`,
    `document.querySelectorAll("ui-combobox").forEach(combo=>{combo.items=${frameworks};combo.addEventListener("ui-combobox-change",()=>{document.querySelector("output").textContent=combo.label+" · "+(combo.value||"not set");});});`,
  ),
  demo(
    "Size inheritance",
    "One size across field and list",
    `<div class="choice-toolbar"><ui-switch id="density" label="Compact context"></ui-switch></div><div class="choice-variants" id="density-context"><ui-combobox label="Inherited size" placeholder="Follows the context…" multiple values='["astro"]'></ui-combobox><ui-combobox label="Pinned default size" placeholder="Always default…" size="default"></ui-combobox><ui-combobox label="Pinned compact size" placeholder="Always compact…" size="compact"></ui-combobox></div>`,
    `document.querySelectorAll("ui-combobox").forEach(combo=>combo.items=${frameworks});document.querySelector("#density").addEventListener("ui-switch-change",event=>document.querySelector("#density-context").dataset.mashSize=event.detail.checked?"compact":"default");`,
  ),
  demo(
    "Long list",
    "Find a time zone",
    `<p>A bounded list with native scrolling. Type a city, or use Home and End while the list is open.</p><ui-combobox id="choice" class="choice-long" label="Time zone" placeholder="Search time zones…" clearable><ui-icon slot="icon" name="action.search" label=""></ui-icon></ui-combobox><output aria-live="polite"></output>`,
    setup +
      `combo.items=Intl.supportedValuesOf("timeZone").map(value=>({value,label:value.replaceAll("_"," ").replaceAll("/"," / ")}));` +
      report,
  ),
  demo(
    "Validation and availability",
    "Finish project setup",
    `<div class="choice-variants"><ui-combobox id="choice" label="Required framework" placeholder="Select a framework…" clearable error="Choose a framework to continue."></ui-combobox><ui-combobox label="Managed framework" value="astro" disabled></ui-combobox><ui-combobox label="Read-only framework" value="next" readonly></ui-combobox><fieldset disabled style="border:0;padding:0;margin:0;min-width:0"><ui-combobox label="Disabled by fieldset" value="nuxt"></ui-combobox></fieldset></div><output aria-live="polite"></output>`,
    setup +
      `document.querySelectorAll("ui-combobox").forEach(control=>control.items=${frameworks});combo.addEventListener("ui-combobox-change",()=>{combo.error=combo.value?"":"Choose a framework to continue.";});` +
      report,
  ),
  demo(
    "Form values and reset",
    "Save project preferences",
    `<form id="preferences" class="mash-stack"><ui-combobox id="choice" name="framework" label="Framework for submission" placeholder="Choose a framework…" value="astro" clearable></ui-combobox><ui-combobox id="form-labels" name="labels" label="Project labels" multiple values='["Design"]' placeholder="Add labels…"></ui-combobox><div class="choice-toolbar"><ui-button type="submit" variant="primary">Save preferences</ui-button><ui-button type="reset" variant="ghost">Reset</ui-button></div></form><output aria-live="polite">Search text is separate from submitted selections.</output>`,
    setup +
      `combo.items=${frameworks};document.querySelector("#form-labels").items=["Design","Engineering","Research"];document.querySelector("form").addEventListener("submit",event=>{event.preventDefault();document.querySelector("output").textContent=[...new FormData(event.target)].map(([key,value])=>key+": "+value).join(" · ");});document.querySelector("form").addEventListener("reset",()=>document.querySelector("output").textContent="Initial project preferences restored.");`,
  ),
  demo(
    "Authored rows and CSS parts",
    "Keep the rows yours",
    `<p>Options can remain authored markup. Field, popup, and moving highlight are independently styleable.</p><ui-combobox id="choice" class="choice-shape" label="Project" placeholder="Find a project…" clearable><ui-option-group label="Your projects"><ui-option value="navigation" aria-label="Navigation refresh"><span class="choice-row"><ui-icon name="object.folder" label=""></ui-icon><span><strong>Navigation refresh</strong><small>Design · updated today</small></span></span></ui-option><ui-option value="components" aria-label="Component library"><span class="choice-row"><ui-icon name="object.folder" label=""></ui-icon><span><strong>Component library</strong><small>Engineering · 12 open tasks</small></span></span></ui-option></ui-option-group><ui-option-group label="Archived"><ui-option value="archive" disabled>Previous launch · read only</ui-option></ui-option-group><small slot="footer">↑ ↓ to navigate · Enter to open</small></ui-combobox><output aria-live="polite"></output>`,
    setup + report,
  ),
];
