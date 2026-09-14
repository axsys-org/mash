export type BlockKind =
  | "paragraph"
  | "heading"
  | "subheading"
  | "bullet"
  | "numbered"
  | "todo"
  | "quote"
  | "callout"
  | "code"
  | "divider"
  | "table"
  | "image";
export type MarkKind = "bold" | "italic" | "underline" | "code" | "link";
export interface TextMark {
  kind: MarkKind;
  start: number;
  end: number;
  href?: string;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface DataRow {
  id: string;
  title: string;
  status: "Planned" | "In progress" | "Done";
  owner: string;
  due: string;
  estimate: number;
  done: boolean;
}
export interface Comment {
  id: string;
  text: string;
  created: string;
  resolved: boolean;
}
export interface DocumentBlock {
  id: string;
  kind: BlockKind;
  text: string;
  marks: TextMark[];
  checked: boolean;
  frame: Rect;
  group?: string;
  color: "plain" | "amber" | "blue" | "green";
  rows?: DataRow[];
  source?: string;
  comments: Comment[];
}
export interface Connection {
  id: string;
  from: string;
  to: string;
  label: string;
}
export interface NotebookDocument {
  id: string;
  parent: string | null;
  title: string;
  icon: string;
  favorite: boolean;
  blocks: DocumentBlock[];
  connections: Connection[];
}
export interface Notebook {
  version: 1;
  active: string;
  documents: NotebookDocument[];
}
export const blockKinds: Array<{ kind: BlockKind; label: string; hint: string; icon: string }> = [
  { kind: "paragraph", label: "Text", hint: "A plain paragraph", icon: "object.document" },
  { kind: "heading", label: "Heading 1", hint: "A large section heading", icon: "object.document" },
  {
    kind: "subheading",
    label: "Heading 2",
    hint: "A smaller section heading",
    icon: "object.document",
  },
  {
    kind: "bullet",
    label: "Bulleted list",
    hint: "An unordered list item",
    icon: "object.document",
  },
  {
    kind: "numbered",
    label: "Numbered list",
    hint: "An ordered list item",
    icon: "object.document",
  },
  { kind: "todo", label: "To-do", hint: "A checkable task", icon: "action.confirm" },
  { kind: "quote", label: "Quote", hint: "A passage worth keeping", icon: "object.document" },
  {
    kind: "callout",
    label: "Callout",
    hint: "Put an idea in the spotlight",
    icon: "object.document",
  },
  {
    kind: "code",
    label: "Code",
    hint: "Plain source with preserved whitespace",
    icon: "object.document",
  },
  {
    kind: "divider",
    label: "Divider",
    hint: "Separate two sections",
    icon: "navigation.more.horizontal",
  },
  {
    kind: "table",
    label: "Collection",
    hint: "Editable records, table and board views",
    icon: "object.document",
  },
  { kind: "image", label: "Image", hint: "Upload or link to an image", icon: "object.document" },
];
export const identifier = () => crypto.randomUUID();
export const clone = <T>(value: T): T => structuredClone(value);
export function createBlock(kind: BlockKind = "paragraph", text = "", index = 0): DocumentBlock {
  return {
    id: identifier(),
    kind,
    text,
    marks: [],
    checked: false,
    frame: {
      x: 80 + (index % 3) * 370,
      y: 80 + Math.floor(index / 3) * 270,
      width: 330,
      height: 220,
    },
    color: "plain",
    comments: [],
    ...(kind === "table" ? { rows: [] } : {}),
  };
}
export function createDocument(title = "Untitled", parent: string | null = null): NotebookDocument {
  return {
    id: identifier(),
    parent,
    title,
    icon: "object.document",
    favorite: false,
    blocks: [createBlock("paragraph")],
    connections: [],
  };
}
export function seedNotebook(): Notebook {
  const intro = createDocument("A place for your ideas");
  intro.favorite = true;
  intro.blocks = [
    createBlock("heading", "Think in pages. Create in space.", 0),
    createBlock(
      "paragraph",
      "A shared notebook for research, rough ideas, and work in progress. Write here, or switch to Canvas to arrange these same blocks spatially.",
      1,
    ),
    createBlock(
      "callout",
      "Everything in this workspace stays in this browser. Export a notebook to keep a portable copy.",
      2,
    ),
    createBlock("subheading", "Make it yours", 3),
    createBlock("todo", "Write your first idea. Type / in a block to explore the menu.", 4),
    createBlock("todo", "Select a passage and use the formatting toolbar.", 5),
    createBlock("todo", "Move into the canvas and connect two ideas.", 6),
    createBlock("quote", "The best place to start is with something worth keeping.", 7),
  ];
  intro.blocks[0]!.frame = { x: 80, y: 80, width: 500, height: 180 };
  intro.blocks[1]!.frame = { x: 80, y: 320, width: 500, height: 240 };
  intro.blocks[2]!.frame = { x: 660, y: 100, width: 370, height: 260 };
  intro.blocks[2]!.color = "amber";
  for (let i = 3; i < intro.blocks.length; i++)
    intro.blocks[i]!.frame = {
      x: 660 + (i > 5 ? 410 : 0),
      y: 420 + (i % 3) * 210,
      width: 350,
      height: 170,
    };
  intro.connections = [
    { id: identifier(), from: intro.blocks[0]!.id, to: intro.blocks[2]!.id, label: "Explore" },
  ];
  const brief = createDocument("Design notebook", intro.id);
  brief.blocks = [
    createBlock("heading", "A quieter workspace"),
    createBlock(
      "paragraph",
      "What if our tools made more room for the work? Collect observations below, then arrange them into a direction.",
    ),
    createBlock("subheading", "Principles"),
    createBlock("bullet", "Let content lead the interface."),
    createBlock("bullet", "Keep actions close to what they change."),
    createBlock("bullet", "Preserve the draft. Make every move reversible."),
    createBlock("code", "const idea = {\n  clarity: true,\n  roomToExplore: true\n};"),
  ];
  const planning = createDocument("Release planning");
  const table = createBlock("table", "Release workstreams");
  table.frame = { x: 100, y: 100, width: 760, height: 450 };
  table.rows = [
    {
      id: identifier(),
      title: "Define the interaction model",
      status: "Done",
      owner: "Alex",
      due: "2026-09-12",
      estimate: 3,
      done: true,
    },
    {
      id: identifier(),
      title: "Review navigation and keyboard paths",
      status: "In progress",
      owner: "Sam",
      due: "2026-09-15",
      estimate: 5,
      done: false,
    },
    {
      id: identifier(),
      title: "Prepare the writing workspace",
      status: "Planned",
      owner: "River",
      due: "2026-09-18",
      estimate: 8,
      done: false,
    },
    {
      id: identifier(),
      title: "Collect feedback",
      status: "Planned",
      owner: "Alex",
      due: "2026-09-20",
      estimate: 2,
      done: false,
    },
  ];
  planning.blocks = [
    createBlock("heading", "A small release, thoughtfully made"),
    createBlock(
      "paragraph",
      "One collection, two views. Edit a cell, filter by owner, or drag a board card into its next stage.",
    ),
    table,
  ];
  return { version: 1, active: intro.id, documents: [intro, brief, planning] };
}
/** Edits retain formatting outside the changed interval; stored state never contains HTML. */
export function replaceText(block: DocumentBlock, next: string): void {
  const previous = block.text;
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let before = previous.length,
    after = next.length;
  while (before > start && after > start && previous[before - 1] === next[after - 1]) {
    before--;
    after--;
  }
  const delta = next.length - previous.length;
  block.marks = block.marks
    .map((mark) => ({
      ...mark,
      start: mark.start >= before ? mark.start + delta : Math.min(mark.start, start),
      end: mark.end >= before ? mark.end + delta : Math.min(mark.end, start),
    }))
    .filter((mark) => mark.end > mark.start);
  block.text = next;
}
export function toggleMark(
  block: DocumentBlock,
  kind: MarkKind,
  start: number,
  end: number,
  href?: string,
): void {
  start = Math.max(0, Math.min(start, block.text.length));
  end = Math.max(start, Math.min(end, block.text.length));
  if (start === end) return;
  const covered = block.marks.some((m) => m.kind === kind && m.start <= start && m.end >= end);
  block.marks = block.marks.flatMap((mark) => {
    if (mark.kind !== kind || mark.end <= start || mark.start >= end) return [mark];
    return [
      mark.start < start ? { ...mark, end: start } : null,
      mark.end > end ? { ...mark, start: end } : null,
    ].filter((m): m is TextMark => Boolean(m));
  });
  if (!covered) block.marks.push({ kind, start, end, ...(href ? { href } : {}) });
}
export function removeBlock(doc: NotebookDocument, id: string): void {
  doc.blocks = doc.blocks.filter((b) => b.id !== id);
  doc.connections = doc.connections.filter((c) => c.from !== id && c.to !== id);
}
export function removeDocument(state: Notebook, id: string): void {
  const removed = new Set([id]);
  for (let i = 0; i < state.documents.length; i++)
    for (const doc of state.documents)
      if (doc.parent && removed.has(doc.parent)) removed.add(doc.id);
  state.documents = state.documents.filter((doc) => !removed.has(doc.id));
  if (!state.documents.length) state.documents.push(createDocument());
  if (removed.has(state.active)) state.active = state.documents[0]!.id;
}
export function duplicateBlock(doc: NotebookDocument, id: string): DocumentBlock | undefined {
  const index = doc.blocks.findIndex((b) => b.id === id);
  if (index < 0) return;
  const copied = clone(doc.blocks[index]!);
  copied.id = identifier();
  delete copied.group;
  copied.frame.x += 24;
  copied.frame.y += 24;
  copied.comments = copied.comments.map((c) => ({ ...c, id: identifier() }));
  doc.blocks.splice(index + 1, 0, copied);
  return copied;
}
export function bounds(rectangles: Rect[]): Rect {
  if (!rectangles.length) return { x: 0, y: 0, width: 800, height: 600 };
  const x = Math.min(...rectangles.map((r) => r.x)),
    y = Math.min(...rectangles.map((r) => r.y));
  return {
    x,
    y,
    width: Math.max(...rectangles.map((r) => r.x + r.width)) - x,
    height: Math.max(...rectangles.map((r) => r.y + r.height)) - y,
  };
}
export function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
  );
}
export function filteredRows(
  block: DocumentBlock,
  query: string,
  status: string,
  sort: string,
  descending = false,
): DataRow[] {
  const rows = (block.rows ?? []).filter(
    (row) =>
      (!status || row.status === status) &&
      `${row.title} ${row.owner} ${row.status}`.toLowerCase().includes(query.toLowerCase()),
  );
  const key =
    (["title", "status", "owner", "due", "estimate"] as const).find((k) => k === sort) ?? "title";
  return [...rows].sort(
    (a, b) =>
      (typeof a[key] === "number"
        ? Number(a[key]) - Number(b[key])
        : String(a[key]).localeCompare(String(b[key]))) * (descending ? -1 : 1),
  );
}
export class NotebookHistory {
  state: Notebook;
  #past: Notebook[] = [];
  #future: Notebook[] = [];
  #key = "";
  #time = 0;
  constructor(state: Notebook) {
    this.state = clone(state);
  }
  get canUndo(): boolean {
    return this.#past.length > 0;
  }
  get canRedo(): boolean {
    return this.#future.length > 0;
  }
  /** Bring external source changes into every snapshot so undo remains local to this editor. */
  rebase(merge: (snapshot: Notebook) => Notebook): void {
    this.state = merge(this.state);
    this.#past = this.#past.map(merge);
    this.#future = this.#future.map(merge);
    this.#key = "";
  }
  transact(edit: (state: Notebook) => void, key = ""): boolean {
    const previous = clone(this.state);
    edit(this.state);
    if (JSON.stringify(previous) === JSON.stringify(this.state)) return false;
    const now = Date.now();
    if (!key || key !== this.#key || now - this.#time > 700) {
      this.#past.push(previous);
      if (this.#past.length > 150) this.#past.shift();
    }
    this.#key = key;
    this.#time = now;
    this.#future = [];
    return true;
  }
  undo(): boolean {
    const previous = this.#past.pop();
    if (!previous) return false;
    this.#future.push(clone(this.state));
    this.state = previous;
    this.#key = "";
    return true;
  }
  redo(): boolean {
    const next = this.#future.pop();
    if (!next) return false;
    this.#past.push(clone(this.state));
    this.state = next;
    this.#key = "";
    return true;
  }
}
/** Validate imports before committing them. Limits keep local files practical to inspect. */
export function parseNotebook(json: string): Notebook {
  if (json.length > 8_000_000) throw new Error("Notebook exceeds the 8 MB import limit.");
  const raw: unknown = JSON.parse(json);
  const record = (v: unknown): v is Record<string, unknown> =>
    Boolean(v) && typeof v === "object" && !Array.isArray(v);
  if (
    !record(raw) ||
    raw.version !== 1 ||
    !Array.isArray(raw.documents) ||
    raw.documents.length < 1 ||
    raw.documents.length > 200
  )
    throw new Error("Choose a valid exported notebook.");
  const ids = new Set<string>();
  const documents: NotebookDocument[] = raw.documents.map((value) => {
    if (
      !record(value) ||
      typeof value.id !== "string" ||
      ids.has(value.id) ||
      typeof value.title !== "string" ||
      !Array.isArray(value.blocks) ||
      value.blocks.length > 2000
    )
      throw new Error("A document has an invalid title, identity, or block list.");
    ids.add(value.id);
    const blockIds = new Set<string>();
    const blocks: DocumentBlock[] = value.blocks.map((item) => {
      if (
        !record(item) ||
        typeof item.id !== "string" ||
        blockIds.has(item.id) ||
        !blockKinds.some((k) => k.kind === item.kind) ||
        typeof item.text !== "string" ||
        item.text.length > 200000 ||
        !record(item.frame)
      )
        throw new Error("A block is incomplete or unsupported.");
      blockIds.add(item.id);
      const frame = item.frame;
      for (const key of ["x", "y", "width", "height"])
        if (
          typeof frame[key] !== "number" ||
          !Number.isFinite(frame[key]) ||
          Math.abs(frame[key] as number) > 1000000
        )
          throw new Error("Canvas dimensions must be finite.");
      if ((frame.width as number) < 80 || (frame.height as number) < 60)
        throw new Error("A canvas card is too small.");
      const block: DocumentBlock = {
        id: item.id,
        kind: item.kind as BlockKind,
        text: item.text,
        checked: item.checked === true,
        marks: [],
        frame: frame as unknown as Rect,
        comments: [],
        color: ["plain", "amber", "blue", "green"].includes(String(item.color))
          ? (item.color as DocumentBlock["color"])
          : "plain",
      };
      if (typeof item.group === "string") block.group = item.group;
      if (typeof item.source === "string" && safeImage(item.source)) block.source = item.source;
      if (Array.isArray(item.marks))
        for (const mark of item.marks) {
          if (
            !record(mark) ||
            !["bold", "italic", "underline", "code", "link"].includes(String(mark.kind)) ||
            !Number.isInteger(mark.start) ||
            !Number.isInteger(mark.end) ||
            Number(mark.start) < 0 ||
            Number(mark.end) > block.text.length ||
            Number(mark.end) <= Number(mark.start)
          )
            throw new Error("Text formatting is invalid.");
          block.marks.push({
            kind: mark.kind as MarkKind,
            start: Number(mark.start),
            end: Number(mark.end),
            ...(typeof mark.href === "string" && safeLink(mark.href) ? { href: mark.href } : {}),
          });
        }
      if (Array.isArray(item.comments))
        block.comments = item.comments
          .filter(record)
          .filter((c) => typeof c.text === "string")
          .map((c) => ({
            id: typeof c.id === "string" ? c.id : identifier(),
            text: String(c.text),
            created: typeof c.created === "string" ? c.created : new Date().toISOString(),
            resolved: c.resolved === true,
          }));
      if (block.kind === "table") {
        if (!Array.isArray(item.rows) || item.rows.length > 5000)
          throw new Error("Collection rows are missing or too numerous.");
        block.rows = item.rows.map((row) => {
          if (
            !record(row) ||
            typeof row.title !== "string" ||
            !["Planned", "In progress", "Done"].includes(String(row.status)) ||
            typeof row.estimate !== "number" ||
            !Number.isFinite(row.estimate)
          )
            throw new Error("A collection row is invalid.");
          return {
            id: typeof row.id === "string" ? row.id : identifier(),
            title: row.title,
            status: row.status as DataRow["status"],
            owner: String(row.owner ?? ""),
            due: String(row.due ?? ""),
            estimate: row.estimate,
            done: row.done === true,
          };
        });
      }
      return block;
    });
    const connections: Connection[] = Array.isArray(value.connections)
      ? value.connections
          .filter(record)
          .filter(
            (c) => blockIds.has(String(c.from)) && blockIds.has(String(c.to)) && c.from !== c.to,
          )
          .map((c) => ({
            id: typeof c.id === "string" ? c.id : identifier(),
            from: String(c.from),
            to: String(c.to),
            label: String(c.label ?? ""),
          }))
      : [];
    return {
      id: value.id,
      title: value.title,
      parent: typeof value.parent === "string" ? value.parent : null,
      icon: "object.document",
      favorite: value.favorite === true,
      blocks,
      connections,
    };
  });
  for (const doc of documents) {
    if (!ids.has(doc.parent ?? "")) doc.parent = null;
    const visited = new Set([doc.id]);
    let parent = doc.parent;
    while (parent) {
      if (visited.has(parent)) throw new Error("Document folders cannot contain a cycle.");
      visited.add(parent);
      parent = documents.find((d) => d.id === parent)?.parent ?? null;
    }
  }
  return {
    version: 1,
    active: ids.has(String(raw.active)) ? String(raw.active) : documents[0]!.id,
    documents,
  };
}
export function safeLink(value: string): boolean {
  try {
    return ["http:", "https:", "mailto:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export function safeImage(value: string): boolean {
  return /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value) || /^https?:\/\//i.test(value);
}
export function markdown(doc: NotebookDocument): string {
  return (
    "# " +
    doc.title +
    "\n\n" +
    doc.blocks
      .map(
        (b) =>
          (({
            heading: "# ",
            subheading: "## ",
            bullet: "- ",
            numbered: "1. ",
            quote: "> ",
            callout: "> ",
            todo: b.checked ? "- [x] " : "- [ ] ",
          })[b.kind as "heading"] ?? "") +
          (b.kind === "divider"
            ? "---"
            : b.kind === "code"
              ? "```\n" + b.text + "\n```"
              : b.kind === "image"
                ? `![${b.text}](${b.source ?? ""})`
                : b.kind === "table"
                  ? "| Title | Status | Owner | Due | Estimate |\n| --- | --- | --- | --- | --- |\n" +
                    (b.rows ?? [])
                      .map(
                        (r) =>
                          `| ${r.title.replaceAll("|", "\\|")} | ${r.status} | ${r.owner} | ${r.due} | ${r.estimate} |`,
                      )
                      .join("\n")
                  : b.text),
      )
      .join("\n\n")
  );
}
