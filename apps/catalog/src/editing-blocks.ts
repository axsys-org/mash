export const blockSelector = "[data-editing-block]";
export const blockContentSelector = "[data-editing-block-content]";
export const editableSelector = "[data-editing-text]";
export const insertGroups = ["Basic", "Components"] as const;

export interface BlockDefinition {
  kind: string;
  label: string;
  description: string;
  group: (typeof insertGroups)[number];
  keywords: readonly string[];
  icon: string;
  create(): HTMLElement;
}

export const blockKindLabels: Readonly<Record<string, string>> = {
  body: "Text",
  bullet: "Bulleted list",
  callout: "Callout",
  caption: "Caption",
  code: "Code",
  heading: "Heading 2",
  quote: "Quote",
  task: "To-do",
  title: "Heading 1",
};

let generatedBlockId = 0;

export function allocateBlockId(kind = "block"): string {
  return `${kind}-${++generatedBlockId}`;
}

export function setAttributes(element: HTMLElement, attributes: Record<string, string>): void {
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
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
): HTMLElement {
  const card = document.createElement("ui-card");
  card.className = "example-editing-callout";
  card.dataset.editingComponent = "callout";
  const heading = document.createElement("strong");
  heading.slot = "header";
  heading.textContent = "Callout";
  const copy = createEditable("p", text);
  copy.slot = "content";
  card.append(heading, copy);
  return card;
}

function createTableContent(): HTMLElement {
  const table = document.createElement("ui-table");
  setAttributes(table, {
    label: "Project milestones",
    "row-count": "3",
    "column-count": "3",
    "data-editing-component": "table",
  });

  const header = document.createElement("ui-table-header");
  const headerRow = document.createElement("ui-table-row");
  headerRow.setAttribute("row-index", "1");
  for (const [index, value] of ["Milestone", "Status", "Owner"].entries()) {
    const cell = document.createElement("ui-table-head");
    cell.setAttribute("column-index", String(index + 1));
    const text = document.createElement("span");
    text.contentEditable = "true";
    text.textContent = value;
    cell.append(text);
    headerRow.append(cell);
  }
  header.append(headerRow);

  const body = document.createElement("ui-table-body");
  const rows = [
    ["Ledger adapter", "In review", "Finance"],
    ["Export fallback", "Ready", "Platform"],
  ];
  rows.forEach((values, rowIndex) => {
    const row = document.createElement("ui-table-row");
    row.setAttribute("row-index", String(rowIndex + 2));
    values.forEach((value, columnIndex) => {
      const cell = document.createElement("ui-table-cell");
      cell.setAttribute("column-index", String(columnIndex + 1));
      const text = document.createElement("span");
      text.contentEditable = "true";
      text.textContent = value;
      cell.append(text);
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
  const code = createEditable("code", 'const migration = await workspace.open("billing");');
  pre.append(code);
  typeset.append(pre);
  return typeset;
}

function createTaskContent(): HTMLElement {
  const checkbox = document.createElement("ui-checkbox");
  checkbox.dataset.editingComponent = "checkbox";
  const label = createEditable("span", "Confirm the reconciliation owner");
  checkbox.append(label);
  return checkbox;
}

function createFieldContent(): HTMLElement {
  const field = document.createElement("ui-field");
  field.setAttribute("label", "Project name");
  field.dataset.editingComponent = "field";
  const input = document.createElement("ui-input");
  input.slot = "control";
  setAttributes(input, { name: "project-name", placeholder: "Billing migration" });
  field.append(input);
  return field;
}

function createDetailsContent(): HTMLElement {
  const collapsible = document.createElement("ui-collapsible");
  collapsible.setAttribute("open", "");
  collapsible.dataset.editingComponent = "collapsible";
  const trigger = document.createElement("span");
  trigger.slot = "trigger";
  trigger.textContent = "Migration notes";
  const copy = createEditable(
    "p",
    "The legacy export stays available until reconciliation has cleared review.",
  );
  collapsible.append(trigger, copy);
  return collapsible;
}

export const blockDefinitions: readonly BlockDefinition[] = [
  {
    kind: "body",
    label: "Text",
    description: "Plain paragraph",
    group: "Basic",
    keywords: ["paragraph", "body"],
    icon: "object.document",
    create: () => createTextBlockContent("p", ""),
  },
  {
    kind: "title",
    label: "Heading 1",
    description: "Large section heading",
    group: "Basic",
    keywords: ["h1", "title"],
    icon: "object.document",
    create: () => createTextBlockContent("h1", "Heading"),
  },
  {
    kind: "heading",
    label: "Heading 2",
    description: "Medium section heading",
    group: "Basic",
    keywords: ["h2", "subtitle"],
    icon: "object.document",
    create: () => createTextBlockContent("h2", "Heading"),
  },
  {
    kind: "bullet",
    label: "Bulleted list",
    description: "Simple unordered list",
    group: "Basic",
    keywords: ["list", "unordered"],
    icon: "navigation.more.horizontal",
    create: () => {
      const list = document.createElement("ul");
      const item = createEditable("li", "List item");
      list.append(item);
      return list;
    },
  },
  {
    kind: "task",
    label: "To-do",
    description: "Interactive checkbox",
    group: "Basic",
    keywords: ["todo", "task", "check"],
    icon: "action.confirm",
    create: createTaskContent,
  },
  {
    kind: "quote",
    label: "Quote",
    description: "Quoted passage",
    group: "Basic",
    keywords: ["blockquote", "citation"],
    icon: "object.document",
    create: () => createEditable("blockquote", "A clear migration is a reversible migration."),
  },
  {
    kind: "callout",
    label: "Callout",
    description: "Card-backed emphasis",
    group: "Basic",
    keywords: ["aside", "note", "card"],
    icon: "status.information",
    create: createCalloutContent,
  },
  {
    kind: "divider",
    label: "Divider",
    description: "Section separator",
    group: "Basic",
    keywords: ["separator", "rule", "line"],
    icon: "navigation.more.horizontal",
    create: () => document.createElement("ui-separator"),
  },
  {
    kind: "code",
    label: "Code block",
    description: "Typeset source code",
    group: "Basic",
    keywords: ["pre", "source", "snippet"],
    icon: "object.terminal",
    create: createCodeContent,
  },
  {
    kind: "table",
    label: "Table",
    description: "Editable structured data",
    group: "Components",
    keywords: ["grid", "rows", "spreadsheet"],
    icon: "object.document",
    create: createTableContent,
  },
  {
    kind: "field",
    label: "Field",
    description: "Labeled form control",
    group: "Components",
    keywords: ["input", "form", "text field"],
    icon: "action.edit",
    create: createFieldContent,
  },
  {
    kind: "button",
    label: "Button",
    description: "Executable control",
    group: "Components",
    keywords: ["action", "control", "cta"],
    icon: "action.launch",
    create: () => {
      const button = document.createElement("ui-button");
      setAttributes(button, {
        type: "button",
        variant: "primary",
        "data-editing-component": "button",
        "data-editing-demo-button": "",
      });
      button.textContent = "Approve migration";
      return button;
    },
  },
  {
    kind: "progress",
    label: "Progress",
    description: "Labeled completion status",
    group: "Components",
    keywords: ["status", "meter", "completion"],
    icon: "status.loading",
    create: () => {
      const progress = document.createElement("ui-progress");
      setAttributes(progress, {
        value: "64",
        label: "Migration readiness",
        "data-editing-component": "progress",
      });
      return progress;
    },
  },
  {
    kind: "details",
    label: "Details",
    description: "Collapsible content",
    group: "Components",
    keywords: ["collapse", "reveal", "disclosure"],
    icon: "navigation.disclosure",
    create: createDetailsContent,
  },
];

export function createBlock(kind: string, content: HTMLElement): HTMLElement {
  const block = document.createElement("section");
  block.dataset.editingBlock = allocateBlockId(kind);
  block.dataset.editingBlockKind = kind;
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
