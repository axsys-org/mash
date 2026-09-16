import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIButton } from "./button.js";
import "./register.js";
import "../icon/register.js";
import "../catalogue/mash.css";

const control = (button: Element) => inShadow<HTMLButtonElement>(button, "button");
const coarse = () => matchMedia("(pointer: coarse)").matches;

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});
afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

describe("ui-button: icon-only action contract", () => {
  it("reflects an opt-in axis without changing variant, tone or size", async () => {
    const button = await fixture<UIButton>(
      `<ui-button variant="ghost" tone="neutral" size="compact" aria-label="Refresh"><ui-icon name="action.refresh"></ui-icon></ui-button>`,
    );
    expect(button.iconOnly).toBe(false);
    button.iconOnly = true;
    await settled(button);
    expect(button.hasAttribute("icon-only")).toBe(true);
    expect([button.variant, button.tone, button.size]).toEqual(["ghost", "neutral", "compact"]);
    expect(control(button).getAttribute("aria-label")).toBe("Refresh");
    button.removeAttribute("icon-only");
    await settled(button);
    expect(button.iconOnly).toBe(false);
  });

  for (const theme of ["light", "dark"]) {
    for (const [size, pixels] of [
      ["small", 24],
      ["compact", 28],
      ["medium", 32],
    ] as const) {
      it(`uses square ${size} geometry in ${theme} and does not resize text actions`, async () => {
        document.documentElement.dataset.theme = theme;
        const host = await fixture(
          `<div class="mash-row"><ui-button icon-only size="${size}" variant="ghost" tone="neutral" aria-label="Refresh"><ui-icon name="action.refresh"></ui-icon></ui-button><ui-button size="${size}">Refresh records</ui-button></div>`,
        );
        const icon = control(host.children[0]!);
        const text = control(host.children[1]!);
        expect(icon.getBoundingClientRect().width).toBe(coarse() ? 44 : pixels);
        expect(icon.getBoundingClientRect().height).toBe(coarse() ? 44 : pixels);
        expect(text.getBoundingClientRect().height).toBe(pixels);
        expect(text.getBoundingClientRect().width).toBeGreaterThan(pixels);
        expect(icon.getBoundingClientRect().right).toBeLessThanOrEqual(
          text.getBoundingClientRect().left,
        );
      });
    }
  }

  for (const slot of ["", ' slot="prefix"']) {
    it(`replaces the ${slot ? "prefix" : "default"} glyph with one centered spinner`, async () => {
      const button = await fixture<UIButton>(
        `<ui-button icon-only size="compact" aria-label="Refresh"><ui-icon${slot} name="action.refresh"></ui-icon></ui-button>`,
      );
      const before = control(button).getBoundingClientRect();
      button.loading = true;
      await settled(button);
      const spinner = inShadow<HTMLElement>(button, '[part="spinner"]');
      const box = control(button).getBoundingClientRect();
      const mark = spinner.getBoundingClientRect();
      expect(box.width).toBe(before.width);
      expect(box.height).toBe(before.height);
      expect(Math.abs(mark.x + mark.width / 2 - box.x - box.width / 2)).toBeLessThan(1);
      expect(Math.abs(mark.y + mark.height / 2 - box.y - box.height / 2)).toBeLessThan(1);
      expect(control(button).disabled).toBe(true);
      expect(control(button).getAttribute("aria-busy")).toBe("true");
      expect(getComputedStyle(inShadow(button, '[part="label"]')).display).toBe("none");
      button.loading = false;
      await settled(button);
      expect(button.querySelector("ui-icon")).not.toBeNull();
      expect(control(button).disabled).toBe(false);
    });
  }

  it("shares persistent selected, pressed and expanded treatment", async () => {
    const host = await fixture(
      `<div class="mash-row"><ui-button icon-only variant="ghost" tone="neutral" aria-label="Neutral"><ui-icon name="action.refresh"></ui-icon></ui-button><ui-button icon-only variant="ghost" tone="neutral" aria-label="Selected" selected></ui-button><ui-button icon-only variant="ghost" tone="neutral" aria-label="Pressed" aria-pressed="true"></ui-button><ui-button icon-only variant="ghost" tone="neutral" aria-label="Expanded" aria-expanded="true"></ui-button></div>`,
    );
    const colors = [...host.children].map(
      (button) => getComputedStyle(control(button)).backgroundColor,
    );
    expect(colors[1]).not.toBe(colors[0]);
    expect(colors.slice(1)).toEqual([colors[1], colors[1], colors[1]]);
  });

  it("preserves native keyboard activation and loading suppression", async () => {
    const button = await fixture<UIButton>(
      `<ui-button icon-only aria-label="Refresh"><ui-icon name="action.refresh"></ui-icon></ui-button>`,
    );
    let clicks = 0;
    button.addEventListener("click", () => clicks++);
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(clicks).toBe(1);
    button.loading = true;
    await settled(button);
    button.click();
    expect(clicks).toBe(1);
  });
});
