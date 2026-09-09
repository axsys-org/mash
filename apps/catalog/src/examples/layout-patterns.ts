import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const groupContent = `<div class="mash-stack"><ui-checkbox checked>Product updates</ui-checkbox><ui-checkbox>Weekly summary</ui-checkbox></div>`;
const disclosureInput = `<ui-input label="Project name" value="Studio website"></ui-input><ui-switch checked>Notify collaborators</ui-switch>`;
const details = `<div><dt>Name</dt><dd>Studio website</dd></div><div><dt>Version</dt><dd>1.4.0</dd></div><div><dt>Status</dt><dd><ui-badge tone="positive">Ready</ui-badge></dd></div><div class="details-wide"><dt>Description</dt><dd>A shared place to review ideas, design the next release, and keep decisions close to the work.</dd></div><div class="details-wide"><dt>Repository</dt><dd><ui-link href="https://example.com">example.com</ui-link></dd></div><div><dt>Platforms</dt><dd>Desktop and mobile web</dd></div>`;
const detailsStyle = `<style>.details-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0;gap:var(--space-container-gap)}.details-grid>div{min-width:0;border-block-end:var(--border-hairline) solid var(--color-fill-secondary-opaque);padding-block:var(--space-control-block)}.details-grid dt{color:var(--color-text-muted)}.details-grid dd{margin:0;overflow-wrap:anywhere}.details-wide{grid-column:span 2}.details-grid[data-horizontal]>div{display:grid;grid-template-columns:minmax(5rem,1fr) minmax(0,2fr);gap:var(--space-control-gap)}.details-grid[data-borderless]>div{border:0}@media(max-width:560px){.details-grid{grid-template-columns:1fr}.details-wide{grid-column:auto}}</style>`;

export const layoutPatternExamples: Record<string, CatalogExample[]> = {
  "ui-card": [
    {
      ...sample(
        "Card",
        `<ui-card style="max-width:28rem"><strong slot="title">Project</strong><span slot="description">Everything in one place.</span><p>A simple container for related content.</p><ui-button id="open-card-project" slot="footer" size="small">Open project</ui-button></ui-card><ui-reveal id="card-project" ><div class="mash-panel"><strong>Studio website</strong><p>Your project is ready for its next review.</p></div></ui-reveal>`,
        "The card groups its title, description, body, and footer. Its action opens the local project summary.",
      ),
      script: `document.querySelector("#open-card-project").addEventListener("click", event => { const details = document.querySelector("#card-project"); details.open = !details.open; event.target.textContent = details.open ? "Close project" : "Open project"; });`,
    },
    {
      ...sample(
        "Description layouts",
        `${detailsStyle}<div class="mash-row mash-wrap"><ui-switch id="horizontal-details">Labels beside values</ui-switch><ui-switch id="borderless-details">Without rules</ui-switch></div><dl id="project-details" class="details-grid">${details}</dl>`,
        "Native description groups can span columns while retaining label/value semantics. Narrow previews stack the groups; horizontal labels remain paired with their values.",
      ),
      script: `const details = document.querySelector("#project-details");
document.querySelector("#horizontal-details").addEventListener("ui-switch-change", event => { details.toggleAttribute("data-horizontal", event.detail.checked); });
document.querySelector("#borderless-details").addEventListener("ui-switch-change", event => { details.toggleAttribute("data-borderless", event.detail.checked); });`,
    },
    sample(
      "Description scale",
      `${detailsStyle}<div class="mash-stack">${["small", "medium", "large"].map((size) => `<dl class="details-grid" style="font-size:var(--type-label-${size === "medium" ? "" : size + "-"}font-size)"><div><dt>Size</dt><dd>${size}</dd></div><div><dt>Owner</dt><dd>Alex Morgan</dd></div><div><dt>Status</dt><dd>Active</dd></div></dl>`).join("")}</div>`,
      "Scale is authored through semantic typography; field meaning and the native description structure stay the same.",
    ),
    sample(
      "Group treatments",
      `<style>.filled-group::part(root){background:var(--color-fill-tertiary-opaque);padding:var(--space-container-inline);border-radius:var(--radius-container)}.outlined-group::part(root){border:var(--border-hairline) solid var(--color-fill-secondary-opaque);padding:var(--space-container-inline);border-radius:var(--radius-container)}</style><div class="mash-grid"><ui-fieldset legend="Normal">${groupContent}</ui-fieldset><ui-fieldset class="filled-group" legend="Filled">${groupContent}</ui-fieldset><ui-fieldset class="outlined-group" legend="Outlined">${groupContent}</ui-fieldset><section class="mash-panel" aria-label="Untitled notification group">${groupContent}</section></div>`,
      "Related inputs use a fieldset and legend. A plain section can group content without a visible heading; the public root part supplies fill or outline.",
    ),
  ],
  "ui-collapsible": [
    sample(
      "Basic",
      `<ui-collapsible open><span slot="trigger">Order details</span><div class="mash-stack"><strong>Order 4189</strong><span>Studio notebook · 2 items</span><ui-badge tone="positive">Shipped</ui-badge></div></ui-collapsible>`,
      "The trigger reveals existing content. Closing the region keeps authored controls and their state mounted.",
    ),
    sample(
      "Row trigger",
      `<style>.row-disclosure::part(trigger){width:100%;justify-content:space-between}</style><ui-collapsible class="row-disclosure"><span slot="trigger">How can I change my preferences?</span><p>Open your workspace settings, choose a section, and save the changes. Your existing projects stay available.</p></ui-collapsible>`,
    ),
    sample(
      "Bottom trigger",
      `<style>.bottom-disclosure{display:flex;flex-direction:column-reverse}.bottom-disclosure::part(trigger){align-self:center}</style><ui-collapsible class="bottom-disclosure" open><span slot="trigger">Show or hide usage details</span><div class="mash-panel mash-stack"><strong>Monthly usage</strong><ui-progress value="72" label="Monthly usage"></ui-progress><span>72 of 100 credits used</span></div></ui-collapsible>`,
      "Reorder the public host layout when the reveal control belongs below its content.",
    ),
    sample(
      "Settings",
      `<ui-collapsible open><span slot="trigger">Notification settings</span><div class="mash-stack">${disclosureInput}<ui-checkbox>Send a weekly digest</ui-checkbox></div></ui-collapsible>`,
      "Edit the field, close the section, and reopen it. The form values stay with the content.",
    ),
    {
      ...sample(
        "Row actions",
        `<div class="mash-row"><ui-collapsible id="keys-disclosure" class="mash-fill"><span slot="trigger">API keys</span><ul id="local-keys" class="mash-list"><li>Development key</li></ul></ui-collapsible><ui-button id="create-local-key" size="small">Add key</ui-button></div><output id="key-result" aria-live="polite">One local key</output>`,
        "Independent actions sit beside the disclosure button; never nest a button inside a button.",
      ),
      script: `let count = 1;
document.querySelector("#create-local-key").addEventListener("click", () => { const item = document.createElement("li"); item.textContent = "Development key " + ++count; document.querySelector("#local-keys").append(item); document.querySelector("#keys-disclosure").open = true; document.querySelector("#key-result").textContent = count + " local keys"; });`,
    },
    sample(
      "Nested",
      `<ui-collapsible open><span slot="trigger">Workspace</span><div class="mash-stack"><ui-collapsible><span slot="trigger">Access</span><ui-switch checked>Allow invitations</ui-switch></ui-collapsible><ui-collapsible><span slot="trigger">Appearance</span><ui-input label="Workspace title" value="Studio"></ui-input></ui-collapsible></div></ui-collapsible>`,
      "Nested disclosures own independent state. Collapse the outer section without resetting the inner forms.",
    ),
    sample(
      "Profile",
      `<ui-collapsible><span slot="trigger"><span class="mash-row"><ui-avatar size="small" alt="Alex Morgan"></ui-avatar>Alex Morgan</span></span><div class="mash-stack"><strong>Product designer</strong><p>Building useful tools for creative teams.</p><ui-label text="Joined" secondary="March 2026"></ui-label></div></ui-collapsible>`,
    ),
  ],
  "ui-badge": [
    sample(
      "Meanings",
      `<div class="mash-row mash-wrap">${["accent", "neutral", "positive", "warning", "critical"].map((tone) => `<ui-badge tone="${tone}">${tone}</ui-badge>`).join("")}</div>`,
    ),
    {
      ...sample(
        "Counts",
        `<div class="mash-row mash-wrap" style="gap:calc(var(--space-group-block) * 2);padding:var(--space-group-related)"><ui-badge id="inbox-count" variant="count" count="12" max="99" label="12 unread messages"><ui-icon slot="target" name="object.document" label="Inbox"></ui-icon></ui-badge><ui-badge variant="count" count="103" max="99" label="103 notifications"><ui-avatar slot="target" alt="Alex Morgan"></ui-avatar></ui-badge><ui-badge variant="count" count="1200" max="999" label="1200 updates"><ui-button slot="target">Updates</ui-button></ui-badge></div><ui-slider id="unread-slider" min="0" max="120" step="1" value="12" label="Unread messages"></ui-slider><output id="unread-count" aria-live="polite">12 unread messages</output>`,
        "Counts over the maximum use a plus suffix. Zero removes the annotation without hiding its target.",
      ),
      script: `document.querySelector("#unread-slider").addEventListener("ui-slider-input", event => { const count = event.detail.value; const badge = document.querySelector("#inbox-count"); badge.count = count; badge.label = count + " unread messages"; document.querySelector("#unread-count").textContent = badge.label; });`,
    },
    sample(
      "Dot and icon",
      `<div class="mash-row mash-wrap" style="gap:calc(var(--space-group-block) * 2);padding:var(--space-group-related)"><ui-badge variant="dot" tone="positive" label="Alex is online"><ui-avatar slot="target" alt="Alex Morgan"></ui-avatar></ui-badge><ui-badge variant="icon" tone="positive" label="Verified workspace"><ui-icon slot="icon" name="action.confirm" size="small" label=""></ui-icon><ui-avatar slot="target" alt="Studio workspace" shape="square">S</ui-avatar></ui-badge><ui-badge variant="dot" tone="warning" label="New activity"><ui-icon slot="target" name="action.search" label="Search"></ui-icon></ui-badge></div>`,
    ),
    sample(
      "Sizes and nesting",
      `<div class="mash-row mash-wrap">${["small", "medium", "large"].map((size) => `<ui-badge variant="count" size="${size}" count="3" label="3 updates"><ui-avatar slot="target" size="${size}" alt="Alex Morgan"></ui-avatar></ui-badge>`).join("")}<ui-badge variant="count" count="12" label="12 new updates"><ui-badge slot="target" variant="icon" tone="positive" label="Verified"><ui-icon slot="icon" name="action.confirm" size="small" label=""></ui-icon><ui-avatar slot="target" size="large" alt="Studio">S</ui-avatar></ui-badge></ui-badge></div>`,
      "An annotation can target another annotation. Keep each accessible meaning distinct.",
    ),
  ],
  "ui-label": [
    sample(
      "Labels",
      `<ui-label text="Account details"></ui-label><ui-label text="Company address" secondary="Optional"></ui-label><ui-label text="Workspace owner" secondary="Administrator" style="font-weight:600"></ui-label>`,
    ),
    {
      ...sample(
        "Highlighting",
        `<ui-input id="label-query" label="Find matching text" value="a"></ui-input><ui-switch id="prefix-label">Prefix match only</ui-switch><ui-label class="search-label" text="Design system documentation" highlight="a"></ui-label><ui-label class="search-label" text="AAA中文BB" highlight="a"></ui-label>`,
        "Search matching can cover the full text or only its prefix, including mixed-script content.",
      ),
      script: `function update() { document.querySelectorAll(".search-label").forEach(label => { label.highlight = document.querySelector("#label-query").value; label.highlightMatch = document.querySelector("#prefix-label").checked ? "prefix" : "full"; }); }
document.querySelector("#label-query").addEventListener("input", update);
document.querySelector("#prefix-label").addEventListener("ui-switch-change", update);`,
    },
    {
      ...sample(
        "Masked value",
        `<div class="mash-row"><div class="mash-stack"><span>Available balance</span><ui-label id="balance-value" text="$9,182.10" masked size="2xl"></ui-label></div><ui-button id="reveal-balance" variant="ghost">Reveal balance</ui-button></div>`,
        "Masking is a presentation choice, not a storage or authorization boundary.",
      ),
      script: `document.querySelector("#reveal-balance").addEventListener("click", event => { const label = document.querySelector("#balance-value"); label.masked = !label.masked; event.target.textContent = label.masked ? "Reveal balance" : "Hide balance"; });`,
    },
    sample(
      "Alignment and wrapping",
      `<div class="mash-stack" style="width:min(100%,24rem)"><ui-label text="Start aligned" align="start"></ui-label><ui-label text="Center aligned" align="center"></ui-label><ui-label text="End aligned" align="end"></ui-label><ui-label text="Long labels wrap naturally inside constrained layouts without losing their secondary context." secondary="Optional"></ui-label></div>`,
    ),
  ],
  "ui-separator": [
    sample(
      "Horizontal",
      `<style>.dashed-rule::part(root){background:none;border-block-start:var(--border-hairline) dashed var(--color-text-muted);height:0}</style><div class="mash-stack"><ui-separator></ui-separator><div class="mash-row"><ui-separator class="mash-fill"></ui-separator><span>With label</span><ui-separator class="mash-fill"></ui-separator></div><ui-separator class="dashed-rule"></ui-separator><div class="mash-row"><ui-separator class="mash-fill dashed-rule"></ui-separator><span>Dashed with label</span><ui-separator class="mash-fill dashed-rule"></ui-separator></div></div>`,
      "A centered label is ordinary text between two rules. The public root part controls the dashed treatment.",
    ),
    sample(
      "Vertical",
      `<style>.vertical-dashed::part(root){background:none;border-inline-start:var(--border-hairline) dashed var(--color-text-muted);width:0}</style><div class="mash-row" style="height:5rem"><span>Overview</span><ui-separator orientation="vertical"></ui-separator><span>Activity</span><ui-separator class="vertical-dashed" orientation="vertical"></ui-separator><span>Settings</span></div>`,
    ),
    sample(
      "Leading marker",
      `<ui-separator><ui-icon slot="prefix" name="object.document" label="Project files"></ui-icon></ui-separator>`,
      "The separator's prefix slot anchors a marker at the leading edge.",
    ),
  ],
  "ui-icon": [
    sample(
      "Icons",
      `<div class="mash-row mash-wrap">${["action.search", "action.add", "action.dismiss", "action.download", "navigation.forward", "navigation.back", "action.confirm"].map((name) => `<ui-icon name="${name}" label="${name}"></ui-icon>`).join("")}</div>`,
    ),
    sample(
      "Size and color",
      `<div class="mash-row mash-wrap">${["small", "medium", "large"].map((size) => `<ui-icon name="action.search" size="${size}" label="${size} search"></ui-icon>`).join("")}<ui-icon name="action.confirm" label="Complete" style="color:var(--color-positive)"></ui-icon><ui-icon name="action.dismiss" label="Unavailable" style="color:var(--color-critical)"></ui-icon></div><style>.rotated-icon::part(glyph){rotate:90deg}.custom-size-icon{font-size:40px}</style><div class="mash-row"><ui-icon class="rotated-icon" name="navigation.forward" label="Rotated forward arrow"></ui-icon><ui-icon class="custom-size-icon" name="action.search" label="40 pixel search"></ui-icon></div>`,
    ),
    sample(
      "Authored SVG",
      `<ui-icon label="Diamond mark"><svg slot="primary" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 3 9 9-9 9-9-9Z"/><path d="M3 12h18M12 3v18"/></svg></ui-icon>`,
      "The public primary slot accepts authored SVG and preserves the surrounding icon's accessible name.",
    ),
    {
      ...sample(
        "Icon actions",
        `<div class="mash-row"><ui-button id="icon-search"><ui-icon slot="prefix" name="action.search" label=""></ui-icon>Search</ui-button><ui-menu label="Icon actions"><ui-button slot="trigger">Actions</ui-button><ui-menu-item value="download"><ui-icon slot="prefix" name="action.download" label=""></ui-icon>Download</ui-menu-item></ui-menu></div><output id="icon-result" aria-live="polite">Choose an action.</output>`,
        "Decorative icons share the control's accessible name. Each control owns a real local action.",
      ),
      script: `document.querySelector("#icon-search").addEventListener("click", () => { document.querySelector("#icon-result").textContent = "Search selected."; });
document.querySelector("ui-menu").addEventListener("ui-menu-select", () => { document.querySelector("#icon-result").textContent = "Download selected."; });`,
    },
  ],
  "ui-marker": [
    sample(
      "Treatments",
      `<ui-marker variant="plain">Plain status update</ui-marker><ui-marker>Earlier messages</ui-marker><ui-marker variant="border">Unread messages</ui-marker>`,
    ),
    sample(
      "Status and icons",
      `<ui-marker variant="plain" style="color:var(--color-positive)"><ui-icon slot="icon" name="action.confirm" size="small" label=""></ui-icon>Online</ui-marker><ui-marker variant="plain"><ui-spinner slot="icon" size="small" label="Activity"></ui-spinner>Alex is typing…</ui-marker><ui-marker variant="plain"><ui-icon slot="icon" name="object.document" label=""></ui-icon>Conversation details updated</ui-marker><ui-marker variant="plain">No icon required</ui-marker>`,
    ),
    {
      ...sample(
        "Loading and actions",
        `<ui-marker id="loading-marker" variant="plain"><ui-shimmer>Preparing the next reply…</ui-shimmer></ui-marker><ui-marker id="draft-marker" variant="border" hidden><span class="mash-row">A draft is ready<ui-button id="open-marker-draft" size="small">Open draft</ui-button></span></ui-marker><div class="mash-row"><ui-button id="complete-marker">Complete</ui-button><ui-button id="restart-marker" variant="ghost">Restart</ui-button></div><ui-reveal id="marker-draft"><ui-textarea label="Prepared draft" rows="3" value="Thanks for the update. I will review it today."></ui-textarea></ui-reveal>`,
        "Compose shimmer and actions without adding a fixed status model to the marker. Draft content stays mounted when its reveal closes.",
      ),
      script: `document.querySelector("#complete-marker").addEventListener("click", () => { document.querySelector("#loading-marker").hidden = true; document.querySelector("#draft-marker").hidden = false; });
document.querySelector("#restart-marker").addEventListener("click", () => { document.querySelector("#loading-marker").hidden = false; document.querySelector("#draft-marker").hidden = true; document.querySelector("#marker-draft").open = false; });
document.querySelector("#open-marker-draft").addEventListener("click", () => { document.querySelector("#marker-draft").open = true; });`,
    },
  ],
};
