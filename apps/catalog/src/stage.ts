/**
 * The preview frame's own bootstrap.
 *
 * Registers every component into *this* document's registry — a custom element
 * registry is per-document, so the parent catalog's registrations do not reach
 * in here — and loads the design tokens so previews resolve real values.
 *
 * The parent drives everything else directly through `contentDocument`.
 */

import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
import "@mash/shrine/catalogue/mash.css";
import "@mash/ui/register";
import "@mash/shrine/register";

import "./stage.css";

// Tells the parent the frame is ready without it having to poll for the
// registry being populated.
document.documentElement.dataset.mashCatalogue = "mash";

// The catalogue is a consumer of the controlled tree contract: it opts into
// the requested expansion state so the example remains interactive without
// moving ownership back into the primitive.
document.addEventListener("ui-tree-item-toggle", (event) => {
  const item = event.target as HTMLElement & { expanded?: boolean };
  const { expanded } = (event as CustomEvent<{ expanded: boolean }>).detail;
  item.expanded = expanded;
});

document.addEventListener("ui-tree-item-select", (event) => {
  const item = event.target as HTMLElement & { selected?: boolean };
  const tree = item.closest("ui-tree");
  for (const sibling of tree?.querySelectorAll<HTMLElement>("ui-tree-item") ?? []) {
    (sibling as HTMLElement & { selected?: boolean }).selected = sibling === item;
  }
});

document.documentElement.dataset.stageReady = "true";
