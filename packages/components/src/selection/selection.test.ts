import { describe, expect, it, vi } from "vitest";

import { fixture } from "../test-support/fixture.js";
import {
  DOMTextSelectionAdapter,
  type DOMTextSelectionRecord,
  SelectionManager,
  selectCollection,
  type SelectionRecord,
} from "./selection.js";

describe("selection manager", () => {
  it("keeps independent logical groups and reports aggregate selection", () => {
    const manager = new SelectionManager<SelectionRecord>();
    const listener = vi.fn();
    manager.subscribe(listener);

    manager.setGroup("text", [{ id: "text-1", kind: "text", data: {} }]);
    manager.setGroup("canvas", [{ id: "shape-1", kind: "surface", data: {} }]);

    expect(manager.groups).toEqual(["text", "canvas"]);
    expect(manager.find("text")?.id).toBe("text-1");
    expect(manager.filter("surface").map((selection) => selection.id)).toEqual(["shape-1"]);
    expect(listener.mock.calls.at(-1)?.[0].selections).toHaveLength(2);
    expect(manager.revision).toBe(2);

    const canvas = manager.inGroup("canvas");
    manager.setGroup("canvas", canvas);
    expect(manager.revision).toBe(2);
  });

  it("adapts and restores a native range scoped to one editing surface", async () => {
    const root = await fixture<HTMLElement>(`
      <section>
        <article contenteditable="true">Invoice <strong>review</strong> stays fast.</article>
        <button type="button">Bold</button>
      </section>
    `);
    const surface = root.querySelector("article")!;
    const text = surface.querySelector("strong")!.firstChild!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const manager = new SelectionManager<DOMTextSelectionRecord>();
    const adapter = new DOMTextSelectionAdapter(manager, surface, { retainWithin: root });

    expect(manager.find("text")?.data.text).toBe("review");
    selection.removeAllRanges();
    root.querySelector("button")!.focus();
    expect(adapter.capture(true)?.data.text).toBe("review");
    expect(adapter.restore()).toBe(true);
    expect(document.getSelection()?.toString()).toBe("review");

    adapter.clear();
    root.querySelector("button")!.focus();
    expect(adapter.range).toBeNull();
    expect(adapter.capture(true)).toBeNull();
    expect(manager.find("text")).toBeUndefined();
    expect(document.getSelection()?.rangeCount).toBe(0);

    adapter.destroy();
  });

  it("rejects ranges from a different surface", async () => {
    const root = await fixture<HTMLElement>(`
      <section><article>First</article><article>Second</article></section>
    `);
    const [first, second] = [...root.querySelectorAll<HTMLElement>("article")];
    const manager = new SelectionManager<DOMTextSelectionRecord>();
    const adapter = new DOMTextSelectionAdapter(manager, first!);
    const range = document.createRange();
    range.selectNodeContents(second!);

    expect(() => adapter.setRange(range)).toThrow(/outside/);
    adapter.destroy();
  });
});

describe("ordered collection selection", () => {
  it("extends and shrinks a range around a stable anchor, skipping excluded rows", () => {
    let state = selectCollection({ values: [], anchor: null }, ["a", "c", "d"], {
      type: "replace",
      value: "a",
    });
    state = selectCollection(state, ["a", "c", "d"], { type: "range", value: "d" });
    expect(state.values).toEqual(["a", "c", "d"]);
    state = selectCollection(state, ["a", "c", "d"], { type: "range", value: "c" });
    expect(state).toEqual({ values: ["a", "c"], anchor: "a" });
    state = selectCollection(state, ["c", "d"], { type: "range", value: "d" });
    expect(state).toEqual({ values: ["d"], anchor: "d" });
  });

  it("preserves filtered selections for toggles and select-all without accepting unavailable ids", () => {
    const initial = { values: ["hidden", "a"], anchor: "a" };
    expect(selectCollection(initial, ["a", "b"], { type: "toggle", value: "a" }).values).toEqual([
      "hidden",
    ]);
    expect(selectCollection(initial, ["a", "b", "b"], { type: "all" }).values).toEqual([
      "hidden",
      "a",
      "b",
    ]);
    expect(selectCollection(initial, ["a", "b"], { type: "replace", value: "missing" })).toBe(
      initial,
    );
  });
});
