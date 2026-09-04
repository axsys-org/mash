import { describe, expect, it, vi } from "vitest";

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

  it("preserves the authored reset value instead of reflecting live edits", async () => {
    const form = await fixture<HTMLFormElement>(
      `<form><ui-textarea name="notes" value="Initial"></ui-textarea></form>`,
    );
    const textarea = form.querySelector<UITextarea>("ui-textarea")!;
    const control = inShadow<HTMLTextAreaElement>(textarea, "[part='control']");

    control.value = "Edited\nnotes";
    control.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(form.parentElement!);

    expect(textarea.value).toBe("Edited\nnotes");
    expect(textarea.getAttribute("value")).toBe("Initial");

    form.reset();
    await settled(form.parentElement!);
    expect(textarea.value).toBe("Initial");
    expect(control.value).toBe("Initial");
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

  it("forwards focus and selection through the host", async () => {
    const textarea = await fixture<UITextarea>(`<ui-textarea value="Review note"></ui-textarea>`);
    const control = inShadow<HTMLTextAreaElement>(textarea, "[part='control']");
    const focusChange = vi.fn();

    textarea.addEventListener("ui-textarea-focus-change", focusChange);

    textarea.focus();
    await settled(textarea.parentElement!);
    expect(textarea.shadowRoot?.activeElement).toBe(control);
    expect(textarea.matches(":state(focused)")).toBe(true);
    expect(focusChange.mock.calls.at(-1)?.[0].detail).toEqual({ focused: true });

    textarea.setSelectionRange(0, 6);
    expect(control.selectionStart).toBe(0);
    expect(control.selectionEnd).toBe(6);

    textarea.blur();
    await settled(textarea.parentElement!);
    expect(textarea.matches(":state(focused)")).toBe(false);
    expect(focusChange.mock.calls.at(-1)?.[0].detail).toEqual({ focused: false });
  });
});
