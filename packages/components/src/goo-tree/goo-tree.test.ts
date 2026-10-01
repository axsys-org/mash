import { userEvent } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import type WaTree from "@awesome.me/webawesome/dist/components/tree/tree.js";
import type WaTreeItem from "@awesome.me/webawesome/dist/components/tree-item/tree-item.js";
import "./theme.css";
import { fixture } from "../test-support/fixture.js";
import { GooTree } from "./register.js";

const settle = async () => {
  for (let i = 0; i < 4; i++)
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};
const item = (subject: string, content = subject, attrs = "") =>
  `<wa-tree-item subject="${subject}" ${attrs}>${content}</wa-tree-item>`;
const make = async (content: string, selection = "single") => {
  const goo = await fixture<GooTree>(
    `<goo-tree selection="${selection}" style="width:500px;--wa-transition-normal:0ms"><wa-tree aria-label="Files">${content}</wa-tree></goo-tree>`,
  );
  await settle();
  return goo;
};
const getItem = (goo: GooTree, subject: string) =>
  Array.from(goo.querySelectorAll<WaTreeItem>("wa-tree-item")).find(
    (node) => node.getAttribute("subject") === subject,
  )!;
const twisty = (node: WaTreeItem) =>
  node.shadowRoot!.querySelector<HTMLElement>('[part="expand-button"]')!;
const label = (node: WaTreeItem) =>
  node.shadowRoot!.querySelector<HTMLSlotElement>("slot:not([name])")!;
const collect = (goo: GooTree, name: string) => {
  const listener = vi.fn();
  goo.addEventListener(name, listener);
  return listener;
};
afterEach(() => vi.restoreAllMocks());

describe("goo-tree hierarchy and WA behavior", () => {
  it("honors initially expanded nested branches", async () => {
    const goo = await make(
      item("A", `Root${item("B", `Branch${item("C")}`, "expanded")}`, "expanded"),
    );
    expect(getItem(goo, "B").expanded).toBe(true);
    expect(getItem(goo, "B").childrenContainer.hidden).toBe(false);
    getItem(goo, "A").insertAdjacentHTML("beforeend", item("D", `Added${item("E")}`, "expanded"));
    await settle();
    expect(getItem(goo, "D").expanded).toBe(true);
  });
  it("preserves the exact caller DOM and WA tree semantics", async () => {
    const goo = await make(item("A", `<strong>Folder</strong>${item("B", "File")}`, "expanded"));
    const wa = goo.querySelector<WaTree>("wa-tree")!;
    const a = getItem(goo, "A"),
      b = getItem(goo, "B");
    expect(goo.shadowRoot!.querySelector("wa-tree")).toBeNull();
    expect(a.parentElement).toBe(wa);
    expect(b.parentElement).toBe(a);
    expect(wa.getAttribute("role")).toBe("tree");
    expect(a.getAttribute("role")).toBe("treeitem");
    expect(a.getAttribute("aria-expanded")).toBe("true");
    expect(a.getChildrenItems()).toEqual([b]);
    expect(b.getBoundingClientRect().height).toBeGreaterThan(0);
  });

  it("lets WA disclose and traverse with native keyboard focus", async () => {
    const goo = await make(item("A", `Folder${item("B", "File")}`, "branch") + item("C"));
    const a = getItem(goo, "A"),
      b = getItem(goo, "B");
    const toggles = collect(goo, "goo-tree-toggle");
    const selects = collect(goo, "goo-tree-select");
    a.focus();
    await userEvent.keyboard("{ArrowRight}");
    await settle();
    expect(a.expanded).toBe(true);
    expect(toggles).toHaveBeenCalledOnce();
    expect((toggles.mock.calls[0]![0] as CustomEvent).detail).toEqual({
      subject: "A",
      expanded: true,
    });
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(b);
    expect(selects).not.toHaveBeenCalled();
    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(getItem(goo, "C"));
    await userEvent.keyboard("{Home}{ArrowLeft}");
    await settle();
    expect(a.expanded).toBe(false);
    expect(a.childrenContainer.hidden).toBe(true);
  });

  it("retains an empty branch affordance without requesting loading", async () => {
    const goo = await make(item("A", "Empty folder", "branch"));
    const a = getItem(goo, "A");
    const lazy = collect(goo, "goo-tree-lazy-load");
    expect(a.isLeaf).toBe(false);
    await userEvent.click(twisty(a));
    await settle();
    expect(a.expanded).toBe(true);
    expect(a.loading).toBe(false);
    expect(lazy).not.toHaveBeenCalled();
    a.removeAttribute("branch");
    await settle();
    expect(a.isLeaf).toBe(true);
    expect(a.hasAttribute("aria-expanded")).toBe(false);
  });

  it("handles added, removed, and reparented DOM items", async () => {
    const goo = await make(
      item("A", "Folder", "expanded branch") + item("C", "Other", "expanded branch"),
    );
    const a = getItem(goo, "A"),
      c = getItem(goo, "C");
    a.insertAdjacentHTML("beforeend", item("B"));
    await settle();
    const b = getItem(goo, "B");
    expect(a.getChildrenItems()).toEqual([b]);
    c.append(b);
    await settle();
    expect(a.getChildrenItems()).toEqual([]);
    expect(c.getChildrenItems()).toEqual([b]);
    b.remove();
    await settle();
    expect(c.getChildrenItems()).toEqual([]);
  });
});

describe("goo-tree Goo-facing state signals", () => {
  it("requests materialization for initially expanded lazy markup", async () => {
    const container = await fixture<HTMLElement>("<div></div>");
    const load = vi.fn();
    container.addEventListener("goo-tree-lazy-load", load);
    container.innerHTML = `<goo-tree><wa-tree>${item("A", "Lazy", "expanded lazy branch")}</wa-tree></goo-tree>`;
    await settle();
    expect(load).toHaveBeenCalledOnce();
    expect((load.mock.calls[0]![0] as CustomEvent).detail).toEqual({ subject: "A" });
  });
  it("emits only opaque subjects on selection and reflects later caller state", async () => {
    const goo = await make(item("opaque:/A?x", "First") + item("B", "Second"));
    const select = collect(goo, "goo-tree-select");
    const a = getItem(goo, "opaque:/A?x"),
      b = getItem(goo, "B");
    await userEvent.click(label(a));
    await settle();
    expect(a.selected).toBe(true);
    const event = select.mock.calls[0]![0] as CustomEvent;
    expect(event.detail).toEqual({ subjects: ["opaque:/A?x"] });
    expect(event.bubbles && event.composed).toBe(true);
    a.removeAttribute("selected");
    b.setAttribute("selected", "");
    await settle();
    expect(a.selected).toBe(false);
    expect(b.selected).toBe(true);
    expect(select).toHaveBeenCalledOnce();
  });

  it("uses WA multiple-selection and translates its full selection in DOM order", async () => {
    const goo = await make(item("A") + item("B"), "multiple");
    const select = collect(goo, "goo-tree-select");
    await userEvent.click(label(getItem(goo, "B")));
    await settle();
    await userEvent.click(label(getItem(goo, "A")));
    await settle();
    expect((select.mock.calls.at(-1)![0] as CustomEvent).detail).toEqual({ subjects: ["A", "B"] });
    expect(goo.querySelector("wa-tree")!.getAttribute("aria-multiselectable")).toBe("true");
    expect(getItem(goo, "A").selectable).toBe(true);
  });

  it("supports selection=none while preserving disclosure and focus traversal", async () => {
    const goo = await make(item("A", `Folder${item("B")}`, "branch"), "none");
    const a = getItem(goo, "A");
    const select = collect(goo, "goo-tree-select");
    await userEvent.click(label(a));
    await settle();
    expect(a.selected).toBe(false);
    a.focus();
    await userEvent.keyboard("{Enter} ");
    await settle();
    expect(a.selected).toBe(false);
    await userEvent.click(twisty(a));
    await settle();
    expect(a.expanded).toBe(true);
    a.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(getItem(goo, "B"));
    expect(select).not.toHaveBeenCalled();
    goo.setAttribute("selection", "single");
    await settle();
    await userEvent.click(label(a));
    await settle();
    expect(a.selected).toBe(true);
  });

  it("accepts caller-expanded attributes without storing a hierarchy copy", async () => {
    const goo = await make(item("A", `Folder${item("B")}`));
    const a = getItem(goo, "A");
    a.setAttribute("expanded", "");
    await settle();
    expect(a.childrenContainer.hidden).toBe(false);
    a.removeAttribute("expanded");
    await settle();
    expect(a.childrenContainer.hidden).toBe(true);
  });

  it("requests lazy children once, then accepts caller materialization", async () => {
    const goo = await make(item("A", "Lazy folder", "branch lazy"));
    const a = getItem(goo, "A");
    const lazy = collect(goo, "goo-tree-lazy-load"),
      toggle = collect(goo, "goo-tree-toggle");
    a.focus();
    await userEvent.keyboard("{ArrowRight}");
    await settle();
    expect(a.loading).toBe(true);
    expect(lazy).toHaveBeenCalledOnce();
    expect(toggle).toHaveBeenCalledOnce();
    expect((lazy.mock.calls[0]![0] as CustomEvent).detail).toEqual({ subject: "A" });
    a.insertAdjacentHTML("beforeend", item("B", "Loaded by caller"));
    a.removeAttribute("lazy");
    await settle();
    expect(a.loading).toBe(false);
    expect(a.getChildrenItems()).toEqual([getItem(goo, "B")]);
    expect(a.childrenContainer.hidden).toBe(false);
    expect(toggle).toHaveBeenCalledOnce();
  });

  it("completes an empty lazy result and permits caller retry after cancellation", async () => {
    const goo = await make(item("A", "Lazy folder", "branch lazy"));
    const a = getItem(goo, "A");
    const lazy = collect(goo, "goo-tree-lazy-load");
    a.focus();
    await userEvent.keyboard("{ArrowRight}");
    await settle();
    a.removeAttribute("lazy");
    await settle();
    expect(a.loading).toBe(false);
    expect(a.isLeaf).toBe(false);
    a.expanded = false;
    await settle();
    a.lazy = true;
    await settle();
    a.focus();
    await userEvent.keyboard("{ArrowRight}");
    await settle();
    expect(lazy).toHaveBeenCalledTimes(2);
  });

  it("finishes lazy work after the caller collapses the pending item", async () => {
    const goo = await make(item("A", "Lazy folder", "branch lazy"));
    const a = getItem(goo, "A");
    a.focus();
    await userEvent.keyboard("{ArrowRight}");
    await settle();
    a.expanded = false;
    await settle();
    a.removeAttribute("lazy");
    await settle();
    expect(a.loading).toBe(false);
    expect(a.expanded).toBe(false);
    expect(a.childrenContainer.hidden).toBe(true);
  });
});

describe("goo-tree content and lifecycle", () => {
  it("keeps button handlers, input edits, and control arrow keys independent of the row", async () => {
    const goo = await make(
      item(
        "A",
        '<span><button>Inspect</button><input aria-label="Name" value="draft"><select aria-label="Mode"><option>A</option><option>B</option></select></span>',
      ) + item("B"),
    );
    const selected = collect(goo, "goo-tree-select");
    const button = goo.querySelector("button")!,
      input = goo.querySelector("input")!,
      select = goo.querySelector("select")!;
    const click = vi.fn();
    button.addEventListener("click", click);
    await userEvent.click(button);
    expect(click).toHaveBeenCalledOnce();
    await userEvent.fill(input, "unsaved draft");
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("unsaved draft");
    select.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(select);
    expect(selected).not.toHaveBeenCalled();
    expect(getItem(goo, "A").selected).toBe(false);
    expect(goo.querySelector("input")).toBe(input);
    const command = collect(goo, "mash-command");
    button.dispatchEvent(new CustomEvent("mash-command", { bubbles: true, composed: true }));
    expect(command).toHaveBeenCalledOnce();
  });

  it("isolates instances and cleans up on detach/reconnect", async () => {
    const one = await make(item("A")),
      two = await make(item("B"));
    const first = collect(one, "goo-tree-select"),
      second = collect(two, "goo-tree-select");
    await userEvent.click(label(getItem(two, "B")));
    await settle();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    const parent = one.parentElement!;
    one.remove();
    parent.append(one);
    await settle();
    await userEvent.click(label(getItem(one, "A")));
    await settle();
    expect(first).toHaveBeenCalledOnce();
  });

  it("warns once for bad subjects and leaves presentation intact", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const goo = await make(item("A") + item("A"));
    expect(warning).toHaveBeenCalledWith('duplicate goo-tree subject: "A"');
    expect(goo.querySelectorAll("wa-tree-item")).toHaveLength(2);
    goo.querySelector("wa-tree-item")!.setAttribute("branch", "");
    await settle();
    expect(warning).toHaveBeenCalledOnce();
  });
});
