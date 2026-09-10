import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";
import { commandExamples } from "./command-tree.js";

const tabs = (
  variant: string,
  size = "inherit",
) => `<ui-tabs variant="${variant}" size="${size}" label="${variant} tabs" value="account">
  <ui-tab slot="tab" value="account">Account</ui-tab><ui-tab slot="tab" value="profile">Profile</ui-tab><ui-tab slot="tab" value="settings">Settings</ui-tab><ui-tab slot="tab" value="archived" disabled>Archived</ui-tab>
  <ui-tab-panel slot="panel" value="account">Account details</ui-tab-panel><ui-tab-panel slot="panel" value="profile">Your profile</ui-tab-panel><ui-tab-panel slot="panel" value="settings">Preferences</ui-tab-panel>
</ui-tabs>`;
export const navigationExamples: Record<string, CatalogExample[]> = {
  "ui-stepper": [
    sample(
      "Steps",
      `<ui-stepper value="details"><ui-step value="account" label="Account"></ui-step><ui-step value="details" label="Details"></ui-step><ui-step value="review" label="Review"></ui-step></ui-stepper>`,
    ),
    sample(
      "Vertical",
      `<ui-stepper orientation="vertical" value="details"><ui-step value="account" label="Account" description="Create your profile"></ui-step><ui-step value="details" label="Details" description="Add contact information"></ui-step><ui-step value="review" label="Review" description="Confirm and submit"></ui-step></ui-stepper>`,
    ),
    sample(
      "Sizes and alignment",
      ["xsmall", "small", "medium", "large"]
        .map(
          (size) =>
            `<ui-stepper size="${size}" align="center" value="details"><ui-step value="account" label="Account"></ui-step><ui-step value="details" label="Details"></ui-step><ui-step value="review" label="Review" disabled></ui-stepper>`,
        )
        .join("\n"),
    ),
  ],
  "ui-tabs": [
    sample(
      "Variants",
      ["default", "underline", "pill", "outline", "segmented"]
        .map(
          (variant) =>
            `<div class="mash-stack"><span>${variant.charAt(0).toUpperCase() + variant.slice(1)}</span>${tabs(variant)}</div>`,
        )
        .join("\n"),
      "Each treatment shares the same selection, keyboard navigation, and panel behavior.",
    ),
    sample(
      "Sizes",
      ["xsmall", "small", "medium", "large"].map((size) => tabs("segmented", size)).join("\n"),
    ),
    sample(
      "Stretched",
      ["underline", "pill", "segmented"]
        .map((variant) => tabs(variant).replace("<ui-tabs ", "<ui-tabs stretched "))
        .join("\n"),
      "Equal-width tabs fill their container and keep complete labels in the accessible name.",
    ),
    sample(
      "Icons",
      `<div class="mash-stack"><ui-tabs variant="segmented" label="Workspace views">
  <ui-tab slot="tab" value="search" label="Search"><ui-icon name="action.search" label=""></ui-icon></ui-tab>
  <ui-tab slot="tab" value="activity" label="Activity"><ui-icon name="status.information" label=""></ui-icon></ui-tab>
  <ui-tab slot="tab" value="saved" label="Saved"><ui-icon name="action.confirm" label=""></ui-icon></ui-tab>
  <ui-tab-panel slot="panel" value="search"><ui-input label="Search workspace" placeholder="Find a document"></ui-input></ui-tab-panel>
  <ui-tab-panel slot="panel" value="activity">You are up to date.</ui-tab-panel>
  <ui-tab-panel slot="panel" value="saved">Saved documents appear here.</ui-tab-panel>
</ui-tabs><ui-tabs variant="underline" label="Project views">
  <ui-tab slot="tab" value="overview"><ui-icon name="status.information" label=""></ui-icon> Overview</ui-tab>
  <ui-tab slot="tab" value="search"><ui-icon name="action.search" label=""></ui-icon> Search</ui-tab>
  <ui-tab-panel slot="panel" value="overview">Project overview</ui-tab-panel>
  <ui-tab-panel slot="panel" value="search"><ui-input label="Find in project"></ui-input></ui-tab-panel>
</ui-tabs></div>`,
      "Icon-only tabs expose a full label to assistive technology and the overflow chooser.",
    ),
    sample("Vertical", tabs("default").replace("<ui-tabs ", '<ui-tabs orientation="vertical" ')),
    {
      ...sample(
        "Rearrangeable",
        `<div class="mash-stack"><ui-tabs id="reorder-tabs" reorderable value="notes" label="Rearrangeable documents" variant="underline">
  <ui-tab slot="tab" value="notes">Notes</ui-tab><ui-tab slot="tab" value="tasks">Tasks</ui-tab><ui-tab slot="tab" value="plan">Plan</ui-tab><ui-tab slot="tab" value="archive" disabled>Archive</ui-tab>
  <ui-tab-panel slot="panel" value="notes"><ui-textarea label="Notes" value="This draft stays intact when tabs move."></ui-textarea></ui-tab-panel>
  <ui-tab-panel slot="panel" value="tasks"><ui-checkbox>Review the design</ui-checkbox></ui-tab-panel>
  <ui-tab-panel slot="panel" value="plan"><ui-input label="Plan title" value="Next release"></ui-input></ui-tab-panel>
</ui-tabs><div class="mash-row"><ui-button id="undo-order" outline disabled>Undo move</ui-button><ui-button id="reset-order" variant="ghost">Reset order</ui-button><output id="order-status" aria-live="polite">Notes · Tasks · Plan · Archive</output></div></div>`,
        "Drag a tab or focus it and press Alt+Shift+Arrow. Home and End with the same modifiers move to either edge. Edit a draft, reorder, then undo.",
      ),
      scoped: true,
      script: `const tabs = root.querySelector("#reorder-tabs");
const initial = tabs.getOrder();
let previous = null;
const undo = root.querySelector("#undo-order");
tabs.addEventListener("ui-tabs-reorder", event => {
  previous = event.detail.previous;
  undo.disabled = false;
  root.querySelector("#order-status").textContent = event.detail.order.join(" · ");
}, { signal });
undo.addEventListener("click", () => { if (previous) { const order = previous; tabs.setOrder(order); previous = null; undo.disabled = true; } }, { signal });
root.querySelector("#reset-order").addEventListener("click", () => tabs.setOrder(initial), { signal });`,
    },
    {
      ...sample(
        "Dynamic tabs",
        `<style>
#documents { display:block; width:100%; border:var(--border-hairline) solid var(--color-border); border-radius:var(--radius-container); background:var(--color-surface); overflow:hidden; }
#documents::part(strip) { padding:var(--space-control-gap); background:var(--color-surface-sunken); }
#documents::part(panels) { padding:var(--space-container-gap); min-block-size:13rem; border-block-start:var(--border-hairline) solid var(--color-border); }
#documents ui-tab { min-inline-size:7rem; max-inline-size:12rem; }
#documents ui-tab::part(root), #documents ui-tab::part(control) { inline-size:100%; }
#documents ui-tab::part(control) { justify-content:flex-start; }
#documents ui-tab[selected]::part(control) { background:var(--color-surface); color:var(--color-text); box-shadow:0 var(--border-hairline) var(--space-control-gap) var(--color-shadow); }
#documents ui-tab[selected]::part(control):hover { background:var(--color-surface-hover); }
#documents ui-textarea::part(control) { min-block-size:10rem; border:0; background:transparent; padding:0; box-shadow:none; resize:vertical; }
#documents ui-textarea::part(control):focus { outline:none; }
</style><ui-tabs id="documents" size="small" variant="default" value="notes" label="Open documents" reorderable>
  <ui-tab slot="tab" value="notes" closable>Notes</ui-tab><ui-tab slot="tab" value="tasks" closable>Tasks</ui-tab>
  <ui-tab-panel slot="panel" value="notes"><ui-textarea label="Your notes" value="Keep this draft when closing and reopening."></ui-textarea></ui-tab-panel>
  <ui-tab-panel slot="panel" value="tasks"><ui-checkbox>Review the latest changes</ui-checkbox></ui-tab-panel>
  <div slot="suffix" class="mash-row"><ui-button id="reopen-tab" size="small" variant="ghost" disabled>Reopen</ui-button><ui-button id="add-tab" size="small" variant="ghost" aria-label="Add document"><ui-icon name="action.add" label=""></ui-icon></ui-button></div>
</ui-tabs>`,
        "Drag to rearrange. Add, close, and reopen documents without losing drafts. Delete closes the focused tab; Alt+Shift+Arrow moves it.",
      ),
      scoped: true,
      script: `const tabs = root.querySelector("#documents");
let count = 0;
const closed = [];
const reopen = root.querySelector("#reopen-tab");
tabs.addEventListener("ui-tab-close", event => {
  const children = [...tabs.children].filter(child => child.value === event.detail.value);
  closed.push(children);
  children.forEach(child => child.remove());
  reopen.disabled = false;
}, { signal });
reopen.addEventListener("click", () => {
  const children = closed.pop();
  if (!children) return;
  tabs.append(...children);
  tabs.value = children[0].value;
  reopen.disabled = !closed.length;
}, { signal });
root.querySelector("#add-tab").addEventListener("click", () => {
  const value = "document-" + ++count;
  const tab = document.createElement("ui-tab");
  Object.assign(tab, { slot: "tab", value, closable: true, textContent: "Document " + count });
  const panel = document.createElement("ui-tab-panel");
  Object.assign(panel, { slot: "panel", value });
  const input = document.createElement("ui-textarea");
  input.label = "Document " + count;
  input.placeholder = "Start writing…";
  panel.append(input);
  tabs.append(tab, panel);
  tabs.value = value;
  tab.updateComplete.then(() => tab.focus());
}, { signal });`,
    },
    sample(
      "Overflow",
      `<ui-tabs label="Open files" variant="underline" style="--mash-tab-max-inline-size: 10rem">${Array.from({ length: 12 }, (_, index) => `<ui-tab slot="tab" value="file-${index}">Document ${index + 1} with a longer name</ui-tab><ui-tab-panel slot="panel" value="file-${index}"><ui-input label="Document ${index + 1} title" value="Document ${index + 1} with a longer name"></ui-input></ui-tab-panel>`).join("")}</ui-tabs>`,
      "Use Arrow keys or the overflow chooser to reach every document. The chooser and tab tooltip preserve full names; each document retains its own editable title.",
    ),
    {
      ...sample(
        "Adjacent controls",
        `<ui-tabs id="navigation-tabs" variant="underline" label="Workspace sections" value="account">
  <div slot="prefix" class="mash-row"><ui-button id="previous-tab" size="small" variant="ghost" aria-label="Previous tab"><ui-icon name="navigation.back" label=""></ui-icon></ui-button><ui-button id="next-tab" size="small" variant="ghost" aria-label="Next tab"><ui-icon name="navigation.forward" label=""></ui-icon></ui-button></div>
  <ui-tab slot="tab" value="account">Account</ui-tab><ui-tab slot="tab" value="profile">Profile</ui-tab><ui-tab slot="tab" value="settings">Settings</ui-tab>
  <ui-tab-panel slot="panel" value="account"><ui-input label="Account name" value="Personal workspace"></ui-input></ui-tab-panel><ui-tab-panel slot="panel" value="profile"><ui-input label="Display name" value="Alex"></ui-input></ui-tab-panel><ui-tab-panel slot="panel" value="settings"><ui-switch checked>Show notifications</ui-switch></ui-tab-panel>
  <ui-button slot="suffix" id="reset-tabs" size="small" variant="ghost">First tab</ui-button>
</ui-tabs>`,
        "Adjacent actions move through the same selection as the tab controls. Panel edits persist while switching.",
      ),
      scoped: true,
      script: `const tabs = root.querySelector("#navigation-tabs");
function navigate(offset) {
  const values = tabs.getOrder();
  const index = (values.indexOf(tabs.value) + offset + values.length) % values.length;
  tabs.select(values[index]);
}
root.querySelector("#previous-tab").addEventListener("click", () => navigate(-1), { signal });
root.querySelector("#next-tab").addEventListener("click", () => navigate(1), { signal });
root.querySelector("#reset-tabs").addEventListener("click", () => { tabs.select(tabs.getOrder()[0]); }, { signal });`,
    },
  ],
  "ui-kbd": [
    sample(
      "Control sizes",
      `<div class="mash-stack"><div class="mash-row" data-mash-size="default"><ui-button outline>Search<ui-kbd slot="suffix" shortcut="Primary+K"></ui-kbd></ui-button><span>Default</span><ui-kbd shortcut="Primary+Shift+P"></ui-kbd></div><div class="mash-row" data-mash-size="compact"><ui-button outline>Search<ui-kbd slot="suffix" shortcut="Primary+K"></ui-kbd></ui-button><span>Compact</span><ui-kbd shortcut="Primary+Shift+P"></ui-kbd><ui-kbd size="default" shortcut="Escape"></ui-kbd></div></div>`,
      "Key labels follow the surrounding control size. The Escape key pins the default size inside a compact group.",
    ),
    sample(
      "Shortcuts",
      `<div class="mash-row mash-wrap">${["Primary+K", "Primary+Shift+P", "Escape", "Enter", "ArrowLeft", "F12"].map((shortcut) => `<ui-kbd shortcut="${shortcut}"></ui-kbd>`).join("\n")}</div>`,
    ),
    sample(
      "Platform formatting",
      `<div class="mash-row"><span>Mac</span><ui-kbd platform="mac" command="palette.open" shortcut="Control+Alt+Shift+Meta+P"></ui-kbd></div><div class="mash-row"><span>Windows</span><ui-kbd platform="windows" command="palette.open" shortcut="Control+Alt+Shift+P"></ui-kbd></div>`,
    ),
    sample(
      "Inline",
      `<p>Press <ui-kbd appearance="plain" command="search.open" shortcut="Primary+K"></ui-kbd> to search.</p>`,
    ),
  ],
  "ui-command": commandExamples,
};
