import type { CatalogExample } from "../examples.js";

const sample = (name: string, code: string, description?: string): CatalogExample => ({
  name,
  code: `<div data-mash-catalogue="mash" class="mash-stack">\n${code.trim()}\n</div>`,
  description,
  portable: true,
});

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
  "ui-toolbar": [
    sample(
      "Formatting",
      `<ui-toolbar label="Text formatting" data-mash-size="small">
  <ui-toggle pressed>Bold</ui-toggle>
  <ui-toggle>Italic</ui-toggle>
  <ui-toggle>Underline</ui-toggle>
  <ui-button variant="primary">Publish</ui-button>
</ui-toolbar>`,
      "Arrow keys move between controls. The toolbar supplies size and spacing.",
    ),
    sample(
      "Mixed controls",
      `<ui-toolbar label="Document tools" data-mash-size="small">
  <ui-button>New</ui-button>
  <ui-input label="Find in document" placeholder="Find"></ui-input>
  <ui-select label="Status" value="draft">${choices}
  </ui-select>
  <ui-button variant="primary">Save</ui-button>
</ui-toolbar>`,
      "Buttons, text input, and select share the same control height.",
    ),
    sample(
      "Vertical",
      `<ui-toolbar orientation="vertical" label="Drawing tools" data-mash-size="small">
  <ui-toggle pressed>Select</ui-toggle>
  <ui-toggle>Draw</ui-toggle>
  <ui-toggle>Erase</ui-toggle>
</ui-toolbar>`,
    ),
  ],
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
  ],
  "ui-combobox": [
    sample(
      "Combobox",
      `<ui-combobox label="Status" placeholder="Find status">${choices}
</ui-combobox>`,
    ),
    sample(
      "Multiple",
      `<ui-combobox label="Statuses" placeholder="Add status" multiple>${choices}
</ui-combobox>`,
    ),
  ],
};
