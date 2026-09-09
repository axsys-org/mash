import { componentExamples } from "./examples/components.js";
import { controlExamples } from "./examples/controls.js";
import { components, type ComponentSchema, type Example } from "./schema.js";

/**
 * A catalog example is deliberately more specific than an `@example` JSDoc
 * snippet. The manifest remains the public, portable component contract; this
 * layer teaches how several contracts become a useful interface together.
 */
export interface CatalogExample extends Example {
  /** Runs with the normal package imports visible in Usage and the public recipe. */
  portable?: boolean;
  /** Portable browser JavaScript shown alongside the markup. */
  script?: string;
  /**
   * This component is only meaningful as an authored composition. Hiding the
   * isolated-preview toggle avoids manufacturing invalid placeholder children
   * for slots that require a particular Mash element.
   */
  compositionOnly?: boolean;
  description?: string;
  /** Optional preview-canvas placement for examples whose shape reads from an edge. */
  stageLayout?: "start" | "fill";
}

const compositionsByTag: Record<
  string,
  { parent: string; example?: string; openParent?: boolean }
> = {
  "sh-limb": { parent: "sh-myth" },
  "sh-pail": { parent: "sh-myth" },
  "sh-slot": { parent: "sh-myth" },
  "ui-dock-panel": { parent: "ui-dock" },
  "ui-accordion-item": { parent: "ui-accordion" },
  "ui-bubble-group": { parent: "ui-bubble", example: "Message rows" },
  "ui-command-item": { parent: "ui-command" },
  "ui-step": { parent: "ui-stepper" },
  "ui-chip": { parent: "ui-combobox", example: "Multiple" },
  "ui-color-swatch": {
    parent: "ui-color-picker",
    example: "Popover and palette",
    openParent: true,
  },
  "ui-menu-item": { parent: "ui-menu", openParent: true },
  "ui-menu-label": {
    parent: "ui-menu",
    example: "Labelled command groups",
    openParent: true,
  },
  "ui-option": { parent: "ui-select", openParent: true },
  "ui-option-group": {
    parent: "ui-select",
    example: "Grouped choices",
    openParent: true,
  },
  "ui-option-row": {
    parent: "ui-combobox",
    example: "Grid suggestions",
    openParent: true,
  },
  "ui-resizable-handle": { parent: "ui-resizable" },
  "ui-resizable-panel": { parent: "ui-resizable" },
  "ui-tab": { parent: "ui-tabs" },
  "ui-tab-panel": { parent: "ui-tabs" },
  "ui-table-body": { parent: "ui-table" },
  "ui-table-caption": { parent: "ui-table" },
  "ui-table-cell": { parent: "ui-table" },
  "ui-table-head": { parent: "ui-table" },
  "ui-table-header": { parent: "ui-table" },
  "ui-table-row": { parent: "ui-table" },
  "ui-tree-item": { parent: "ui-tree" },
  "ui-virtual-item": { parent: "ui-virtual-list" },
};

/** Curated system compositions take precedence; all other public examples stay manifest-driven. */
export function examplesFor(component: ComponentSchema): CatalogExample[] {
  const direct = controlExamples[component.tagName] ?? componentExamples[component.tagName];
  if (direct) return direct;

  const composition = compositionsByTag[component.tagName];
  if (!composition) return component.examples.map((entry) => ({ ...entry, portable: true }));

  const parent = components.find((candidate) => candidate.tagName === composition.parent);
  if (!parent) return component.examples.map((entry) => ({ ...entry, portable: true }));

  const parentExamples =
    controlExamples[parent.tagName] ?? componentExamples[parent.tagName] ?? parent.examples;
  const selected = composition.example
    ? (parentExamples.find((candidate) => candidate.name === composition.example) ??
      parentExamples[0])
    : parentExamples[0];
  if (!selected) return component.examples.map((entry) => ({ ...entry, portable: true }));

  const code = composition.openParent
    ? selected.code.replace(`<${composition.parent}`, `<${composition.parent} open`)
    : selected.code;
  return [{ ...selected, code, compositionOnly: true }];
}

export function exampleNamed(
  component: ComponentSchema,
  name: string | null,
): CatalogExample | null {
  return name === null
    ? null
    : (examplesFor(component).find((entry) => entry.name === name) ?? null);
}

/** Whether synthesising standalone slots would create an invalid component tree. */
export function controlsPreviewAllowed(component: ComponentSchema): boolean {
  return compositionsByTag[component.tagName] === undefined;
}
