import { describe, expect, it, vi } from "vitest";
import { fixture, settled } from "../test-support/fixture.js";
import type { UIRadioGroup } from "../radio-group/radio-group.js";
import type { UIRadio } from "../radio/radio.js";
import type { UIToggleGroup } from "../toggle-group/toggle-group.js";
import type { UIToggle } from "../toggle/toggle.js";
import "../radio/register.js";
import "../radio-group/register.js";
import "../checkbox/register.js";
import "../checkbox-group/register.js";
import "../toggle/register.js";
import "../toggle-group/register.js";

describe("group selection and disabled ownership", () => {
  it("blocks native radio activation and form participation while the group is disabled", async () => {
    const form = await fixture<HTMLFormElement>(
      '<form><ui-radio-group name="choice" value="a" disabled><ui-radio value="a">A</ui-radio><ui-radio value="b">B</ui-radio></ui-radio-group></form>',
    );
    const group = form.querySelector<UIRadioGroup>("ui-radio-group")!;
    const change = vi.fn();
    group.addEventListener("ui-radio-group-change", change);
    const a = group.querySelector<UIRadio>('[value="a"]')!,
      b = group.querySelector<UIRadio>('[value="b"]')!;
    const input = b.shadowRoot!.querySelector<HTMLInputElement>("input")!;
    expect(input.disabled).toBe(true);
    input.click();
    await settled(form);
    expect(group.value).toBe("a");
    expect(a.checked).toBe(true);
    expect(b.checked).toBe(false);
    expect(change).not.toHaveBeenCalled();
    expect(new FormData(form).getAll("choice")).toEqual([]);
    expect(b.matches(":state(disabled)")).toBe(true);
    group.disabled = false;
    await settled(form);
    input.click();
    await settled(form);
    expect(group.value).toBe("b");
    expect(new FormData(form).getAll("choice")).toEqual(["b"]);
    expect(change).toHaveBeenCalledTimes(1);
  });
  it("clears the single toggle value when its selected option is toggled off", async () => {
    const group = await fixture<UIToggleGroup>(
      '<ui-toggle-group mode="single" value="a"><ui-toggle value="a">A</ui-toggle><ui-toggle value="b">B</ui-toggle></ui-toggle-group>',
    );
    const change = vi.fn();
    group.addEventListener("ui-toggle-group-change", change);
    group
      .querySelector<UIToggle>('[value="a"]')!
      .shadowRoot!.querySelector<HTMLButtonElement>("button")!
      .click();
    await settled(group);
    expect(group.value).toBe("");
    expect(change.mock.calls[0]![0].detail.values).toEqual([]);
    expect(group.querySelectorAll("ui-toggle[pressed]")).toHaveLength(0);
    group
      .querySelector<UIToggle>('[value="b"]')!
      .shadowRoot!.querySelector<HTMLButtonElement>("button")!
      .click();
    await settled(group);
    expect(group.value).toBe("b");
    expect(change.mock.calls[1]![0].detail.values).toEqual(["b"]);
  });
  it.each(["radio", "checkbox", "toggle"])(
    "preserves authored and dynamically changed %s disabled state across group policy changes",
    async (kind) => {
      const root = await fixture<HTMLElement>(
        `<div><ui-${kind}-group disabled><ui-${kind} value="a">A</ui-${kind}><ui-${kind} value="b" disabled>B</ui-${kind}></ui-${kind}-group><div id="outside"></div></div>`,
      );
      const group = root.querySelector<HTMLElement & { disabled: boolean }>(`ui-${kind}-group`)!;
      const [a, b] = [...group.children] as Array<HTMLElement & { disabled: boolean }>;
      const native = (item: HTMLElement) =>
        item.shadowRoot!.querySelector<HTMLInputElement | HTMLButtonElement>("input,button")!;
      expect(a!.disabled).toBe(false);
      expect(b!.disabled).toBe(true);
      expect(native(a!).disabled).toBe(true);
      expect(native(b!).disabled).toBe(true);
      a!.disabled = true;
      b!.disabled = false;
      await settled(root);
      group.disabled = false;
      await settled(root);
      expect(native(a!).disabled).toBe(true);
      expect(native(b!).disabled).toBe(false);
      expect(a!.disabled).toBe(true);
      expect(b!.disabled).toBe(false);
      group.disabled = true;
      await settled(root);
      root.querySelector("#outside")!.append(b!);
      await settled(root);
      expect(native(b!).disabled).toBe(false);
      expect(b!.matches(":state(disabled)")).toBe(false);
    },
  );
  it("does not forward a nested group's change as an outer group selection", async () => {
    const root = await fixture<HTMLElement>(
      '<ui-checkbox-group id="outer"><ui-checkbox value="outer">Outer</ui-checkbox><ui-checkbox-group id="inner"><ui-checkbox value="inner">Inner</ui-checkbox></ui-checkbox-group></ui-checkbox-group>',
    );
    const outer = vi.fn();
    root.addEventListener("ui-checkbox-group-change", (event) => {
      if (event.target === root) outer(event);
    });
    root
      .querySelector("#inner ui-checkbox")!
      .shadowRoot!.querySelector<HTMLInputElement>("input")!
      .click();
    await settled(root);
    expect(outer).not.toHaveBeenCalled();
  });
});

it("restores native radio group value and checked child to the initial choice", async () => {
  const form = await fixture<HTMLFormElement>(
    '<form><ui-radio-group name="choice" value="b"><ui-radio value="a">A</ui-radio><ui-radio value="b">B</ui-radio></ui-radio-group></form>',
  );
  const group = form.querySelector<UIRadioGroup>("ui-radio-group")!;
  const [a, b] = [...group.querySelectorAll<UIRadio>("ui-radio")];
  a!.shadowRoot!.querySelector<HTMLInputElement>("input")!.click();
  await settled(form);
  expect(group.value).toBe("a");
  form.reset();
  await settled(form);
  expect(group.value).toBe("b");
  expect(a!.checked).toBe(false);
  expect(b!.checked).toBe(true);
  expect(new FormData(form).getAll("choice")).toEqual(["b"]);
  a!.shadowRoot!.querySelector<HTMLInputElement>("input")!.click();
  await settled(form);
  form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
  form.reset();
  await settled(form);
  expect(group.value).toBe("a");
  expect(a!.checked).toBe(true);
});
