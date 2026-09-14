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
    expect(inShadow(toggle, '[part="track"]')).toBeInstanceOf(HTMLElement);
    expect(inShadow(toggle, '[part="thumb"]')).toBeInstanceOf(HTMLElement);
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

  it("exposes size aliases and label placement", async () => {
    const toggle = await fixture<UISwitch>(
      `<ui-switch size="small" label-side="left">Notifications</ui-switch>`,
    );

    expect(toggle.size).toBe("small");
    expect(toggle.labelSide).toBe("left");

    toggle.size = "medium";
    toggle.labelSide = "right";
    await settled(toggle.parentElement!);

    expect(toggle.getAttribute("size")).toBe("medium");
    expect(toggle.getAttribute("label-side")).toBe("right");
  });
  it("uses attribute labels, synchronizes form data before change and respects fieldsets", async () => {
    const form = await fixture<HTMLFormElement>(
      '<form><fieldset><ui-switch name="alerts" label="Notifications"></ui-switch></fieldset></form>',
    );
    const toggle = form.querySelector<UISwitch>("ui-switch")!;
    const input = inShadow<HTMLInputElement>(toggle, "input");
    expect(inShadow(toggle, '[part="label"]').hidden).toBe(false);
    expect(inShadow(toggle, '[part="label"]').textContent).toContain("Notifications");
    const values: FormDataEntryValue[] = [];
    toggle.addEventListener("ui-switch-change", () =>
      values.push(new FormData(form).get("alerts")!),
    );
    input.click();
    expect(values).toEqual(["on"]);
    form.querySelector("fieldset")!.disabled = true;
    await settled(form);
    expect(input.disabled).toBe(true);
    expect(new FormData(form).has("alerts")).toBe(false);
    form.querySelector("fieldset")!.disabled = false;
    await settled(form);
    expect(new FormData(form).get("alerts")).toBe("on");
    form.reset();
    await settled(form);
    expect(toggle.checked).toBe(false);
  });
});
