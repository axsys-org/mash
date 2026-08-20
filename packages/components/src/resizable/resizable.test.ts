import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIResizable, UIResizableHandle, UIResizablePanel } from "./resizable.js";
import "./register.js";

describe("ui-resizable", () => {
  it("binds authored panels and handles to the group axis", async () => {
    const group = await fixture<UIResizable>(`
      <ui-resizable orientation="vertical">
        <ui-resizable-panel min="80">One</ui-resizable-panel>
        <ui-resizable-handle></ui-resizable-handle>
        <ui-resizable-panel min="90">Two</ui-resizable-panel>
      </ui-resizable>
    `);
    const handle = group.querySelector<UIResizableHandle>("ui-resizable-handle")!;

    expect(inShadow<HTMLSlotElement>(group, "slot").assignedElements()).toHaveLength(3);
    expect(handle.orientation).toBe("vertical");
    expect(inShadow(handle, `[role="separator"]`).getAttribute("aria-orientation")).toBe(
      "vertical",
    );
  });

  it("supports keyboard resizing and reports ordered sizes", async () => {
    const group = await fixture<UIResizable>(`
      <ui-resizable>
        <ui-resizable-panel size="200" min="100">One</ui-resizable-panel>
        <ui-resizable-handle step="20"></ui-resizable-handle>
        <ui-resizable-panel size="200" min="100">Two</ui-resizable-panel>
      </ui-resizable>
    `);
    const [first, second] = Array.from(
      group.querySelectorAll<UIResizablePanel>("ui-resizable-panel"),
    );
    const handle = group.querySelector<UIResizableHandle>("ui-resizable-handle")!;
    const onChange = vi.fn();
    group.addEventListener("ui-resizable-change", onChange);

    inShadow(handle, `[role="separator"]`).dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }),
    );
    await settled(group);

    expect(first?.size).toBe(220);
    expect(second?.size).toBe(180);
    expect(onChange).toHaveBeenCalled();
    expect(handle.matches(":state(resizing)")).toBe(false);
  });

  it("supports programmatic resize, reset, and panel visibility state", async () => {
    const group = await fixture<UIResizable>(`
      <ui-resizable>
        <ui-resizable-panel size="180" min="100">One</ui-resizable-panel>
        <ui-resizable-handle></ui-resizable-handle>
        <ui-resizable-panel size="220" min="100">Two</ui-resizable-panel>
      </ui-resizable>
    `);
    const [first, second] = Array.from(
      group.querySelectorAll<UIResizablePanel>("ui-resizable-panel"),
    );

    group.resizePanel(0, 240);
    await settled(group);
    expect(first?.size).toBe(240);
    expect(second?.size).toBe(160);
    expect(group.sizes).toEqual([240, 160]);

    group.resetPanel(0);
    await settled(group);
    expect(first?.size).toBe(180);
    expect(second?.size).toBe(220);

    second!.visible = false;
    await settled(group);
    expect(second?.hidden).toBe(true);
    expect(second?.matches(":state(visible)")).toBe(false);
  });
});
