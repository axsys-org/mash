import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture } from "../test-support/fixture.js";
import { GooTidyTree } from "./register.js";

const node = (id: string, parent?: string, width = 90, height = 40) =>
  `<goo-tree-node subject="${id}" ${parent === undefined ? "" : `parent="${parent}"`}
    style="width:${width}px;height:${height}px">${id}</goo-tree-node>`;
const pause = async () => {
  for (let i = 0; i < 4; i++)
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};
const make = async (body: string, attrs = "") => {
  const tree = await fixture<GooTidyTree>(
    `<goo-tidy-tree style="width:800px;height:500px" ${attrs}>${body}</goo-tidy-tree>`,
  );
  await pause();
  return tree;
};
const box = (tree: GooTidyTree, id: string) =>
  Array.from(tree.children)
    .find((el) => el.getAttribute("subject") === id)!
    .getBoundingClientRect();
const edges = (tree: GooTidyTree) => tree.shadowRoot!.querySelectorAll("path");
const scene = (tree: GooTidyTree) => tree.shadowRoot!.querySelector<HTMLElement>("[part=scene]")!;
const viewport = (tree: GooTidyTree) =>
  tree.shadowRoot!.querySelector<HTMLElement>("[part=viewport]")!;
const assertNoOverlap = (tree: GooTidyTree) => {
  const boxes = Array.from(tree.children, (el) => el.getBoundingClientRect());
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      expect(
        a.right <= b.left + 0.01 ||
          b.right <= a.left + 0.01 ||
          a.bottom <= b.top + 0.01 ||
          b.bottom <= a.top + 0.01,
      ).toBe(true);
    }
  }
};
afterEach(() => vi.restoreAllMocks());

describe("goo-tidy-tree geometry", () => {
  it("lays out one ordinary HTML node without adding semantics", async () => {
    const tree = await make(node("A"));
    expect(tree.hasAttribute("data-layout-invalid")).toBe(false);
    expect(edges(tree)).toHaveLength(0);
    expect(box(tree, "A").left - tree.getBoundingClientRect().left).toBeCloseTo(24);
    expect(tree.firstElementChild!.parentElement).toBe(tree);
    expect(tree.querySelector("[role]")).toBeNull();
  });

  it.each(["right", "left", "down", "up"])(
    "lays out variable boxes toward %s with boundary edges",
    async (direction) => {
      const tree = await make(
        node("A", undefined, 145, 63) +
          node("B", "A", 320, 135) +
          node("C", "B", 55, 210) +
          node("D", "A", 170, 77),
        `direction="${direction}"`,
      );
      assertNoOverlap(tree);
      const a = box(tree, "A"),
        b = box(tree, "B"),
        c = box(tree, "C");
      if (direction === "right") {
        expect(b.left - a.right).toBeCloseTo(64);
        expect(c.left - b.right).toBeCloseTo(64);
      }
      if (direction === "left") {
        expect(a.left - b.right).toBeCloseTo(64);
        expect(b.left - c.right).toBeCloseTo(64);
      }
      if (direction === "down") {
        expect(b.top - a.bottom).toBeCloseTo(64);
        expect(c.top - b.bottom).toBeCloseTo(64);
      }
      if (direction === "up") {
        expect(a.top - b.bottom).toBeCloseTo(64);
        expect(b.top - c.bottom).toBeCloseTo(64);
      }
      expect(edges(tree)).toHaveLength(3);
      const path = edges(tree)[0]!;
      const start = path.getPointAtLength(0);
      const end = path.getPointAtLength(path.getTotalLength());
      const origin = scene(tree).getBoundingClientRect();
      expect(start.x + origin.left).toBeCloseTo(
        direction === "right" ? a.right : direction === "left" ? a.left : a.left + a.width / 2,
        1,
      );
      expect(start.y + origin.top).toBeCloseTo(
        direction === "down" ? a.bottom : direction === "up" ? a.top : a.top + a.height / 2,
        1,
      );
      expect(end.x + origin.left).toBeCloseTo(
        direction === "right" ? b.left : direction === "left" ? b.right : b.left + b.width / 2,
        1,
      );
      expect(end.y + origin.top).toBeCloseTo(
        direction === "down" ? b.top : direction === "up" ? b.bottom : b.top + b.height / 2,
        1,
      );
    },
  );

  it("preserves sibling DOM order and avoids overlaps in deeper variable-size branches", async () => {
    const tree = await make(
      node("A") +
        node("B", "A", 370, 21) +
        node("C", "A", 20, 250) +
        node("D", "A", 140, 57) +
        node("E", "B", 130, 303) +
        node("F", "B", 230, 99) +
        node("G", "C", 510, 31),
    );
    assertNoOverlap(tree);
    expect(box(tree, "B").top).toBeLessThan(box(tree, "C").top);
    expect(box(tree, "C").top).toBeLessThan(box(tree, "D").top);
    const before = Array.from(tree.children, (el) => (el as HTMLElement).style.transform);
    tree.layout();
    await pause();
    expect(Array.from(tree.children, (el) => (el as HTMLElement).style.transform)).toEqual(before);
  });

  it("updates spacing and direction attributes", async () => {
    const tree = await make(node("A") + node("B", "A") + node("C", "A"));
    tree.setAttribute("gap", "80");
    tree.setAttribute("level-gap", "120");
    await pause();
    expect(box(tree, "C").top - box(tree, "B").bottom).toBeCloseTo(80);
    expect(box(tree, "B").left - box(tree, "A").right).toBeCloseTo(120);
    tree.setAttribute("direction", "down");
    await pause();
    expect(box(tree, "B").top - box(tree, "A").bottom).toBeCloseTo(120);
  });
});

describe("goo-tidy-tree lifecycle", () => {
  it("adds, removes, renames and reparents existing nodes without reconnecting", async () => {
    const tree = await make(node("A") + node("B", "A"));
    const b = tree.children[1]!;
    tree.insertAdjacentHTML("beforeend", node("C", "A"));
    await pause();
    expect(edges(tree)).toHaveLength(2);
    b.setAttribute("parent", "C");
    await pause();
    expect(box(tree, "B").left).toBeGreaterThan(box(tree, "C").right);
    b.setAttribute("subject", "opaque:/anything ?#");
    await pause();
    expect(tree.center("B")).toBe(false);
    expect(tree.center("opaque:/anything ?#")).toBe(true);
    b.remove();
    await pause();
    expect(edges(tree)).toHaveLength(1);
    expect((b as HTMLElement).style.transform).toBe("");
  });

  it("relayouts on fractional border-box resize, including after fit", async () => {
    const tree = await make(node("A") + node("B", "A") + node("C", "A"), "fit zoom");
    const b = tree.children[1] as HTMLElement;
    const initial = box(tree, "C").top;
    b.style.height = "230.5px";
    b.style.width = "650.25px";
    await pause();
    assertNoOverlap(tree);
    expect(box(tree, "C").top).toBeGreaterThan(initial);
    tree.fit();
    const before = b.style.transform;
    tree.layout();
    await pause();
    expect(b.style.transform).toBe(before);
  });

  it("keeps HTML identity, input state, listeners, and nested node content", async () => {
    const tree = await make(
      `<goo-tree-node subject="A"><article><button>Inspect</button><input value="draft"><goo-tree-node subject="nested">Nested content</goo-tree-node></article></goo-tree-node>`,
    );
    const input = tree.querySelector("input")!;
    input.value = "unsaved";
    const clicked = vi.fn();
    tree.querySelector("button")!.addEventListener("click", clicked);
    tree.layout();
    await pause();
    tree.querySelector("button")!.click();
    expect(clicked).toHaveBeenCalledOnce();
    expect(tree.querySelector("input")).toBe(input);
    expect(input.value).toBe("unsaved");
    expect(edges(tree)).toHaveLength(0);
    expect(tree.hasAttribute("data-layout-invalid")).toBe(false);
  });

  it("disconnects observers and reconnects against fresh membership", async () => {
    const tree = await make(node("A"));
    const parent = tree.parentElement!;
    const event = vi.fn();
    tree.addEventListener("goo-tree-layout", event);
    tree.remove();
    tree.insertAdjacentHTML("beforeend", node("B", "A"));
    await pause();
    expect(event).not.toHaveBeenCalled();
    parent.append(tree);
    await pause();
    expect(edges(tree)).toHaveLength(1);
  });

  it("batches explicit invalidations and reports dimensions", async () => {
    const tree = await make(node("A"));
    const event = vi.fn();
    tree.addEventListener("goo-tree-layout", event);
    for (let i = 0; i < 100; i++) tree.layout();
    await pause();
    expect(event).toHaveBeenCalledOnce();
    expect((event.mock.calls[0]![0] as CustomEvent).detail).toEqual({
      nodeCount: 1,
      width: 138,
      height: 88,
    });
  });
});

describe("goo-tidy-tree errors", () => {
  it.each([
    [node("A") + node("A", "A"), 'duplicate goo-tree-node subject: "A"'],
    [node("A") + node("B", "missing"), 'goo-tree-node "B" references missing parent "missing"'],
    [node("A") + node("B"), "goo-tidy-tree expected exactly one root; found 2"],
    [node("A", "B") + node("B", "A"), "goo-tidy-tree hierarchy contains a cycle"],
    [node("root") + node("A", "B") + node("B", "A"), "goo-tidy-tree hierarchy contains a cycle"],
    ["", "goo-tidy-tree expected exactly one root; found 0"],
    [node(""), "goo-tree-node requires a nonempty subject"],
  ])("reports invalid hierarchy without repeated warnings: %s", async (body, message) => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tree = await make(body);
    const original = Array.from(tree.children);
    expect(warning).toHaveBeenCalledWith(message);
    tree.layout();
    await pause();
    expect(warning).toHaveBeenCalledOnce();
    expect(Array.from(tree.children)).toEqual(original);
    tree.replaceChildren();
    tree.insertAdjacentHTML("beforeend", node("valid"));
    await pause();
    expect(tree.hasAttribute("data-layout-invalid")).toBe(false);
  });
});

describe("goo-tidy-tree camera", () => {
  it("defers initial fit while hidden and fits when the viewport appears", async () => {
    const fresh = document.createElement("goo-tidy-tree");
    fresh.style.cssText = "width:800px;height:500px;display:none";
    fresh.setAttribute("fit", "");
    fresh.innerHTML = node("A", undefined, 1200, 700);
    const container = await fixture<HTMLElement>("<div></div>");
    container.append(fresh);
    await pause();
    expect(fresh.fit()).toBe(false);
    fresh.style.display = "block";
    await pause();
    expect(box(fresh, "A").width).toBeLessThan(800);
    expect(box(fresh, "A").height).toBeLessThan(500);
  });

  it("lays out 1000 visible nodes with finite bounds and one edge per relation", async () => {
    const markup = Array.from({ length: 1000 }, (_, index) =>
      node(
        String(index),
        index === 0 ? undefined : String(Math.floor((index - 1) / 4)),
        60 + (index % 13) * 11,
        20 + (index % 7) * 13,
      ),
    ).join("");
    const tree = await make(markup, "fit");
    expect(edges(tree)).toHaveLength(999);
    expect(Number.isFinite(parseFloat(scene(tree).style.width))).toBe(true);
    expect(tree.center("999")).toBe(true);
  });

  it("fits without zoom, centers, and never refits on mutations", async () => {
    const tree = await make(node("A", undefined, 1000, 600) + node("B", "A"), "fit");
    const bounds = tree.getBoundingClientRect();
    for (const child of tree.children) {
      const rect = child.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(bounds.left);
      expect(rect.right).toBeLessThanOrEqual(bounds.right);
      expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom);
    }
    expect(tree.center("B")).toBe(true);
    expect(box(tree, "B").left + box(tree, "B").width / 2).toBeCloseTo(
      bounds.left + viewport(tree).clientWidth / 2,
    );
    const transform = scene(tree).style.transform;
    tree.insertAdjacentHTML("beforeend", node("C", "A"));
    await pause();
    expect(scene(tree).style.transform).toBe(transform);
    expect(tree.center("missing")).toBe(false);
    expect(tree.fit()).toBe(true);
  });

  it("accepts background wheel and pan, but leaves node gestures and disabled zoom alone", async () => {
    const tree = await make(node("A"), "zoom");
    const vp = viewport(tree);
    const initial = scene(tree).style.transform;
    tree.firstElementChild!.dispatchEvent(
      new WheelEvent("wheel", { bubbles: true, composed: true, cancelable: true, deltaY: -100 }),
    );
    expect(scene(tree).style.transform).toBe(initial);
    vp.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 }));
    expect(scene(tree).style.transform).not.toBe(initial);
    const wheel = scene(tree).style.transform;
    const drag = (target: Element) => {
      target.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          composed: true,
          view: window,
          clientX: 500,
          clientY: 300,
          buttons: 1,
        }),
      );
      window.dispatchEvent(
        new MouseEvent("mousemove", { view: window, clientX: 550, clientY: 340, buttons: 1 }),
      );
      window.dispatchEvent(new MouseEvent("mouseup", { view: window, clientX: 550, clientY: 340 }));
    };
    drag(tree.firstElementChild!);
    expect(scene(tree).style.transform).toBe(wheel);
    drag(vp);
    expect(scene(tree).style.transform).not.toBe(wheel);
    tree.removeAttribute("zoom");
    const disabled = scene(tree).style.transform;
    vp.dispatchEvent(new WheelEvent("wheel", { deltaY: -100 }));
    expect(scene(tree).style.transform).toBe(disabled);
  });
});
