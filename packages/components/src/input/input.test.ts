import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { UIInput } from "./input.js";
import "./register.js";

describe("ui-input", () => {
  it("registers and delegates text-entry semantics to a native input", async () => {
    expect(customElements.get("ui-input")).toBe(UIInput);

    const input = await fixture<UIInput>(
      `<ui-input placeholder="Search" label="Search"></ui-input>`,
    );
    const control = inShadow<HTMLInputElement>(input, '[part="control"]');

    expect(input).toBeInstanceOf(UIInput);
    expect(input.type).toBe("text");
    expect(input.size).toBe("medium");
    expect(control.localName).toBe("input");
    expect(control.placeholder).toBe("Search");
    expect(control.getAttribute("aria-label")).toBe("Search");
  });

  it("reflects configuration and keeps its value synchronized with native input", async () => {
    const input = await fixture<UIInput>(`<ui-input></ui-input>`);
    const control = inShadow<HTMLInputElement>(input, '[part="control"]');

    input.type = "search";
    input.size = "large";
    input.disabled = true;
    await settled(input.parentElement!);

    expect(input.getAttribute("type")).toBe("search");
    expect(input.getAttribute("size")).toBe("large");
    expect(control.disabled).toBe(true);

    input.disabled = false;
    control.value = "Mash";
    control.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(input.parentElement!);

    expect(input.value).toBe("Mash");
  });

  it("keeps the native control as its only visual anatomy", async () => {
    const input = await fixture<UIInput>(`<ui-input></ui-input>`);
    const parts = [...shadow(input).querySelectorAll("[part]")].map((node) =>
      node.getAttribute("part"),
    );

    expect(parts).toEqual(["control"]);
  });

  it("preserves the authored reset value instead of reflecting live edits", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form><ui-input name="project" value="Initial"></ui-input></form>
    `);
    const input = form.querySelector<UIInput>("ui-input")!;
    const control = inShadow<HTMLInputElement>(input, '[part="control"]');

    control.value = "Edited";
    control.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(form.parentElement!);

    expect(input.value).toBe("Edited");
    expect(input.getAttribute("value")).toBe("Initial");

    form.reset();
    await settled(form.parentElement!);
    expect(input.value).toBe("Initial");
    expect(control.value).toBe("Initial");
  });

  it("mirrors native required validity into form participation", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form><ui-input name="project" required></ui-input></form>
    `);
    const input = form.querySelector<UIInput>("ui-input")!;
    const control = inShadow<HTMLInputElement>(input, '[part="control"]');

    expect(form.checkValidity()).toBe(false);

    control.value = "Mash";
    control.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(form.parentElement!);

    expect(form.checkValidity()).toBe(true);
  });

  it("forwards native text constraints and clears editable text on Escape when requested", async () => {
    const input = await fixture<UIInput>(`
      <ui-input
        value="MASH01"
        autocomplete="off"
        inputmode="text"
        pattern="[A-Z]{4}[0-9]{2}"
        minlength="6"
        maxlength="10"
        clean-on-escape
      ></ui-input>
    `);
    const control = inShadow<HTMLInputElement>(input, '[part="control"]');
    let inputEvents = 0;
    input.addEventListener("input", () => inputEvents++);

    expect(control.autocomplete).toBe("off");
    expect(control.inputMode).toBe("text");
    expect(control.pattern).toBe("[A-Z]{4}[0-9]{2}");
    expect(control.minLength).toBe(6);
    expect(control.maxLength).toBe(10);

    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
    );
    await settled(input.parentElement!);

    expect(input.value).toBe("");
    expect(inputEvents).toBe(1);
  });

  it("forwards focus, selection, Enter, and native invalid state through the host", async () => {
    const input = await fixture<UIInput>(`
      <ui-input value="MASH01" pattern="[A-Z]{4}[0-9]{2}"></ui-input>
    `);
    const control = inShadow<HTMLInputElement>(input, '[part="control"]');
    const enter = vi.fn();
    const focusChange = vi.fn();

    input.addEventListener("ui-input-enter", enter);
    input.addEventListener("ui-input-focus-change", focusChange);

    input.focus();
    await settled(input.parentElement!);
    expect(input.shadowRoot?.activeElement).toBe(control);
    expect(input.matches(":state(focused)")).toBe(true);
    expect(focusChange.mock.calls.at(-1)?.[0].detail).toEqual({ focused: true });

    input.setSelectionRange(0, 4);
    expect(control.selectionStart).toBe(0);
    expect(control.selectionEnd).toBe(4);

    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true }),
    );
    expect(enter.mock.calls.at(-1)?.[0].detail).toEqual({
      value: "MASH01",
      secondary: true,
    });

    control.value = "bad";
    control.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(input.parentElement!);
    expect(input.matches(":state(invalid)")).toBe(true);

    input.blur();
    await settled(input.parentElement!);
    expect(input.matches(":state(focused)")).toBe(false);
    expect(focusChange.mock.calls.at(-1)?.[0].detail).toEqual({ focused: false });
  });
});
