import { describe, expect, it } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UISelect } from "./select.js";
import "./register.js";
import "../option/register.js";

describe("ui-select effective disabled state", () => {
  it("enables the native trigger and restores form value after repeated busy cycles", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form><ui-select name="mode" label="Response mode" value="plan">
        <ui-option value="ask">Ask</ui-option><ui-option value="plan">Plan</ui-option>
      </ui-select></form>
    `);
    const select = form.querySelector<UISelect>("ui-select")!;
    const trigger = inShadow<HTMLButtonElement>(select, '[part="trigger"]');
    for (let cycle = 0; cycle < 2; cycle++) {
      select.disabled = true;
      await settled(form);
      expect(trigger.disabled).toBe(true);
      expect(select.matches(":state(disabled)")).toBe(true);
      expect(new FormData(form).has("mode")).toBe(false);
      select.disabled = false;
      await settled(form);
      expect(trigger.disabled).toBe(false);
      expect(select.matches(":state(disabled)")).toBe(false);
      expect(new FormData(form).get("mode")).toBe("plan");
    }
    trigger.click();
    await settled(form);
    expect(select.open).toBe(true);
  });

  it("retains fieldset disabling until both the fieldset and authored property permit input", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form><fieldset disabled><ui-select name="mode" label="Response mode" value="ask">
        <ui-option value="ask">Ask</ui-option><ui-option value="plan">Plan</ui-option>
      </ui-select></fieldset></form>
    `);
    const fieldset = form.querySelector("fieldset")!;
    const select = form.querySelector<UISelect>("ui-select")!;
    const trigger = inShadow<HTMLButtonElement>(select, '[part="trigger"]');
    expect(trigger.disabled).toBe(true);
    expect(select.disabled).toBe(false);
    select.disabled = true;
    await settled(form);
    fieldset.disabled = false;
    await settled(form);
    expect(trigger.disabled).toBe(true);
    select.disabled = false;
    await settled(form);
    expect(trigger.disabled).toBe(false);
    expect(new FormData(form).get("mode")).toBe("ask");
    fieldset.disabled = true;
    await settled(form);
    expect(trigger.disabled).toBe(true);
    fieldset.disabled = false;
    await settled(form);
    expect(trigger.disabled).toBe(false);
    expect(select.matches(":state(disabled)")).toBe(false);
  });
});
