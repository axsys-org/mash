import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIDraggable } from "./draggable.js";
import "./register.js";

function pointer(
  target: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
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
