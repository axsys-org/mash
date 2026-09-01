import { describe, expect, it, vi } from "vitest";

import { fixture, settled } from "../test-support/fixture.js";
import type { MashCommandDetail } from "../gesture/gesture.js";
import { UIGestureBinding } from "./gesture-binding.js";
import "./register.js";

function press(target: HTMLElement): void {
  target.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      isPrimary: true,
      pointerId: 2,
      pointerType: "mouse",
    }),
  );
  target.dispatchEvent(
    new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      isPrimary: true,
      pointerId: 2,
      pointerType: "mouse",
    }),
  );
}

describe("ui-gesture-binding", () => {
  it("binds a declarative gesture to an explicit target without adding layout", async () => {
    const composition = await fixture<HTMLElement>(`
      <section>
        <button id="gesture-target" type="button">Inspect</button>
        <ui-gesture-binding for="gesture-target" gesture="press" command="workspace.inspect"></ui-gesture-binding>
      </section>
    `);
    const target = composition.querySelector<HTMLElement>("#gesture-target")!;
    const binding = composition.querySelector<UIGestureBinding>("ui-gesture-binding")!;
    const listener = vi.fn();
    target.addEventListener("mash-command", listener);

    press(target);

    expect(binding.boundTarget).toBe(target);
    expect(getComputedStyle(binding).display).toBe("none");
    expect((listener.mock.calls[0]![0] as CustomEvent<MashCommandDetail>).detail).toMatchObject({
      command: "workspace.inspect",
      gesture: "press",
      phase: "ended",
    });
  });

  it("shares one target controller across bindings and updates keyboard metadata", async () => {
    const composition = await fixture<HTMLElement>(`
      <section>
        <button id="shortcut-target" type="button">Search</button>
        <ui-gesture-binding for="shortcut-target" gesture="press" command="workspace.search"></ui-gesture-binding>
        <ui-gesture-binding for="shortcut-target" gesture="key" shortcut="Control+K" command="workspace.search"></ui-gesture-binding>
      </section>
    `);
    const target = composition.querySelector<HTMLElement>("#shortcut-target")!;
    const keyBinding = composition.querySelectorAll<UIGestureBinding>("ui-gesture-binding")[1]!;

    expect(target.getAttribute("aria-keyshortcuts")).toBe("Control+K");
    keyBinding.disabled = true;
    await settled(composition);
    expect(target.hasAttribute("aria-keyshortcuts")).toBe(false);
    keyBinding.remove();
    await settled(composition);
  });
});
