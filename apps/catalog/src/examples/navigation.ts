import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const tabs = (
  variant: string,
  size = "inherit",
) => `<ui-tabs variant="${variant}" size="${size}" label="${variant} tabs" value="account">
  <ui-tab slot="tab" value="account">Account</ui-tab><ui-tab slot="tab" value="profile">Profile</ui-tab><ui-tab slot="tab" value="settings">Settings</ui-tab><ui-tab slot="tab" value="archived" disabled>Archived</ui-tab>
  <ui-tab-panel slot="panel" value="account">Account details</ui-tab-panel><ui-tab-panel slot="panel" value="profile">Your profile</ui-tab-panel><ui-tab-panel slot="panel" value="settings">Preferences</ui-tab-panel>
</ui-tabs>`;
const commands = `<ui-command id="commands" label="Quick actions">
  <ui-command-item value="new" keywords="create document"><ui-icon slot="icon" name="action.add" label=""></ui-icon>New document<ui-kbd slot="shortcut" command="document.new" shortcut="Primary+N" appearance="plain"></ui-kbd></ui-command-item>
  <ui-command-item value="search" keywords="find"><ui-icon slot="icon" name="action.search" label=""></ui-icon>Search files</ui-command-item>
  <ui-command-item value="settings" keywords="preferences">Settings</ui-command-item>
  <ui-command-item value="delete" disabled>Delete workspace</ui-command-item>
</ui-command>`;
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
    ),
    sample(
      "Sizes",
      ["xsmall", "small", "medium", "large"].map((size) => tabs("segmented", size)).join("\n"),
    ),
    sample("Vertical", tabs("default").replace("<ui-tabs ", '<ui-tabs orientation="vertical" ')),
    {
      ...sample(
        "Dynamic tabs",
        `<ui-tabs id="documents" variant="default" value="notes" label="Open documents">
  <ui-tab slot="tab" value="notes" closable>Notes</ui-tab><ui-tab slot="tab" value="tasks" closable>Tasks</ui-tab>
  <ui-tab-panel slot="panel" value="notes">Your notes</ui-tab-panel><ui-tab-panel slot="panel" value="tasks">Your tasks</ui-tab-panel>
  <ui-button slot="suffix" id="add-tab" size="small" variant="ghost" aria-label="Add document"><ui-icon name="action.add" label=""></ui-icon></ui-button>
</ui-tabs>`,
        "Close with the × button or Delete. The owner removes the tab and its panel together.",
      ),
      script: `const tabs = document.querySelector("#documents");
let count = 0;
tabs.addEventListener("ui-tab-close", event => {
  const value = event.detail.value;
  for (const child of [...tabs.children]) {
    if (child.value === value) child.remove();
  }
});
document.querySelector("#add-tab").addEventListener("click", () => {
  const value = "document-" + ++count;
  const tab = document.createElement("ui-tab");
  Object.assign(tab, { slot: "tab", value, closable: true, textContent: "Document " + count });
  const panel = document.createElement("ui-tab-panel");
  Object.assign(panel, { slot: "panel", value, textContent: "Start writing here." });
  tabs.append(tab, panel);
  tabs.value = value;
  tab.updateComplete.then(() => tab.focus());
});`,
    },
    sample(
      "Overflow",
      `<ui-tabs label="Open files" variant="underline" style="--mash-tab-max-inline-size: 10rem">${Array.from({ length: 12 }, (_, index) => `<ui-tab slot="tab" value="file-${index}">Document ${index + 1} with a longer name</ui-tab>`).join("")}</ui-tabs>`,
      "Arrow keys keep the active tab in view. Set --mash-tab-max-inline-size to truncate long labels.",
    ),
    sample(
      "Adjacent controls",
      tabs("underline").replace(
        "</ui-tabs>",
        '<ui-button slot="prefix" size="small" variant="ghost" aria-label="Back"><ui-icon name="navigation.back" label=""></ui-icon></ui-button><ui-button slot="suffix" size="small" variant="ghost" aria-label="Add tab"><ui-icon name="action.add" label=""></ui-icon></ui-button></ui-tabs>',
      ),
    ),
  ],
  "ui-kbd": [
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
  "ui-command": [
    {
      ...sample(
        "Commands",
        `${commands}<output id="command-result" aria-live="polite">Choose a command</output>`,
      ),
      script: `document.querySelector("#commands").addEventListener("ui-command-select", event => {
  document.querySelector("#command-result").textContent = "Selected: " + event.detail.value;
});`,
    },
    sample(
      "Command dialog",
      `<ui-dialog label="Commands"><ui-button slot="trigger">Open commands</ui-button><strong slot="title">Quick actions</strong>${commands}</ui-dialog>`,
    ),
  ],
};
