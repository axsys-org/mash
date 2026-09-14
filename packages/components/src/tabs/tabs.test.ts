import { describe, expect, it, vi } from "vitest";

import type { UITab } from "../tab/tab.js";
import type { UITabPanel } from "../tab-panel/tab-panel.js";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UITabs } from "./tabs.js";
import "../tab-panel/register.js";
import "../tab/register.js";
import "./register.js";

describe("ui-tabs", () => {
  it("selects a slotted tab through its native control", async () => {
    const element = await fixture<UITabs>(`
      <ui-tabs value="controls" label="Selection accessories">
        <ui-tab slot="tab" value="controls">Controls</ui-tab>
        <ui-tab slot="tab" value="comments">Comments</ui-tab>
        <ui-tab-panel slot="panel" value="controls">Controls panel</ui-tab-panel>
        <ui-tab-panel slot="panel" value="comments">Comments panel</ui-tab-panel>
      </ui-tabs>
    `);
    const tabs = [...element.querySelectorAll<UITab>("ui-tab")];
    const panels = [...element.querySelectorAll<UITabPanel>("ui-tab-panel")];
    const onChange = vi.fn();
    element.addEventListener("ui-tabs-change", onChange);

    inShadow<HTMLButtonElement>(tabs[1]!, "button").click();
    await settled(element);

    expect(element.value).toBe("comments");
    expect(tabs.map((tab) => tab.selected)).toEqual([false, true]);
    expect(panels.map((panel) => panel.selected)).toEqual([false, true]);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("requests closure with Delete and selects an adjacent tab after removal", async () => {
    const element = await fixture<UITabs>(`<ui-tabs value="b">
      <ui-tab slot="tab" value="a">Alpha</ui-tab>
      <ui-tab slot="tab" value="b" closable>Beta</ui-tab>
      <ui-tab slot="tab" value="c">Gamma</ui-tab>
      <ui-tab-panel slot="panel" value="b">Beta panel</ui-tab-panel>
    </ui-tabs>`);
    const middle = element.querySelector<UITab>('[value="b"]')!;
    const request = vi.fn();
    element.addEventListener("ui-tab-close", request);
    middle.focus();
    inShadow(middle, '[part="control"]').dispatchEvent(
      new KeyboardEvent("keydown", { key: "Delete", bubbles: true, composed: true }),
    );
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0]![0].detail.value).toBe("b");
    expect(middle.isConnected).toBe(true);
    middle.remove();
    element.querySelector("ui-tab-panel")!.remove();
    await settled(element);
    expect(element.value).toBe("c");
    expect(element.querySelector<UITab>('[value="c"]')!.selected).toBe(true);
  });

  it("keeps nested tab selections independent and reconciles disabled tabs", async () => {
    const element = await fixture<UITabs>(
      `<ui-tabs value="outer"><ui-tab slot="tab" value="outer">Outer</ui-tab><ui-tab slot="tab" value="other">Other</ui-tab><ui-tab-panel slot="panel" value="outer"><ui-tabs><ui-tab slot="tab" value="one">One</ui-tab><ui-tab slot="tab" value="two">Two</ui-tab></ui-tabs></ui-tab-panel></ui-tabs>`,
    );
    const inner = element.querySelector<UITabs>("ui-tabs")!;
    inShadow(inner.querySelector<UITab>('[value="two"]')!, "button").click();
    await settled(element);
    expect(inner.value).toBe("two");
    expect(element.value).toBe("outer");
    element.querySelector<UITab>('ui-tab[value="outer"]')!.disabled = true;
    await settled(element);
    expect(element.value).toBe("other");
  });

  it("reorders and restores without replacing panels or losing draft state", async () => {
    const element = await fixture<UITabs>(`<ui-tabs value="b" reorderable>
      <ui-tab slot="tab" value="a">Alpha</ui-tab><ui-tab slot="tab" value="b">Beta</ui-tab><ui-tab slot="tab" value="c">Gamma</ui-tab>
      <ui-tab-panel slot="panel" value="b"><input value="Initial"></ui-tab-panel>
    </ui-tabs>`);
    const panel = element.querySelector("ui-tab-panel")!;
    const input = panel.querySelector("input")!;
    input.value = "Unsaved changes";
    input.focus();
    const previous = element.getOrder();
    const changed = vi.fn();
    element.addEventListener("ui-tabs-reorder", changed);
    expect(element.reorder("b", 0)).toBe(true);
    await settled(element);
    expect(element.getOrder()).toEqual(["b", "a", "c"]);
    expect(element.value).toBe("b");
    expect(element.querySelector("ui-tab-panel")).toBe(panel);
    expect(input.value).toBe("Unsaved changes");
    expect(document.activeElement).toBe(input);
    expect(changed.mock.calls[0]![0].detail).toEqual({ previous, order: ["b", "a", "c"] });
    expect(element.setOrder(previous)).toBe(true);
    expect(element.getOrder()).toEqual(previous);
    expect(element.setOrder(["a", "a", "b"])).toBe(false);
    expect(element.reorder("unknown", 0)).toBe(false);
    expect(element.reorder("a", 99)).toBe(false);
    expect(element.getOrder()).toEqual(previous);
  });

  it("reorders with keyboard modifiers in horizontal RTL and vertical layouts", async () => {
    const element = await fixture<UITabs>(`<ui-tabs reorderable value="b" dir="rtl">
      <ui-tab slot="tab" value="a">Alpha</ui-tab><ui-tab slot="tab" value="b">Beta</ui-tab><ui-tab slot="tab" value="c">Gamma</ui-tab>
    </ui-tabs>`);
    const tab = element.querySelector<UITab>('[value="b"]')!;
    const press = (key: string) =>
      inShadow(tab, '[part="control"]').dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          altKey: true,
          shiftKey: true,
          bubbles: true,
          composed: true,
        }),
      );
    press("ArrowLeft");
    await settled(element);
    expect(element.getOrder()).toEqual(["a", "c", "b"]);
    expect(element.value).toBe("b");
    expect(document.activeElement).toBe(tab);
    element.orientation = "vertical";
    await settled(element);
    press("ArrowUp");
    await settled(element);
    expect(element.getOrder()).toEqual(["a", "b", "c"]);
    press("Home");
    await settled(element);
    expect(element.getOrder()).toEqual(["b", "a", "c"]);
    expect(inShadow(element, '[part="announcement"]').textContent).toContain("position 1 of 3");
  });

  it("commits a pointer reorder and cancels another drag without changing selection", async () => {
    const element = await fixture<UITabs>(`<ui-tabs reorderable value="b">
      <ui-tab slot="tab" value="a" style="display:inline-block;width:100px">Alpha</ui-tab><ui-tab slot="tab" value="b" style="display:inline-block;width:100px">Beta</ui-tab><ui-tab slot="tab" value="c" style="display:inline-block;width:100px">Gamma</ui-tab>
    </ui-tabs>`);
    const tab = element.querySelector<UITab>('[value="a"]')!;
    const begin = () => {
      const bounds = tab.getBoundingClientRect();
      inShadow(tab, '[part="control"]').dispatchEvent(
        new PointerEvent("pointerdown", {
          button: 0,
          isPrimary: true,
          pointerId: 7,
          clientX: bounds.left + 5,
          clientY: bounds.top + 5,
          bubbles: true,
          composed: true,
        }),
      );
    };
    begin();
    document.dispatchEvent(new PointerEvent("pointermove", { pointerId: 99, clientX: 1000 }));
    document.dispatchEvent(new PointerEvent("pointerup", { pointerId: 99 }));
    expect(element.querySelector("[data-dragging]")).toBeNull();
    const last = element.querySelector<UITab>('[value="c"]')!.getBoundingClientRect();
    document.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 7,
        clientX: last.right + 8,
        clientY: last.top + 5,
      }),
    );
    document.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7 }));
    await settled(element);
    expect(element.getOrder()).toEqual(["b", "c", "a"]);
    expect(element.value).toBe("b");
    begin();
    document.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 7, clientX: 0, clientY: last.top + 5 }),
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    document.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7 }));
    expect(element.getOrder()).toEqual(["b", "c", "a"]);
    expect(element.querySelector("[data-dragging]")).toBeNull();
    inShadow(tab, '[part="control"]').dispatchEvent(
      new MouseEvent("click", { detail: 1, bubbles: true, composed: true, cancelable: true }),
    );
    expect(element.value).toBe("b");
  });

  it("offers full labels for overflow and activates a document outside the visible strip", async () => {
    const element =
      await fixture<UITabs>(`<ui-tabs label="Documents" style="display:block;width:200px">
      ${Array.from({ length: 6 }, (_, index) => `<ui-tab slot="tab" value="${index}" label="Complete document title ${index}" style="display:inline-block;flex:none;width:120px">Short ${index}</ui-tab><ui-tab-panel slot="panel" value="${index}">Panel ${index}</ui-tab-panel>`).join("")}
    </ui-tabs>`);
    const list = inShadow<HTMLElement>(element, '[part="list"]');
    Object.assign(list.style, { display: "flex", overflow: "auto", width: "200px" });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await settled(element);
    const overflow = inShadow<HTMLElement>(element, '[part="overflow"]');
    expect(overflow.hidden).toBe(false);
    expect(element.shadowRoot!.querySelector("select")).toBeNull();
    const menu = element.shadowRoot!.querySelector("ui-menu")!;
    expect(menu.querySelectorAll("ui-menu-item")[5]!.textContent).toBe("Complete document title 5");
    menu.dispatchEvent(
      new CustomEvent("ui-menu-select", { detail: { value: "5" }, bubbles: true }),
    );
    await settled(element);
    expect(element.value).toBe("5");
    expect(element.querySelector<UITabPanel>('ui-tab-panel[value="5"]')!.selected).toBe(true);
    expect(
      inShadow(element.querySelector<UITab>('ui-tab[value="5"]')!, "button").getAttribute("title"),
    ).toBe("Complete document title 5");
  });

  it("preserves tab focus when the platform lacks state-preserving moves", async () => {
    const element = await fixture<UITabs>(`<ui-tabs value="a">
      <ui-tab slot="tab" value="a">Alpha</ui-tab><ui-tab slot="tab" value="b">Beta</ui-tab>
    </ui-tabs>`);
    Object.defineProperty(element, "moveBefore", { value: undefined, configurable: true });
    const tab = element.querySelector<UITab>('[value="a"]')!;
    const control = inShadow<HTMLButtonElement>(tab, '[part="control"]');
    control.focus();
    element.reorder("a", 1);
    await settled(element);
    expect(document.activeElement).toBe(tab);
    expect(tab.shadowRoot!.activeElement).toBe(control);
  });

  it("releases resize observations for hidden and removed tabs", async () => {
    const element = await fixture<UITabs>(`<ui-tabs>
      <ui-tab slot="tab" value="a">Alpha</ui-tab><ui-tab slot="tab" value="b">Beta</ui-tab>
    </ui-tabs>`);
    const tabs = [...element.querySelectorAll<UITab>("ui-tab")];
    const unobserve = vi.spyOn(ResizeObserver.prototype, "unobserve");
    try {
      tabs[0]!.hidden = true;
      await settled(element);
      expect(unobserve).toHaveBeenCalledWith(tabs[0]);
      tabs[1]!.remove();
      await settled(element);
      expect(unobserve).toHaveBeenCalledWith(tabs[1]);
    } finally {
      unobserve.mockRestore();
    }
  });
});
