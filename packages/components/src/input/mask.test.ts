import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { fixture, settled } from "../test-support/fixture.js";
import type { UIInput } from "./input.js";
import { formatInputMask, parseInputMask } from "./mask.js";
import "./register.js";

describe("masked text entry", () => {
  it("keeps raw data separate from punctuation through middle edits, deletion and form reset", async () => {
    const form = await fixture<HTMLFormElement>(
      '<form><ui-input name="phone" mask="(###) ###-####" value="4155550123" label="Phone"></ui-input></form>',
    );
    const input = form.querySelector<UIInput>("ui-input")!;
    const control = input.control!;
    expect(control.value).toBe("(415) 555-0123");
    expect(new FormData(form).get("phone")).toBe("4155550123");
    control.focus();
    control.setSelectionRange(6, 6);
    await userEvent.keyboard("{Backspace}");
    expect(input.value).toBe("415550123");
    expect(control.selectionStart).toBe(3);
    control.setSelectionRange(1, 4);
    await userEvent.keyboard("212");
    expect(input.value.startsWith("212")).toBe(true);
    expect(new FormData(form).get("phone")).toBe(input.value);
    form.reset();
    await settled(form);
    expect(control.value).toBe("(415) 555-0123");
    expect(input.value).toBe("4155550123");
  });

  it("normalizes pasted display text without moving the caret to the end and defers composition", async () => {
    const input = await fixture<UIInput>(
      '<ui-input mask="AAA-####" label="Reference" clean-on-escape></ui-input>',
    );
    const control = input.control!;
    control.value = "ABC-12x34";
    control.setSelectionRange(6, 6);
    control.dispatchEvent(
      new InputEvent("input", { bubbles: true, composed: true, inputType: "insertFromPaste" }),
    );
    expect(input.value).toBe("ABC1234");
    expect(control.value).toBe("ABC-1234");
    expect(control.selectionStart).toBe(6);
    control.dispatchEvent(new CompositionEvent("compositionstart"));
    control.value = "ABC-9";
    control.dispatchEvent(
      new InputEvent("input", { isComposing: true, bubbles: true, composed: true }),
    );
    expect(input.value).toBe("ABC1234");
    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", isComposing: true, bubbles: true }),
    );
    expect(control.value).toBe("ABC-9");
    control.dispatchEvent(new CompositionEvent("compositionend"));
    expect(input.value).toBe("ABC9");
    input.value = "XYZ9876";
    await input.updateComplete;
    expect(control.value).toBe("XYZ-9876");
  });

  it("round-trips escaped literals and fixed numeric prefixes without consuming raw characters", () => {
    const formatted = formatInputMask("123456", "+1 ###-###");
    expect(formatted.displayValue).toBe("+1 123-456");
    expect(parseInputMask(formatted.displayValue, "+1 ###-###").value).toBe("123456");
    expect(formatInputMask("ABC12", "\\AAA-##").displayValue).toBe("AAB-12");
  });
});
