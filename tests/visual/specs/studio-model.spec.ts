import { expect, test } from "@playwright/test";
import {
  StudioModel,
  readProject,
  searchFiles,
  diffLines,
  normalizePath,
} from "../../../apps/catalog/src/stories/studio-model.js";
import { seedStudio } from "../../../apps/catalog/src/stories/studio-seed.js";

test("renaming nested folders preserves identities and deleting is reversible", () => {
  const model = new StudioModel(seedStudio());
  const file = model.state.entries.find((entry) => entry.path === "src/page.js")!;
  const id = file.id;
  model.checkpoint();
  model.rename("folder-src", "assets/source");
  expect(model.state.entries.find((entry) => entry.id === id)?.path).toBe("assets/source/page.js");
  expect(
    model.state.entries.some((entry) => entry.path === "assets" && entry.kind === "folder"),
  ).toBe(true);
  model.checkpoint();
  model.remove("folder-src");
  expect(model.state.entries.some((entry) => entry.id === id)).toBe(false);
  expect(model.state.deleted.some((entry) => entry.id === id)).toBe(true);
  model.undo();
  expect(model.state.entries.find((entry) => entry.id === id)?.content).toBe(file.content);
});

test("project import validates paths, duplicate IDs, shapes and text bounds", () => {
  expect(() => normalizePath("src/../secrets")).toThrow();
  const state = seedStudio();
  expect(readProject(JSON.parse(JSON.stringify(state))).entries).toEqual(state.entries);
  expect(() => readProject({ ...state, entries: [state.entries[0], state.entries[0]] })).toThrow(
    /Duplicate/,
  );
  expect(() => readProject({ ...state, entries: [{ ...state.entries[0], content: 1 }] })).toThrow(
    /Invalid/,
  );
  expect(() =>
    readProject({ ...state, entries: [{ ...state.entries[1], content: "x".repeat(4_000_001) }] }),
  ).toThrow(/limit/);
});

test("literal search retains UTF-16 offsets without regex interpretation", () => {
  const state = seedStudio();
  state.entries = [
    {
      id: "unicode",
      path: "unicode.js",
      kind: "file",
      content: "İ first\n😀 alpha.* ALPHA.*",
      saved: "",
    },
  ];
  const hits = searchFiles(state.entries, "alpha.*", false);
  expect(hits).toHaveLength(2);
  expect(hits.map((hit) => state.entries[0]!.content.slice(hit.start, hit.end))).toEqual([
    "alpha.*",
    "ALPHA.*",
  ]);
  expect(hits[0]!.line).toBe(2);
  expect(searchFiles(state.entries, "alpha.*", true)).toHaveLength(1);
});

test("line diff reconstructs the exact saved and working text", () => {
  const before = "one\ntwo\nkeep\nthree";
  const after = "one\nnew\nkeep\nfour\nfive";
  const rows = diffLines(before, after);
  expect(
    rows
      .filter((row) => row.kind !== "add")
      .map((row) => row.text)
      .join("\n"),
  ).toBe(before);
  expect(
    rows
      .filter((row) => row.kind !== "remove")
      .map((row) => row.text)
      .join("\n"),
  ).toBe(after);
});
