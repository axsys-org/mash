import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const styles = `<style>
.tip-stage{inline-size:min(100%,36rem);margin-inline:auto;display:grid;gap:1rem;padding-block:2.5rem}.tip-stage p,.tip-stage output{margin:0;color:var(--color-text-muted);font-size:var(--type-label-small-font-size)}.tip-actions{display:flex;align-items:center;justify-content:center;gap:.75rem;flex-wrap:wrap}.tip-actions ui-icon{font-size:1.25rem}.tip-rich{display:grid;gap:.3rem;max-inline-size:16rem}.tip-rich>span{font-size:.92em;opacity:.8}.tip-hint{display:flex;align-items:center;justify-content:space-between;gap:1.25rem}.tip-track{border:1px solid var(--color-border);border-radius:var(--radius-container);background:var(--color-surface-sunken);color:var(--color-text);font:inherit;cursor:default}.tip-track.horizontal{inline-size:100%;block-size:4rem}.tip-track.vertical{width:4rem;height:12rem;writing-mode:vertical-rl}.tip-tracks{display:grid;grid-template-columns:minmax(0,1fr) 5rem;gap:2rem;align-items:center}.tip-shape::part(popup){border-radius:0}.tip-soft::part(popup){border:1px solid var(--color-border);background:var(--color-surface-raised);color:var(--color-text);border-radius:1rem}.tip-long::part(popup){max-inline-size:17rem}.tip-layer::part(backdrop){z-index:var(--layer-overlay)}.tip-stage ui-dialog::part(popup){inline-size:min(26rem,calc(100vw - 2rem))}
</style>`;
const demo = (name: string, body: string, script = "", description?: string): CatalogExample => ({
  ...sample(
    name,
    `${styles}<div class="tip-stage" data-mash-size="default">${body}</div>`,
    description,
  ),
  script,
});
const iconTip = (label: string, icon: string, id: string) =>
  `<ui-tooltip label="${label}"><ui-button id="${id}" slot="trigger" variant="ghost" aria-label="${label}"><ui-icon name="${icon}" label=""></ui-icon></ui-button></ui-tooltip>`;

export const tooltipExamples: CatalogExample[] = [
  demo(
    "Action hints",
    `<div class="tip-actions">${iconTip("Save changes", "action.confirm", "save")}${iconTip("Duplicate page", "object.document", "duplicate")}${iconTip("Download a copy", "action.download", "download")}</div><ui-textarea id="draft" label="Page draft" rows="3" value="A small note worth keeping."></ui-textarea><output aria-live="polite">Hover or focus an action. Your draft is ready to save.</output>`,
    `const draft=document.querySelector("#draft"),output=document.querySelector("output");document.querySelector("#save").addEventListener("click",()=>{output.textContent="Saved · "+draft.value.length+" characters";});document.querySelector("#duplicate").addEventListener("click",()=>{draft.value+="\\n\\n"+draft.value;output.textContent="Duplicated the note.";});document.querySelector("#download").addEventListener("click",()=>{const url=URL.createObjectURL(new Blob([draft.value],{type:"text/plain"}));const link=document.createElement("a");link.href=url;link.download="note.txt";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);output.textContent="Downloaded note.txt";});`,
    "A short label after 200 ms of hover, immediately on keyboard focus. Escape dismisses without moving focus.",
  ),
  demo(
    "Placement and offset",
    `<div class="tip-actions">${["top", "right", "bottom", "left"].map((side) => `<ui-tooltip placement="${side}" label="On the ${side}"><ui-button slot="trigger" outline>${side[0]!.toUpperCase() + side.slice(1)}</ui-button></ui-tooltip>`).join("")}</div><div class="tip-actions"><ui-select id="tip-align" label="Alignment" value="center" size="compact"><ui-option value="start">Start</ui-option><ui-option value="center">Center</ui-option><ui-option value="end">End</ui-option></ui-select><ui-number-field id="tip-offset" label="Distance" value="8" min="0" max="32" step="2"><span slot="suffix">px</span></ui-number-field></div>`,
    `document.querySelector("#tip-align").addEventListener("ui-select-change",event=>document.querySelectorAll("ui-tooltip").forEach(tip=>{tip.align=event.detail.value;}));document.querySelector("#tip-offset").addEventListener("ui-number-field-change",event=>document.querySelectorAll("ui-tooltip").forEach(tip=>{tip.offset=event.detail.value;}));`,
    "Preferred sides flip when space runs out. Alignment and distance share the same positioning contract as menus and popovers.",
  ),
  demo(
    "Rich content and shortcuts",
    `<div class="tip-actions"><ui-tooltip><ui-button slot="trigger" outline>Save</ui-button><span class="tip-rich"><strong class="tip-hint">Save changes<ui-kbd shortcut="Primary+S" appearance="plain"></ui-kbd></strong><span>Keep your latest edits in this workspace.</span></span></ui-tooltip><ui-tooltip><ui-button slot="trigger" outline>Sync status</ui-button><span class="tip-rich"><strong>Everything is up to date</strong><span>Your latest changes are available on this device.</span></span></ui-tooltip></div>`,
    "",
    "Use passive text, icons, and shortcut hints. Put links, buttons, and editable content in a Popover instead.",
  ),
  demo(
    "Follow the cursor",
    `<div class="tip-tracks"><ui-tooltip follow-cursor="x" label="Move horizontally to scrub" open-delay="0"><button slot="trigger" class="tip-track horizontal">Move across the timeline</button></ui-tooltip><ui-tooltip follow-cursor="y" placement="left" label="Drag to resize this panel" open-delay="0"><button slot="trigger" class="tip-track vertical">Move along the rail</button></ui-tooltip></div>`,
    "",
    "Only one axis follows the pointer. The other stays anchored to the control. Keyboard focus uses the control’s center.",
  ),
  demo(
    "Hover delays",
    `<div class="tip-actions">${[0, 200, 500].map((delay) => `<ui-tooltip open-delay="${delay}" label="${delay === 0 ? "No wait" : delay + " ms hover delay"}"><ui-button slot="trigger" outline>${delay === 0 ? "Immediate" : delay + " ms"}</ui-button></ui-tooltip>`).join("")}</div><p>Move away before the delay finishes to cancel it. Keyboard focus always opens immediately.</p>`,
  ),
  demo(
    "Controlled visibility",
    `<div class="tip-actions"><ui-tooltip id="controlled-tip" label="The application owns this hint"><ui-button slot="trigger" outline>Controlled hint</ui-button></ui-tooltip></div><ui-select id="tip-state" label="Visibility" value="auto"><ui-option value="auto">Hover and focus</ui-option><ui-option value="open">Force open</ui-option><ui-option value="closed">Force closed</ui-option></ui-select><output aria-live="polite">Automatic interaction</output>`,
    `const tip=document.querySelector("#controlled-tip");document.querySelector("#tip-state").addEventListener("ui-select-change",event=>{tip.forceOpen=event.detail.value==="auto"?undefined:event.detail.value==="open";document.querySelector("output").textContent=event.detail.value==="auto"?"Automatic interaction":"Forced "+event.detail.value;});tip.addEventListener("ui-tooltip-open-change",event=>{document.querySelector("output").textContent=(event.detail.open?"Opened":"Closed")+" · "+event.detail.reason;});`,
    "A forced state wins over hover, focus, Escape, and imperative requests. Returning to automatic mode closes the pinned hint until the next interaction.",
  ),
  demo(
    "CSS parts and wrapping",
    `<div class="tip-actions"><ui-tooltip class="tip-shape" label="A square tooltip"><ui-button slot="trigger" outline>Square</ui-button></ui-tooltip><ui-tooltip class="tip-soft" label="A softer surface"><ui-button slot="trigger" outline>Soft surface</ui-button></ui-tooltip><ui-tooltip class="tip-long" label="This description wraps within a constrained width and stays readable at the edge of a small viewport."><ui-button slot="trigger" outline>Long hint</ui-button></ui-tooltip></div>`,
    "",
    "Shape, color, width, and layer order stay in CSS parts. Descriptions inherit the tooltip surface’s text color, including inverse materials.",
  ),
  demo(
    "Inside a dialog",
    `<ui-dialog label="Page details"><ui-button slot="trigger" outline>Open page details</ui-button><strong slot="title">Page details</strong><ui-field label="Page name"><ui-input slot="control" value="Team notes"></ui-input></ui-field><ui-tooltip class="tip-layer" label="Names are visible to everyone in this workspace"><ui-button slot="trigger" variant="ghost" aria-label="About page names"><ui-icon name="status.information" label=""></ui-icon></ui-button></ui-tooltip><ui-button slot="close">Done</ui-button></ui-dialog>`,
    "",
    "The dialog owns focus containment. The tooltip describes its control without becoming another focus destination.",
  ),
  demo(
    "Disabled controls",
    `<div class="tip-actions"><ui-tooltip label="Choose a destination before publishing"><span slot="trigger" tabindex="0" role="group" aria-label="Publishing unavailable"><ui-button disabled>Publish</ui-button></span></ui-tooltip></div>`,
    "",
    "A disabled button cannot receive keyboard focus. A focusable wrapper can explain why it is unavailable while the button stays disabled.",
  ),
];
