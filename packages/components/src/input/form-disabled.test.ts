import { describe, expect, it, vi } from "vitest";

import { fixture, settled } from "../test-support/fixture.js";
import type { UIInput } from "./input.js";
import type { UITextarea } from "../textarea/textarea.js";
import "./register.js";
import "../textarea/register.js";

for (const tag of ["ui-input", "ui-textarea"]) {
  describe(`${tag} inherited form disabled state`, () => {
    it("disables native editing immediately and restores current form data without changing authored state", async () => {
      const form = await fixture<HTMLFormElement>(
        `<form><fieldset><${tag} name="draft" value="Saved draft" required></${tag}></fieldset></form>`,
      );
      const fieldset = form.querySelector("fieldset")!;
      const input = form.querySelector<UIInput | UITextarea>(tag)!;
      const control = input.control!;
      input.focus();
      expect(input.shadowRoot!.activeElement).toBe(control);

      fieldset.disabled = true;
      expect(control.disabled).toBe(true);
      input.focus();
      expect(input.shadowRoot!.activeElement).not.toBe(control);
      await settled(form);
      expect(input.disabled).toBe(false);
      expect(input.hasAttribute("disabled")).toBe(false);
      expect(input.matches(":state(disabled)")).toBe(true);
      expect(input.matches(":state(focused)")).toBe(false);
      expect(new FormData(form).has("draft")).toBe(false);

      input.value = "Updated while unavailable";
      await settled(form);
      expect(control.value).toBe("Updated while unavailable");
      expect(new FormData(form).has("draft")).toBe(false);
      fieldset.disabled = false;
      await settled(form);
      expect(control.disabled).toBe(false);
      expect(input.matches(":state(disabled)")).toBe(false);
      expect(new FormData(form).get("draft")).toBe("Updated while unavailable");
    });

    it("suspends invalid state and restores required validation when the fieldset reopens", async () => {
      const form = await fixture<HTMLFormElement>(
        `<form><fieldset><${tag} name="draft" required></${tag}></fieldset></form>`,
      );
      const fieldset = form.querySelector("fieldset")!;
      const input = form.querySelector<UIInput | UITextarea>(tag)!;
      expect(form.checkValidity()).toBe(false);
      expect(input.matches(":state(invalid)")).toBe(true);
      input._setFieldContext({ description: "A draft is required", invalid: true });
      fieldset.disabled = true;
      await settled(form);
      expect(form.checkValidity()).toBe(true);
      expect(input.control!.willValidate).toBe(false);
      expect(input.matches(":state(invalid)")).toBe(false);
      expect(input.control!.hasAttribute("aria-invalid")).toBe(false);
      fieldset.disabled = false;
      await settled(form);
      expect(form.checkValidity()).toBe(false);
      expect(input.matches(":state(invalid)")).toBe(true);
      expect(input.control!.getAttribute("aria-invalid")).toBe("true");
    });

    it("keeps authored disabled independent through fieldset and property changes", async () => {
      const form = await fixture<HTMLFormElement>(
        `<form><fieldset disabled><${tag} name="draft" value="Draft" disabled></${tag}></fieldset></form>`,
      );
      const fieldset = form.querySelector("fieldset")!;
      const input = form.querySelector<UIInput | UITextarea>(tag)!;
      fieldset.disabled = false;
      await settled(form);
      expect(input.disabled).toBe(true);
      expect(input.control!.disabled).toBe(true);
      expect(new FormData(form).has("draft")).toBe(false);
      fieldset.disabled = true;
      input.disabled = false;
      await settled(form);
      expect(input.hasAttribute("disabled")).toBe(false);
      expect(input.control!.disabled).toBe(true);
      fieldset.disabled = false;
      await settled(form);
      expect(input.control!.disabled).toBe(false);
      expect(new FormData(form).get("draft")).toBe("Draft");

      fieldset.disabled = true;
      input.disabled = true;
      await settled(form);
      fieldset.disabled = false;
      await settled(form);
      expect(input.control!.disabled).toBe(true);
      input.disabled = false;
      await settled(form);
      expect(input.control!.disabled).toBe(false);
      expect(input.matches(":state(disabled)")).toBe(false);
      expect(new FormData(form).get("draft")).toBe("Draft");
    });

    it("honors the first legend exemption and reevaluates when controls move", async () => {
      const form = await fixture<HTMLFormElement>(
        `<form><fieldset disabled><legend><${tag} id="legend-field" name="legend" value="Allowed"></${tag}></legend><${tag} id="body-field" name="body" value="Body"></${tag}></fieldset></form>`,
      );
      const fieldset = form.querySelector("fieldset")!;
      const legend = form.querySelector<UIInput | UITextarea>("#legend-field")!;
      const body = form.querySelector<UIInput | UITextarea>("#body-field")!;
      expect(legend.control!.disabled).toBe(false);
      expect(body.control!.disabled).toBe(true);
      expect([...new FormData(form)]).toEqual([["legend", "Allowed"]]);
      form.append(body);
      fieldset.append(legend);
      await settled(form);
      expect(body.control!.disabled).toBe(false);
      expect(legend.control!.disabled).toBe(true);
      expect([...new FormData(form)]).toEqual([["body", "Body"]]);
    });
  });
}

it("does not publish Enter or clear a fieldset-disabled input on Escape", async () => {
  const fieldset = await fixture<HTMLFieldSetElement>(
    `<fieldset disabled><ui-input value="Draft" clean-on-escape></ui-input></fieldset>`,
  );
  const input = fieldset.querySelector<UIInput>("ui-input")!;
  const enter = vi.fn();
  input.addEventListener("ui-input-enter", enter);
  input.control!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  input.control!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await settled(fieldset);
  expect(enter).not.toHaveBeenCalled();
  expect(input.value).toBe("Draft");
});
