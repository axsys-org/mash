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
      "horizontal",
    );
    expect(inShadow(handle, `[role="separator"]`).getAttribute("aria-controls")).toBe(
      group.querySelector("ui-resizable-panel")?.id,
    );
    expect(inShadow(handle, `[role="separator"]`).getAttribute("aria-valuemin")).toBe("80");
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
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        composed: true,
      }),
    );
    await settled(group);

    expect(first?.size).toBe(220);
    expect(second?.size).toBe(180);
    expect(onChange).toHaveBeenCalled();
    expect(handle.matches(":state(resizing)")).toBe(false);
    expect(inShadow(handle, `[role="separator"]`).getAttribute("aria-valuenow")).toBe("220");
  });

  it("announces a following inspector panel while arrow movement remains spatial", async () => {
    const group = await fixture<UIResizable>(`
      <ui-resizable>
        <ui-resizable-panel size="400" min="240">Workspace</ui-resizable-panel>
        <ui-resizable-handle label="Resize inspector" primary-panel="next" step="8"></ui-resizable-handle>
        <ui-resizable-panel size="280" min="200" max="420">Inspector</ui-resizable-panel>
      </ui-resizable>
    `);
    const [workspace, inspector] = Array.from(
      group.querySelectorAll<UIResizablePanel>("ui-resizable-panel"),
    );
    const handle = group.querySelector<UIResizableHandle>("ui-resizable-handle")!;
    const control = inShadow(handle, '[role="separator"]');
    expect(control.getAttribute("aria-valuenow")).toBe("280");
    expect(control.getAttribute("aria-valuemin")).toBe("200");
    expect(control.getAttribute("aria-valuemax")).toBe("420");
    expect(control.getAttribute("aria-controls")).toBe(inspector!.id);
    control.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        composed: true,
      }),
    );
    await settled(group);
    expect(inspector!.size).toBe(288);
    expect(workspace!.size).toBe(392);
    expect(control.getAttribute("aria-valuenow")).toBe("288");
    handle.primaryPanel = "previous";
    await settled(group);
    expect(control.getAttribute("aria-controls")).toBe(workspace!.id);
    expect(control.getAttribute("aria-valuenow")).toBe("392");
  });

  it("exposes a CSS fallback grip and semantic boundary states", async () => {
    const group = await fixture<UIResizable>(`
      <ui-resizable>
        <ui-resizable-panel size="100" min="100">One</ui-resizable-panel>
        <ui-resizable-handle></ui-resizable-handle>
        <ui-resizable-panel size="200" min="100">Two</ui-resizable-panel>
      </ui-resizable>
    `);
    const handle = group.querySelector<UIResizableHandle>("ui-resizable-handle")!;

    expect(inShadow(handle, `[part="grip"]`)).toBeTruthy();
    expect(handle.matches(":state(at-min)")).toBe(true);

    group.resizePanel(0, 200);
    await settled(group);
    expect(handle.matches(":state(at-min)")).toBe(false);
    expect(handle.matches(":state(at-max)")).toBe(true);
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

  it("removes orphaned handles and restores flexible sizing", async () => {
    const group = await fixture<UIResizable>(`
      <ui-resizable>
        <ui-resizable-panel size="180" min="100">One</ui-resizable-panel>
        <ui-resizable-handle></ui-resizable-handle>
        <ui-resizable-panel min="100">Two</ui-resizable-panel>
      </ui-resizable>
    `);
    const first = group.querySelector<UIResizablePanel>("ui-resizable-panel")!;
    const handle = group.querySelector<UIResizableHandle>("ui-resizable-handle")!;

    first.visible = false;
    await settled(group);
    expect(handle.hidden).toBe(true);

    first.visible = true;
    first.size = 0;
    await settled(group);
    expect(handle.hidden).toBe(false);
    expect(first.style.flexBasis).toBe("");
    expect(first.style.inlineSize).toBe("");
  });
});
