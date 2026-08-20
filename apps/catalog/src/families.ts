import type { ComponentSchema } from "./schema.js";

export interface ComponentFamily {
  title: string;
  description: string;
  /** Root components shown in navigation. Supporting anatomy is documented on its parent. */
  tags: string[];
}

/**
 * Navigation is an orientation aid, not a second registry of component APIs.
 * The manifest remains the source of truth for every tag; this only groups
 * meaningful starting points and leaves authored child elements discoverable
 * through the code example and API anatomy of their parent.
 */
const families: ComponentFamily[] = [
  {
    title: "Foundations",
    description: "Surfaces, status, and small supporting primitives.",
    tags: [
      "ui-avatar",
      "ui-badge",
      "ui-card",
      "ui-kbd",
      "ui-path",
      "ui-progress",
      "ui-separator",
      "ui-spinner",
    ],
  },
  {
    title: "Actions",
    description: "Direct actions and editor controls.",
    tags: ["ui-button", "ui-toggle", "ui-toggle-group", "ui-toolbar"],
  },
  {
    title: "Input & selection",
    description: "Values, options, and field-level choice.",
    tags: [
      "ui-input",
      "ui-number-field",
      "ui-otp-field",
      "ui-slider",
      "ui-switch",
      "ui-checkbox",
      "ui-checkbox-group",
      "ui-radio",
      "ui-radio-group",
      "ui-select",
      "ui-combobox",
      "ui-autocomplete",
    ],
  },
  {
    title: "Forms",
    description: "Labels, groups, validation, and submission.",
    tags: ["ui-field", "ui-fieldset", "ui-form", "ui-meter"],
  },
  {
    title: "Navigation & disclosure",
    description: "Structured browsing and progressive disclosure.",
    tags: [
      "ui-accordion",
      "ui-collapsible",
      "ui-tabs",
      "ui-tree",
      "ui-scroll-area",
      "ui-navigation-menu",
      "ui-menubar",
    ],
  },
  {
    title: "Overlays & feedback",
    description: "Contextual actions, focused work, and status.",
    tags: [
      "ui-dialog",
      "ui-alert-dialog",
      "ui-drawer",
      "ui-popover",
      "ui-menu",
      "ui-context-menu",
      "ui-preview-card",
      "ui-tooltip",
      "ui-toast",
    ],
  },
  {
    title: "Shrine",
    description: "The system-specific composed surfaces.",
    tags: [
      "sh-limb",
      "sh-locator",
      "sh-myth",
      "sh-pail",
      "sh-slot",
      "sh-triptych",
      "shrine-confirm",
    ],
  },
];

export interface ResolvedComponentFamily extends ComponentFamily {
  components: ComponentSchema[];
}

export function familiesFor(components: ComponentSchema[]): ResolvedComponentFamily[] {
  const byTag = new Map(components.map((component) => [component.tagName, component]));
  const known = new Set<string>();

  const resolved = families.map((family) => {
    const entries = family.tags.flatMap((tag) => {
      const component = byTag.get(tag);
      if (component) known.add(tag);
      return component ? [component] : [];
    });
    return { ...family, components: entries };
  });

  // A newly-added public root should remain visible before it is deliberately
  // classified. The intentionally-hidden anatomy tags are the only exceptions.
  const anatomy = new Set([
    "ui-accordion-item",
    "ui-menu-item",
    "ui-option",
    "ui-tab",
    "ui-tab-panel",
    "ui-tree-item",
  ]);
  const uncategorised = components.filter(
    (component) => !known.has(component.tagName) && !anatomy.has(component.tagName),
  );
  if (uncategorised.length > 0) {
    resolved.push({
      title: "Unclassified",
      description: "New public components awaiting a deliberate family assignment.",
      tags: uncategorised.map((component) => component.tagName),
      components: uncategorised,
    });
  }

  return resolved.filter((family) => family.components.length > 0);
}
