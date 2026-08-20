import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIChip } from "./chip.js";
import "./register.js";

describe("ui-chip", () => {
  it("reports removal through its semantic remove slot", async () => {
    const chip = await fixture<UIChip>(`
      <ui-chip value="maya">Maya<button slot="remove" type="button">Remove</button></ui-chip>
    `);
    const removed: string[] = [];
    chip.addEventListener("ui-chip-remove", (event) => {
      removed.push((event as CustomEvent<{ value: string }>).detail.value);
    });

    chip.querySelector<HTMLButtonElement>("button")!.click();
    await settled(chip.parentElement!);

    expect(removed).toEqual(["maya"]);
    expect(inShadow(chip, "[part=root]").getAttribute("role")).toBe("listitem");
  });

  it("does not request removal while readonly", async () => {
    const chip = await fixture<UIChip>(`
      <ui-chip value="maya" readonly>Maya<button slot="remove" type="button">Remove</button></ui-chip>
    `);
    let removals = 0;
    chip.addEventListener("ui-chip-remove", () => removals++);

    chip.querySelector<HTMLButtonElement>("button")!.click();
    await settled(chip.parentElement!);

    expect(removals).toBe(0);
    expect(chip.matches(":state(readonly)")).toBe(true);
  });
});
