export interface StudioEntry {
  id: string;
  path: string;
  kind: "file" | "folder";
  content: string;
  saved: string | null;
}
export interface StudioPreferences {
  wrap: boolean;
  whitespace: boolean;
  fontSize: number;
  sidebar: boolean;
  panel: boolean;
}
export interface StudioSnapshot {
  version: 1;
  entries: StudioEntry[];
  deleted: StudioEntry[];
  active: string;
  open: string[];
  preferences: StudioPreferences;
  layout?: unknown;
}
export interface SearchHit {
  id: string;
  path: string;
  start: number;
  end: number;
  line: number;
  excerpt: string;
}
export const defaultPreferences: StudioPreferences = {
  wrap: false,
  whitespace: false,
  fontSize: 13,
  sidebar: true,
  panel: true,
};
export function normalizePath(input: string): string {
  const path = input
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+|\/+$/g, "");
  if (
    !path ||
    path.length > 180 ||
    path
      .split("/")
      .some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          Array.from(part).some((character) => character.charCodeAt(0) < 32) ||
          /[<>:"|?*]/.test(part),
      )
  )
    throw new Error("Use a relative path without empty folders or reserved characters.");
  return path;
}
export function parentPath(path: string): string {
  return path.slice(0, Math.max(0, path.lastIndexOf("/")));
}
export function basename(path: string): string {
  return path.split("/").at(-1)!;
}
export function language(path: string): string {
  return (
    (
      {
        js: "javascript",
        mjs: "javascript",
        ts: "typescript",
        html: "html",
        css: "css",
        json: "json",
        md: "markdown",
      } as Record<string, string>
    )[path.split(".").at(-1)!] ?? "text"
  );
}
export function dirty(entry: StudioEntry): boolean {
  return entry.kind === "file" && entry.saved !== entry.content;
}
export function searchFiles(
  entries: readonly StudioEntry[],
  query: string,
  matchCase: boolean,
): SearchHit[] {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, matchCase ? "gu" : "giu");
  const hits: SearchHit[] = [];
  for (const file of entries) {
    if (file.kind !== "file") continue;
    for (const match of file.content.matchAll(pattern)) {
      const start = match.index!;
      const lineStart = file.content.lastIndexOf("\n", start - 1) + 1;
      const end = file.content.indexOf("\n", start);
      hits.push({
        id: file.id,
        path: file.path,
        start,
        end: start + match[0].length,
        line: file.content.slice(0, start).split("\n").length,
        excerpt: file.content.slice(lineStart, end < 0 ? undefined : end).slice(0, 200),
      });
      if (hits.length >= 2000) return hits;
    }
  }
  return hits;
}
export interface DiffLine {
  kind: "same" | "add" | "remove";
  text: string;
  before?: number;
  after?: number;
}
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n"),
    b = after.split("\n");
  if (a.length * b.length > 250_000) {
    let prefix = 0;
    while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
    return [
      ...a
        .slice(0, prefix)
        .map((text, i) => ({ kind: "same" as const, text, before: i + 1, after: i + 1 })),
      ...a
        .slice(prefix)
        .map((text, i) => ({ kind: "remove" as const, text, before: prefix + i + 1 })),
      ...b.slice(prefix).map((text, i) => ({ kind: "add" as const, text, after: prefix + i + 1 })),
    ];
  }
  const lengths = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lengths[i]![j] =
        a[i] === b[j]
          ? lengths[i + 1]![j + 1]! + 1
          : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!);
  const result: DiffLine[] = [];
  let i = 0,
    j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j])
      result.push({ kind: "same", text: a[i++]!, before: i, after: ++j });
    else if (j < b.length && (i === a.length || lengths[i]![j + 1]! >= lengths[i + 1]![j]!))
      result.push({ kind: "add", text: b[j++]!, after: j });
    else result.push({ kind: "remove", text: a[i++]!, before: i });
  }
  return result;
}
export function readProject(value: unknown): StudioSnapshot {
  if (!value || typeof value !== "object") throw new Error("This is not a workspace project.");
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || !Array.isArray(raw.entries) || raw.entries.length > 300)
    throw new Error("Unsupported project format or too many entries (maximum 300).");
  const ids = new Set<string>(),
    paths = new Set<string>();
  let length = 0;
  function readEntry(item: unknown, deleted = false): StudioEntry {
    if (!item || typeof item !== "object") throw new Error("Invalid project entry.");
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      !/^[\w-]{1,80}$/.test(row.id) ||
      typeof row.path !== "string" ||
      !["file", "folder"].includes(String(row.kind)) ||
      typeof row.content !== "string" ||
      !(row.saved === null || typeof row.saved === "string")
    )
      throw new Error("Invalid project entry.");
    const path = normalizePath(row.path);
    if (ids.has(row.id) || (!deleted && paths.has(path)))
      throw new Error("Duplicate project entry.");
    ids.add(row.id);
    if (!deleted) paths.add(path);
    length += row.content.length + (typeof row.saved === "string" ? row.saved.length : 0);
    if (length > 4_000_000) throw new Error("Project text exceeds the 4 MB limit.");
    return {
      id: row.id,
      path,
      kind: row.kind as StudioEntry["kind"],
      content: row.content,
      saved: row.saved as string | null,
    };
  }
  const entries = raw.entries.map((item) => readEntry(item));
  const deleted = Array.isArray(raw.deleted)
    ? raw.deleted.slice(0, 300).map((item) => readEntry(item, true))
    : [];
  for (const entry of entries) {
    let parent = parentPath(entry.path);
    while (parent) {
      if (entries.some((item) => item.path === parent && item.kind === "file"))
        throw new Error("A file cannot contain child entries.");
      parent = parentPath(parent);
    }
  }
  const preferences =
    raw.preferences && typeof raw.preferences === "object"
      ? (raw.preferences as Record<string, unknown>)
      : {};
  const validFile = (id: unknown): id is string =>
    typeof id === "string" && entries.some((entry) => entry.id === id && entry.kind === "file");
  return {
    version: 1,
    entries,
    deleted,
    active: validFile(raw.active)
      ? raw.active
      : (entries.find((entry) => entry.kind === "file")?.id ?? ""),
    open: Array.isArray(raw.open) ? [...new Set(raw.open.filter(validFile))] : [],
    preferences: {
      wrap: preferences.wrap === true,
      whitespace: preferences.whitespace === true,
      fontSize:
        typeof preferences.fontSize === "number"
          ? Math.min(20, Math.max(11, preferences.fontSize))
          : 13,
      sidebar: preferences.sidebar !== false,
      panel: preferences.panel !== false,
    },
    layout: raw.layout,
  };
}
export class StudioModel {
  state: StudioSnapshot;
  history: StudioSnapshot[] = [];
  constructor(state: StudioSnapshot) {
    this.state = state;
  }
  checkpoint(): void {
    this.history.push(structuredClone(this.state));
    if (this.history.length > 30) this.history.shift();
  }
  undo(): boolean {
    const previous = this.history.pop();
    if (!previous) return false;
    this.state = previous;
    return true;
  }
  ensureFolders(path: string): void {
    const pieces = path.split("/").slice(0, -1);
    for (let i = 1; i <= pieces.length; i++) {
      const folder = pieces.slice(0, i).join("/");
      const existing = this.state.entries.find((entry) => entry.path === folder);
      if (existing?.kind === "file") throw new Error("A parent path is already a file.");
      if (!existing)
        this.state.entries.push({
          id: crypto.randomUUID(),
          path: folder,
          kind: "folder",
          content: "",
          saved: "",
        });
    }
  }
  create(path: string, kind: StudioEntry["kind"], content = ""): StudioEntry {
    path = normalizePath(path);
    if (this.state.entries.some((entry) => entry.path === path))
      throw new Error("An entry already uses that path.");
    this.ensureFolders(path);
    const entry: StudioEntry = {
      id: crypto.randomUUID(),
      path,
      kind,
      content,
      saved: kind === "file" ? null : "",
    };
    this.state.entries.push(entry);
    return entry;
  }
  rename(id: string, path: string): void {
    const entry = this.state.entries.find((item) => item.id === id);
    if (!entry) return;
    path = normalizePath(path);
    if (path === entry.path) return;
    if (entry.kind === "folder" && path.startsWith(entry.path + "/"))
      throw new Error("A folder cannot move inside itself.");
    const affected = this.state.entries.filter(
      (item) => item.id === id || item.path.startsWith(entry.path + "/"),
    );
    const moves = affected.map((item) => ({
      item,
      path: path + item.path.slice(entry.path.length),
    }));
    if (
      moves.some((move) =>
        this.state.entries.some((item) => !affected.includes(item) && item.path === move.path),
      )
    )
      throw new Error("The destination already exists.");
    this.ensureFolders(path);
    for (const move of moves) move.item.path = move.path;
  }
  remove(id: string): void {
    const target = this.state.entries.find((entry) => entry.id === id);
    if (!target) return;
    const removed = this.state.entries.filter(
      (entry) => entry.id === id || entry.path.startsWith(target.path + "/"),
    );
    this.state.deleted.push(
      ...removed.filter((entry) => entry.kind === "file" && entry.saved !== null),
    );
    this.state.entries = this.state.entries.filter((entry) => !removed.includes(entry));
    this.state.open = this.state.open.filter((open) => !removed.some((entry) => entry.id === open));
    if (removed.some((entry) => entry.id === this.state.active))
      this.state.active = this.state.open[0] ?? "";
  }
}
