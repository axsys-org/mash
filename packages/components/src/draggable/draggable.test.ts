import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIDraggable } from "./draggable.js";
import "./register.js";

function pointer(
  target: Element | Document,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  x: number,
  y: number,
  pointerId = 7,
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
      clientX: x,
      clientY: y,
      isPrimary: true,
      pointerId,
      pointerType: "mouse",
    }),
  );
}

async function draggableFixture(markup = ""): Promise<UIDraggable> {
  const stage = await fixture<HTMLElement>(`
    <div style="position:relative;width:400px;height:300px;overflow:hidden">
      <ui-draggable style="width:100px;height:80px" ${markup}>
        <button slot="handle" type="button">Move</button>
        <div>Content</div>
      </ui-draggable>
    </div>
  `);
  return stage.querySelector<UIDraggable>("ui-draggable")!;
}

describe("ui-draggable", () => {
  it.each(["cancel", "destroy"] as const)(
    "does not capture or revive a session when a start listener calls %s",
    async (operation) => {
      const element = await draggableFixture('threshold="4"');
      const handle = element.querySelector('[slot="handle"]')!;
      const controller = element.controller!;
      const capture = vi.spyOn(handle, "setPointerCapture").mockImplementation(() => {});
      const move = vi.fn();
      const end = vi.fn();
      element.addEventListener("ui-drag-start", () => controller[operation](), { once: true });
      element.addEventListener("ui-drag-move", move);
      element.addEventListener("ui-drag-end", end);
      const { left, top } = element.getBoundingClientRect();
      try {
        pointer(handle, "pointerdown", left + 5, top + 5);
        pointer(document, "pointermove", left + 25, top + 5);
        pointer(document, "pointermove", left + 45, top + 5);
        pointer(document, "pointerup", left + 45, top + 5);
        await settled(element);
        expect(capture).not.toHaveBeenCalled();
        expect(move).not.toHaveBeenCalled();
        expect(end).not.toHaveBeenCalled();
        expect(controller.dragging).toBe(false);
        expect(element.dragging).toBe(false);
        expect(element.x).toBe(0);
      } finally {
        capture.mockRestore();
      }
    },
  );

  it("preserves ordinary clicks below the authored threshold and starts once after crossing it", async () => {
    const element = await draggableFixture('threshold="8"');
    const handle = element.querySelector('[slot="handle"]')!;
    const { left, top } = element.getBoundingClientRect();
    const start = vi.fn();
    const end = vi.fn();
    const click = vi.fn();
    element.addEventListener("ui-drag-start", start);
    element.addEventListener("ui-drag-end", end);
    handle.addEventListener("click", click);

    pointer(handle, "pointerdown", left + 5, top + 5);
    pointer(document, "pointermove", left + 8, top + 9);
    pointer(document, "pointerup", left + 8, top + 9);
    handle.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await settled(element);
    expect(start).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
    expect(element.x).toBe(0);
    expect(element.dragging).toBe(false);

    pointer(handle, "pointerdown", left + 5, top + 5);
    pointer(document, "pointermove", left + 14, top + 5);
    pointer(document, "pointermove", left + 25, top + 5);
    pointer(document, "pointerup", left + 25, top + 5);
    handle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
    await settled(element);
    expect(start).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
    expect(end.mock.calls[0]![0].detail.cancelled).toBe(false);
    expect(click).toHaveBeenCalledOnce();
    expect(element.x).toBe(20);
  });

  it.each(["escape", "pointercancel", "disabled"])(
    "reports %s cancellation once and ignores later pointer movement",
    async (reason) => {
      const element = await draggableFixture('threshold="4"');
      const handle = element.querySelector('[slot="handle"]')!;
      const { left, top } = element.getBoundingClientRect();
      const end = vi.fn();
      element.addEventListener("ui-drag-end", end);
      pointer(handle, "pointerdown", left + 5, top + 5);
      pointer(document, "pointermove", left + 25, top + 5);
      await settled(element);
      expect(element.dragging).toBe(true);
      if (reason === "escape") {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      } else if (reason === "pointercancel") {
        pointer(document, "pointercancel", left + 25, top + 5);
      } else {
        element.disabled = true;
        await settled(element);
      }
      pointer(document, "pointermove", left + 95, top + 5);
      pointer(document, "pointerup", left + 95, top + 5);
      await settled(element);
      expect(end).toHaveBeenCalledOnce();
      expect(end.mock.calls[0]![0].detail.cancelled).toBe(true);
      expect(element.dragging).toBe(false);
      expect(element.matches(":state(dragging)")).toBe(false);
      expect(element.x).toBe(20);
    },
  );

  it("forwards a changed threshold and treats invalid values as immediate activation", async () => {
    const element = await draggableFixture('threshold="20"');
    const handle = element.querySelector('[slot="handle"]')!;
    const { left, top } = element.getBoundingClientRect();
    const start = vi.fn();
    element.addEventListener("ui-drag-start", start);
    element.threshold = 4;
    await settled(element);
    pointer(handle, "pointerdown", left + 5, top + 5);
    pointer(document, "pointermove", left + 10, top + 5);
    pointer(document, "pointerup", left + 10, top + 5);
    expect(start).toHaveBeenCalledOnce();
    element.threshold = Number.NaN;
    await settled(element);
    pointer(handle, "pointerdown", left + 5, top + 5);
    pointer(document, "pointerup", left + 5, top + 5);
    expect(start).toHaveBeenCalledTimes(2);
  });

  it("registers, projects semantic slots, and exposes a controller", async () => {
    const element = await draggableFixture();
    expect(customElements.get("ui-draggable")).toBe(UIDraggable);
    expect(element.controller).toBeDefined();
    expect(
      inShadow<HTMLSlotElement>(element, 'slot[name="handle"]').assignedElements(),
    ).toHaveLength(1);
    expect(inShadow<HTMLSlotElement>(element, "slot:not([name])").assignedElements()).toHaveLength(
      1,
    );
  });

  it("moves through a dedicated handle, clamps to its parent, and snaps to a grid", async () => {
    const element = await draggableFixture('snap-step="20"');
    const handle = element.querySelector('[slot="handle"]')!;
    const start = element.getBoundingClientRect();
    const onStart = vi.fn();
    const onMoveStart = vi.fn();
    const onMove = vi.fn();
    const onEnd = vi.fn();
    element.addEventListener("ui-drag-start", onStart);
    element.addEventListener("ui-drag-move-start", onMoveStart);
    element.addEventListener("ui-drag-move", onMove);
    element.addEventListener("ui-drag-end", onEnd);

    pointer(handle, "pointerdown", start.left + 10, start.top + 10);
    pointer(handle, "pointermove", start.left + 36, start.top + 53);
    pointer(handle, "pointerup", start.left + 36, start.top + 53);
    await settled(element.parentElement!);

    expect(element.x).toBe(20);
    expect(element.y).toBe(40);
    expect(element.style.getPropertyValue("--ui-drag-x")).toBe("20px");
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onMoveStart).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(element.dragging).toBe(false);
    expect(element.matches(":state(dragging)")).toBe(false);
  });

  it("supports controlled movement and an axis constraint without mutating position", async () => {
    const element = await draggableFixture('controlled axis="x" x="40" y="20"');
    const handle = element.querySelector('[slot="handle"]')!;
    const start = element.getBoundingClientRect();
    const onMove = vi.fn();
    element.addEventListener("ui-drag-move", onMove);

    pointer(handle, "pointerdown", start.left + 5, start.top + 5);
    pointer(handle, "pointermove", start.left + 55, start.top + 75);
    pointer(handle, "pointerup", start.left + 55, start.top + 75);
    await settled(element.parentElement!);

    const detail = onMove.mock.calls.at(-1)?.[0].detail;
    expect(detail.position.x).toBe(90);
    expect(detail.position.y).toBe(20);
    expect(element.x).toBe(40);
    expect(element.y).toBe(20);
  });

  it("allows a consumer to reject a candidate without committing it", async () => {
    const element = await draggableFixture('containment="none"');
    const handle = element.querySelector('[slot="handle"]')!;
    const start = element.getBoundingClientRect();
    element.addEventListener("ui-drag", (event) => event.preventDefault());

    pointer(handle, "pointerdown", start.left + 5, start.top + 5);
    pointer(handle, "pointermove", start.left + 155, start.top + 105);
    pointer(handle, "pointerup", start.left + 155, start.top + 105);
    await settled(element.parentElement!);

    expect(element.x).toBe(0);
    expect(element.y).toBe(0);
    expect(element.style.getPropertyValue("--ui-drag-x")).toBe("0px");
  });

  it("honors cancelable start proposals and cleans up on disconnect", async () => {
    const element = await draggableFixture();
    const handle = element.querySelector('[slot="handle"]')!;
    const start = element.getBoundingClientRect();
    element.addEventListener("ui-drag-start", (event) => event.preventDefault(), { once: true });

    pointer(handle, "pointerdown", start.left + 5, start.top + 5);
    await Promise.resolve();
    expect(element.dragging).toBe(false);
    expect(element.controller?.dragging).toBe(false);

    element.remove();
    expect(element.controller).toBeUndefined();
  });
});
