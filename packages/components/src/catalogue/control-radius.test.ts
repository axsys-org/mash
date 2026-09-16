import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { fixture, inShadow } from "../test-support/fixture.js";
import "../button/register.js";
import "../input/register.js";
import "../toggle/register.js";
import "./mash.css";

afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

for (const theme of ["light", "dark"]) {
  it(`inherits the shared 8px radius across controls in ${theme}`, async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    document.documentElement.dataset.theme = theme;
    const host =
      await fixture(`<div style="display:flex;gap:16px;padding:24px;background:var(--color-surface)">
      <ui-button size="small" variant="secondary">Inspect</ui-button>
      <ui-input label="Path" value="/sys/weft"></ui-input>
      <ui-toggle pressed>Preview</ui-toggle>
    </div>`);
    for (const tag of ["ui-button", "ui-input", "ui-toggle"]) {
      const control = inShadow<HTMLElement>(host.querySelector(tag)!, '[part~="control"]');
      const css = getComputedStyle(control);
      expect([
        css.borderTopLeftRadius,
        css.borderTopRightRadius,
        css.borderBottomRightRadius,
        css.borderBottomLeftRadius,
      ]).toEqual(["8px", "8px", "8px", "8px"]);
    }
    await page.screenshot({
      path: `test-results/control-radius-${theme}-${matchMedia("(pointer: coarse)").matches ? "coarse" : "fine"}.png`,
    });
  });
}
