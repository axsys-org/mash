/**
 * The renderer-neutral vocabulary shared by every Mash component manifest.
 *
 * A role names meaning, not markup. Web Components may realize `title` as a
 * named HTML slot, GPUI as a child view, and Swift as a view-builder argument;
 * all three still expose the same Mash role. Component manifests embed this
 * registry so consumers never have to import this build-tool module directly.
 */

export const MASH_CONTRACT_SCHEMA = "https://mash.axsys.dev/schema/component-contract-1.0.0.json";
export const MASH_CONTRACT_VERSION = "1.0.0";

const role = (family, description) => Object.freeze({ family, description });

export const MASH_ROLES = Object.freeze({
  root: role("structure", "The root realization of a component."),
  content: role("structure", "The primary authored content."),
  children: role("structure", "A declared collection of nested items."),
  group: role("structure", "A semantically related subset of sibling nodes."),
  header: role("structure", "Content before the primary body."),
  footer: role("structure", "Content after the primary body."),
  underlay: role("structure", "Content realized beneath the primary body."),
  overlay: role("structure", "Content realized above the primary body."),
  prefix: role("content", "Content preceding the primary label or value."),
  suffix: role("content", "Content following the primary label or value."),
  icon: role("content", "A compact symbolic representation."),
  image: role("content", "A raster or vector visual representation."),
  fallback: role("content", "Content used when the preferred realization is unavailable."),
  identity: role("content", "The content establishing an item's identity."),
  label: role("content", "A concise human-readable name."),
  title: role("content", "The primary heading or identity."),
  description: role("content", "Supporting explanatory content."),
  message: role("content", "A communicated status or prompt."),
  value: role("data", "The represented semantic value."),
  meta: role("data", "Secondary metadata about the primary content."),
  path: role("data", "A canonical or navigational path."),
  date: role("data", "A calendar date value."),
  month: role("data", "A calendar month value."),
  color: role("data", "A semantic color value."),
  preview: role("data", "A transient value previewed before commitment."),
  hue: role("data", "The angular hue channel of a semantic color."),
  saturation: role("data", "The saturation channel of a semantic color."),
  lightness: role("data", "The lightness channel of a semantic color."),
  alpha: role("data", "The opacity channel of a semantic color."),
  hex: role("data", "A hexadecimal color representation."),
  kind: role("data", "The semantic kind of the represented value."),
  actions: role("action", "A collection of available actions."),
  confirm: role("action", "The affirmative or consequential action."),
  cancel: role("action", "The declining or dismissive action."),
  close: role("action", "An action that closes the current surface."),
  clear: role("action", "An action that removes the current value or filter."),
  remove: role("action", "An action that removes one value from a collection."),
  previous: role("action", "An action that navigates to the preceding item or range."),
  next: role("action", "An action that navigates to the following item or range."),
  "scroll-backward": role("action", "An action that reveals earlier content on an axis."),
  "scroll-forward": role("action", "An action that reveals later content on an axis."),
  control: role("control", "The primary interactive control."),
  trigger: role("control", "A control that requests an interaction or disclosure."),
  anchor: role("control", "The semantic placement reference for a floating surface."),
  disclosure: role("control", "A control that expands or collapses nested content."),
  decrement: role("control", "A control that decreases a value."),
  increment: role("control", "A control that increases a value."),
  list: role("collection", "A collection container."),
  listbox: role("collection", "A selectable option collection."),
  option: role("collection", "One selectable value in a collection."),
  item: role("collection", "One authored item in an ordered collection."),
  grid: role("collection", "A two-dimensional collection of selectable values."),
  table: role("collection", "A two-dimensional collection of tabular values."),
  row: role("collection", "One semantic row in a two-dimensional collection."),
  chips: role("collection", "The collection of values selected by a multiple-value control."),
  chip: role("collection", "One selected value in a multiple-value control."),
  tab: role("navigation", "One navigation control in a tab set."),
  panel: role("navigation", "Content selected by a tab."),
  panels: role("navigation", "The collection of tab panels."),
  segment: role("navigation", "One segment of a path or sequence."),
  segments: role("navigation", "The collection of path or sequence segments."),
  page: role("navigation", "One destination in a paginated sequence."),
  "page-index": role("range", "The one-based logical position in a paginated sequence."),
  separator: role("structure", "A semantic boundary between adjacent regions."),
  scroller: role("scroll", "The owner that bounds and coordinates a scroll viewport."),
  viewport: role("scroll", "The bounded region through which scrollable content is viewed."),
  scrollbar: role("scroll", "A scroll position and extent control."),
  thumb: role("scroll", "The movable control within a scrollbar or range track."),
  corner: role("scroll", "The junction between block and inline scrollbars."),
  progress: role("progress", "A bounded or indeterminate work completion measure."),
  track: role("progress", "The full extent of progress or range."),
  indicator: role("progress", "The realized current progress or status."),
  spinner: role("progress", "An indeterminate activity indicator."),
  loading: role("state", "Whether work is in progress."),
  "loading-content": role("feedback", "Content shown while work is in progress."),
  empty: role("feedback", "Content shown when a collection has no items."),
  error: role("feedback", "Content describing an invalid or failed state."),
  legend: role("form", "The label for a related group of controls."),
  cell: role("form", "One position in a segmented value editor."),
  backdrop: role("overlay", "The layer separating a floating surface from its context."),
  positioner: role("overlay", "The owner of anchor-relative overlay placement."),
  pointer: role("overlay", "A visual connector between an overlay and its anchor."),
  popup: role("overlay", "The floating interaction surface."),
  status: role("feedback", "A live report about the current interaction or result set."),
  inspector: role("workspace", "A contextual inspection region."),
  locator: role("workspace", "A location or path region."),
  navigate: role("workspace", "A navigation region."),
  sidebar: role("workspace", "A supporting region beside primary content."),
  limbs: role("record", "The collection of labelled values belonging to a record."),
  card: role("surface", "A grouped semantic surface."),
  editor: role("surface", "A source-document editing surface."),
  main: role("workspace", "The primary workspace region."),
  open: role("state", "Whether a disclosure or floating surface is open."),
  selected: role("state", "Whether an item is selected."),
  active: role("state", "Whether an item is the current keyboard or pointer target."),
  "grid-mode": role("state", "Whether a collection uses two-dimensional grid navigation."),
  expanded: role("state", "Whether nested content is expanded."),
  disabled: role("state", "Whether interaction is disabled."),
  muted: role("state", "Whether content is de-emphasized relative to its peers."),
  today: role("state", "Whether a date represents the current day."),
  "range-start": role("state", "Whether a value begins the selected range."),
  "range-end": role("state", "Whether a value ends the selected range."),
  "in-range": role("state", "Whether a value lies inside the selected range."),
  pressed: role("state", "Whether a toggle action is pressed."),
  checked: role("state", "Whether a checkable value is checked."),
  indeterminate: role("state", "Whether a value or operation has no single determinate state."),
  invalid: role("state", "Whether the current value is invalid."),
  pending: role("state", "Whether completion is awaiting external work."),
  paused: role("state", "Whether a time-based interaction is temporarily suspended."),
  resizing: role("state", "Whether a user-driven resize interaction is active."),
  dragging: role("state", "Whether a pointer-driven drag interaction is active."),
  visible: role("state", "Whether an item participates in the current realization window."),
  reveal: role("event", "Requests that an identified item become visible in its owning viewport."),
  command: role("event", "Requests a renderer-neutral command from a composite control."),
  search: role("form", "Search and replacement controls for an authored document."),
  "search-query": role("value", "The literal or structured query used by a search surface."),
  "case-sensitive": role("configuration", "Whether text matching distinguishes letter case."),
  "search-open": role("state", "Whether an authored search surface is visible."),
  "completion-open": role("state", "Whether authored completion content is visible."),
  decorations: role("feedback", "Authored range or item decorations from a provider."),
  "document-colors": role(
    "feedback",
    "Authored color information associated with document ranges.",
  ),
  "fold-controls": role("disclosure", "Authored controls for collapsing document ranges."),
  "indent-guides": role("hierarchy", "Authored guides describing document indentation depth."),
  hover: role("feedback", "Authored contextual information for the current pointer or selection."),
  "code-actions": role("action", "Authored commands supplied for the current document context."),
  parent: role("relationship", "Identifies the semantic parent of a flattened item."),
  "selection-follows-focus": role(
    "configuration",
    "Whether moving composite focus also requests selection.",
  ),
  previewing: role("state", "Whether a transient preview differs from the committed value."),
  focused: role("state", "Whether a control owns the active input focus."),
  current: role("state", "Whether an item identifies the current location or step."),
  activate: role("event", "Requests activation of an action or control."),
  change: role("event", "Reports a committed value or state change."),
  input: role("event", "Reports an in-progress value change."),
  select: role("event", "Reports selection of an item or value."),
  submit: role("event", "Requests submission of a composed value."),
  toggle: role("event", "Requests inversion of a binary or disclosure state."),
  "open-change": role("event", "Requests or reports a change to open state."),
  complete: role("event", "Reports completion of an operation or value."),
  dismiss: role("event", "Requests dismissal of a transient surface."),
  scroll: role("event", "Reports a semantic scroll position change."),
  resize: role("event", "Reports a semantic dimension change request."),
  "scrollable-block": role("state", "Whether content overflows the block-axis viewport."),
  "scrollable-inline": role("state", "Whether content overflows the inline-axis viewport."),
  "at-block-start": role("state", "Whether the viewport is at its block-start edge."),
  "at-block-end": role("state", "Whether the viewport is at its block-end edge."),
  "at-inline-start": role("state", "Whether the viewport is at its inline-start edge."),
  "at-inline-end": role("state", "Whether the viewport is at its inline-end edge."),
  elevation: role("configuration", "Selects a semantic elevation treatment."),
  multiple: role("configuration", "Whether a control owns more than one selected value."),
  orientation: role("configuration", "Selects a logical layout or interaction axis."),
  shape: role("configuration", "Selects a renderer realization with equivalent meaning."),
  scale: role("configuration", "Selects the mapping between position and semantic value."),
  reversed: role("configuration", "Reverses the value direction along the selected axis."),
  range: role("state", "Whether a control owns a bounded start and end value."),
  placement: role("configuration", "Selects the preferred side of an anchored surface."),
  align: role("configuration", "Selects leading, centered, or trailing cross-axis alignment."),
  offset: role("configuration", "Selects the gap between an anchored surface and its anchor."),
  "collision-padding": role(
    "configuration",
    "Selects minimum viewport-edge clearance for a floating surface.",
  ),
  "close-on-escape": role(
    "behavior",
    "Whether Escape requests dismissal of an open transient surface.",
  ),
  "close-on-outside": role("behavior", "Whether interaction outside a popup requests dismissal."),
  "open-delay": role("behavior", "Delay in milliseconds before a transient surface opens."),
  "close-delay": role(
    "behavior",
    "Grace period in milliseconds before a transient surface closes.",
  ),
  masked: role("configuration", "Whether an authored value is visually obscured."),
  tone: role("configuration", "Selects semantic emphasis or consequence."),
  variant: role("configuration", "Selects a named structural realization."),
  size: role("configuration", "Selects a semantic size or density."),
  overscan: role("configuration", "Selects extra collection items realized beyond a viewport."),
  "first-day": role("configuration", "Selects the first weekday in a calendar grid."),
  "disabled-values": role("configuration", "Lists semantic values unavailable for selection."),
  view: role("configuration", "Selects the active semantic view of a composite control."),
  months: role("configuration", "Selects how many consecutive calendar months are realized."),
  language: role("configuration", "Identifies a source or document language."),
  "line-numbers": role("configuration", "Whether an editor realizes a line-number gutter."),
  "soft-wrap": role("configuration", "Whether long source lines wrap within the viewport."),
  "tab-size": role("configuration", "Selects the logical source indentation width."),
  gutter: role("structure", "A supporting region aligned beside primary content."),
  "line-number": role("data", "The logical index label of a source line."),
  completion: role("feedback", "A proposed completion for the current authored value."),
  diagnostics: role("feedback", "Diagnostics associated with authored content."),
  action: role("form", "Identifies a submission destination or command."),
  alt: role("content", "Alternative text for non-text content."),
  controls: role("relationship", "Identifies the semantic node controlled by an action."),
  dismissible: role("configuration", "Whether a transient surface may be dismissed."),
  duration: role("configuration", "Selects a semantic or numeric duration."),
  high: role("range", "The lower bound of a high range."),
  lede: role("content", "Introductory supporting content."),
  length: role("configuration", "The declared length of a segmented collection."),
  level: role("range", "The one-based semantic nesting or heading level."),
  limit: role("configuration", "The maximum number of collection items realized at once."),
  "loop-focus": role("behavior", "Whether composite focus wraps at its boundaries."),
  low: role("range", "The upper bound of a low range."),
  max: role("range", "The inclusive maximum value."),
  method: role("form", "The semantic submission method."),
  min: role("range", "The inclusive minimum value."),
  mode: role("configuration", "Selects a named behavior mode."),
  name: role("form", "The stable name used when composing or submitting a value."),
  novalidate: role("form", "Whether submission bypasses validation."),
  optimum: role("range", "The optimum value within a measured range."),
  placeholder: role("content", "A hint shown when no authored value is present."),
  readonly: role("state", "Whether a value can be read but not edited."),
  required: role("state", "Whether a value must be supplied."),
  side: role("configuration", "Selects the logical side of an anchored surface."),
  src: role("resource", "Identifies an external resource realization."),
  step: role("range", "The increment between valid numeric values."),
  "step-request": role("event", "Requests a directional bounded numeric step."),
  "row-count": role("range", "The total logical row count of a collection."),
  "column-count": role("range", "The total logical column count of a collection."),
  "row-index": role("range", "The one-based logical row position of an item."),
  "column-index": role("range", "The one-based logical column position of an item."),
  "set-size": role("range", "The total logical collection size used for position reporting."),
  position: role("range", "The one-based logical position within a semantic collection."),
  index: role("range", "The stable logical position of an item in a collection."),
  type: role("configuration", "Selects a native or semantic control type."),
});

export const MASH_ROLE_ALIASES = Object.freeze({});

const overlayReasons = [
  "trigger",
  "outside",
  "escape",
  "close",
  "cancel",
  "confirm",
  "select",
  "clear",
  "keyboard",
  "input",
  "hover",
  "focus",
  "contextmenu",
  "imperative",
];

const nullable = (value) => ({ kind: "nullable", value });

const MASH_TYPE_REFERENCES = Object.freeze({
  OverlaySide: { kind: "enum", choices: ["top", "bottom", "left", "right"] },
  OverlayAlign: { kind: "enum", choices: ["start", "center", "end"] },
  OverlayOpenChangeDetail: {
    kind: "record",
    fields: {
      open: { kind: "boolean" },
      reason: { kind: "enum", choices: overlayReasons },
    },
  },
  CalendarView: { kind: "enum", choices: ["day", "month", "year"] },
  CalendarChangeDetail: {
    kind: "record",
    fields: {
      value: { kind: "string" },
      start: nullable({ kind: "string" }),
      end: nullable({ kind: "string" }),
    },
  },
  EditorSelectionDetail: {
    kind: "record",
    fields: {
      start: { kind: "number" },
      end: { kind: "number" },
      direction: { kind: "enum", choices: ["forward", "backward", "none"] },
      startLine: { kind: "number" },
      startColumn: { kind: "number" },
      endLine: { kind: "number" },
      endColumn: { kind: "number" },
    },
  },
  EditorCommandDetail: {
    kind: "record",
    fields: {
      command: {
        kind: "enum",
        choices: [
          "accept-completion",
          "dismiss-overlays",
          "find",
          "find-next",
          "find-previous",
          "go-to-definition",
          "indent",
          "outdent",
          "toggle-code-actions",
        ],
      },
    },
  },
  EditorSearchDetail: {
    kind: "record",
    fields: {
      query: { kind: "string" },
      count: { kind: "number" },
      index: { kind: "number" },
      start: nullable({ kind: "number" }),
      end: nullable({ kind: "number" }),
    },
  },
  TreeSelectionDetail: {
    kind: "record",
    fields: {
      value: { kind: "string" },
      index: { kind: "number" },
      reason: { kind: "enum", choices: ["keyboard", "pointer", "imperative"] },
    },
  },
  TreeToggleDetail: {
    kind: "record",
    fields: {
      value: { kind: "string" },
      expanded: { kind: "boolean" },
    },
  },
  TreeRevealDetail: {
    kind: "record",
    fields: {
      value: { kind: "string" },
      ancestors: { kind: "array", value: { kind: "string" } },
      alignment: { kind: "enum", choices: ["center", "end", "nearest", "start"] },
    },
  },
  ResizeDetail: {
    kind: "record",
    fields: {
      delta: { kind: "number" },
      phase: { kind: "enum", choices: ["start", "move", "end"] },
    },
  },
});

export function canonicalMashRole(name) {
  return MASH_ROLE_ALIASES[name] ?? name;
}

export function eventRole(name) {
  if (name === "click") return "activate";
  if (name === "open-change" || name.endsWith("-open-change")) return "open";
  const suffixes = [
    "open-change",
    "complete",
    "change",
    "input",
    "select",
    "submit",
    "toggle",
    "dismiss",
    "confirm",
    "cancel",
    "scroll",
  ];
  return suffixes.find((suffix) => name === suffix || name.endsWith(`-${suffix}`)) ?? name;
}

export function contractRole(name, kind) {
  if (kind === "event") return eventRole(name);
  if (kind === "slot" && !name) return "content";
  return canonicalMashRole(name);
}

export function mashTypeSchema(rawType, kind) {
  if (kind === "slot" || kind === "part") return { kind: "node" };
  if (kind === "state") return { kind: "boolean" };
  const text = String(rawType ?? "").trim();
  if (!text) return { kind: "unknown" };

  if (kind === "event") {
    const customEvent = text.match(/^CustomEvent<(.*)>$/s);
    return customEvent
      ? { kind: "event", detail: mashTypeSchema(customEvent[1], "value") }
      : { kind: "event", detail: { kind: "void" } };
  }

  if (text === "void") return { kind: "void" };
  if (text === "FormData") return { kind: "form-data" };
  if (["string", "number", "boolean"].includes(text)) return { kind: text };
  if (MASH_TYPE_REFERENCES[text]) return MASH_TYPE_REFERENCES[text];
  const nullableMatch = text.match(/^(.*)\s*\|\s*null$/);
  if (nullableMatch?.[1]) return nullable(mashTypeSchema(nullableMatch[1].trim(), "value"));
  if (text.endsWith("[]")) {
    return { kind: "array", items: mashTypeSchema(text.slice(0, -2), "value") };
  }

  const choices = [...text.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  if (choices.length > 0 && text.split("|").length === choices.length) {
    return { kind: "enum", choices };
  }

  if (text.startsWith("{") && text.endsWith("}")) {
    const fields = {};
    for (const entry of text.slice(1, -1).split(/[,;]/)) {
      const colon = entry.indexOf(":");
      if (colon === -1) continue;
      const name = entry.slice(0, colon).trim();
      const value = entry.slice(colon + 1).trim();
      if (name) fields[name] = mashTypeSchema(value, "value");
    }
    return { kind: "record", fields };
  }

  return { kind: "reference", name: text };
}

function mashDefault(rawDefault, kind) {
  if (kind !== "attribute" || rawDefault === undefined) return { kind: "none" };

  try {
    return { kind: "value", value: JSON.parse(rawDefault) };
  } catch {
    throw new Error(`Mash cannot serialize the attribute default ${JSON.stringify(rawDefault)}.`);
  }
}

export function mashBinding(
  tagName,
  kind,
  name,
  overrideRole,
  nodeId,
  exposed = {},
  mapping = "inferred",
) {
  const exposedName = name || "default";
  const semanticRole = overrideRole ?? contractRole(name, kind);
  const definition = MASH_ROLES[semanticRole];
  const fallbackFamily = {
    attribute: "configuration",
    slot: "content",
    part: "anatomy",
    state: "state",
    event: "event",
  }[kind];

  return {
    address: `mash://${tagName}/binding/${kind}/${exposedName}`,
    nodeAddress: `mash://${tagName}/node/${nodeId ?? semanticRole}`,
    renderer: "web",
    kind,
    name,
    role: semanticRole,
    family: definition?.family ?? fallbackFamily,
    shared: Boolean(definition),
    mapping,
    availability:
      kind === "attribute" || kind === "slot"
        ? exposed.required
          ? "required"
          : "optional"
        : "provided",
    direction: {
      attribute: "input",
      slot: "content",
      part: "realization",
      state: "state",
      event: "output",
    }[kind],
    value: mashTypeSchema(exposed.type?.text, kind),
    default: mashDefault(exposed.default, kind),
    fallback: { kind: kind === "slot" ? "empty" : "none" },
    ...(kind === "event" ? { reports: [] } : {}),
  };
}

export function mashSemanticNode(tagName, id, roleName, parent, bindings) {
  const definition = MASH_ROLES[roleName];
  const kinds = new Set(bindings.map((binding) => binding.kind));
  const ownership =
    kinds.has("attribute") && kinds.has("state")
      ? "controlled"
      : kinds.has("slot")
        ? "authored"
        : kinds.has("event")
          ? "reported"
          : "realized";
  return {
    id,
    address: `mash://${tagName}/node/${id}`,
    role: roleName,
    family: definition?.family ?? "local",
    shared: Boolean(definition),
    ownership,
    ...(parent ? { parent: `mash://${tagName}/node/${parent}` } : {}),
    bindings,
  };
}

export function mashManifestMetadata() {
  return {
    schema: MASH_CONTRACT_SCHEMA,
    version: MASH_CONTRACT_VERSION,
    roles: Object.fromEntries(
      Object.entries(MASH_ROLES).map(([name, definition]) => [name, { name, ...definition }]),
    ),
    aliases: { ...MASH_ROLE_ALIASES },
  };
}
