import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

/** An application-owned form composed from public controls and a shared recipe. */
export const composerMarkup = (attributes = "", value = "") => `
<form class="mash-composer" aria-label="Message composer" ${attributes}>
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
  <div class="mash-composer-status" hidden><output aria-live="polite"></output><ui-button type="button" variant="ghost" size="small" data-retry hidden>Retry</ui-button></div>
</form>`;

/** Included verbatim in each example's reference code; no hidden stage controller. */
export const composerScript = `for (const form of document.querySelectorAll(".mash-composer")) {
  const draft = form.querySelector("ui-textarea");
  const send = form.querySelector("[data-send]");
  const stop = form.querySelector("[data-stop]");
  const expand = form.querySelector("[data-expand]");
  const attach = form.querySelector("[data-attach]");
  const picker = form.querySelector('input[type="file"]');
  const context = form.querySelector(".mash-composer-context");
  const status = form.querySelector(".mash-composer-status");
  const output = status.querySelector("output");
  const retry = form.querySelector("[data-retry]");
  const mode = form.querySelector(".mash-composer-mode");
  let files = [];
  let pending = null;
  let timer;
  let pinned = form.hasAttribute("data-expanded");
  const announce = (text, error = false) => {
    status.hidden = !text;
    output.textContent = text;
    form.dataset.status = error ? "error" : "idle";
    retry.hidden = !error;
  };
  const sync = () => {
    send.disabled = !draft.value.trim() && !files.length;
    draft.rows = pinned ? 6 : Math.min(4, Math.max(1, draft.value.split("\\n").length));
    form.toggleAttribute("data-expanded", pinned);
    expand.setAttribute("aria-expanded", String(pinned));
    expand.setAttribute("aria-label", pinned ? "Collapse composer" : "Expand composer");
  };
  const renderFiles = () => {
    context.replaceChildren();
    context.hidden = !files.length;
    files.forEach((file, index) => {
      const chip = document.createElement("span"); chip.className = "mash-composer-file";
      const icon = document.createElement("ui-icon"); icon.name = "object.document"; icon.label = "";
      const name = document.createElement("span"); name.textContent = file.name;
      const remove = document.createElement("ui-button"); remove.type = "button"; remove.variant = "ghost"; remove.size = "xsmall";
      remove.setAttribute("aria-label", "Remove " + file.name);
      const close = document.createElement("ui-icon"); close.name = "action.dismiss"; close.label = ""; remove.append(close);
      remove.addEventListener("click", () => { files.splice(index, 1); renderFiles(); sync(); });
      chip.append(icon, name, remove); context.append(chip);
    });
  };
  const setBusy = busy => {
    form.toggleAttribute("data-sending", busy);
    draft.readonly = busy; attach.disabled = mode.disabled = busy;
    context.inert = busy;
    send.hidden = busy; stop.hidden = !busy;
  };
  const finish = () => {
    if (!pending) return;
    const message = pending; pending = null;
    setBusy(false);
    if (form.hasAttribute("data-fail-next")) {
      form.removeAttribute("data-fail-next");
      draft.value = message.text; files = message.files; renderFiles(); sync();
      announce("Couldn't send. Your draft is safe.", true);
    } else {
      form.dispatchEvent(new CustomEvent("composer-send", { bubbles: true, detail: message }));
      announce("Sent");
    }
    draft.focus();
  };
  const submit = () => {
    if (pending || (!draft.value.trim() && !files.length)) return;
    pending = { text: draft.value.trim(), files: [...files], mode: mode.value };
    draft.value = ""; files = []; renderFiles(); sync();
    retry.hidden = true;
    const delay = Number(form.dataset.sendDelay) || 0;
    if (delay) {
      setBusy(true); announce("Sending…");
      timer = setTimeout(finish, delay);
      stop.focus();
    } else finish();
  };
  form.addEventListener("submit", event => { event.preventDefault(); submit(); });
  draft.addEventListener("input", sync);
  draft.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault(); submit();
    }
  });
  expand.addEventListener("click", () => { pinned = !pinned; sync(); draft.focus(); });
  attach.addEventListener("click", () => picker.click());
  picker.addEventListener("change", () => { files.push(...picker.files); picker.value = ""; renderFiles(); sync(); draft.focus(); });
  form.addEventListener("dragover", event => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); });
  form.addEventListener("drop", event => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault(); if (pending) return;
    files.push(...event.dataTransfer.files); renderFiles(); sync();
  });
  stop.addEventListener("click", () => {
    clearTimeout(timer); if (!pending) return;
    draft.value = pending.text; files = pending.files; pending = null;
    setBusy(false); renderFiles(); sync(); announce("Sending stopped. Continue editing."); draft.focus();
  });
  retry.addEventListener("click", submit);
  mode.addEventListener("ui-select-change", event => {
    draft.placeholder = { ask: "Ask anything, or describe a task…", plan: "What would you like to plan?", write: "What would you like to write?" }[event.detail.value];
  });
  if (form.dataset.context) {
    files = form.dataset.context.split(",").map(name => new File(["Example context"], name));
    renderFiles();
  }
  sync();
}
`;

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
