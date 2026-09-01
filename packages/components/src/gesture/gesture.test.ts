import { describe, expect, it, vi } from "vitest";

import { fixture } from "../test-support/fixture.js";
import {
  bindGesture,
  dispatchCommand,
  GestureController,
  parseGestureShortcut,
  type GestureStateDetail,
  type MashCommandDetail,
} from "./gesture.js";

function pointer(type: string, options: Partial<PointerEventInit> = {}): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    button: 0,
    clientX: 0,
    clientY: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: "mouse",
    ...options,
  });
}

describe("gesture controller", () => {
  it("dispatches portable imperative commands", async () => {
    const target = await fixture<HTMLElement>(`<button type="button">Run</button>`);
    const listener = vi.fn();
    target.addEventListener("mash-command", listener);

    const accepted = dispatchCommand(target, "workspace.run", { data: { source: "toolbar" } });

    expect(accepted).toBe(true);
    expect((listener.mock.calls[0]![0] as CustomEvent<MashCommandDetail>).detail).toMatchObject({
      bindingId: "imperative",
      command: "workspace.run",
      gesture: "command",
      phase: "ended",
      source: "imperative",
      data: { source: "toolbar" },
    });
  });

  it("normalizes keyboard chords and advertises them on the bound target", async () => {
    const target = await fixture<HTMLElement>(`<button type="button">Search</button>`);
    const listener = vi.fn();
    target.addEventListener("mash-command", listener);
    const shortcut = parseGestureShortcut("Control+K");
    const handle = bindGesture(target, {
      command: "workspace.search",
      gesture: { kind: "key", ...shortcut, preventDefault: "recognized" },
    });

    expect(target.getAttribute("aria-keyshortcuts")).toBe("Control+K");
    const down = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      code: "KeyK",
      ctrlKey: true,
      key: "k",
    });
    target.dispatchEvent(down);
    target.dispatchEvent(
      new KeyboardEvent("keyup", {
        bubbles: true,
        code: "KeyK",
        ctrlKey: true,
        key: "k",
      }),
    );

    expect(down.defaultPrevented).toBe(true);
    expect(listener.mock.calls.map((call) => call[0].detail.phase)).toEqual(["began", "ended"]);
    handle.destroy();
    expect(target.hasAttribute("aria-keyshortcuts")).toBe(false);
  });

  it("arbitrates press against drag and reports the recognizer states", async () => {
    const target = await fixture<HTMLElement>(`<div tabindex="0">Canvas</div>`);
    const commands = vi.fn();
    const states = vi.fn();
    target.addEventListener("mash-command", commands);
    target.addEventListener("mash-gesture-state", states);
    const controller = new GestureController(target, [
      {
        id: "select",
        command: "canvas.select",
        gesture: { kind: "press", threshold: 8 },
        group: "canvas",
      },
      {
        id: "move",
        command: "canvas.move",
        gesture: { kind: "drag", threshold: 4 },
        group: "canvas",
        priority: 10,
      },
    ]);

    target.dispatchEvent(pointer("pointerdown"));
    target.dispatchEvent(pointer("pointermove", { clientX: 12, clientY: 3 }));
    target.dispatchEvent(pointer("pointerup", { clientX: 12, clientY: 3 }));

    expect(commands.mock.calls.map((call) => call[0].detail.command)).toEqual([
      "canvas.move",
      "canvas.move",
    ]);
    expect(commands.mock.calls.map((call) => call[0].detail.phase)).toEqual(["began", "ended"]);
    expect(
      states.mock.calls
        .map((call) => (call[0] as CustomEvent<GestureStateDetail>).detail)
        .some((detail) => detail.bindingId === "select" && detail.state === "failed"),
    ).toBe(true);
    controller.destroy();
  });

  it("lets long-press win its arena without also firing press", async () => {
    const target = await fixture<HTMLElement>(`<div>Preview</div>`);
    const listener = vi.fn();
    target.addEventListener("mash-command", listener);
    const controller = new GestureController(target, [
      {
        id: "press",
        command: "surface.open",
        gesture: { kind: "press" },
        group: "surface",
      },
      {
        id: "preview",
        command: "surface.preview",
        gesture: { kind: "long-press", delay: 5 },
        group: "surface",
        priority: 10,
      },
    ]);

    target.dispatchEvent(pointer("pointerdown"));
    await new Promise((resolve) => setTimeout(resolve, 15));
    target.dispatchEvent(pointer("pointerup"));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0].detail).toMatchObject({
      command: "surface.preview",
      gesture: "long-press",
      phase: "ended",
    });
    controller.destroy();
  });

  it("groups a wheel stream into began, changed, and ended phases", async () => {
    const target = await fixture<HTMLElement>(`<div>Timeline</div>`);
    const listener = vi.fn();
    target.addEventListener("mash-command", listener);
    const controller = new GestureController(target, [
      {
        command: "timeline.scrub",
        gesture: { kind: "wheel", axis: "x", delay: 5 },
      },
    ]);

    target.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaX: 12, deltaY: 8 }));
    target.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaX: 4, deltaY: 2 }));
    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(listener.mock.calls.map((call) => call[0].detail.phase)).toEqual([
      "began",
      "changed",
      "ended",
    ]);
    expect(listener.mock.calls[0]![0].detail.value.wheel).toEqual({ x: 12, y: 0 });
    controller.destroy();
  });
});
