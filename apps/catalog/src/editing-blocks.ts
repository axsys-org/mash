import {
  BlockCatalogue,
  blockIntegrationFor,
  type BlockDefinition as MashBlockDefinition,
} from "@mash/ui";

export const blockSelector = "[data-editing-block]";
export const blockContentSelector = "[data-editing-block-content]";
export const editableSelector = "[data-editing-text]";
export const insertGroups = ["Text", "Media", "Data & layout", "Interactive"] as const;

export interface BlockDefinition extends MashBlockDefinition {
  group: (typeof insertGroups)[number];
  keywords: readonly string[];
  icon: string;
  create(): HTMLElement;
}

export const blockKindLabels: Readonly<Record<string, string>> = {
  approval: "Approval",
  body: "Text",
  bullet: "Bulleted list",
  callout: "Callout",
  caption: "Caption",
  code: "Code",
  details: "Details",
  divider: "Divider",
  field: "Field",
  heading: "Heading 2",
  image: "Image",
  media: "Audio or video",
  metrics: "Metrics",
  progress: "Progress",
  quote: "Quote",
  table: "Table",
  tabs: "Tabs",
  task: "To-do",
  "task-list": "Task list",
  title: "Heading 1",
};

let generatedBlockId = 0;

export function allocateBlockId(kind = "block"): string {
  return `${kind}-${++generatedBlockId}`;
}

export function setAttributes(element: HTMLElement, attributes: Record<string, string>): void {
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
}

function createIcon(name: string, label = ""): HTMLElement {
  const icon = document.createElement("ui-icon");
  setAttributes(icon, { name, label });
  return icon;
}

function createEditable(tag: string, text = ""): HTMLElement {
  const editable = document.createElement(tag);
  editable.contentEditable = "true";
  editable.spellcheck = true;
  editable.dataset.editingText = "";
  editable.textContent = text;
  return editable;
}

export function createTextBlockContent(tag: "p" | "h1" | "h2", text: string): HTMLElement {
  return createEditable(tag, text);
}

export function createCalloutContent(
  text = "Keep the operational handoff visible to the whole team.",
  headingText = "Callout",
): HTMLElement {
  const card = document.createElement("ui-card");
  card.className = "example-editing-callout";
  card.dataset.editingComponent = "callout";
  const heading = document.createElement("strong");
  heading.slot = "header";
  heading.textContent = headingText;
  const copy = createEditable("p", text);
  copy.slot = "content";
  card.append(heading, copy);
  return card;
}

function createTableContent(): HTMLElement {
  const table = document.createElement("ui-table");
  setAttributes(table, {
    label: "Release workstreams",
    "row-count": "4",
    "column-count": "4",
    "data-editing-component": "table",
  });

  const header = document.createElement("ui-table-header");
  const headerRow = document.createElement("ui-table-row");
  headerRow.setAttribute("row-index", "1");
  for (const [index, value] of ["Workstream", "Status", "Owner", "Window"].entries()) {
    const cell = document.createElement("ui-table-head");
    cell.setAttribute("column-index", String(index + 1));
    cell.append(createEditable("span", value));
    headerRow.append(cell);
  }
  header.append(headerRow);

  const body = document.createElement("ui-table-body");
  const rows = [
    ["Interface schema", "In review", "Platform", "Sep 09"],
    ["Media pipeline", "Ready", "Studio", "Sep 11"],
    ["Agent renderer", "Building", "Systems", "Sep 14"],
  ];
  rows.forEach((values, rowIndex) => {
    const row = document.createElement("ui-table-row");
    row.setAttribute("row-index", String(rowIndex + 2));
    values.forEach((value, columnIndex) => {
      const cell = document.createElement("ui-table-cell");
      cell.setAttribute("column-index", String(columnIndex + 1));
      cell.append(createEditable("span", value));
      row.append(cell);
    });
    body.append(row);
  });
  table.append(header, body);
  return table;
}

function createCodeContent(): HTMLElement {
  const typeset = document.createElement("ui-typeset");
  typeset.setAttribute("preset", "code");
  typeset.className = "example-editing-code";
  typeset.dataset.editingComponent = "code";
  const pre = document.createElement("pre");
  const code = createEditable(
    "code",
    'await stream.append({ type: "callout", props: { tone: "accent" } });',
  );
  pre.append(code);
  typeset.append(pre);
  return typeset;
}

function createTaskContent(text = "Confirm the release owner"): HTMLElement {
  const checkbox = document.createElement("ui-checkbox");
  checkbox.dataset.editingComponent = "checkbox";
  checkbox.append(createEditable("span", text));
  return checkbox;
}

function createTaskListContent(): HTMLElement {
  const list = document.createElement("div");
  list.className = "example-editing-task-list";
  list.dataset.editingComponent = "task-list";
  for (const [text, checked] of [
    ["Lock the semantic block envelope", true],
    ["Exercise image and media handoff", true],
    ["Run the cross-renderer fixture matrix", false],
  ] as const) {
    const checkbox = createTaskContent(text);
    checkbox.toggleAttribute("checked", checked);
    list.append(checkbox);
  }
  return list;
}

function createFieldContent(): HTMLElement {
  const field = document.createElement("ui-field");
  field.setAttribute("label", "Document owner");
  field.dataset.editingComponent = "field";
  const input = document.createElement("ui-input");
  input.slot = "control";
  setAttributes(input, { name: "document-owner", placeholder: "Name or team" });
  field.append(input);
  return field;
}

function createDetailsContent(): HTMLElement {
  const collapsible = document.createElement("ui-collapsible");
  collapsible.setAttribute("open", "");
  collapsible.dataset.editingComponent = "collapsible";
  const trigger = document.createElement("span");
  trigger.slot = "trigger";
  trigger.textContent = "Implementation notes";
  const copy = createEditable(
    "p",
    "Keep persistence, collaboration, and transport adapters outside the visible block grammar.",
  );
  collapsible.append(trigger, copy);
  return collapsible;
}

function createProgressContent(): HTMLElement {
  const group = document.createElement("div");
  group.className = "example-editing-progress";
  group.dataset.editingComponent = "progress";
  const heading = document.createElement("div");
  heading.className = "example-editing-progress-heading";
  const label = document.createElement("strong");
  label.textContent = "Release confidence";
  const badge = document.createElement("ui-badge");
  setAttributes(badge, { tone: "positive", size: "small" });
  badge.textContent = "82%";
  heading.append(label, badge);
  const progress = document.createElement("ui-progress");
  setAttributes(progress, { value: "82", label: "Release confidence" });
  group.append(heading, progress);
  return group;
}

function createMetricsContent(): HTMLElement {
  const metrics = document.createElement("dl");
  metrics.className = "example-editing-metrics";
  metrics.dataset.editingComponent = "metrics";
  for (const [label, value, note, tone] of [
    ["Block contracts", "24", "+9 this pass", "positive"],
    ["Renderer coverage", "91%", "Web baseline", "accent"],
    ["Open decisions", "3", "Needs review", "warning"],
  ] as const) {
    const item = document.createElement("div");
    item.className = "example-editing-metric";
    const term = document.createElement("dt");
    term.textContent = label;
    const number = document.createElement("dd");
    number.textContent = value;
    const badge = document.createElement("ui-badge");
    setAttributes(badge, { tone, size: "small" });
    badge.textContent = note;
    item.append(term, number, badge);
    metrics.append(item);
  }
  return metrics;
}

function createTabsContent(): HTMLElement {
  const tabs = document.createElement("ui-tabs");
  tabs.className = "example-editing-tabs";
  tabs.dataset.editingComponent = "tabs";
  setAttributes(tabs, { label: "Rollout views", value: "brief" });
  for (const [value, label, copy] of [
    ["brief", "Brief", "The document remains useful before any editor runtime upgrades it."],
    ["agents", "Agents", "Each streamed operation targets a stable, versioned block record."],
    ["handoff", "Handoff", "Files remain local until an application explicitly persists them."],
  ]) {
    const tab = document.createElement("ui-tab");
    tab.slot = "tab";
    tab.setAttribute("value", value!);
    tab.textContent = label!;
    const panel = document.createElement("ui-tab-panel");
    panel.slot = "panel";
    panel.setAttribute("value", value!);
    panel.append(createEditable("p", copy!));
    tabs.append(tab, panel);
  }
  return tabs;
}

function createApprovalContent(): HTMLElement {
  const form = document.createElement("ui-form");
  form.className = "example-editing-approval";
  form.dataset.editingComponent = "approval";
  const field = document.createElement("ui-field");
  field.setAttribute("label", "Review note");
  const input = document.createElement("ui-input");
  input.slot = "control";
  setAttributes(input, { name: "review-note", placeholder: "Optional context" });
  field.append(input);
  const switchControl = document.createElement("ui-switch");
  switchControl.setAttribute("name", "notify-team");
  switchControl.textContent = "Notify the workspace";
  const actions = document.createElement("div");
  actions.className = "example-editing-approval-actions";
  const secondary = document.createElement("ui-button");
  setAttributes(secondary, { type: "button", variant: "secondary" });
  secondary.textContent = "Request changes";
  const primary = document.createElement("ui-button");
  setAttributes(primary, {
    type: "button",
    variant: "primary",
    "data-editing-demo-button": "",
  });
  primary.textContent = "Approve brief";
  actions.append(secondary, primary);
  form.append(field, switchControl, actions);
  return form;
}

function createFileUpload(kind: "image" | "media", compact = false): HTMLElement {
  const upload = document.createElement("ui-file-upload");
  const image = kind === "image";
  upload.className = compact ? "example-editing-upload-compact" : "example-editing-upload";
  setAttributes(upload, {
    accept: image ? "image/*" : "audio/*,video/*",
    label: image ? "Choose an image" : "Choose audio or video",
    "max-size": String(100 * 1024 * 1024),
    "data-editing-upload": kind,
  });
  const icon = createIcon(image ? "object.image" : "object.video");
  icon.slot = "prefix";
  const description = document.createElement("span");
  description.slot = "description";
  description.textContent = image
    ? "PNG, JPEG, WebP, AVIF, or GIF up to 100 MB"
    : "Audio or video up to 100 MB";
  upload.append(icon, compact ? "Replace" : image ? "Upload image" : "Upload media", description);
  return upload;
}

export function createUploadContent(kind: "image" | "media"): HTMLElement {
  const figure = document.createElement("figure");
  figure.className = "example-editing-media";
  figure.dataset.editingComponent = kind;
  figure.dataset.editingUploadContainer = kind;
  figure.append(createFileUpload(kind));
  return figure;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function renderUploadedFile(
  container: HTMLElement,
  file: File,
  url: string,
  assetId: string,
): void {
  const requestedKind = container.dataset.editingUploadContainer ?? "media";
  const image = file.type.startsWith("image/") || requestedKind === "image";
  const audio = file.type.startsWith("audio/");
  container.replaceChildren();
  container.dataset.editingAsset = assetId;
  container.dataset.editingAssetName = file.name;
  container.dataset.editingAssetType = file.type || "application/octet-stream";

  if (image) {
    const preview = document.createElement("ui-image");
    preview.className = "example-editing-image-preview";
    setAttributes(preview, { src: url, alt: file.name, loading: "eager" });
    const pending = document.createElement("span");
    pending.slot = "placeholder";
    pending.textContent = "Decoding image";
    const error = document.createElement("span");
    error.slot = "error";
    error.textContent = "This image cannot be previewed";
    preview.append(pending, error);
    container.append(preview);
  } else if (audio) {
    const shell = document.createElement("div");
    shell.className = "example-editing-audio-preview";
    shell.append(createIcon("object.audio"));
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = file.name;
    const meta = document.createElement("span");
    meta.textContent = `${file.type || "Audio"} · ${formatBytes(file.size)}`;
    copy.append(title, meta);
    const player = document.createElement("audio");
    player.controls = true;
    player.preload = "metadata";
    player.src = url;
    shell.append(copy, player);
    container.append(shell);
  } else {
    const player = document.createElement("video");
    player.className = "example-editing-video-preview";
    player.controls = true;
    player.preload = "metadata";
    player.src = url;
    player.setAttribute("aria-label", file.name);
    container.append(player);
  }

  const caption = document.createElement("figcaption");
  caption.className = "example-editing-media-caption";
  const copy = document.createElement("div");
  copy.append(createEditable("span", file.name));
  const meta = document.createElement("small");
  meta.textContent = `${file.type || "Local file"} · ${formatBytes(file.size)}`;
  copy.append(meta);
  caption.append(copy, createFileUpload(requestedKind === "image" ? "image" : "media", true));
  container.append(caption);
}

export const blockDefinitions: readonly BlockDefinition[] = [
  {
    type: "body",
    version: 1,
    label: "Text",
    description: "Plain paragraph",
    group: "Text",
    keywords: ["paragraph", "body"],
    icon: "object.document",
    placement: "document",
    capabilities: ["editable", "streamable"],
    create: () => createTextBlockContent("p", ""),
  },
  {
    type: "title",
    version: 1,
    label: "Heading 1",
    description: "Primary document heading",
    group: "Text",
    keywords: ["h1", "title"],
    icon: "object.document",
    placement: "document",
    capabilities: ["editable", "streamable"],
    create: () => createTextBlockContent("h1", "Heading"),
  },
  {
    type: "heading",
    version: 1,
    label: "Heading 2",
    description: "Section heading",
    group: "Text",
    keywords: ["h2", "subtitle"],
    icon: "object.document",
    placement: "document",
    capabilities: ["editable", "streamable"],
    create: () => createTextBlockContent("h2", "Heading"),
  },
  {
    type: "bullet",
    version: 1,
    label: "Bulleted list",
    description: "Simple unordered list",
    group: "Text",
    keywords: ["list", "unordered"],
    icon: "navigation.menu",
    placement: "document",
    capabilities: ["editable", "streamable"],
    create: () => {
      const list = document.createElement("ul");
      list.append(createEditable("li", "List item"));
      return list;
    },
  },
  {
    type: "task",
    version: 1,
    label: "To-do",
    description: "One interactive checkbox",
    group: "Text",
    keywords: ["todo", "task", "check"],
    icon: "action.confirm",
    placement: "document",
    capabilities: ["editable", "interactive", "streamable"],
    components: ["ui-checkbox"],
    create: () => createTaskContent(),
  },
  {
    type: "task-list",
    version: 1,
    label: "Task list",
    description: "A coordinated release checklist",
    group: "Text",
    keywords: ["todos", "checklist", "tasks"],
    icon: "action.confirm",
    placement: "document",
    capabilities: ["editable", "interactive", "streamable"],
    components: ["ui-checkbox"],
    create: createTaskListContent,
  },
  {
    type: "quote",
    version: 1,
    label: "Quote",
    description: "Quoted passage",
    group: "Text",
    keywords: ["blockquote", "citation"],
    icon: "object.document",
    placement: "document",
    capabilities: ["editable", "streamable"],
    create: () =>
      createEditable("blockquote", "A durable interface keeps its meaning when its host changes."),
  },
  {
    type: "callout",
    version: 1,
    label: "Callout",
    description: "Card-backed emphasis",
    group: "Text",
    keywords: ["aside", "note", "card"],
    icon: "status.information",
    placement: "document",
    capabilities: ["editable", "streamable"],
    components: ["ui-card"],
    create: () => createCalloutContent(),
  },
  {
    type: "code",
    version: 1,
    label: "Code block",
    description: "Typeset source code",
    group: "Text",
    keywords: ["pre", "source", "snippet"],
    icon: "object.terminal",
    placement: "document",
    capabilities: ["editable", "streamable"],
    components: ["ui-typeset"],
    create: createCodeContent,
  },
  {
    type: "image",
    version: 1,
    label: "Image",
    description: "Upload and preview an image",
    group: "Media",
    keywords: ["photo", "picture", "upload", "asset"],
    icon: "object.image",
    placement: "document",
    capabilities: ["atomic", "interactive", "media", "streamable"],
    components: ["ui-file-upload", "ui-image"],
    create: () => createUploadContent("image"),
  },
  {
    type: "media",
    version: 1,
    label: "Audio or video",
    description: "Upload playable local media",
    group: "Media",
    keywords: ["audio", "video", "movie", "sound", "upload"],
    icon: "object.video",
    placement: "document",
    capabilities: ["atomic", "interactive", "media", "streamable"],
    components: ["ui-file-upload"],
    create: () => createUploadContent("media"),
  },
  {
    type: "divider",
    version: 1,
    label: "Divider",
    description: "Section separator",
    group: "Data & layout",
    keywords: ["separator", "rule", "line"],
    icon: "action.remove",
    placement: "document",
    capabilities: ["atomic", "streamable"],
    components: ["ui-separator"],
    create: () => document.createElement("ui-separator"),
  },
  {
    type: "table",
    version: 1,
    label: "Table",
    description: "Editable structured data",
    group: "Data & layout",
    keywords: ["grid", "rows", "spreadsheet"],
    icon: "object.table",
    placement: "document",
    capabilities: ["editable", "interactive", "streamable"],
    components: [
      "ui-table",
      "ui-table-header",
      "ui-table-row",
      "ui-table-head",
      "ui-table-body",
      "ui-table-cell",
    ],
    create: createTableContent,
  },
  {
    type: "metrics",
    version: 1,
    label: "Metrics",
    description: "Three compact status measures",
    group: "Data & layout",
    keywords: ["stats", "kpi", "numbers", "dashboard"],
    icon: "object.table",
    placement: "document",
    capabilities: ["streamable"],
    components: ["ui-badge"],
    create: createMetricsContent,
  },
  {
    type: "tabs",
    version: 1,
    label: "Tabs",
    description: "Switchable authored views",
    group: "Data & layout",
    keywords: ["panels", "views", "sections"],
    icon: "object.folder",
    placement: "document",
    capabilities: ["editable", "interactive", "streamable"],
    components: ["ui-tabs", "ui-tab", "ui-tab-panel"],
    create: createTabsContent,
  },
  {
    type: "details",
    version: 1,
    label: "Details",
    description: "Collapsible authored content",
    group: "Data & layout",
    keywords: ["collapse", "reveal", "disclosure"],
    icon: "navigation.disclosure",
    placement: "document",
    capabilities: ["editable", "interactive", "streamable"],
    components: ["ui-collapsible"],
    create: createDetailsContent,
  },
  {
    type: "field",
    version: 1,
    label: "Field",
    description: "Labeled text input",
    group: "Interactive",
    keywords: ["input", "form", "text field"],
    icon: "action.edit",
    placement: "document",
    capabilities: ["interactive", "streamable"],
    components: ["ui-field", "ui-input"],
    create: createFieldContent,
  },
  {
    type: "button",
    version: 1,
    label: "Button",
    description: "Executable control",
    group: "Interactive",
    keywords: ["action", "control", "cta"],
    icon: "action.launch",
    placement: "document",
    capabilities: ["atomic", "interactive", "streamable"],
    components: ["ui-button"],
    create: () => {
      const button = document.createElement("ui-button");
      setAttributes(button, {
        type: "button",
        variant: "primary",
        "data-editing-component": "button",
        "data-editing-demo-button": "",
      });
      button.textContent = "Approve brief";
      return button;
    },
  },
  {
    type: "progress",
    version: 1,
    label: "Progress",
    description: "Labeled completion status",
    group: "Interactive",
    keywords: ["status", "meter", "completion"],
    icon: "status.loading",
    placement: "document",
    capabilities: ["streamable"],
    components: ["ui-badge", "ui-progress"],
    create: createProgressContent,
  },
  {
    type: "approval",
    version: 1,
    label: "Approval",
    description: "Review field and actions",
    group: "Interactive",
    keywords: ["form", "review", "approve", "workflow"],
    icon: "action.confirm",
    placement: "document",
    capabilities: ["interactive", "streamable"],
    components: ["ui-button", "ui-field", "ui-form", "ui-input", "ui-switch"],
    create: createApprovalContent,
  },
];

export const blockCatalogue = new BlockCatalogue(
  blockDefinitions.map(({ create: _create, ...definition }) => definition),
);

for (const definition of blockDefinitions) {
  const integrations = (definition.components ?? []).map(
    (tag) => [tag, blockIntegrationFor(tag)] as const,
  );
  const unknown = integrations.find(([, integration]) => !integration)?.[0];
  if (unknown)
    throw new Error(`Block "${definition.type}" uses unclassified component "${unknown}".`);
  if (
    integrations.some(([, integration]) => integration === "structural") &&
    !integrations.some(([, integration]) => integration === "container")
  ) {
    throw new Error(`Block "${definition.type}" has structural components without their owner.`);
  }
}

export function createBlock(
  kind: string,
  content: HTMLElement,
  id = allocateBlockId(kind),
): HTMLElement {
  const block = document.createElement("section");
  block.dataset.editingBlock = id;
  block.dataset.editingBlockKind = kind;
  block.dataset.editingBlockVersion = String(blockCatalogue.get(kind)?.version ?? 1);
  block.tabIndex = -1;
  const container = document.createElement("div");
  container.dataset.editingBlockContent = "";
  container.append(content);
  block.append(container);
  return block;
}

export function placeCaretAtEnd(element: HTMLElement): void {
  element.focus({ preventScroll: true });
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = element.ownerDocument.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function textOffsetRange(root: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let position = 0;
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffset = 0;
  let endOffset = 0;
  let node = walker.nextNode() as Text | null;

  while (node) {
    const next = position + node.data.length;
    if (!startNode && start >= position && start <= next) {
      startNode = node;
      startOffset = start - position;
    }
    if (end >= position && end <= next) {
      endNode = node;
      endOffset = end - position;
      break;
    }
    position = next;
    node = walker.nextNode() as Text | null;
  }

  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}
