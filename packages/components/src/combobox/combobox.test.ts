import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIOption } from "../option/option.js";
import type { UICombobox } from "./combobox.js";
import "../option/register.js";
import "./register.js";

describe("ui-combobox", () => {
  it("supports contains, starts-with, and externally controlled filtering", async () => {
    const combobox = await fixture<UICombobox>(`
      <ui-combobox value="am" filter="starts-with" label="Owner">
        <ui-option value="amy">Amy</ui-option>
        <ui-option value="sam">Sam</ui-option>
      </ui-combobox>
    `);
    const [amy, sam] = [...combobox.querySelectorAll<UIOption>("ui-option")];

    expect(amy?.hidden).toBe(false);
    expect(sam?.hidden).toBe(true);

    combobox.filter = "none";
    await settled(combobox.parentElement!);
    expect(amy?.hidden).toBe(false);
    expect(sam?.hidden).toBe(false);
  });

  it("exposes pending-result state and authored loading content", async () => {
    const combobox = await fixture<UICombobox>(`
      <ui-combobox loading loading-label="Finding owners" label="Owner" open>
        <span slot="loading">Searching the workspace…</span>
        <ui-option value="maya">Maya</ui-option>
      </ui-combobox>
    `);

    expect(combobox.matches(":state(loading)")).toBe(true);
    expect(inShadow<HTMLInputElement>(combobox, "input").getAttribute("aria-busy")).toBe("true");
    expect(inShadow<HTMLElement>(combobox, '[part~="listbox"]').hidden).toBe(true);
    expect(
      inShadow<HTMLSlotElement>(combobox, 'slot[name="loading"]').assignedElements()[0]
        ?.textContent,
    ).toContain("Searching");
  });
});

describe("combobox data and composition", () => {
  const items = [
    { value: "astro", label: "Astro" },
    { value: "next", label: "Next.js" },
  ];
  const type = async (combo: UICombobox, text: string) => {
    await settled(combo);
    const input = inShadow<HTMLInputElement>(combo, "input");
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(combo);
    return input;
  };

  it("keeps queries separate from submitted identities and restores labels and form defaults", async () => {
    const form = await fixture<HTMLFormElement>(
      '<form><ui-combobox name="framework" value="astro"></ui-combobox></form>',
    );
    const combo = form.querySelector<UICombobox>("ui-combobox")!;
    combo.items = items;
    await settled(form);
    expect(inShadow<HTMLInputElement>(combo, "input").value).toBe("Astro");
    const input = await type(combo, "Next");
    expect(new FormData(form).get("framework")).toBe("astro");
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, isComposing: true }),
    );
    expect(combo.value).toBe("astro");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await settled(form);
    expect(new FormData(form).get("framework")).toBe("next");
    expect(input.value).toBe("Next.js");
    combo.show();
    await settled(form);
    expect(
      [...combo.querySelectorAll<UIOption>("ui-option")].every((option) => !option.hidden),
    ).toBe(true);
    form.reset();
    await settled(form);
    expect(input.value).toBe("Astro");
    expect(combo.open).toBe(false);
  });

  it("creates and removes chips using the shared option and chip events", async () => {
    const combo = await fixture<UICombobox>(
      '<ui-combobox multiple hide-selected name="tags"></ui-combobox>',
    );
    combo.items = ["Design", "Engineering"];
    combo.onCreate = (query) => query;
    const input = await type(combo, "Research");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await settled(combo);
    expect(combo.values).toEqual(["Research"]);
    expect(combo.items).toEqual(["Design", "Engineering", "Research"]);
    const option = combo.querySelector<UIOption>('ui-option[value="Research"]')!;
    expect(option.hidden).toBe(true);
    combo.querySelector<HTMLButtonElement>("ui-chip button")!.click();
    await settled(combo);
    expect(combo.values).toEqual([]);
    expect(option.hidden).toBe(false);
    combo.values = ["next"];
    await settled(combo);
    combo.items = items;
    await settled(combo);
    expect(combo.querySelector("ui-chip")!.textContent).toContain("Next.js");
    expect(combo.querySelector("ui-chip button")!.getAttribute("aria-label")).toBe(
      "Remove Next.js",
    );
  });

  it("filters rich records and refuses disabled options and declined creation", async () => {
    const combo = await fixture<UICombobox>("<ui-combobox></ui-combobox>");
    combo.items = [
      { value: "alex", label: "Alex", team: "Design" },
      { value: "sam", label: "Sam", team: "Design", disabled: true },
    ];
    combo.filter = (item, query) =>
      typeof item !== "string" && (item.team as string).includes(query);
    await type(combo, "Design");
    expect(combo.querySelector<UIOption>('[value="alex"]')!.hidden).toBe(false);
    combo
      .querySelector<UIOption>('[value="sam"]')!
      .dispatchEvent(new CustomEvent("ui-option-select", { bubbles: true, composed: true }));
    expect(combo.value).toBe("");
    combo.onCreate = () => undefined;
    const input = await type(combo, "New team");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(combo.value).toBe("");
    expect(combo.items).toHaveLength(2);
  });

  it("preserves authored rich labels and grid navigation", async () => {
    const combo = await fixture<UICombobox>(
      '<ui-combobox grid><ui-option-row><ui-option value="a" aria-label="Alex">Alex · Design</ui-option><ui-option value="m" aria-label="Maya">Maya · Engineering</ui-option></ui-option-row></ui-combobox>',
    );
    const input = inShadow<HTMLInputElement>(combo, "input");
    for (const key of ["ArrowDown", "ArrowRight", "Enter"])
      input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    await settled(combo);
    expect(combo.value).toBe("m");
    expect(input.value).toBe("Maya");
  });
});
