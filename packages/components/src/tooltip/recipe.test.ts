import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UITooltip } from "./tooltip.js";
import "./register.js";
import "../button/register.js";
import "../kbd/register.js";
import "../catalogue/mash.css";

afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

for (const theme of ["light", "dark"]) {
  it(`uses a compact non-inverted help tag in ${theme}`, async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    document.documentElement.dataset.theme = theme;
    const tip = await fixture<UITooltip>(`<ui-tooltip trigger="manual" style="margin:64px">
      <ui-button slot="trigger" title="Native refresh" aria-label="Refresh">Refresh</ui-button>
      <span style="display:flex;align-items:center;gap:8px">Edit path <ui-kbd shortcut="Primary+L" appearance="plain"></ui-kbd></span>
    </ui-tooltip>`);
    tip.show();
    await settled(tip);
    const popup = inShadow<HTMLElement>(tip, '[part="popup"]');
    const css = getComputedStyle(popup);
    expect(css.fontSize).toBe("11px");
    expect(css.fontWeight).toBe("400");
    expect(css.paddingBlockStart).toBe("2px");
    expect(css.paddingInlineStart).toBe("6px");
    expect(css.borderRadius).toBe("4px");
    expect(popup.getBoundingClientRect().height).toBeLessThanOrEqual(23);
    const reference = document.createElement("span");
    reference.style.cssText = "background:var(--color-tooltip-surface);color:var(--color-text)";
    tip.append(reference);
    expect(css.backgroundColor).toBe(getComputedStyle(reference).backgroundColor);
    expect(css.color).toBe(getComputedStyle(reference).color);
    await page.screenshot({ path: `test-results/tooltip-${theme}.png` });
  });
}

it("suppresses native and inherited titles throughout a binding, then restores them", async () => {
  const host = await fixture<HTMLElement>(`<div title="Inherited browser bubble">
    <ui-button id="one" title="First hint">One</ui-button>
    <ui-button id="two" title="Second hint">Two</ui-button>
    <ui-tooltip trigger="manual" label="Mash hint"></ui-tooltip>
  </div>`);
  const tip = host.querySelector<UITooltip>("ui-tooltip")!;
  const one = host.querySelector<HTMLElement>("#one")!;
  const two = host.querySelector<HTMLElement>("#two")!;
  const native = inShadow<HTMLElement>(one, "button");
  tip.anchorElement = native;
  await settled(host);
  expect(one.title).toBe("");
  expect(native.getAttribute("title")).toBe("");
  tip.show();
  tip.dismiss();
  await settled(host);
  expect(one.title).toBe("");
  expect(native.getAttribute("title")).toBe("");
  one.title = "Updated native hint";
  await settled(host);
  expect(one.title).toBe("");
  tip.anchorElement = two;
  expect(one.title).toBe("Updated native hint");
  expect(native.hasAttribute("title")).toBe(false);
  expect(two.title).toBe("");
  tip.remove();
  expect(two.title).toBe("Second hint");
  expect(host.title).toBe("Inherited browser bubble");
});
