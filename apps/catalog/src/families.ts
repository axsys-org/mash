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
    title: "Text, Media & Status",
    description: "Display primitives for text, imagery, glyphs, and compact state.",
    tags: [
      "ui-label",
      "ui-typeset",
      "ui-avatar",
      "ui-badge",
      "ui-icon",
      "ui-image",
      "ui-intl-formatter",
      "ui-kbd",
    ],
  },
  {
    title: "Actions & Commands",
    description: "Direct actions, toggled commands, and command menus.",
    tags: [
      "ui-button",
      "ui-clipboard",
      "ui-link",
      "ui-toggle",
      "ui-toggle-group",
      "ui-toolbar",
      "ui-menu",
      "ui-context-menu",
      "ui-menubar",
    ],
  },
  {
    title: "Forms & Choice",
    description: "Fields, values, options, and submission semantics.",
    tags: [
      "ui-field",
      "ui-fieldset",
      "ui-form",
      "ui-input-group",
      "ui-input",
      "ui-textarea",
      "ui-editor",
      "ui-number-field",
      "ui-otp-field",
      "ui-checkbox",
      "ui-checkbox-group",
      "ui-radio",
      "ui-radio-group",
      "ui-switch",
      "ui-slider",
      "ui-select",
      "ui-combobox",
      "ui-autocomplete",
      "ui-calendar",
      "ui-date-picker",
      "ui-color-picker",
    ],
  },
  {
    title: "Surfaces & Overlays",
    description: "Framed content, conversation surfaces, and transient layers.",
    tags: [
      "ui-card",
      "ui-bubble",
      "ui-dialog",
      "ui-alert-dialog",
      "ui-drawer",
      "ui-popover",
      "ui-preview-card",
      "ui-tooltip",
      "ui-separator",
    ],
  },
  {
    title: "Navigation, Data & Layout",
    description: "Structured browsing, disclosure, data views, and layout mechanics.",
    tags: [
      "ui-path",
      "ui-accordion",
      "ui-collapsible",
      "ui-tabs",
      "ui-navigation-menu",
      "ui-pagination",
      "ui-table",
      "ui-data-table",
      "ui-tree",
      "ui-scroll-area",
      "ui-virtual-list",
      "ui-draggable",
      "ui-resizable",
    ],
  },
  {
    title: "Feedback & Motion",
    description: "Progress, transient status, gesture bindings, and animation primitives.",
    tags: [
      "ui-gesture-binding",
      "ui-motion",
      "ui-reveal",
      "ui-stagger",
      "ui-progress",
      "ui-meter",
      "ui-skeleton",
      "ui-shimmer",
      "ui-spinner",
      "ui-toast",
      "ui-toast-stack",
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
      "sh-tree",
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
    "ui-bubble-group",
    "ui-chip",
    "ui-menu-item",
    "ui-option",
    "ui-option-group",
    "ui-option-row",
    "ui-tab",
    "ui-tab-panel",
    "ui-table-header",
    "ui-table-body",
    "ui-table-row",
    "ui-table-head",
    "ui-table-cell",
    "ui-table-caption",
    "ui-resizable-panel",
    "ui-resizable-handle",
    "ui-virtual-item",
    "ui-color-swatch",
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
