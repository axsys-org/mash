import { describe, expect, it } from "vitest";

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
});
