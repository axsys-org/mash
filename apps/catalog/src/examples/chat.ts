import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";
import { conversationExamples } from "./message-conversation.js";
import { composerMarkup, composerScript } from "./composer.js";

const message = (text: string, attributes = "", metadata = "") =>
  `<ui-message ${attributes}>${metadata}<ui-bubble variant="secondary">${text}</ui-bubble></ui-message>`;
const history = Array.from({ length: 24 }, (_, index) =>
  message(
    `Message ${index + 1}. ${index % 3 ? "The review is moving forward." : "We checked the proposal, kept the useful details and left room for the next round of feedback."}`,
    `id="message-${index + 1}"`,
    `<span slot="header">${index % 2 ? "You" : "Alex"} · ${String(index + 1).padStart(2, "0")}</span>`,
  ),
).join("");
const status = `<output id="chat-status" aria-live="polite">Ready</output>`;
const owner = `const scroller = document.querySelector("ui-message-scroller");
const status = document.querySelector("#chat-status");
const row = (text, id = "") => {
  const message = document.createElement("ui-message"); message.id = id;
  const bubble = document.createElement("ui-bubble"); bubble.variant = "secondary"; bubble.textContent = text; message.append(bubble); return message;
};
document.querySelector("#first-message")?.addEventListener("click", () => { scroller.scrollToMessage("message-1"); status.textContent="First message"; });
document.querySelector("#middle-message")?.addEventListener("click", () => { scroller.scrollToMessage("message-12"); status.textContent="Message 12"; });
document.querySelector("#latest-message")?.addEventListener("click", () => { scroller.scrollToLatest(); status.textContent="Latest message"; });`;
const targets = `<div class="mash-row mash-wrap"><ui-button id="first-message" size="small" outline>First message</ui-button><ui-button id="middle-message" size="small" outline>Message 12</ui-button><ui-button id="latest-message" size="small" outline>Latest</ui-button></div>`;

const scrollerExample = (
  name: string,
  code: string,
  description: string,
  script: string,
): CatalogExample => ({
  ...sample(name, code + status, description),
  script: owner + "\n" + script,
});

export const chatScrollerExamples: CatalogExample[] = [
  scrollerExample(
    "Streaming responses",
    `${targets}<ui-message-scroller label="Streaming conversation">${history}<ui-message id="response"><span slot="header">Assistant</span><ui-bubble variant="ghost" aria-live="off">Start a response to see it grow.</ui-bubble></ui-message></ui-message-scroller><div class="mash-row mash-wrap"><ui-button id="start-stream" size="small" variant="primary">Start response</ui-button><ui-button id="stop-stream" size="small" outline disabled>Stop response</ui-button><ui-button id="expand-response" size="small" variant="ghost">Expand response</ui-button><ui-button id="reset-stream" size="small" variant="ghost">Reset response</ui-button></div>`,
    "Content grows in place. Follow at the end, or read an earlier message while generation continues; stop preserves the partial response.",
    `const response = document.querySelector("#response ui-bubble");
const start = document.querySelector("#start-stream"), stop = document.querySelector("#stop-stream");
const words = ("The next step is to make each interaction useful on its own. Keep the content readable, preserve the reader's position and expose a clear path back to the newest message. ".repeat(5)).trim().split(" ");
let timer, position = 0;
function stopStream(label) { clearInterval(timer); timer=undefined; start.disabled=false; stop.disabled=true; status.textContent=label; }
start.addEventListener("click", () => {
  stopStream(""); position=0; response.textContent=""; start.disabled=true; stop.disabled=false; status.textContent="Generating response…";
  timer=setInterval(() => { response.textContent += (position ? " " : "") + words[position++]; if (position===words.length) stopStream("Response complete"); },35);
});
stop.addEventListener("click", () => stopStream("Response stopped · partial text retained"));
document.querySelector("#expand-response").addEventListener("click", () => { stopStream("Response expanded"); response.textContent = words.join(" "); });
document.querySelector("#reset-stream").addEventListener("click", () => { stopStream("Response reset"); response.textContent="Start a response to see it grow."; });
addEventListener("pagehide", () => clearInterval(timer), {once:true});`,
  ),
  scrollerExample(
    "Loading earlier messages",
    `<div class="mash-row mash-wrap"><ui-button id="load-earlier" size="small" outline>Load 5 earlier</ui-button><ui-button id="oldest-message" size="small" variant="ghost">Oldest loaded</ui-button><ui-checkbox id="fail-earlier">Fail next load</ui-checkbox></div><ui-message-scroller label="Earlier messages">${history}</ui-message-scroller>`,
    "Delayed loading preserves the current reading anchor. Simulate a failure, retry, then jump to the oldest loaded message.",
    `const load = document.querySelector("#load-earlier"); let count=0, timer;
load.addEventListener("click", () => {
  load.disabled=true; status.textContent="Loading earlier messages…";
  timer=setTimeout(() => {
    load.disabled=false;
    if (document.querySelector("#fail-earlier").checked) { document.querySelector("#fail-earlier").checked=false; load.textContent="Retry earlier messages"; status.textContent="Earlier messages could not load. Your conversation is unchanged."; return; }
    const rows=Array.from({length:5},()=>row("Earlier context " + ++count, "earlier-" + count)).reverse();
    scroller.prepend(...rows); load.textContent="Load 5 earlier"; status.textContent=count+" earlier messages loaded";
  },450);
});
document.querySelector("#oldest-message").addEventListener("click", () => { scroller.scrollToMessage(count ? "earlier-"+count : "message-1"); status.textContent="Oldest loaded message"; });
addEventListener("pagehide", () => clearTimeout(timer), {once:true});`,
  ),
  scrollerExample(
    "Jumping to messages",
    `${targets}<ui-message-scroller label="Message navigation">${history}</ui-message-scroller>`,
    "Targets use stable message IDs. The same public methods work with authored rows and virtual history.",
    `scroller.addEventListener("ui-message-scroll", event => { if (event.detail.atEnd) status.textContent="Reading latest messages"; });`,
  ),
  scrollerExample(
    "Empty conversation",
    `<ui-message-scroller label="New conversation"><div slot="empty" class="mash-stack"><strong>Start a conversation</strong><p>Your first message will appear here.</p><ui-button id="add-first" size="small" outline>Add a first message</ui-button></div></ui-message-scroller><div class="mash-row"><ui-button id="clear-conversation" size="small" variant="ghost">Clear conversation</ui-button></div>${composerMarkup()}`,
    "The empty state is useful content. Add a starter or write your own message; clearing restores the same composer and empty state.",
    `document.querySelector("#add-first").addEventListener("click", () => { scroller.append(row("Welcome. What would you like to work on?")); status.textContent="Conversation started"; });
document.querySelector("#clear-conversation").addEventListener("click", () => { [...scroller.children].filter(child=>!child.hasAttribute("slot")).forEach(child=>child.remove()); status.textContent="Conversation cleared"; });
document.querySelector(".mash-composer").addEventListener("composer-send", event => { const message=row(event.detail.text || "Attached files"); message.alignment="end"; message.querySelector("ui-bubble").variant="filled"; for (const file of event.detail.files) { const attachment=document.createElement("ui-attachment"); const title=document.createElement("strong"); title.slot="title"; title.textContent=file.name; attachment.append(title); message.append(attachment); } scroller.append(message); requestAnimationFrame(()=>scroller.scrollToLatest()); status.textContent="Message sent"; });
${composerScript}`,
  ),
  scrollerExample(
    "Custom jump button",
    `<style>ui-message-scroller::part(latest) { border:var(--border-hairline) solid var(--color-border); background:var(--color-surface); color:var(--color-text); border-radius:var(--radius-pill); }</style>${targets}<ui-message-scroller label="Custom conversation navigation">${history}<span slot="latest">↓ Back to the conversation</span></ui-message-scroller>`,
    "Customize the public latest-button part and its label. Read earlier messages to reveal it.",
    "",
  ),
  scrollerExample(
    "Application-owned controls",
    `${targets}<ui-message-scroller hide-latest label="Application-owned navigation">${history}</ui-message-scroller>`,
    "The owner provides all navigation controls and suppresses the built-in button. Latest becomes unavailable when you are already there.",
    `const latest=document.querySelector("#latest-message");
const update=()=>{ latest.disabled=scroller.atEnd; };
scroller.addEventListener("ui-message-scroll", update); scroller.updateComplete.then(update);`,
  ),
];

const file = `<ui-attachment><ui-icon slot="media" name="object.document" label=""></ui-icon><strong slot="title">proposal.md</strong><span slot="description">Markdown · project brief</span><ui-button slot="actions" data-download size="small" variant="ghost" aria-label="Download proposal"><ui-icon name="action.download" label=""></ui-icon></ui-button></ui-attachment>`;
const fileText =
  "# Project proposal\n\nKeep the navigation compact, retain drafts and make each action useful.\n\n- Review the layout\n- Check keyboard access\n- Share the next revision\n";
const downloadOwner = `for (const button of document.querySelectorAll("[data-download]")) button.addEventListener("click", () => {
  const url=URL.createObjectURL(new Blob([${JSON.stringify(fileText)}],{type:"text/markdown"})); const link=document.createElement("a"); link.href=url; link.download="proposal.md"; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
});`;
const actionsOwner = `${downloadOwner}
const result=document.querySelector("#message-action-result");
for (const button of document.querySelectorAll("[data-copy]")) button.addEventListener("click",async()=>{ try { await navigator.clipboard.writeText(button.closest("ui-message").querySelector("ui-bubble").textContent); result.textContent="Message copied"; } catch { result.textContent="Select the message text to copy"; } });
for (const toggle of document.querySelectorAll("[data-like],[data-save]")) toggle.addEventListener("ui-toggle-change",event=>{ result.textContent=(toggle.hasAttribute("data-like") ? "Reaction " : "Saved message ")+(event.detail.pressed ? "added" : "removed"); });
document.querySelector("#retry-message")?.addEventListener("click", event=>{ const button=event.currentTarget; button.disabled=true; result.textContent="Retrying…"; setTimeout(()=>{ const bubble=button.closest("ui-message").querySelector("ui-bubble"); bubble.variant="secondary"; bubble.textContent="The response is ready for review."; button.hidden=true; result.textContent="Response delivered"; },350); });`;

export const messageExamples: Record<string, CatalogExample[]> = {
  "ui-message": [
    ...conversationExamples,
    sample(
      "Conversation",
      `${message("Can you review the revised proposal?", "", '<ui-avatar slot="avatar" alt="Alex" size="small">AL</ui-avatar><span slot="header">Alex · 10:24</span>')}${message("I left a note on the timeline.", 'alignment="end"', '<span slot="header">You · 10:25</span><span slot="footer">Read</span>')}`,
    ),
    sample(
      "Avatars",
      `${message("An avatar identifies the sender.", "", '<ui-avatar slot="avatar" alt="Alex" size="small">AL</ui-avatar>')}${message("The next message keeps the avatar column clear.", "", '<span slot="avatar" style="display:block;width:2rem" aria-hidden="true"></span>')}${message("A message can also start without an avatar.")}`,
    ),
    sample(
      "Header and footer",
      ["auto", "none", "bubble"]
        .map((inset) =>
          message(
            "Metadata can align with the content or its bubble.",
            `inset="${inset}"`,
            `<span slot="header">${inset} inset</span><span slot="footer">Delivered · just now</span>`,
          ),
        )
        .join(""),
    ),
    {
      ...sample(
        "Attachments and actions",
        `<ui-message><span slot="header">Alex · 10:26</span>${file}<div slot="footer" class="mash-row"><ui-button id="reply-message" size="xsmall" variant="ghost">Reply</ui-button><ui-button id="forward-message" size="xsmall" variant="ghost">Forward</ui-button></div></ui-message><form id="reply-form" class="mash-stack" hidden><ui-textarea name="reply" label="Reply to Alex" rows="2"></ui-textarea><ui-button type="submit" size="small" variant="primary">Send reply</ui-button></form><div id="replies" class="mash-stack"></div><output id="message-action-result" aria-live="polite"></output>`,
        "Download the actual brief, reply in place, or forward it into a local conversation preview.",
      ),
      script: `${downloadOwner}
const form=document.querySelector("#reply-form"), input=form.querySelector("ui-textarea"), result=document.querySelector("#message-action-result");
document.querySelector("#reply-message").addEventListener("click",()=>{ form.hidden=!form.hidden; if(!form.hidden) input.focus(); });
form.addEventListener("submit",event=>{ event.preventDefault(); if(!input.value.trim()) return; const message=document.createElement("ui-message"); message.alignment="end"; const bubble=document.createElement("ui-bubble"); bubble.textContent=input.value; message.append(bubble); document.querySelector("#replies").append(message); input.value=""; form.hidden=true; result.textContent="Reply sent"; });
document.querySelector("#forward-message").addEventListener("click",()=>{ const message=document.createElement("ui-message"); const header=document.createElement("span"); header.slot="header"; header.textContent="Forwarded to project notes"; const attachment=document.querySelector("ui-attachment").cloneNode(true); attachment.querySelector("[data-download]").remove(); message.append(header,attachment); document.querySelector("#replies").append(message); result.textContent="Brief forwarded to project notes"; });`,
    },
    {
      ...sample(
        "Actions",
        `<ui-message><ui-bubble variant="secondary">The draft is ready for a final review.</ui-bubble><div slot="footer" class="mash-row"><ui-button data-copy size="xsmall" variant="ghost">Copy</ui-button><ui-toggle data-like>Like</ui-toggle><ui-toggle data-save>Save</ui-toggle></div></ui-message><ui-message><ui-bubble variant="critical">The response could not be sent.</ui-bubble><ui-button id="retry-message" slot="footer" size="small" variant="ghost">Retry response</ui-button></ui-message><output id="message-action-result" aria-live="polite"></output>`,
        "Copy uses the clipboard, reactions and saved state toggle, and retry replaces the failed response.",
      ),
      script: actionsOwner,
    },
    sample(
      "Multiple bubbles",
      `<ui-message><ui-avatar slot="avatar" alt="Alex" size="small">AL</ui-avatar><span slot="header">Alex</span><ui-bubble-group><ui-bubble variant="secondary">Here is the first part.</ui-bubble><ui-bubble variant="secondary">And a little more context.</ui-bubble>${file.replace(/<ui-button[\s\S]*?<\/ui-button>/, "")}</ui-bubble-group><span slot="footer">Three items · one sender</span></ui-message>`,
    ),
    sample(
      "Grouping",
      `<div class="mash-stack" role="group" aria-label="Messages from Alex">${message("The layout is ready.", "", '<ui-avatar slot="avatar" alt="Alex" size="small">AL</ui-avatar><span slot="header">Alex · 10:24</span>')}${message("The interactions are next.", "", '<span slot="avatar" style="display:block;width:2rem" aria-hidden="true"></span><span slot="footer">Delivered</span>')}</div>`,
    ),
    sample(
      "Custom style",
      `<style>.review-message::part(content) { border-inline-start:3px solid var(--color-action); padding-inline-start:var(--space-container-inline); }</style>${message("This response uses a quiet document treatment.", 'class="review-message"', '<span slot="header">Review assistant</span><span slot="footer">Ready for feedback</span>').replace('variant="secondary"', 'variant="ghost"')}`,
      "Public parts can give a message a document treatment while its content and metadata remain semantic.",
    ),
    sample(
      "Unframed",
      `${message("The proposal is ready for review.", 'inset="auto"', '<span slot="header">Assistant</span><span slot="footer">Just now</span>').replace('variant="secondary"', 'variant="ghost"')}`,
    ),
  ],
  "ui-attachment": [
    {
      ...sample(
        "File",
        file,
        "Download saves the brief shown in this preview as a real Markdown file.",
      ),
      script: downloadOwner,
    },
    {
      ...sample(
        "Lifecycle",
        ["pending", "uploading", "failed", "ready"]
          .map(
            (state, index) =>
              `<ui-attachment status="${state}"><strong slot="title">Document ${index + 1}.md</strong><span slot="description">${state}</span>${state === "ready" ? '<ui-button slot="actions" data-download size="small">Download</ui-button>' : `<ui-button slot="actions" data-upload size="small">${state === "failed" ? "Retry" : state === "pending" ? "Start upload" : "Continue upload"}</ui-button>`}</ui-attachment>`,
          )
          .join(""),
        "Start, continue or retry a transfer. Progress reaches a real ready state; failure leaves a useful retry path.",
      ),
      script: `${downloadOwner}
const timers=new Set();
document.querySelectorAll("[data-upload]").forEach(button=>button.addEventListener("click",()=>{
 const attachment=button.closest("ui-attachment"), description=attachment.querySelector('[slot="description"]'); let progress=0; attachment.status="uploading"; button.disabled=true;
 const timer=setInterval(()=>{ progress+=10; description.textContent="Uploading · "+progress+"%"; if(progress===100) { clearInterval(timer); timers.delete(timer); attachment.status="ready"; description.textContent="Upload complete"; button.textContent="Uploaded"; } },90); timers.add(timer);
})); addEventListener("pagehide",()=>timers.forEach(clearInterval),{once:true});`,
    },
    {
      ...sample(
        "Sizes",
        ["xsmall", "small", "medium", "large"]
          .map((size) => file.replace("<ui-attachment>", `<ui-attachment size="${size}">`))
          .join(""),
      ),
      script: downloadOwner,
    },
    {
      ...sample(
        "Vertical preview",
        `<ui-dialog label="Document preview"><ui-attachment slot="trigger" orientation="vertical"><div slot="media" class="mash-panel" style="aspect-ratio:2;display:grid;place-items:center"><ui-icon name="object.document" label="Document preview"></ui-icon></div><strong slot="title">proposal.md</strong><span slot="description">Markdown · project brief</span><ui-button slot="actions" size="small">Open preview</ui-button></ui-attachment><span slot="title">Project proposal</span><ui-typeset flow="block"><h2>Project proposal</h2><p>Keep the navigation compact, retain drafts and make each action useful.</p><ul><li>Review the layout</li><li>Check keyboard access</li><li>Share the next revision</li></ul></ui-typeset><ui-button slot="close" size="small">Close preview</ui-button></ui-dialog>`,
        "Open the document without leaving the catalogue; close returns focus to the preview trigger.",
      ),
    },
  ],
};
