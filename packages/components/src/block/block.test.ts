import { describe, expect, it } from "vitest";

import {
  applyBlockOperation,
  applyBlockStreamFrame,
  BlockCatalogue,
  BlockValidationError,
  createBlockDocument,
  type BlockDefinition,
  type BlockNode,
} from "./block.js";

const definitions: readonly BlockDefinition[] = [
  {
    type: "text",
    version: 1,
    label: "Text",
    description: "A paragraph",
    group: "Text",
    keywords: ["body", "paragraph"],
    placement: "document",
    capabilities: ["editable", "streamable"],
    validate: (props) => (typeof props.text === "string" ? [] : ["Text blocks need text."]),
  },
  {
    type: "section",
    version: 1,
    label: "Section",
    description: "A block container",
    group: "Layout",
    placement: "document",
    capabilities: ["container", "streamable"],
  },
];

const text = (id: string, value: string): BlockNode => ({
  id,
  type: "text",
  version: 1,
  props: { text: value },
});

describe("BlockCatalogue", () => {
  it("registers strict metadata and searches labels, types, and keywords", () => {
    const catalogue = new BlockCatalogue(definitions);

    expect(catalogue.search("paragraph").map(({ type }) => type)).toEqual(["text"]);
    expect(catalogue.search("sec").map(({ type }) => type)).toEqual(["section"]);
    expect(catalogue.list({ capability: "container" }).map(({ type }) => type)).toEqual([
      "section",
    ]);
    expect(() => catalogue.register(definitions[0]!)).toThrow(/already registered/);
  });

  it("creates immutable versioned JSON records and rejects host objects", () => {
    const catalogue = new BlockCatalogue(definitions);
    const node = catalogue.create("text", "intro", { text: "Hello" });

    expect(node).toEqual(text("intro", "Hello"));
    expect(Object.isFrozen(node)).toBe(true);
    expect(Object.isFrozen(node.props)).toBe(true);
    expect(() =>
      catalogue.create("text", "file", {
        file: new File(["hello"], "hello.txt"),
      } as never),
    ).toThrow(/finite JSON values/);
  });

  it("reports duplicate ids, unknown types, invalid props, and illegal children together", () => {
    const catalogue = new BlockCatalogue(definitions);
    const issues = catalogue.validate([
      { ...text("same", "First"), children: [text("nested", "Nested")] },
      text("same", "Second"),
      text("invalid id", "Unstable"),
      { id: "unknown", type: "chart", version: 1, props: {} },
      { id: "bad", type: "text", version: 1, props: { text: 42 } },
    ]);

    expect(issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "children-not-allowed",
        "duplicate-id",
        "invalid-id",
        "properties-rejected",
        "unknown-type",
      ]),
    );
    expect(() => catalogue.assert([text("same", "A"), text("same", "B")])).toThrow(
      BlockValidationError,
    );
  });
});

describe("block stream operations", () => {
  it("applies insert, update, move, and remove without mutating prior revisions", () => {
    const catalogue = new BlockCatalogue(definitions);
    const section = catalogue.create("section", "section", {}, [text("first", "One")]);
    const initial = createBlockDocument("brief", [section], catalogue);
    const inserted = applyBlockOperation(
      initial,
      { op: "insert", parentId: "section", index: 1, block: text("second", "Two") },
      catalogue,
    );
    const updated = applyBlockOperation(
      inserted,
      { op: "update", id: "second", props: { text: "Updated" } },
      catalogue,
    );
    const moved = applyBlockOperation(
      updated,
      { op: "move", id: "second", parentId: null, index: 0 },
      catalogue,
    );
    const removed = applyBlockOperation(moved, { op: "remove", id: "first" }, catalogue);

    expect(initial.revision).toBe(0);
    expect(initial.blocks[0]?.children?.map(({ id }) => id)).toEqual(["first"]);
    expect(inserted.blocks[0]?.children?.map(({ id }) => id)).toEqual(["first", "second"]);
    expect(updated.blocks[0]?.children?.[1]?.props.text).toBe("Updated");
    expect(moved.blocks.map(({ id }) => id)).toEqual(["second", "section"]);
    expect(removed.blocks[1]?.children).toBeUndefined();
    expect(removed.revision).toBe(4);
  });

  it("enforces document identity and monotonic stream sequence", () => {
    const catalogue = new BlockCatalogue(definitions);
    const document = createBlockDocument("brief", [], catalogue);
    const frame = {
      documentId: "brief",
      sequence: 1,
      operation: { op: "insert", parentId: null, index: 0, block: text("intro", "Hi") } as const,
    };

    const next = applyBlockStreamFrame(document, frame, catalogue);
    expect(next.revision).toBe(1);
    expect(() => applyBlockStreamFrame(next, frame, catalogue)).toThrow(/out of order/);
    expect(() =>
      applyBlockStreamFrame(document, { ...frame, documentId: "another" }, catalogue),
    ).toThrow(/not "brief"/);
  });
});
