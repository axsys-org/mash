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

  it("keeps both content slots and their styling parts available", async () => {
    const input = await fixture<UIInput>(`
      <ui-input><span slot="prefix">⌕</span><span slot="suffix">⌘ K</span></ui-input>
    `);
    const parts = [...shadow(input).querySelectorAll("[part]")].map((node) =>
      node.getAttribute("part"),
    );

    expect(parts).toEqual(expect.arrayContaining(["control", "prefix", "suffix"]));
    expect(
      shadow(input).querySelector<HTMLSlotElement>('slot[name="prefix"]')?.assignedElements(),
    ).toHaveLength(1);
    expect(
      shadow(input).querySelector<HTMLSlotElement>('slot[name="suffix"]')?.assignedElements(),
    ).toHaveLength(1);
  });
});
