import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const placements = [
  "top-start",
  "top-center",
  "top-end",
  "bottom-start",
  "bottom-center",
  "bottom-end",
];
const removeClosedToast = `toast.addEventListener("mash-presence-end", event => { if (event.target === toast && !event.detail.open && !event.detail.interrupted && !toast.open) toast.remove(); });`;
const notifications: CatalogExample = {
  ...sample(
    "Notification center",
    `<style>.notification-canvas{position:relative;min-height:32rem;border:var(--border-hairline) solid var(--color-fill-secondary-opaque);border-radius:var(--radius-container)}#notice-stack{position:absolute}</style><div class="mash-row mash-wrap"><ui-select id="notice-placement" label="Notification placement" value="bottom-end">${placements.map((placement) => `<ui-option value="${placement}">${placement}</ui-option>`).join("")}</ui-select><ui-select id="notice-limit" label="Visible notifications" value="3"><ui-option value="1">One visible</ui-option><ui-option value="3">Three visible</ui-option><ui-option value="0">All visible</ui-option></ui-select><ui-switch id="notice-timer">Auto-hide after five seconds</ui-switch></div><div class="mash-row mash-wrap"><ui-button data-notice="neutral">Information</ui-button><ui-button data-notice="positive">Success</ui-button><ui-button data-notice="warning">Warning</ui-button><ui-button data-notice="critical">Error</ui-button><ui-button id="dismiss-notices" variant="ghost">Dismiss all</ui-button></div><output id="notice-log" aria-live="polite">Create a notification. Hover or focus the stack to expand it and pause timers.</output><div class="notification-canvas"><ui-toast-stack id="notice-stack" placement="bottom-end" limit="3" label="Example notifications"></ui-toast-stack></div>`,
    "The owner creates and removes messages. Placement, limits, hover/focus expansion, and timers belong to the existing stack and toast contracts. This queue retains at most five messages.",
  ),
  script: `const stack = document.querySelector("#notice-stack");
const log = document.querySelector("#notice-log");
let sequence = 0;
const messages = {neutral:["New activity","A teammate left a comment."],positive:["Changes saved","Your project is up to date."],warning:["Connection unstable","Your draft remains available locally."],critical:["Upload failed","Check the file, then try again."]};
document.querySelectorAll("[data-notice]").forEach(button => button.addEventListener("click", () => {
  if (stack.children.length >= 5) stack.firstElementChild.remove();
  const toast = document.createElement("ui-toast");
  const tone = button.dataset.notice;
  const title = document.createElement("strong"); title.slot = "title"; title.textContent = messages[tone][0];
  toast.append(title, document.createTextNode(messages[tone][1]));
  toast.tone = tone; toast.duration = document.querySelector("#notice-timer").checked ? 5000 : 0; toast.open = true;
  const number = ++sequence;
  toast.addEventListener("click", event => { if (!event.composedPath().some(node => node instanceof HTMLElement && ["BUTTON","UI-BUTTON"].includes(node.tagName))) log.textContent = "Opened notification " + number; });
  toast.addEventListener("ui-toast-open-change", event => { log.textContent = "Closed notification " + number + " · " + event.detail.reason; });
  ${removeClosedToast}
  stack.append(toast); log.textContent = "Created notification " + number;
}));
document.querySelector("#notice-placement").addEventListener("ui-select-change", event => { stack.placement = event.detail.value; });
document.querySelector("#notice-limit").addEventListener("ui-select-change", event => { stack.limit = Number(event.detail.value); });
document.querySelector("#dismiss-notices").addEventListener("click", () => stack.dismissAll());`,
};

export const feedbackExamples: Record<string, CatalogExample[]> = {
  "ui-toast": [
    {
      ...sample(
        "Undo action",
        `<div class="mash-row"><ui-button id="archive-note">Archive note</ui-button><output id="note-state" aria-live="polite">Note is active.</output></div><ui-toast id="undo-notice" duration="0" tone="positive"><strong slot="title">Note archived</strong>The note can be restored from this notification.<ui-button id="undo-note" slot="actions" size="small">Undo</ui-button></ui-toast>`,
        "The action restores local state and dismisses the notification. Repeat Archive to try it again.",
      ),
      script: `const toast = document.querySelector("#undo-notice");
const archive = document.querySelector("#archive-note");
archive.addEventListener("click", () => { archive.disabled = true; toast.open = true; document.querySelector("#note-state").textContent = "Note archived."; });
document.querySelector("#undo-note").addEventListener("click", () => { archive.disabled = false; toast.requestClose("undo"); document.querySelector("#note-state").textContent = "Note restored."; });
toast.addEventListener("ui-toast-open-change", () => { archive.disabled = false; });`,
    },
    notifications,
    {
      ...sample(
        "Keyed updates",
        `<div class="mash-row mash-wrap"><ui-button data-job="upload">Update upload</ui-button><ui-button data-job="index">Update index</ui-button><ui-button id="clear-jobs" variant="ghost">Dismiss all</ui-button></div><div id="job-notices" class="mash-stack"></div><output id="job-result" aria-live="polite">Each job keeps one notification.</output>`,
        "Keys are application policy. Repeated updates replace content in the existing message; distinct jobs retain separate messages.",
      ),
      script: `const jobs = new Map();
document.querySelectorAll("[data-job]").forEach(button => button.addEventListener("click", () => {
  const key = button.dataset.job;
  let entry = jobs.get(key);
  if (!entry || !entry.toast.isConnected) {
    const toast = document.createElement("ui-toast"); toast.duration = 0;
    const title = document.createElement("strong"); title.slot = "title"; title.textContent = key === "upload" ? "Asset upload" : "Search index";
    const body = document.createElement("span"); toast.append(title, body);
    entry = {toast, body, updates:0}; jobs.set(key, entry);
    ${removeClosedToast}
    document.querySelector("#job-notices").append(toast);
  }
  entry.updates += 1; entry.body.textContent = "Update " + entry.updates + " received"; entry.toast.open = true;
  document.querySelector("#job-result").textContent = "Updated " + key + " · " + entry.updates;
}));
document.querySelector("#clear-jobs").addEventListener("click", () => { jobs.forEach(entry => entry.toast.requestClose("clear")); });`,
    },
    sample(
      "Rich content",
      `<ui-toast open duration="0"><ui-icon slot="icon" name="object.document" label=""></ui-icon><strong slot="title">Review summary</strong><div class="mash-stack"><p>The release is ready for a final check.</p><ul><li>Typography reviewed</li><li>Keyboard paths checked</li><li>Two notes remain</li></ul></div></ui-toast>`,
      "Notification content may use ordinary semantic markup. Keep essential decisions in the page or a dialog.",
    ),
  ],
  "ui-toast-stack": [notifications],
  "ui-alert": [
    {
      ...sample(
        "Meanings",
        `<div id="alert-meanings" class="mash-stack">${["info", "positive", "warning", "critical"].map((tone, index) => `<ui-alert tone="${tone}" closable><strong slot="title">${["Update available", "Changes saved", "Connection interrupted", "Unable to save"][index]}</strong>${["A new version is ready to install.", "Your work is up to date.", "Reconnecting in the background.", "Try again when the connection returns."][index]}</ui-alert>`).join("")}</div><ui-button id="restore-alerts" variant="ghost" size="small">Restore alerts</ui-button>`,
        "Dismiss each message independently; restore makes the demonstration repeatable.",
      ),
      script: `document.querySelector("#restore-alerts").addEventListener("click", () => document.querySelectorAll("#alert-meanings ui-alert").forEach(alert => { alert.hidden = false; }));`,
    },
    sample(
      "Rich content and custom icon",
      `<ui-alert tone="neutral"><ui-icon slot="icon" name="object.document" label=""></ui-icon><strong slot="title">Workspace ready</strong><p>Your workspace is ready for the team.</p><ul><li><strong>12 members</strong> have access</li><li>The owner manages billing</li></ul></ui-alert><ui-alert tone="warning">Two meetings overlap. Move one meeting or invite another owner before sending the agenda.</ui-alert>`,
      "Titles and icons are optional. Longer content keeps its own paragraphs, lists, and emphasis.",
    ),
    {
      ...sample(
        "Banner and recovery",
        `<ui-alert id="connection-alert" banner tone="warning" closable><strong slot="title">Live updates paused</strong><span id="connection-message">Your changes remain available locally.</span><ui-button id="reconnect" slot="actions" size="small">Reconnect</ui-button></ui-alert><ui-button id="disconnect" variant="ghost" size="small">Simulate interruption</ui-button><output id="connection-result" aria-live="polite">Waiting for reconnection.</output>`,
        "Recovery changes the local connection state. The banner can be dismissed and recreated without reloading the example.",
      ),
      script: `const alert = document.querySelector("#connection-alert");
document.querySelector("#reconnect").addEventListener("click", () => { alert.hidden = true; document.querySelector("#connection-result").textContent = "Connected. Your changes are synchronized."; });
document.querySelector("#disconnect").addEventListener("click", () => { alert.hidden = false; document.querySelector("#connection-result").textContent = "Waiting for reconnection."; });`,
    },
  ],
  "ui-tooltip": [
    sample(
      "Control triggers",
      `<div class="mash-row mash-wrap"><ui-tooltip label="Search this workspace"><ui-button slot="trigger">Search</ui-button>Search this workspace</ui-tooltip><ui-tooltip label="Remember this device"><ui-checkbox slot="trigger">Remember me</ui-checkbox>Remember this device</ui-tooltip><ui-tooltip label="Receive release updates"><ui-switch slot="trigger">Updates</ui-switch>Receive release updates</ui-tooltip><ui-tooltip label="Toggle bold text"><ui-toggle slot="trigger">Bold</ui-toggle>Toggle bold text</ui-tooltip><ui-tooltip label="Copy the command"><ui-clipboard slot="trigger" value="npm install @mash/ui" label="Copy install command"></ui-clipboard>Copy the command</ui-tooltip></div>`,
      "Hover or focus the actual control. Tooltip text adds context without replacing its accessible name.",
    ),
    sample(
      "Shortcut hint",
      `<ui-tooltip label="Search commands"><ui-button slot="trigger">Commands</ui-button><span class="mash-row">Search commands<ui-kbd shortcut="Primary+K" appearance="plain"></ui-kbd></span></ui-tooltip>`,
      "A passive shortcut hint belongs in the tooltip; interactive controls belong in a popover.",
    ),
    {
      ...sample(
        "Removed trigger",
        `<div id="removable-tooltip"><ui-tooltip label="This trigger can be removed"><ui-button id="remove-tooltip" slot="trigger">Remove me</ui-button>This trigger can be removed</ui-tooltip></div><ui-button id="restore-tooltip" variant="ghost" hidden>Restore button</ui-button><output id="tooltip-result" aria-live="polite">Hover or focus, then remove the trigger.</output>`,
        "Removing the trigger also removes its owner, so no detached tooltip remains open.",
      ),
      script: `const holder = document.querySelector("#removable-tooltip");
const tooltip = holder.firstElementChild;
const restore = document.querySelector("#restore-tooltip");
document.querySelector("#remove-tooltip").addEventListener("click", () => { tooltip.remove(); restore.hidden = false; restore.focus(); document.querySelector("#tooltip-result").textContent = "Trigger removed."; });
restore.addEventListener("click", () => { tooltip.open = false; holder.append(tooltip); restore.hidden = true; document.querySelector("#remove-tooltip").focus(); document.querySelector("#tooltip-result").textContent = "Trigger restored."; });`,
    },
  ],
  "ui-preview-card": [
    sample(
      "Profile preview",
      `<ui-preview-card label="Alex Morgan profile"><ui-link slot="trigger" href="https://example.com">Alex Morgan</ui-link><strong slot="title">Alex Morgan</strong><span slot="description">Product designer</span><div class="mash-row"><ui-avatar alt="Alex Morgan" size="large"></ui-avatar><p>Building calm interfaces for teams. Joined in March.</p></div></ui-preview-card>`,
      "Hover or focus the link for nonessential profile context. The link keeps its native destination.",
    ),
    sample(
      "Timing",
      `<div class="mash-row mash-wrap"><ui-preview-card open-delay="200" close-delay="100" label="Quick preview"><ui-button slot="trigger">Quick · 200ms</ui-button><strong slot="title">Quick preview</strong>Opens after 200ms and closes after 100ms.</ui-preview-card><ui-preview-card open-delay="1000" close-delay="500" label="Patient preview"><ui-button slot="trigger">Patient · 1000ms</ui-button><strong slot="title">Patient preview</strong>Opens after 1000ms and leaves a 500ms transfer window.</ui-preview-card></div>`,
      "Move from trigger to content to try the close delay. The preview does not take focus away from the trigger.",
    ),
    sample(
      "Positions",
      `<div class="mash-row mash-wrap">${["top", "bottom"].flatMap((side) => ["start", "center", "end"].map((align) => `<ui-preview-card placement="${side}" align="${align}" label="${side} ${align} preview"><ui-button slot="trigger">${side} ${align}</ui-button><strong slot="title">${side} ${align}</strong>Placement adapts at the viewport edge.</ui-preview-card>`)).join("")}</div>`,
    ),
  ],
  "ui-drawer": [
    sample(
      "Edges",
      `<div class="mash-row mash-wrap">${["start", "top", "end", "bottom"].map((side) => `<ui-drawer side="${side}" label="${side} sheet"><ui-button slot="trigger">${side}</ui-button><strong slot="title">${side} sheet</strong><p>Supplementary content enters from this edge.</p><ui-input label="${side} draft" value="This value stays after closing."></ui-input><ui-button slot="close">Done</ui-button></ui-drawer>`).join("")}</div>`,
      "Logical start/end follow writing direction. Open each edge, edit its field, close, and reopen.",
    ),
    {
      ...sample(
        "Scrollable form",
        `<ui-drawer id="profile-sheet" label="Profile settings" side="end"><ui-button slot="trigger">Edit profile</ui-button><strong slot="title">Profile settings</strong><form id="sheet-form" class="mash-stack"><ui-input id="sheet-name" label="Display name" value="Alex Morgan" required></ui-input><ui-textarea label="Biography" rows="4" value="I make tools for creative teams."></ui-textarea>${Array.from({ length: 8 }, (_, index) => `<ui-fieldset legend="Preference ${index + 1}"><ui-switch>Enable workspace option ${index + 1}</ui-switch><p>These settings stay available while you scroll through the form.</p></ui-fieldset>`).join("")}<div class="mash-row"><ui-button type="submit" variant="primary">Save profile</ui-button><ui-button id="cancel-sheet" type="button">Cancel</ui-button></div></form><ui-button slot="close">Close</ui-button></ui-drawer><output id="sheet-result" aria-live="polite">No changes saved.</output>`,
        "A long body scrolls within the sheet. Submission uses the native form contract and closes only after a valid save.",
      ),
      script: `const sheet = document.querySelector("#profile-sheet");
document.querySelector("#sheet-form").addEventListener("submit", event => { event.preventDefault(); document.querySelector("#sheet-result").textContent = "Saved profile for " + document.querySelector("#sheet-name").value; sheet.open = false; });
document.querySelector("#cancel-sheet").addEventListener("click", () => { sheet.open = false; });`,
    },
  ],
};
