import { afterEach, describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import "../checkbox/register.js";
import "../switch/register.js";
import "../toggle/register.js";
import "./mash.css";

describe("Mash catalogue", () => {
  afterEach(() => {
    delete document.documentElement.dataset.mashCatalogue;
  });

  it("applies a recipe outside component definitions", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const toggle = await fixture(`<ui-toggle pressed>Bold</ui-toggle>`);
    const control = inShadow<HTMLButtonElement>(toggle, "button");

    expect(getComputedStyle(control).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(control).borderTopWidth).toBe("1px");
  });

  it("uses the same root opt-in for checkable controls", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const checkbox = await fixture(`<ui-checkbox>Release notes</ui-checkbox>`);
    const indicator = inShadow<HTMLElement>(checkbox, '[part="indicator"]');

    expect(getComputedStyle(indicator).display).toBe("grid");
    expect(getComputedStyle(indicator).borderTopWidth).toBe("1px");
  });
});
