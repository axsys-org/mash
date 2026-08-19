import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UISwitch } from "./switch.js";
import "./register.js";

describe("ui-switch", () => {
  it("uses a native checkbox with switch semantics", async () => {
    expect(customElements.get("ui-switch")).toBe(UISwitch);

    const toggle = await fixture<UISwitch>(`<ui-switch checked>Notifications</ui-switch>`);
    const control = inShadow<HTMLInputElement>(toggle, "input");

    expect(control.getAttribute("role")).toBe("switch");
    expect(control.checked).toBe(true);
    expect(toggle.matches(":state(checked)")).toBe(true);
  });

  it("reflects changes and honours disabled state", async () => {
    const toggle = await fixture<UISwitch>(`<ui-switch>Notifications</ui-switch>`);
    const changes: boolean[] = [];
    toggle.addEventListener("ui-switch-change", (event) => {
      changes.push((event as CustomEvent<{ checked: boolean }>).detail.checked);
    });

    const control = inShadow<HTMLInputElement>(toggle, "input");
    control.click();
    await settled(toggle.parentElement!);
    expect(changes).toEqual([true]);

    toggle.disabled = true;
    await settled(toggle.parentElement!);
    expect(control.disabled).toBe(true);
    expect(toggle.matches(":state(disabled)")).toBe(true);
  });
});
