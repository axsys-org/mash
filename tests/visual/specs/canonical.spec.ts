import { expect, test } from "@playwright/test";

/**
 * A deliberately small set of canonical states.
 *
 * The temptation with screenshot testing is to enumerate the cross product of
 * every variant, size, tone and theme. That produces hundreds of baselines,
 * every one of which has to be re-reviewed whenever a shared token moves, and
 * the review becomes a rubber stamp. These are the states that would be
 * embarrassing to break, and nothing else.
 *
 * Each is addressed by the same deep link a designer would paste into a PR.
 */
const STATES = [
  {
    name: "button-primary-light",
    tag: "ui-button",
    url: "/components/ui-button?example=controls",
  },
  {
    name: "button-primary-dark",
    tag: "ui-button",
    url: "/components/ui-button?example=controls&theme=dark",
  },
  {
    name: "button-quiet-light",
    tag: "ui-button",
    url: "/components/ui-button?example=controls&variant=quiet",
  },
  {
    name: "button-disabled",
    tag: "ui-button",
    url: "/components/ui-button?example=controls&disabled=true",
  },
  { name: "card-light", tag: "ui-card", url: "/components/ui-card" },
  { name: "card-dark", tag: "ui-card", url: "/components/ui-card?theme=dark" },
] as const;

for (const state of STATES) {
  test(state.name, async ({ page }) => {
    await page.goto(state.url);

    // The preview lives in the stage iframe. Waiting for the element inside it
    // to be visible is what guarantees the frame has loaded, its registry has
    // been populated and the component has rendered — the catalog does all of
    // that asynchronously.
    const preview = page.frameLocator("iframe.stage-frame").locator(state.tag);
    await expect(preview).toBeVisible();

    // Fonts settle after first paint; without this the first run and every
    // later run disagree about glyph antialiasing.
    await page.evaluate(() => document.fonts.ready);

    await expect(page.locator("iframe.stage-frame")).toHaveScreenshot(`${state.name}.png`);
  });
}
