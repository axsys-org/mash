import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIButton } from "./button.js";
import "./register.js";
import "../icon/register.js";
import "../catalogue/mash.css";

const native = (host: Element) => inShadow<HTMLButtonElement>(host, "button");
const coarse = () => matchMedia("(pointer: coarse)").matches;
beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});
afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

describe("ui-button: opt-in touch targets", () => {
  it("keeps the API orthogonal and disabled by default", async () => {
    const host = await fixture<UIButton>(
      `<ui-button size="small" variant="ghost" tone="neutral">Inspect</ui-button>`,
    );
    expect(host.touchTarget).toBe(false);
    host.touchTarget = true;
    await settled(host);
    expect(host.hasAttribute("touch-target")).toBe(true);
    expect([host.size, host.variant, host.tone, host.iconOnly]).toEqual([
      "small",
      "ghost",
      "neutral",
      false,
    ]);
    host.removeAttribute("touch-target");
    await settled(host);
    expect(host.touchTarget).toBe(false);
  });

  for (const theme of ["light", "dark"]) {
    for (const [size, height] of [
      ["small", 24],
      ["compact", 28],
      ["medium", 32],
    ] as const) {
      it(`reserves real ${size} target geometry in ${theme} without resizing ordinary text controls`, async () => {
        document.documentElement.dataset.theme = theme;
        const row = await fixture(
          `<div style="display:flex;gap:4px;align-items:start"><ui-button size="${size}" variant="ghost" touch-target><ui-icon slot="prefix" name="object.code" size="small"></ui-icon>Inspect</ui-button><ui-button size="${size}" variant="ghost">Inspect</ui-button></div>`,
        );
        const button = native(row.children[0]!);
        const untouched = native(row.children[1]!);
        const rect = button.getBoundingClientRect();
        expect(rect.height).toBe(coarse() ? 44 : height);
        expect(rect.width).toBeGreaterThanOrEqual(coarse() ? 44 : height);
        expect(untouched.getBoundingClientRect().height).toBe(height);
        expect(rect.right).toBeLessThanOrEqual(untouched.getBoundingClientRect().left);
        expect(getComputedStyle(button).fontFamily).toBe(getComputedStyle(untouched).fontFamily);
      });
    }
    it(`wraps long action labels without losing text, icons or focus in ${theme}`, async () => {
      document.documentElement.dataset.theme = theme;
      const text = "Inspect the entire unabridged representation";
      const row = await fixture(
        `<div style="width:160px;display:flex;gap:4px;flex-wrap:wrap"><ui-button touch-target size="small" variant="ghost"><ui-icon slot="prefix" name="object.code" size="small"></ui-icon>${text}</ui-button><ui-button touch-target size="small" variant="ghost">Close</ui-button></div>`,
      );
      const host = row.querySelector<UIButton>("ui-button")!;
      const control = native(host);
      expect(host.textContent).toBe(text);
      expect(getComputedStyle(control).whiteSpace).toBe("normal");
      expect(control.getBoundingClientRect().height).toBeGreaterThan(24);
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
      const second = native(row.children[1]!).getBoundingClientRect();
      expect(control.getBoundingClientRect().bottom).toBeLessThanOrEqual(second.top);
      await userEvent.tab();
      expect(host.shadowRoot!.activeElement).toBe(control);
      expect(getComputedStyle(control).outlineStyle).not.toBe("none");
      await page.screenshot({
        path: `test-results/button-touch-${theme}-${coarse() ? "coarse" : "fine"}.png`,
        element: row,
      });
    });
  }

  it("retains native activation, state treatments and loading/disabled suppression", async () => {
    const host = await fixture<UIButton>(
      `<ui-button touch-target size="small" variant="ghost" tone="neutral"><ui-icon slot="prefix" name="object.code" size="small"></ui-icon>Inspect</ui-button>`,
    );
    const control = native(host);
    let clicks = 0;
    host.addEventListener("click", () => clicks++);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(clicks).toBe(1);
    const resting = getComputedStyle(control).backgroundColor;
    await page.elementLocator(host).hover();
    expect(getComputedStyle(control).backgroundColor).not.toBe(resting);
    host.ariaPressed = "true";
    await settled(host);
    expect(control.getAttribute("aria-pressed")).toBe("true");
    expect(getComputedStyle(control).backgroundColor).not.toBe(resting);
    control.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(host.matches(":state(pressed)")).toBe(true);
    host.loading = true;
    await settled(host);
    expect(native(host)).toBe(control);
    expect(control.disabled).toBe(true);
    expect(control.getAttribute("aria-busy")).toBe("true");
    expect(host.matches(":state(pressed)")).toBe(false);
    host.click();
    expect(clicks).toBe(1);
    host.loading = false;
    host.disabled = true;
    await settled(host);
    host.click();
    expect(clicks).toBe(1);
    expect(Number(getComputedStyle(control).opacity)).toBeLessThan(1);
    host.disabled = false;
    await settled(host);
    host.focus();
    await userEvent.keyboard("{Enter}");
    expect(clicks).toBe(2);
  });
});
