import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seedNotebook,
  NotebookHistory,
  createBlock,
  replaceText,
  toggleMark,
  duplicateBlock,
  removeBlock,
  removeDocument,
  parseNotebook,
  filteredRows,
  intersects,
} from "./documents-model.ts";

test("text editing adjusts stored mark ranges and history restores the typed model", () => {
  const history = new NotebookHistory(seedNotebook());
  const id = history.state.documents[0].blocks[0].id;
  const block = () => history.state.documents[0].blocks.find((b) => b.id === id);
  history.transact(() => {
    block().text = "A clear direction";
    toggleMark(block(), "bold", 2, 7);
  });
  history.transact(() => replaceText(block(), "A very clear direction"), "typing");
  assert.equal(block().text, "A very clear direction");
  assert.deepEqual(block().marks, [{ kind: "bold", start: 7, end: 12 }]);
  history.undo();
  assert.equal(block().text, "A clear direction");
  history.redo();
  assert.equal(block().text, "A very clear direction");
  assert.equal(JSON.stringify(history.state).includes("innerHTML"), false);
});
test("formatting a subset can be removed while both surrounding marks survive", () => {
  const block = createBlock("paragraph", "0123456789");
  toggleMark(block, "italic", 0, 10);
  toggleMark(block, "italic", 3, 6);
  assert.deepEqual(block.marks, [
    { kind: "italic", start: 0, end: 3 },
    { kind: "italic", start: 6, end: 10 },
  ]);
});
test("deletion removes connected edges and document descendants, undo restores all", () => {
  const history = new NotebookHistory(seedNotebook());
  const before = JSON.stringify(history.state);
  const doc = history.state.documents[0];
  history.transact(() => removeBlock(doc, doc.connections[0].from));
  assert.equal(doc.connections.length, 0);
  history.undo();
  assert.equal(JSON.stringify(history.state), before);
  history.transact((state) => removeDocument(state, state.documents[0].id));
  assert.equal(history.state.documents.length, 1);
  assert.equal(history.state.documents[0].title, "Release planning");
  history.undo();
  assert.equal(JSON.stringify(history.state), before);
});
test("duplicating blocks preserves independent content, records, and canvas geometry", () => {
  const doc = seedNotebook().documents[2];
  const source = doc.blocks.find((b) => b.kind === "table");
  const copy = duplicateBlock(doc, source.id);
  assert.notEqual(copy.id, source.id);
  assert.equal(copy.frame.x, source.frame.x + 24);
  copy.rows[0].title = "Changed";
  assert.notEqual(source.rows[0].title, copy.rows[0].title);
});
test("table and board queries use the same local records with finite sorting", () => {
  const block = seedNotebook().documents[2].blocks.find((b) => b.kind === "table");
  assert.equal(filteredRows(block, "Alex", "Planned", "estimate").length, 1);
  assert.deepEqual(
    filteredRows(block, "", "", "estimate", true).map((row) => row.estimate),
    [8, 5, 3, 2],
  );
});
test("import round-trips the notebook but rejects unsupported kinds, cycles and malformed geometry", () => {
  const state = seedNotebook();
  assert.deepEqual(parseNotebook(JSON.stringify(state)), state);
  const invalid = structuredClone(state);
  invalid.documents[0].blocks[0].frame.x = null;
  assert.throws(() => parseNotebook(JSON.stringify(invalid)), /finite/);
  invalid.documents[0].blocks[0].frame.x = 0;
  invalid.documents[0].blocks[0].kind = "foreign-runtime";
  assert.throws(() => parseNotebook(JSON.stringify(invalid)), /unsupported/);
  const cycle = structuredClone(state);
  cycle.documents[0].parent = cycle.documents[1].id;
  assert.throws(() => parseNotebook(JSON.stringify(cycle)), /cycle/);
});
test("canvas selection includes boundary intersections and excludes distant cards", () => {
  assert.equal(
    intersects({ x: 0, y: 0, width: 100, height: 100 }, { x: 90, y: 90, width: 30, height: 30 }),
    true,
  );
  assert.equal(
    intersects({ x: 0, y: 0, width: 100, height: 100 }, { x: 200, y: 90, width: 30, height: 30 }),
    false,
  );
});
