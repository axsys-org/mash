import type { CatalogExample } from "../examples.js";
import { composerExamples } from "./composer.js";
import { sample } from "./shared.js";

/** Focused compositions using native semantics and existing component parts. */
export const patternExamples: Record<string, CatalogExample[]> = {
  "ui-textarea": composerExamples,
  "ui-card": [
    sample(
      "Description list",
      `<ui-card><strong slot="title">Project details</strong><dl class="mash-description-list"><dt>Name</dt><dd>Website</dd><dt>Owner</dt><dd><div class="mash-row"><ui-avatar size="small" alt="Alex">AL</ui-avatar>Alex</div></dd><dt>Status</dt><dd><ui-badge tone="positive">Ready</ui-badge></dd><dt>Repository</dt><dd><ui-link href="https://example.com">example.com</ui-link></dd></dl></ui-card>`,
      "Use a native description list for labelled facts. Keep editable fields in a form.",
    ),
  ],
  "ui-avatar": [
    sample(
      "Group",
      `<div class="mash-avatar-group" role="group" aria-label="Project members"><ui-avatar alt="Alex">AL</ui-avatar><ui-avatar alt="Sam">SA</ui-avatar><ui-avatar alt="Morgan">MO</ui-avatar><ui-avatar alt="Three more members">+3</ui-avatar></div>`,
      "Name every person with alt; the fallback remains visible when an image fails.",
    ),
    {
      ...sample(
        "Group limits",
        `<div id="limited-members" class="mash-avatar-group" role="group" aria-label="Team members"></div><ui-slider id="member-limit" label="Visible members" min="1" max="6" step="1" value="3"></ui-slider><ui-switch id="member-ellipsis">Use an ellipsis for overflow</ui-switch><output id="member-count" aria-live="polite"></output>`,
        "The composition owns the member list and visible limit. Overflow retains the names of hidden members in its accessible label.",
      ),
      script: `const members = ["Alex Morgan", "Sam Rivera", "Jo Chen", "Robin Lee", "Morgan Park", "Taylor Reed"];
const group = document.querySelector("#limited-members");
const limitControl = document.querySelector("#member-limit");
const ellipsis = document.querySelector("#member-ellipsis");
function renderMembers() {
  const limit = Math.max(1, Math.min(members.length, limitControl.value));
  const avatars = members.slice(0, limit).map(name => {
    const avatar = document.createElement("ui-avatar");
    avatar.alt = name;
    return avatar;
  });
  const hidden = members.slice(limit);
  if (hidden.length) {
    const overflow = document.createElement("ui-avatar");
    overflow.alt = hidden.length + " more members: " + hidden.join(", ");
    overflow.textContent = ellipsis.checked ? "…" : "+" + hidden.length;
    avatars.push(overflow);
  }
  group.replaceChildren(...avatars);
  document.querySelector("#member-count").textContent = limit + " of " + members.length + " members visible";
}
limitControl.addEventListener("ui-slider-input", renderMembers);
ellipsis.addEventListener("ui-switch-change", renderMembers);
renderMembers();`,
    },
  ],
  "ui-command": [
    {
      ...sample(
        "Selectable list",
        `<ui-command label="Recent files"><ui-command-item value="proposal"><ui-icon slot="icon" name="object.document" label=""></ui-icon>Proposal<ui-badge slot="shortcut">PDF</ui-badge></ui-command-item><ui-command-item value="notes"><ui-icon slot="icon" name="object.document" label=""></ui-icon>Meeting notes</ui-command-item><ui-command-item value="archive" disabled>Archived file</ui-command-item></ui-command>`,
        "Use a listbox when choosing an item. Ordinary content lists can use native ul and li with mash-list.",
      ),
      script: `document.querySelector("ui-command").searchable = false;`,
    },
  ],
  "ui-form": [
    {
      ...sample(
        "Settings",
        `<ui-form><form id="settings" class="mash-stack"><ui-fieldset legend="Appearance"><div class="mash-settings"><ui-field label="Color mode" description="Follow the device or choose a theme."><ui-select slot="control" name="theme" label="Color mode" value="system"><ui-option value="system">System</ui-option><ui-option value="light">Light</ui-option><ui-option value="dark">Dark</ui-option></ui-select></ui-field><ui-switch name="motion" checked>Animate interface changes</ui-switch></div></ui-fieldset><ui-fieldset legend="Notifications"><div class="mash-settings"><ui-switch name="reviews" checked>Review requests</ui-switch><ui-switch name="digest">Weekly digest</ui-switch></div></ui-fieldset><div class="mash-row"><ui-button type="submit" variant="primary">Save preferences</ui-button><ui-button type="reset">Reset</ui-button><output id="settings-result" aria-live="polite"></output></div></form></ui-form>`,
        "Group related preferences with a fieldset. Native submission and reset work with Mash's form-associated controls.",
      ),
      script: `document.querySelector("#settings").addEventListener("submit", event => {
  event.preventDefault();
  const preferences = Object.fromEntries(new FormData(event.target));
  document.querySelector("#settings-result").textContent = "Saved · " + preferences.theme;
});`,
    },
  ],
  "ui-fieldset": [
    sample(
      "Groups",
      `<ui-fieldset legend="Delivery"><div class="mash-stack"><ui-radio-group name="delivery" label="Delivery method" value="email"><ui-radio value="email">Email</ui-radio><ui-radio value="download">Download</ui-radio></ui-radio-group></div></ui-fieldset><ui-fieldset legend="Unavailable settings" disabled><ui-input label="Team name" value="Design"></ui-input><ui-switch checked>Public access</ui-switch></ui-fieldset>`,
    ),
  ],
  "ui-toolbar": [
    sample(
      "Status bar",
      `<ui-toolbar label="Editor status" data-mash-size="small"><ui-label text="Saved" secondary="Just now"></ui-label><div class="mash-fill"></div><ui-button variant="ghost">Line 12, Column 8</ui-button><ui-separator orientation="vertical"></ui-separator><ui-button variant="ghost">UTF-8</ui-button><ui-button variant="ghost">HTML</ui-button></ui-toolbar>`,
      "Use a toolbar for actionable status controls. Keep passive status messages concise and announce changes only when useful.",
    ),
  ],
  "ui-navigation-menu": [
    {
      ...sample(
        "Collapsible sidebar",
        `<ui-navigation-menu id="sidebar-nav" label="Workspace" class="mash-sidebar"><div class="mash-row"><strong class="mash-fill">Workspace</strong><ui-button id="collapse-sidebar" size="small" variant="ghost" aria-label="Toggle navigation labels"><ui-icon name="navigation.disclosure" label=""></ui-icon></ui-button></div><ul class="mash-list"><li><ui-link href="#inbox"><ui-icon name="object.document" label=""></ui-icon><span class="sidebar-label">Inbox</span></ui-link></li><li><ui-link href="#projects"><ui-icon name="action.search" label=""></ui-icon><span class="sidebar-label">Projects</span></ui-link></li></ul><ui-collapsible open><span slot="trigger">Recent</span><ul class="mash-list"><li><ui-link href="#website">Website</ui-link></li><li><ui-link href="#documentation">Documentation</ui-link></li></ul></ui-collapsible><ui-separator></ui-separator><div class="mash-row"><ui-avatar size="small" alt="Alex">AL</ui-avatar><span class="sidebar-label">Alex</span></div></ui-navigation-menu>`,
        "Keep navigation links as links. Collapse only when each remaining icon has an accessible name.",
      ),
      script: `const sidebar = document.querySelector("#sidebar-nav");
document.querySelector("#collapse-sidebar").addEventListener("click", () => {
  const collapsed = sidebar.toggleAttribute("data-collapsed");
  sidebar.querySelectorAll(".sidebar-label").forEach(label => {
    const link = label.closest("ui-link");
    if (link) link.setAttribute("aria-label", label.textContent);
    label.hidden = collapsed;
  });
  sidebar.querySelector("ui-collapsible").hidden = collapsed;
});`,
    },
  ],
};
