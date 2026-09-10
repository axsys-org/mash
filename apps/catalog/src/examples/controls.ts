import { comboboxExamples } from "./combobox.js";
import { finalControlExamples } from "./final-control-examples.js";
import { menuExtensionExamples } from "./menu-extensions.js";
import { mergeControlStateExamples } from "./control-states.js";
import { mergeSelectionExamples } from "./selection.js";
import { sizeExamples } from "./sizes.js";
import { toolbarExamples } from "./display.js";
import { patternExamples } from "./patterns.js";
import type { CatalogExample } from "../examples.js";

import { sample } from "./shared.js";

const choices = `
  <ui-option value="draft">Draft</ui-option>
  <ui-option value="review">In review</ui-option>
  <ui-option value="published">Published</ui-option>`;

export const controlExamples: Record<string, CatalogExample[]> = {
  "ui-button": [
    sample(
      "Variants",
      `<div class="mash-row mash-wrap" data-mash-size="small">
  <ui-button>Default</ui-button>
  <ui-button variant="primary">Primary</ui-button>
  <ui-button variant="secondary">Secondary</ui-button>
  <ui-button variant="ghost">Ghost</ui-button>
  <ui-button variant="link">Link</ui-button>
</div>`,
    ),
    sample(
      "Meaning",
      `<div class="mash-row mash-wrap" data-mash-size="small">
  <ui-button tone="positive">Success</ui-button>
  <ui-button tone="warning">Warning</ui-button>
  <ui-button tone="critical">Danger</ui-button>
  <ui-button tone="info">Information</ui-button>
</div>`,
    ),
    sample(
      "Sizes",
      `<div class="mash-row mash-wrap">
  <ui-button size="xsmall">Extra small</ui-button>
  <ui-button size="small">Small</ui-button>
  <ui-button size="medium">Medium</ui-button>
  <ui-button size="large">Large</ui-button>
</div>`,
    ),
    sample(
      "States",
      `<div class="mash-row mash-wrap" data-mash-size="small">
  <ui-button variant="primary" loading>Saving</ui-button>
  <ui-button disabled>Unavailable</ui-button>
  <ui-button selected>Selected</ui-button>
  <ui-button dropdown-caret>Options</ui-button>
</div>`,
    ),
    sample(
      "Theme boundaries",
      `<div class="mash-grid">${["light", "dark"]
        .map(
          (theme) => `
  <section class="mash-panel mash-stack" data-theme="${theme}" data-mash-size="small" aria-label="${theme} theme">
    <strong>${theme === "light" ? "Light" : "Dark"}</strong>
    <div class="mash-row mash-wrap"><ui-button>Default</ui-button><ui-button variant="primary">Primary</ui-button><ui-button variant="secondary">Secondary</ui-button></div>
    <div class="mash-row mash-wrap"><ui-toggle pressed>Selected</ui-toggle><ui-toggle>Unselected</ui-toggle><ui-button disabled>Disabled</ui-button></div>
    <div class="mash-row mash-wrap"><ui-button variant="primary" tone="positive">Success</ui-button><ui-button tone="warning">Warning</ui-button><ui-button tone="critical">Danger</ui-button></div>
    <ui-input label="Project" placeholder="Project name"></ui-input>
    <ui-tooltip label="Additional information"><ui-button slot="trigger">Details</ui-button>Additional information</ui-tooltip>
  </section>`,
        )
        .join("")}</div>`,
      "Each theme boundary resolves the complete semantic palette, including hover, selection, and inverse tooltip surfaces.",
    ),
  ],
  "ui-input": [
    sample("Input", `<ui-input label="Project name" placeholder="Project name"></ui-input>`),
    sample(
      "Sizes",
      `<ui-input size="small" label="Small input" placeholder="Small"></ui-input>
<ui-input size="medium" label="Medium input" placeholder="Medium"></ui-input>
<ui-input size="large" label="Large input" placeholder="Large"></ui-input>`,
    ),
    sample(
      "States",
      `<ui-input label="Project name" value="Mash" readonly></ui-input>
<ui-input label="Unavailable field" placeholder="Disabled" disabled></ui-input>
<ui-input label="Email" type="email" value="invalid" required></ui-input>`,
    ),
  ],
  "ui-input-group": [
    sample(
      "Affixes",
      `<ui-input-group>
  <span slot="prefix">https://</span>
  <ui-input slot="control" label="Site address" placeholder="example.com"></ui-input>
  <span slot="suffix">/</span>
</ui-input-group>`,
      "One border and one focus ring around the input and its affixes.",
    ),
  ],
  "ui-toggle": [
    sample(
      "Toggle",
      `<div class="mash-row" data-mash-size="small">
  <ui-toggle pressed>Bold</ui-toggle>
  <ui-toggle>Italic</ui-toggle>
  <ui-toggle disabled>Underline</ui-toggle>
</div>`,
    ),
  ],
  "ui-toggle-group": [
    sample(
      "Single selection",
      `<ui-toggle-group label="Text alignment" data-mash-size="small">
  <ui-toggle value="left" pressed>Left</ui-toggle>
  <ui-toggle value="center">Center</ui-toggle>
  <ui-toggle value="right">Right</ui-toggle>
</ui-toggle-group>`,
    ),
  ],
  "ui-toolbar": [...toolbarExamples, ...sizeExamples],
  "ui-select": [
    sample(
      "Select",
      `<ui-select label="Status" placeholder="Select status">${choices}
</ui-select>`,
    ),
    sample(
      "Search",
      `<ui-select label="Status" placeholder="Find status" searchable>${choices}
</ui-select>`,
    ),
    sample(
      "Grouped choices",
      `<ui-select label="Status" placeholder="Choose a status">
  <ui-option-group label="In progress"><ui-option value="draft">Draft</ui-option><ui-option value="review">In review</ui-option></ui-option-group>
  <ui-option-group label="Complete"><ui-option value="published">Published</ui-option><ui-option value="archived" disabled>Archived</ui-option></ui-option-group>
</ui-select>`,
    ),
  ],
  "ui-combobox": [],
};

for (const [tag, examples] of Object.entries(patternExamples)) {
  if (controlExamples[tag]) controlExamples[tag] = [...controlExamples[tag], ...examples];
}

mergeSelectionExamples(controlExamples, true);

mergeControlStateExamples(controlExamples, true);

for (const [tag, examples] of Object.entries(menuExtensionExamples)) {
  if (!controlExamples[tag]) continue;
  controlExamples[tag] = [...(controlExamples[tag] ?? []), ...examples];
}

for (const [tag, examples] of Object.entries(finalControlExamples)) {
  if (!controlExamples[tag]) continue;
  controlExamples[tag] = [...(controlExamples[tag] ?? []), ...examples];
}

controlExamples["ui-combobox"] = [
  ...comboboxExamples,
  ...controlExamples["ui-combobox"]!.filter((example) =>
    [
      "Async search and recovery",
      "Selection limit and pinned chip",
      "Rich grid navigation",
      "Collapsed selection summary",
    ].includes(example.name),
  ),
];
