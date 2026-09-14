/** A half-open UTF-16 range in the native textarea's document. */
export interface EditorDecoration {
  id: string;
  start: number;
  end: number;
  kind: "highlight" | "error" | "warning" | "info";
  /** Owner-facing diagnostic text; present it in an accessible diagnostics list. */
  message?: string;
}

export interface EditorTextChange {
  from: number;
  to: number;
  insert: string;
}

/** Normalizes provider ranges without mutating the provider's objects. */
export function normalizeDecorations(
  ranges: readonly EditorDecoration[],
  length: number,
): EditorDecoration[] {
  return ranges.flatMap((range) => {
    if (!Number.isFinite(range.start) || !Number.isFinite(range.end)) return [];
    const start = Math.max(0, Math.min(length, Math.trunc(range.start)));
    const end = Math.max(start, Math.min(length, Math.trunc(range.end)));
    return end > start ? [{ ...range, start, end }] : [];
  });
}

/**
 * Maps ranges through a replacement. Insertions at either boundary stay outside
 * the range; insertions within it expand it. A fully replaced range is removed
 * so stale diagnostics do not attach themselves to unrelated replacement text.
 */
export function mapDecorations(
  ranges: readonly EditorDecoration[],
  change: EditorTextChange,
): EditorDecoration[] {
  const { from, to, insert } = change;
  const delta = insert.length - (to - from);
  return ranges.flatMap((range) => {
    if (to > from && from <= range.start && to >= range.end) return [];
    const start =
      range.start >= to
        ? range.start + delta
        : range.start >= from
          ? from + insert.length
          : range.start;
    const end = range.end <= from ? range.end : range.end >= to ? range.end + delta : from;
    return end > start ? [{ ...range, start, end }] : [];
  });
}

/** Finds one contiguous edit, using native selection context to disambiguate repeated text. */
export function inferTextChange(
  previous: string,
  next: string,
  hint?: { start: number; end: number; inputType: string },
): EditorTextChange {
  if (hint) {
    let { start, end } = hint;
    const delta = next.length - previous.length;
    if (start === end && delta < 0) {
      if (hint.inputType.endsWith("Backward")) start += delta;
      else if (hint.inputType.endsWith("Forward")) end -= delta;
    }
    const insertedLength = next.length - (previous.length - (end - start));
    if (
      start >= 0 &&
      end >= start &&
      insertedLength >= 0 &&
      next.startsWith(previous.slice(0, start)) &&
      next.endsWith(previous.slice(end))
    ) {
      return { from: start, to: end, insert: next.slice(start, start + insertedLength) };
    }
  }
  let from = 0;
  while (from < previous.length && from < next.length && previous[from] === next[from]) from++;
  let to = previous.length;
  let nextEnd = next.length;
  while (to > from && nextEnd > from && previous[to - 1] === next[nextEnd - 1]) {
    to--;
    nextEnd--;
  }
  return { from, to, insert: next.slice(from, nextEnd) };
}
