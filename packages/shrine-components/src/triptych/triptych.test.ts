import { afterEach, beforeEach, describe, expect, it } from "vitest";

import "@mash/ui/catalogue/mash.css";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import "../catalogue/mash.css";
import { ShrineTriptych } from "./triptych.js";
import "./register.js";

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});

afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
});

describe("sh-triptych", () => {
  const settlePanels = async (element: ShrineTriptych): Promise<void> => {
    await settled(element);
    await settled(element.shadowRoot!);
    await settled(element.shadowRoot!);
  };
  const wideTriptych = async (): Promise<ShrineTriptych> => {
    const element = await fixture<ShrineTriptych>(`
      <sh-triptych resizable style="inline-size: 1200px; block-size: 420px">
        <input slot="sidebar" value="Keep this draft">
        <p slot="content">Workspace</p><p slot="inspector">Details</p>
      </sh-triptych>
    `);
    await settlePanels(element);
    return element;
  };

  it("centers quiet resize targets on adjacent pane edges without reserving columns", async () => {
    const element = await wideTriptych();
    for (const side of ["sidebar", "inspector"]) {
      const handle = inShadow(element, `[part="${side}-resizer"]`);
      const control = inShadow(handle, '[part="control"]');
      const main = inShadow(element, '[part="main"]').getBoundingClientRect();
      const pane = inShadow(element, `[part="${side}"]`).getBoundingClientRect();
      const target = control.getBoundingClientRect();
      const edge = side === "sidebar" ? pane.right : pane.left;
      expect(side === "sidebar" ? main.left : main.right).toBeCloseTo(edge, 1);
      expect(handle.getBoundingClientRect().width).toBe(0);
      expect(target.width).toBe(matchMedia("(pointer: coarse)").matches ? 12 : 8);
      expect(target.left + target.width / 2).toBeCloseTo(edge, 1);
      expect(getComputedStyle(control).backgroundColor).toBe("rgba(0, 0, 0, 0)");
      expect(getComputedStyle(inShadow(handle, '[part="grip"]')).display).toBe("none");
    }
  });

  it("keeps resizing opt-in and composes Mash separators when enabled", async () => {
    const element = await fixture<ShrineTriptych>(
      `<sh-triptych style="inline-size:1200px; block-size:420px">Record</sh-triptych>`,
    );
    await settlePanels(element);
    expect(element.shadowRoot!.querySelector("ui-resizable-handle")).toBeNull();
    expect(getComputedStyle(inShadow(element, '[part="shell"]')).display).toBe("grid");
    element.resizable = true;
    await settlePanels(element);
    expect(element.matches(":state(resizable)")).toBe(true);
    expect(getComputedStyle(inShadow(element, '[part="shell"]')).display).toBe("flex");
    expect(element.shadowRoot!.querySelectorAll("ui-resizable-handle")).toHaveLength(2);
    expect(inShadow(element, '[part="main"]').getAttribute("role")).toBe("main");
    expect(
      getComputedStyle(inShadow(inShadow(element, '[part="main"]'), '[part="root"]')).display,
    ).toBe("contents");
  });

  it("resizes both panes with keyboard separators and keeps the content flexible", async () => {
    const element = await wideTriptych();
    const sidebar = inShadow(element, '[part="sidebar"]');
    const main = inShadow(element, '[part="main"]');
    const inspector = inShadow(element, '[part="inspector"]');
    const initialSidebar = sidebar.getBoundingClientRect().width;
    const initialInspector = inspector.getBoundingClientRect().width;
    const handle = inShadow(inShadow(element, '[part="sidebar-resizer"]'), '[role="separator"]');
    handle.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        composed: true,
      }),
    );
    await settlePanels(element);
    expect(sidebar.getBoundingClientRect().width).toBeCloseTo(initialSidebar + 8);
    expect(element.sidebarWidth).toBeCloseTo(initialSidebar + 8);
    expect(handle.getAttribute("aria-valuenow")).toBe(String(Math.round(initialSidebar + 8)));
    const inspectorHandle = inShadow(
      inShadow(element, '[part="inspector-resizer"]'),
      '[role="separator"]',
    );
    inspectorHandle.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        composed: true,
      }),
    );
    await settlePanels(element);
    expect(inspector.getBoundingClientRect().width).toBeCloseTo(initialInspector + 8);
    expect(inspectorHandle.getAttribute("aria-valuenow")).toBe(
      String(Math.round(initialInspector + 8)),
    );
    expect(inspectorHandle.getAttribute("aria-controls")).toBe(inspector.id);
    expect(main.style.flexBasis).toBe("");
    expect(main.getBoundingClientRect().width).toBeGreaterThanOrEqual(element.mainMinWidth);
  });

  it("applies primitive drag deltas, bounds widths, and emits persistable details", async () => {
    const element = await wideTriptych();
    const handle = inShadow(element, '[part="sidebar-resizer"]');
    const changes: unknown[] = [];
    element.addEventListener("sh-triptych-resize", (event) =>
      changes.push((event as CustomEvent).detail),
    );
    const resize = (delta: number, phase: string) =>
      handle.dispatchEvent(
        new CustomEvent("ui-resize", {
          detail: { delta, phase },
          bubbles: true,
          composed: true,
        }),
      );
    resize(0, "start");
    expect(element.matches(":state(resizing)")).toBe(true);
    resize(10000, "move");
    await settlePanels(element);
    expect(element.sidebarWidth).toBe(element.sidebarMaxWidth);
    resize(-10000, "move");
    await settlePanels(element);
    expect(element.sidebarWidth).toBe(element.sidebarMinWidth);
    resize(0, "end");
    expect(element.matches(":state(resizing)")).toBe(false);
    expect(changes.at(-1)).toEqual({
      sidebarWidth: element.sidebarMinWidth,
      inspectorWidth: 320,
    });
  });

  it("resets with a double-click without remounting authored state", async () => {
    const element = await wideTriptych();
    const input = element.querySelector("input")!;
    const content = inShadow(element, '[part="main-body"]');
    input.value = "An unsent edit";
    element.sidebarWidth = 384;
    element.inspectorWidth = 352;
    await settlePanels(element);
    expect(inShadow(element, '[part="sidebar"]').getBoundingClientRect().width).toBe(384);
    inShadow(element, '[part="sidebar-resizer"]').dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true, composed: true }),
    );
    await settlePanels(element);
    expect(element.sidebarWidth).toBe(0);
    expect(inShadow(element, '[part="sidebar"]').getBoundingClientRect().width).toBe(240);
    expect(element.inspectorWidth).toBe(352);
    expect(element.querySelector("input")).toBe(input);
    expect(input.value).toBe("An unsent edit");
    expect(inShadow(element, '[part="main-body"]')).toBe(content);
  });

  it("temporarily releases pane widths on narrow containers and restores them", async () => {
    const element = await wideTriptych();
    element.sidebarWidth = 304;
    element.inspectorWidth = 288;
    await settlePanels(element);
    element.style.inlineSize = "620px";
    await settlePanels(element);
    expect(element.matches(":state(resizable)")).toBe(false);
    expect(element.shadowRoot!.querySelector("ui-resizable-handle")).toBeNull();
    expect(inShadow(element, '[part="sidebar"]').style.inlineSize).toBe("");
    expect(inShadow(element, '[part="main"]').style.minInlineSize).toBe("0px");
    element.style.inlineSize = "1200px";
    await settlePanels(element);
    expect(element.matches(":state(resizable)")).toBe(true);
    expect(inShadow(element, '[part="sidebar"]').getBoundingClientRect().width).toBe(304);
    expect(inShadow(element, '[part="inspector"]').getBoundingClientRect().width).toBe(288);
  });

  it("clamps restored widths to keep space for the primary workspace", async () => {
    const element = await wideTriptych();
    element.sidebarWidth = 900;
    element.inspectorWidth = 900;
    element.style.inlineSize = "900px";
    await settlePanels(element);
    const sidebar = inShadow(element, '[part="sidebar"]').getBoundingClientRect().width;
    const inspector = inShadow(element, '[part="inspector"]').getBoundingClientRect().width;
    const main = inShadow(element, '[part="main"]').getBoundingClientRect().width;
    expect(main).toBeGreaterThanOrEqual(element.mainMinWidth - 1);
    expect(sidebar + inspector + main).toBeCloseTo(900, 0);
    expect(sidebar).toBeGreaterThanOrEqual(element.sidebarMinWidth);
    expect(inspector).toBeGreaterThanOrEqual(element.inspectorMinWidth);
  });

  it("preserves hidden-pane width and exposes hover scrollbars for every scroll owner", async () => {
    const element = await wideTriptych();
    element.sidebarWidth = 288;
    element.sidebarOpen = false;
    await settlePanels(element);
    expect(element.shadowRoot!.querySelector('[part="sidebar-resizer"]')).toBeNull();
    expect(inShadow(element, '[part="sidebar"]').hidden).toBe(true);
    element.sidebarOpen = true;
    await settlePanels(element);
    expect(inShadow(element, '[part="sidebar"]').getBoundingClientRect().width).toBe(288);
    for (const region of ["sidebar", "main", "inspector"]) {
      const area = inShadow(element, `[part="${region}-body"]`);
      expect(area.getAttribute("mode")).toBe("scrolling");
      expect(area.getAttribute("size")).toBe("medium");
      expect(area.getAttribute("exportparts")).toContain(`block-thumb:${region}-block-thumb`);
      expect(area.getAttribute("exportparts")).toContain("inline-thumb:inline-thumb");
      expect(area.getAttribute("exportparts")).toContain("block-scrollbar:scrollbar");
    }
  });

  it("projects a persistent lower panel independently of scrolling content", async () => {
    const el = await fixture<ShrineTriptych>(
      `<sh-triptych><p slot="content">Record</p><div slot="main-footer">Activity</div></sh-triptych>`,
    );
    const slot = inShadow<HTMLSlotElement>(el, 'slot[name="main-footer"]');
    expect(slot.assignedElements()[0]?.textContent).toBe("Activity");
    expect(inShadow(el, '[part="main-footer"]').hidden).toBe(false);
    el.querySelector('[slot="main-footer"]')!.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
    expect(inShadow(el, '[part="main-footer"]').hidden).toBe(true);
  });
  it("hides navigation without discarding authored controls", async () => {
    const el = await fixture<ShrineTriptych>(
      `<sh-triptych><input slot="sidebar" value="retained"><p slot="content">Main</p></sh-triptych>`,
    );
    const input = el.querySelector("input")!;
    el.sidebarOpen = false;
    await el.updateComplete;
    expect(el.matches(":state(sidebar-open)")).toBe(false);
    expect(getComputedStyle(inShadow(el, '[part="sidebar"]')).display).toBe("none");
    expect(inShadow(el, '[part="sidebar"]').inert).toBe(true);
    el.sidebarOpen = true;
    await el.updateComplete;
    expect(el.querySelector("input")).toBe(input);
    expect(input.value).toBe("retained");
    expect(el.matches(":state(sidebar-open)")).toBe(true);
  });
  it("registers and upgrades", async () => {
    expect(customElements.get("sh-triptych")).toBe(ShrineTriptych);

    const element = await fixture<ShrineTriptych>(`<sh-triptych>content</sh-triptych>`);
    expect(element).toBeInstanceOf(ShrineTriptych);
    expect(element.shadowRoot).not.toBeNull();
  });

  it("projects named content and preserves the default compatibility path", async () => {
    const element = await fixture<ShrineTriptych>(`
      <sh-triptych><p slot="content">named</p><p>fallback</p></sh-triptych>
    `);
    const slot = inShadow<HTMLSlotElement>(element, 'slot[name="content"]');

    expect(slot.assignedElements()[0]?.textContent).toBe("named");
    expect(customElements.get("ui-scroll-area")).toBeDefined();
    expect(inShadow(element, 'ui-scroll-area[part="main-body"]').shadowRoot).not.toBeNull();
  });

  it("exports stable styling parts for every workspace region", async () => {
    const element = await fixture<ShrineTriptych>(`
      <sh-triptych inspector-open>
        <p slot="sidebar">sidebar</p>
        <p slot="navigate">navigate</p>
        <p slot="locator">locator</p>
        <p slot="content">main</p>
        <p slot="inspector-locator">inspector locator</p>
        <p slot="inspector">inspector</p>
      </sh-triptych>
    `);

    for (const part of [
      "shell",
      "sidebar",
      "sidebar-body",
      "navigate",
      "main",
      "locator",
      "main-body",
      "content",
      "inspector",
      "inspector-locator",
      "inspector-body",
    ]) {
      expect(inShadow(element, `[part~="${part}"]`)).toBeInstanceOf(HTMLElement);
    }

    for (const area of element.shadowRoot!.querySelectorAll("ui-scroll-area")) {
      expect(area.getAttribute("exportparts")).toMatch(/root:.*-scroll-root/);
      expect(area.getAttribute("exportparts")).toMatch(/viewport:.*-viewport/);
      expect(area.getAttribute("exportparts")).toMatch(/content:.*-content/);
      expect(inShadow(area, '[part="viewport"]').getAttribute("role")).toBe("region");
    }
  });

  it("reflects inspector ownership through an attribute and custom state", async () => {
    const element = await fixture<ShrineTriptych>(`<sh-triptych></sh-triptych>`);

    expect(element.hasAttribute("inspector-open")).toBe(true);
    expect(element.matches(":state(inspector-open)")).toBe(true);

    element.inspectorOpen = false;
    await element.updateComplete;

    expect(element.hasAttribute("inspector-open")).toBe(false);
    expect(element.matches(":state(inspector-open)")).toBe(false);
    expect(element.shadowRoot?.querySelector('[part="inspector"]')).toBeNull();
  });

  it("keeps long content inside the exported main viewport", async () => {
    const rows = Array.from({ length: 80 }, (_, index) => `<p>Row ${index}</p>`).join("");
    const element = await fixture<ShrineTriptych>(`
      <sh-triptych style="block-size: 420px" inspector-open>
        <div slot="sidebar">Sidebar</div>
        <div slot="content">${rows}</div>
        <div slot="inspector">Inspector</div>
      </sh-triptych>
    `);
    const area = inShadow<HTMLElement>(element, 'ui-scroll-area[part="main-body"]');
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');

    expect(area.clientHeight).toBeLessThanOrEqual(420);
    expect(viewport.clientHeight).toBeLessThanOrEqual(area.clientHeight);
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
  });

  it("collapses optional chrome when its slots are empty", async () => {
    const element = await fixture<ShrineTriptych>(`<sh-triptych>content</sh-triptych>`);

    expect(inShadow(element, '[part="locator"]').hidden).toBe(true);
    expect(inShadow(element, '[part="navigate"]').hidden).toBe(true);
    expect(inShadow(element, '[part="inspector-locator"]').hidden).toBe(true);
  });
});
