import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";
import { composerController } from "./composer-controller.js";

/** An application-owned form composed from public controls and a shared recipe. */
export const composerMarkup = (attributes = "", value = "") => `
<form class="mash-composer" aria-label="Message composer" ${attributes}>
  <div class="mash-composer-queue" aria-label="Queued messages" hidden></div>
  <div class="mash-composer-context" aria-label="Attached context" hidden></div>
  <ui-textarea name="message" label="Message" placeholder="Ask anything, or describe a task…" rows="1" value="${value}"></ui-textarea>
  <div class="mash-composer-toolbar">
    <ui-button type="button" variant="ghost" size="small" data-attach aria-label="Attach files"><ui-icon name="action.add" label=""></ui-icon></ui-button>
    <input type="file" multiple hidden aria-label="Choose attachments">
    <ui-select class="mash-composer-mode" label="Response mode" value="ask" size="small" placement="top" align="start"><ui-option value="ask">Ask</ui-option><ui-option value="plan">Plan</ui-option><ui-option value="write">Write</ui-option></ui-select>
    <span class="mash-composer-spacer"></span>
    <ui-button type="button" variant="ghost" size="small" data-expand aria-label="Expand composer" aria-expanded="false"><ui-icon name="action.fit" label=""></ui-icon></ui-button>
    <ui-button type="submit" variant="primary" size="small" data-send aria-label="Send" disabled><ui-icon name="navigation.up" label=""></ui-icon></ui-button>
    <ui-button type="button" variant="primary" size="small" data-stop aria-label="Stop sending" hidden><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor"/></svg></ui-button>
  </div>
  <div class="mash-composer-suggestions" role="group" aria-label="Suggested prompts" hidden></div>
  <div class="mash-composer-status" hidden><output aria-live="polite"></output><ui-button type="button" variant="ghost" size="small" data-retry hidden>Retry</ui-button></div>
</form>`;

export const composerScript = composerController;

const reportSend = `document.addEventListener("composer-send", event => {
  document.querySelector("#sent-message").textContent = event.detail.text + (event.detail.files.length ? " · " + event.detail.files.map(file => file.name).join(", ") : "");
});`;
const composerExample = (
  name: string,
  attrs: string,
  value: string,
  description: string,
): CatalogExample => ({
  ...sample(
    name,
    `${composerMarkup(attrs, value)}<output id="sent-message" class="mash-composer-result" aria-live="polite"></output>`,
    description,
  ),
  script: composerScript + reportSend,
});
export const composerExamples: CatalogExample[] = [
  composerExample(
    "Compact composer",
    "",
    "",
    "A compact draft grows with new lines. Enter sends; Shift+Enter adds a line. Expand for longer writing.",
  ),
  composerExample(
    "Expanded composer",
    "data-expanded",
    "Help me plan the next release.&#10;&#10;Start with the most important improvements, then outline a small first step.",
    "Collapse and expand without losing your draft. Change the writing mode beside the attachment control.",
  ),
  composerExample(
    "Context and attachments",
    'data-context="release-notes.md,design-review.txt"',
    "Use these notes to write a short summary.",
    "Attach or drop local files, remove individual chips, and send text with context. This example keeps files in this page.",
  ),
  composerExample(
    "Send, stop and retry",
    'data-send-delay="1800" data-fail-next',
    "Send this update to the conversation.",
    "The first send demonstrates a recoverable error. Retry succeeds; stop restores the draft and attachments while sending.",
  ),
];

const inputDemo = (
  name: string,
  markup: string,
  script: string,
  description: string,
): CatalogExample => ({
  ...sample(
    name,
    `<div class="message-input-demo" data-mash-size="default">${markup}</div>`,
    description,
  ),
  script: composerScript + script,
});
const prompts =
  '["Summarize the notes","Help me plan the next release","Turn this idea into a first draft"]';
const selected = 'const form=document.querySelector(".mash-composer"), composer=form.composer;';
const result = '<output class="mash-composer-result" aria-live="polite"></output>';
const report =
  'form.addEventListener("composer-send",event=>{document.querySelector(".mash-composer-result").textContent="Sent: "+(event.detail.text || event.detail.files.map(file=>file.name).join(", "));});';
const minimal = (attrs = "", value = "") =>
  composerMarkup(attrs, value)
    .replace(/<ui-select[\s\S]*?<\/ui-select>/, "")
    .replace(/<ui-button[^>]*data-expand[\s\S]*?<\/ui-button>/, "");

composerExamples.push(
  inputDemo(
    "Suggested prompts",
    minimal(
      'data-no-attachments data-placeholder-suggestion="Help me plan the next release"',
    ).replace(/<ui-button[^>]*data-attach[\s\S]*?<\/ui-button>/, "") + result,
    selected + `composer.suggestions=${prompts};` + report,
    "Tab accepts the placeholder. ↓ explores suggestions; Enter fills one without sending. Shift+Tab still moves focus backward.",
  ),
  inputDemo(
    "Streaming and queued drafts",
    minimal("data-response-queue") +
      `<div class="mash-row mash-wrap"><ui-button id="finish-response" size="compact" outline>Finish response</ui-button><ui-switch id="streaming" checked>Streaming</ui-switch></div>${result}`,
    selected +
      `composer.status="streaming"; composer.queue=[{id:crypto.randomUUID(),text:"Start with a short summary.",files:[]},{id:crypto.randomUUID(),text:"Then list the open questions.",files:[]}];
const toggle=document.querySelector("#streaming");
function finish(){toggle.checked=false;composer.status="idle";}
document.querySelector("#finish-response").addEventListener("click",finish);
toggle.addEventListener("ui-switch-change",()=>{composer.status=toggle.checked?"streaming":"idle";});
form.addEventListener("composer-stop",finish);
form.addEventListener("composer-send",event=>{document.querySelector(".mash-composer-result").textContent="Dispatched: "+event.detail.text;toggle.checked=true;composer.status="streaming";});`,
    "Write while a response is running. Drag queued rows by their grip, or focus one and use Alt+↑/↓. Enter edits; Delete removes. Finishing dispatches the next message.",
  ),
  inputDemo(
    "History recall",
    minimal() + result,
    selected +
      'composer.history=["Summarize the meeting notes.","What should we work on next?"];' +
      report,
    "↑ on the first line recalls sent messages. ↓ on the last line returns to your current draft. Editing exits history; text selection keeps its native behavior.",
  ),
  inputDemo(
    "Attachment previews and limits",
    minimal('data-max-files="3"').replace(
      "multiple hidden",
      'accept="image/*,.txt,.md,application/pdf" multiple hidden',
    ) + result,
    selected +
      `composer.files=[new File(["Review the opening paragraph."],"review-notes.md",{type:"text/markdown"}),new File(['<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="20" fill="#c4d8b5"/><circle cx="60" cy="60" r="30" fill="#4e7053"/></svg>'],"palette.svg",{type:"image/svg+xml"})];` +
      report,
    "Drop images, PDF, Markdown, or text files. Three attachments maximum. Duplicate files are ignored. Images preview locally; documents retain their name and size. Files alone can be sent.",
  ),
  inputDemo(
    "Action areas",
    minimal().replace(
      '<span class="mash-composer-spacer"></span>',
      '<div data-actions="left"><ui-button id="browse-images" data-labelled type="button" variant="ghost" size="compact">Images</ui-button></div><span class="mash-composer-spacer"></span><div data-actions="right"><ui-select id="response-style" label="Response style" value="balanced" size="compact" placement="top"><ui-option value="balanced">Balanced</ui-option><ui-option value="brief">Brief</ui-option><ui-option value="thorough">Thorough</ui-option></ui-select></div>',
    ) + result,
    selected +
      'document.querySelector("#browse-images").addEventListener("click",()=>composer.openFilePicker("image/*"));' +
      report,
    "Compose either action area with ordinary Mash controls. The image action narrows the native picker; the response selector stays independent of the draft.",
  ),
  inputDemo(
    "Compact and disabled",
    `<div data-mash-size="compact">${minimal("data-disabled", "A saved draft stays readable while sending is unavailable.")}</div><ui-switch id="enable-composer">Enable composer</ui-switch>${result}`,
    selected +
      'document.querySelector("#enable-composer").addEventListener("ui-switch-change",event=>{composer.disabled=!event.currentTarget.checked;});' +
      report,
    "The compact size scope aligns the textarea, icons, and actions. Disabled blocks editing, queue actions, attachments, and sending.",
  ),
  inputDemo(
    "Composer CSS parts",
    `<style>.soft-composer{background:var(--color-surface-sunken);border-color:transparent;border-radius:1.5rem}.soft-composer:focus-within{border-color:var(--color-border)}.soft-composer ui-textarea::part(control){min-block-size:5rem}.soft-composer [data-send]::part(control){border-radius:var(--radius-pill)}</style>${minimal().replace('class="mash-composer"', 'class="mash-composer soft-composer"')}${result}`,
    selected + report,
    "The recipe supplies the surface. Textarea and button parts control the interior without replacing their editing, focus, or form behavior.",
  ),
);

// Scoped setup shares the public controller across isolated and consolidated previews.
for (const example of composerExamples) {
  example.scoped = true;
  example.script = example.script
    ?.replaceAll("document.querySelector", "root.querySelector")
    .replaceAll("document.addEventListener", "root.addEventListener");
}
