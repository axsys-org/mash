import { userEvent } from "vitest/browser";
import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIToggle } from "./toggle.js";
import "./register.js";

describe("ui-toggle", () => {
  it("registers a behaviour-only native button", async () => {
    expect(customElements.get("ui-toggle")).toBe(UIToggle);

    const toggle = await fixture<UIToggle>(`<ui-toggle>Bold</ui-toggle>`);
    expect(inShadow<HTMLButtonElement>(toggle, "button").localName).toBe("button");
    expect(toggle.pressed).toBe(false);
  });

  it("reflects pressed state and emits its portable contract", async () => {
    const toggle = await fixture<UIToggle>(`<ui-toggle>Bold</ui-toggle>`);
    const changes: boolean[] = [];
    toggle.addEventListener("ui-toggle-change", (event) => {
      changes.push((event as CustomEvent<{ pressed: boolean }>).detail.pressed);
    });

    inShadow<HTMLButtonElement>(toggle, "button").click();
    await settled(toggle.parentElement!);

    expect(toggle.pressed).toBe(true);
    expect(toggle.getAttribute("pressed")).toBe("");
    expect(toggle.matches(":state(pressed)")).toBe(true);
    expect(changes).toEqual([true]);
  });

  it("retains native keyboard activation and disabled behaviour", async () => {
    const toggle = await fixture<UIToggle>(`<ui-toggle>Bold</ui-toggle>`);
    toggle.focus();
    await userEvent.keyboard(" ");
    expect(toggle.pressed).toBe(true);

    toggle.disabled = true;
    await settled(toggle.parentElement!);
    inShadow<HTMLButtonElement>(toggle, "button").click();
    expect(toggle.pressed).toBe(true);
  });
});
