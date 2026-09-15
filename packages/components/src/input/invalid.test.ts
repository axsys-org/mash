import { describe, expect, it } from "vitest";
import { fixture, settled } from "../test-support/fixture.js";
import { UIInput } from "./input.js";
import { UIField } from "../field/field.js";
import "./register.js";
import "../field/register.js";

describe("ui-input: authored invalid state", () => {
  it("forwards semantic errors to the native input without changing form validity or value", async () => {
    const form = await fixture<HTMLFormElement>(
      `<form><ui-input name="path" label="Path" value="/app"></ui-input></form>`,
    );
    const input = form.querySelector<UIInput>("ui-input")!;
    expect(input.invalid).toBe(false);
    const control = input.control!;
    input.focus();
    control.setSelectionRange(1, 3);
    input.invalid = true;
    await settled(form);
    expect(input.hasAttribute("invalid")).toBe(true);
    expect(input.matches(":state(invalid)")).toBe(true);
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(form.checkValidity()).toBe(true);
    expect(new FormData(form).get("path")).toBe("/app");
    expect(input.control).toBe(control);
    expect(input.shadowRoot!.activeElement).toBe(control);
    expect([control.selectionStart, control.selectionEnd]).toEqual([1, 3]);
    input.invalid = false;
    await settled(form);
    expect(input.matches(":state(invalid)")).toBe(false);
    expect(control.hasAttribute("aria-invalid")).toBe(false);
  });

  it("composes authored, field and native invalidity without clearing another owner's state", async () => {
    const field = await fixture<UIField>(
      `<ui-field invalid required description="Canonical address required"><ui-input slot="control" label="Path"></ui-input></ui-field>`,
    );
    const input = field.querySelector<UIInput>("ui-input")!;
    input.invalid = true;
    await settled(field);
    input.invalid = false;
    await settled(field);
    expect(input.control!.getAttribute("aria-invalid")).toBe("true");
    field.invalid = false;
    await settled(field);
    expect(input.control!.getAttribute("aria-invalid")).toBe("true");
    expect(input.matches(":invalid")).toBe(true);
    input.value = "/app";
    await settled(field);
    expect(input.control!.hasAttribute("aria-invalid")).toBe(false);
    expect(input.matches(":state(invalid)")).toBe(false);
    expect(input.control!.getAttribute("aria-description")).toContain("Canonical address required");
  });

  it("suspends invalid semantics while disabled by property or fieldset and restores the authored state", async () => {
    const form = await fixture<HTMLFormElement>(
      `<form><fieldset><ui-input name="path" label="Path" invalid value="/app"></ui-input></fieldset></form>`,
    );
    const fieldset = form.querySelector("fieldset")!;
    const input = form.querySelector<UIInput>("ui-input")!;
    for (const target of [input, fieldset]) {
      target.disabled = true;
      await settled(form);
      expect(input.invalid).toBe(true);
      expect(input.matches(":state(invalid)")).toBe(false);
      expect(input.control!.hasAttribute("aria-invalid")).toBe(false);
      expect(form.checkValidity()).toBe(true);
      target.disabled = false;
      await settled(form);
      expect(input.control!.getAttribute("aria-invalid")).toBe("true");
      expect(input.matches(":state(invalid)")).toBe(true);
    }
  });
});
