import { userEvent } from "vitest/browser";
import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UICheckbox } from "./checkbox.js";
import "./register.js";

const control = (checkbox: Element) => inShadow<HTMLInputElement>(checkbox, "input");

describe("ui-checkbox", () => {
  it("registers an unstyled native checkbox contract", async () => {
    expect(customElements.get("ui-checkbox")).toBe(UICheckbox);

    const checkbox = await fixture<UICheckbox>(`<ui-checkbox>Release notes</ui-checkbox>`);
    expect(control(checkbox).type).toBe("checkbox");
    expect(checkbox.checked).toBe(false);
    expect(
      [...checkbox.shadowRoot!.querySelectorAll("[part]")].map((part) => part.getAttribute("part")),
    ).toEqual(expect.arrayContaining(["root", "control", "indicator", "label"]));
  });

  it("exposes and restores a portable indeterminate state", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form><ui-checkbox name="selection" indeterminate>Partially selected</ui-checkbox></form>
    `);
    const checkbox = form.querySelector<UICheckbox>("ui-checkbox")!;
    const details: Array<{ checked: boolean; indeterminate: boolean }> = [];
    checkbox.addEventListener("ui-checkbox-change", (event) => {
      details.push((event as CustomEvent<{ checked: boolean; indeterminate: boolean }>).detail);
    });

    expect(control(checkbox).indeterminate).toBe(true);
    expect(checkbox.matches(":state(indeterminate)")).toBe(true);

    control(checkbox).click();
    await settled(form);
    expect(details).toEqual([{ checked: true, indeterminate: false }]);
    expect(checkbox.indeterminate).toBe(false);

    form.reset();
    await settled(form);
    expect(checkbox.indeterminate).toBe(true);
    expect(checkbox.checked).toBe(false);
  });

  it("reflects checked state and emits a portable change event", async () => {
    const checkbox = await fixture<UICheckbox>(`<ui-checkbox>Release notes</ui-checkbox>`);
    const changes: boolean[] = [];
    checkbox.addEventListener("ui-checkbox-change", (event) => {
      changes.push((event as CustomEvent<{ checked: boolean }>).detail.checked);
    });

    control(checkbox).click();
    await settled(checkbox.parentElement!);

    expect(checkbox.checked).toBe(true);
    expect(checkbox.hasAttribute("checked")).toBe(true);
    expect(checkbox.matches(":state(checked)")).toBe(true);
    expect(changes).toEqual([true]);
  });

  it("uses native keyboard and form semantics through the shadow boundary", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form><ui-checkbox name="updates" value="yes">Release notes</ui-checkbox></form>
    `);
    const checkbox = form.querySelector<UICheckbox>("ui-checkbox")!;

    checkbox.focus();
    await userEvent.keyboard(" ");
    await settled(form);

    expect(checkbox.checked).toBe(true);
    expect(new FormData(form).get("updates")).toBe("yes");

    form.reset();
    await settled(form);
    expect(checkbox.checked).toBe(false);
  });

  it("enforces required selection without leaking form policy into callers", async () => {
    const checkbox = await fixture<UICheckbox>(`<ui-checkbox required>Agree</ui-checkbox>`);
    expect(checkbox.matches(":invalid")).toBe(true);

    checkbox.checked = true;
    await settled(checkbox.parentElement!);
    expect(checkbox.matches(":valid")).toBe(true);
  });
});
