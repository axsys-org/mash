import type { CatalogExample } from "../examples.js";
import { composerMarkup, composerScript } from "./composer.js";
import { sample } from "./shared.js";

const incoming = `<ui-message>
  <ui-avatar slot="avatar" alt="Alex" size="small">AL</ui-avatar>
  <span slot="header">Alex · 10:24</span>
  <ui-bubble variant="secondary">Can you take a look at the revised proposal?</ui-bubble>
</ui-message>`;
const outgoing = `<ui-message alignment="end">
  <span slot="header">You · 10:25</span>
  <ui-bubble alignment="end">Looks good. I left a note on the timeline.</ui-bubble>
  <span slot="footer">Read</span>
</ui-message>`;
const attachment = `<ui-attachment>
  <ui-icon slot="media" name="object.document" label=""></ui-icon>
  <strong slot="title">proposal.pdf</strong>
  <span slot="description">PDF · 2.4 MB</span>
  <ui-button slot="actions" size="small" variant="ghost" aria-label="Download proposal"><ui-icon name="action.download" label=""></ui-icon></ui-button>
</ui-attachment>`;

export const conversationExamples: Record<string, CatalogExample[]> = {
  "ui-message": [
    sample("Conversation", `${incoming}${outgoing}`),
    sample(
      "Attachments and actions",
      `<ui-message><span slot="header">Alex · 10:26</span>${attachment}<div slot="footer" class="mash-row"><ui-button size="xsmall" variant="ghost">Reply</ui-button><ui-button size="xsmall" variant="ghost">Forward</ui-button></div></ui-message>`,
    ),
    sample(
      "Unframed",
      `<ui-message><span slot="header">Assistant</span><ui-bubble variant="ghost">The proposal is ready for review.</ui-bubble><span slot="footer">Just now</span></ui-message>`,
    ),
  ],
  "ui-attachment": [
    sample("File", attachment),
    sample(
      "Lifecycle",
      `<ui-attachment status="uploading"><ui-spinner slot="media" label="Uploading"></ui-spinner><strong slot="title">recording.mp4</strong><span slot="description">Uploading · 42%</span></ui-attachment><ui-attachment status="failed"><strong slot="title">notes.txt</strong><span slot="description">Upload failed</span><ui-button slot="actions" size="small">Retry</ui-button></ui-attachment>`,
    ),
    sample(
      "Sizes",
      ["xsmall", "small", "medium", "large"]
        .map((size) => attachment.replace("<ui-attachment>", `<ui-attachment size="${size}">`))
        .join("\n"),
    ),
    sample(
      "Vertical preview",
      `<div class="mash-grid"><ui-attachment orientation="vertical"><div slot="media" class="mash-panel" style="aspect-ratio: 2; display: grid; place-items: center"><ui-icon name="object.document" label="Document preview"></ui-icon></div><strong slot="title">design-notes.md</strong><span slot="description">Markdown · 12 KB</span><ui-button slot="actions" size="small">Open preview</ui-button></ui-attachment></div>`,
    ),
  ],
  "ui-marker": [
    sample(
      "Treatments",
      `<ui-marker variant="plain">Today</ui-marker><ui-marker>New messages</ui-marker><ui-marker variant="border">Yesterday</ui-marker>`,
    ),
  ],
  "ui-alert": [
    sample(
      "Meanings",
      ["info", "positive", "warning", "critical"]
        .map(
          (tone, i) =>
            `<ui-alert tone="${tone}" closable><strong slot="title">${["Update available", "Changes saved", "Connection interrupted", "Unable to save"][i]}</strong>${["A new version is ready to install.", "Your work is up to date.", "Reconnecting in the background.", "Try again when the connection returns."][i]}</ui-alert>`,
        )
        .join("\n"),
    ),
    sample(
      "Banner",
      `<ui-alert banner tone="warning"><strong slot="title">Scheduled maintenance</strong>Some services may be briefly unavailable.</ui-alert>`,
    ),
  ],
  "ui-rating": [
    sample("Rating", `<ui-rating label="Your rating" value="3"></ui-rating>`),
    sample(
      "States and sizes",
      `<ui-rating size="small" label="Read-only score" readonly value="4"></ui-rating><ui-rating label="Unavailable rating" disabled value="3"></ui-rating><ui-rating size="large" label="Ten-point score" max="10" value="7"></ui-rating>`,
    ),
  ],
  "ui-message-scroller": [
    {
      ...sample(
        "Live conversation",
        `<ui-message-scroller id="conversation" label="Project conversation"><ui-marker>Today</ui-marker>${Array.from({ length: 5 }, () => incoming + outgoing).join("\n")}</ui-message-scroller><div class="mash-row"><ui-button id="earlier" size="small">Load earlier</ui-button><ui-button id="append" size="small">Receive message</ui-button></div>${composerMarkup()}`,
      ),
      script:
        `const conversation = document.querySelector("#conversation");
const message = text => {
  const row = document.createElement("ui-message");
  const bubble = document.createElement("ui-bubble");
  bubble.variant = "secondary";
  bubble.textContent = text;
  row.append(bubble);
  return row;
};
document.querySelector("#earlier").addEventListener("click", () => conversation.prepend(message("Earlier context, with your reading position preserved.")));
document.querySelector("#append").addEventListener("click", () => conversation.append(message("A new message just arrived.")));
document.querySelector(".mash-composer").addEventListener("composer-send", event => {
  const row = message(event.detail.text || "Attached files");
  row.alignment = "end";
  row.querySelector("ui-bubble").variant = "filled";
  row.querySelector("ui-bubble").alignment = "end";
  for (const file of event.detail.files) {
    const attachment = document.createElement("ui-attachment");
    const title = document.createElement("strong"); title.slot = "title"; title.textContent = file.name;
    attachment.append(title); row.append(attachment);
  }
  conversation.append(row);
  requestAnimationFrame(() => conversation.scrollToLatest());
});
` + composerScript,
    },
    {
      ...sample(
        "Long history",
        `<div class="mash-row"><ui-button id="unread" size="small">Jump to unread</ui-button><ui-button id="older-history" size="small">Load 100 earlier</ui-button><span>10,000 messages · variable heights</span></div><ui-message-scroller id="history" label="Message history"><span slot="latest">Jump to latest ↓</span></ui-message-scroller>`,
        "Only the visible window is mounted. Stable IDs preserve the reading position as earlier history arrives; the owner chooses the unread message.",
      ),
      script: `const history = document.querySelector("#history");
history.renderMessage = item => {
  const row = document.createElement("ui-message");
  row.alignment = item.outgoing ? "end" : "start";
  const label = document.createElement("span"); label.slot = "header"; label.textContent = item.author;
  const bubble = document.createElement("ui-bubble"); bubble.variant = item.outgoing ? "filled" : "secondary"; bubble.alignment = item.outgoing ? "end" : "start"; bubble.textContent = item.text;
  row.append(label, bubble); return row;
};
history.items = Array.from({ length: 10000 }, (_, index) => ({ id: "message-" + index, author: index % 2 ? "You" : "Alex", outgoing: Boolean(index % 2), text: "Message " + (index + 1) + (index % 4 ? ": A quick update." : ": The latest review includes a few more details about the proposed interaction. We can keep the controls close to their content and give every action a clear outcome.") }));
document.querySelector("#unread").addEventListener("click", () => history.scrollToMessage("message-9750"));
let earlier = 0;
document.querySelector("#older-history").addEventListener("click", () => {
  history.items = [...Array.from({ length: 100 }, () => ({ id: "earlier-" + ++earlier, author: "Alex", text: "Earlier context " + earlier })), ...history.items];
});`,
    },
  ],
  "ui-bubble": [
    sample(
      "Surfaces",
      ["filled", "secondary", "muted", "tinted", "outline", "ghost", "critical"]
        .map(
          (variant) =>
            `<ui-bubble variant="${variant}">${variant.charAt(0).toUpperCase() + variant.slice(1)} message</ui-bubble>`,
        )
        .join("\n"),
    ),
    sample(
      "Message rows",
      `<ui-bubble-group><ui-bubble variant="secondary" alignment="start">A short message.</ui-bubble><ui-bubble variant="secondary" alignment="start">And a follow-up.</ui-bubble></ui-bubble-group><ui-bubble alignment="end">Thank you.<ui-button slot="reactions" size="xsmall" variant="secondary">♡ 2</ui-button></ui-bubble>`,
    ),
  ],
};
