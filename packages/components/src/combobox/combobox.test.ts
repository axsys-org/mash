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
