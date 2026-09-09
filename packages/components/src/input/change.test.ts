import { describe, expect, it, vi } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIInput } from "./input.js";
import "./register.js";

describe("input committed value", () => {
  it("publishes one host change with the current value and allows controlled correction", async () => {
    const form = await fixture<HTMLFormElement>(
      `<form><ui-input name="color" label="Hex color" value="#112233"></ui-input></form>`,
    );
    const input = form.querySelector<UIInput>("ui-input")!;
    const control = inShadow<HTMLInputElement>(input, "input");
    const committed = vi.fn((event: Event) => {
      expect(event.target).toBe(input);
      expect(event.composed).toBe(true);
      expect(input.value).toBe("invalid");
      input.value = "#112233";
    });
    form.addEventListener("change", committed);
    control.value = "invalid";
    control.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    await settled(form);
    control.dispatchEvent(new Event("change", { bubbles: true }));
    await settled(form);
    expect(committed).toHaveBeenCalledOnce();
    expect(control.value).toBe("#112233");
    expect(new FormData(form).get("color")).toBe("#112233");
  });
});
