import { describe, expect, it } from "vitest";
import {
  inferTextChange,
  mapDecorations,
  normalizeDecorations,
  type EditorDecoration,
} from "./decorations.js";
const range: EditorDecoration = { id: "diagnostic", start: 4, end: 8, kind: "error" };

describe("editor decoration mapping", () => {
  it("keeps boundary insertions outside and interior insertions inside", () => {
    expect(mapDecorations([range], { from: 4, to: 4, insert: "xx" })[0]).toMatchObject({
      start: 6,
      end: 10,
    });
    expect(mapDecorations([range], { from: 8, to: 8, insert: "xx" })[0]).toMatchObject({
      start: 4,
      end: 8,
    });
    expect(mapDecorations([range], { from: 6, to: 6, insert: "xx" })[0]).toMatchObject({
      start: 4,
      end: 10,
    });
    expect(range).toMatchObject({ start: 4, end: 8 });
  });
  it("clips partial replacements and drops fully replaced diagnostics", () => {
    expect(mapDecorations([range], { from: 2, to: 6, insert: "x" })[0]).toMatchObject({
      start: 3,
      end: 5,
    });
    expect(mapDecorations([range], { from: 6, to: 10, insert: "x" })[0]).toMatchObject({
      start: 4,
      end: 6,
    });
    expect(mapDecorations([range], { from: 4, to: 8, insert: "other" })).toEqual([]);
  });
  it("uses UTF-16 lengths for non-BMP input and native selection hints for repeated text", () => {
    expect(mapDecorations([range], { from: 0, to: 0, insert: "😀" })[0]).toMatchObject({
      start: 6,
      end: 10,
    });
    expect(inferTextChange("aaaa", "aaaaa", { start: 0, end: 0, inputType: "insertText" })).toEqual(
      { from: 0, to: 0, insert: "a" },
    );
    expect(
      inferTextChange("aaaa", "aaa", { start: 2, end: 2, inputType: "deleteContentBackward" }),
    ).toEqual({ from: 1, to: 2, insert: "" });
  });
  it("clamps provider ranges and excludes empty or invalid positions", () => {
    expect(
      normalizeDecorations(
        [
          { ...range, start: -2 },
          { ...range, start: NaN },
          { ...range, start: 20 },
        ],
        6,
      ),
    ).toEqual([{ ...range, start: 0, end: 6 }]);
  });
});
