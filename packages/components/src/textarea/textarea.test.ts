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
});
