import {
  createBlock,
  createDocument,
  parseNotebook,
  seedNotebook,
  type DocumentBlock,
  type Notebook,
  type NotebookDocument,
} from "./documents-model.js";

export const notebookStorageKey = "mash-documents-notebook-v1";
const changedEvent = "mash-notebook-change";
let cachedRaw: string | null = null;
let cached: Notebook | undefined;

/** One persisted seed gives every view the same source identities on first use. */
export function readNotebook(): Notebook {
  const raw = localStorage.getItem(notebookStorageKey);
  if (!cached || raw !== cachedRaw) {
    cached = raw ? parseNotebook(raw) : seedNotebook();
    cachedRaw = raw;
    if (!raw) {
      cachedRaw = JSON.stringify(cached);
      localStorage.setItem(notebookStorageKey, cachedRaw);
    }
  }
  return structuredClone(cached);
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const same = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((value, index) => same(value, b[index]));
  if (record(a) && record(b))
    return (
      Object.keys(a).length === Object.keys(b).length &&
      Object.keys(a).every((key) => Object.hasOwn(b, key) && same(a[key], b[key]))
    );
  return false;
};
const identified = (value: unknown): value is { id: string }[] =>
  Array.isArray(value) && value.every((item) => record(item) && typeof item.id === "string");

export function notebooksEqual(a: Notebook, b: Notebook): boolean {
  return same(a, b);
}

/** Apply only this editor's changes. Unrelated documents/blocks survive stale snapshots. */
function mergeValue(next: unknown, before: unknown, current: unknown): unknown {
  if (same(next, before)) return current;
  if (identified(next) && identified(before) && identified(current)) {
    const old = new Map(before.map((item) => [item.id, item]));
    const live = new Map(current.map((item) => [item.id, item]));
    const edited = new Map(next.map((item) => [item.id, item]));
    const oldOrder = before.map((item) => item.id);
    const newOrder = next.map((item) => item.id);
    const order = same(oldOrder, newOrder) ? current : next;
    const ids = [...new Set([...order, ...current, ...next].map((item) => item.id))];
    return ids.flatMap((id) => {
      // A stale writer cannot restore a deleted source. Explicit undo is a new insertion.
      if (old.has(id) && (!edited.has(id) || !live.has(id))) return [];
      return [mergeValue(edited.get(id), old.get(id), live.get(id))];
    });
  }
  if (record(next) && record(before) && record(current)) {
    const result = { ...current };
    for (const key of new Set([...Object.keys(before), ...Object.keys(next)])) {
      if (same(next[key], before[key])) continue;
      if (!(key in next)) delete result[key];
      else result[key] = mergeValue(next[key], before[key], current[key]);
    }
    return result;
  }
  return structuredClone(next);
}

export function mergeNotebooks(next: Notebook, before: Notebook, current: Notebook): Notebook {
  const merged = structuredClone(mergeValue(next, before, current)) as Notebook;
  if (!merged.documents.length) merged.documents.push(createDocument());
  if (!merged.documents.some((document) => document.id === merged.active))
    merged.active = merged.documents[0]!.id;
  for (const document of merged.documents)
    if (document.parent && !merged.documents.some((item) => item.id === document.parent))
      document.parent = null;
  return merged;
}

export function writeNotebook(next: Notebook, before?: Notebook): Notebook {
  const current = readNotebook();
  const merged = before ? mergeNotebooks(next, before, current) : structuredClone(next);
  const raw = JSON.stringify(merged);
  if (raw !== cachedRaw) {
    // Validate before replacing the user's only saved copy.
    const validated = parseNotebook(raw);
    localStorage.setItem(notebookStorageKey, raw);
    cachedRaw = raw;
    cached = validated;
    window.dispatchEvent(new CustomEvent(changedEvent));
  }
  return structuredClone(cached!);
}

export function subscribeNotebook(
  listener: (notebook: Notebook) => void,
  options: { signal?: AbortSignal } = {},
): () => void {
  const notify = (): void => listener(readNotebook());
  const storage = (event: StorageEvent): void => {
    if (event.key === notebookStorageKey && event.newValue) notify();
  };
  window.addEventListener(changedEvent, notify, options);
  window.addEventListener("storage", storage, options);
  return () => {
    window.removeEventListener(changedEvent, notify);
    window.removeEventListener("storage", storage);
  };
}

type DocumentSeed = { id: string; title: string; text?: string };

export function ensureDocument(input: DocumentSeed): NotebookDocument {
  return ensureDocuments([input])[0]!;
}

export function ensureDocuments(inputs: readonly DocumentSeed[]): NotebookDocument[] {
  const before = readNotebook();
  const next = structuredClone(before);
  const documents = new Map(next.documents.map((document) => [document.id, document]));
  const result = inputs.map((input) => {
    const found = documents.get(input.id);
    if (found) return found;
    const document = createDocument(input.title);
    document.id = input.id;
    document.blocks = (input.text?.split(/\n\s*\n/) ?? [""]).map((text, index) => {
      const block = createBlock("paragraph", text);
      block.frame.y = 80 + index * 180;
      return block;
    });
    next.documents.push(document);
    documents.set(document.id, document);
    return document;
  });
  if (next.documents.length !== before.documents.length) writeNotebook(next, before);
  return structuredClone(result);
}

export function updateDocument(
  id: string,
  edit: (document: NotebookDocument) => void,
): NotebookDocument | undefined {
  const before = readNotebook();
  const next = structuredClone(before);
  const document = next.documents.find((item) => item.id === id);
  if (!document) return undefined;
  edit(document);
  return writeNotebook(next, before).documents.find((item) => item.id === id);
}

export function documentBlockText(block: DocumentBlock): string {
  return [block.text, ...(block.rows?.map((row) => `${row.title} · ${row.status}`) ?? [])]
    .filter(Boolean)
    .join("\n");
}
