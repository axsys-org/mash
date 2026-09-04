import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UITextarea } from "./textarea.js";
import "./register.js";

describe("ui-textarea", () => {
  it("owns native multi-line editing and form state", async () => {
    const form = await fixture<HTMLFormElement>(
      `<form><ui-textarea name="notes" value="Initial" required></ui-textarea></form>`,
    );
    const textarea = form.querySelector<UITextarea>("ui-textarea")!;
    const control = inShadow<HTMLTextAreaElement>(textarea, "[part='control']");

    expect(control.value).toBe("Initial");
    control.value = "Updated\nnotes";
    control.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    await settled(form);

    expect(textarea.value).toBe("Updated\nnotes");
    expect(new FormData(form).get("notes")).toBe("Updated\nnotes");
    expect(textarea.matches(":state(required)")).toBe(true);
  });

  it("is structurally unstyled without a catalogue recipe", async () => {
    const textarea = await fixture<UITextarea>(`<ui-textarea></ui-textarea>`);
    expect(UITextarea.styles.cssText).not.toContain("padding");
    expect(UITextarea.styles.cssText).not.toContain("border:");
    expect(inShadow(textarea, "textarea")).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("forwards native multiline sizing and length constraints", async () => {
    const textarea = await fixture<UITextarea>(
      `<ui-textarea rows="5" minlength="8" maxlength="160"></ui-textarea>`,
    );
    const control = inShadow<HTMLTextAreaElement>(textarea, "[part='control']");

    expect(control.rows).toBe(5);
    expect(control.minLength).toBe(8);
    expect(control.maxLength).toBe(160);

    textarea.rows = 0;
    await settled(textarea.parentElement!);

    expect(control.rows).toBe(2);
  });

  it("reflects native validity into the invalid state", async () => {
    const textarea = await fixture<UITextarea>(`<ui-textarea required></ui-textarea>`);
    const control = inShadow<HTMLTextAreaElement>(textarea, "[part='control']");

    expect(textarea.matches(":state(invalid)")).toBe(true);

    control.value = "Reviewed";
    control.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(textarea.parentElement!);

    expect(textarea.matches(":state(invalid)")).toBe(false);
  });
});
