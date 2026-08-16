import { expect, test, type Page } from "@playwright/test";

/**
 * Environment preferences.
 *
 * These are easy to regress precisely because nobody develops with them turned
 * on, which is what makes them worth asserting in CI.
 *
 * Emulation goes through `page.emulateMedia()` rather than `test.use()`.
 * `test.use({ reducedMotion })` is silently ignored by this Playwright build —
 * the tests still run, they just run without the preference applied, which is
 * the worst possible failure mode for a suite whose entire job is to check that
 * preference. `emulateMedia` is explicit and verifiable.
 */

const controlStyle = (page: Page, testId: string, property: string) =>
  page.evaluate(
    ({ id, prop }) => {
      const host = document.querySelector(`[data-testid="${id}"]`)!;
      const control = host.shadowRoot!.querySelector("button")!;
      return getComputedStyle(control).getPropertyValue(prop);
    },
    { id: testId, prop: property },
  );

test.describe("reduced motion", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    // Guard the guard: if emulation ever stops working, fail here rather than
    // quietly passing the assertions below for the wrong reason.
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
      true,
    );
  });

  test("drops control transitions", async ({ page }) => {
    const duration = await controlStyle(page, "kb-first", "transition-duration");
    expect(duration.split(",").every((part) => parseFloat(part) === 0)).toBe(true);
  });

  test("stops the loading spinner without removing it", async ({ page }) => {
    const spinner = await page.evaluate(() => {
      const host = document.querySelector('[data-testid="motion-button"]')!;
      const node = host.shadowRoot!.querySelector(".spinner");
      return node ? { present: true, animationName: getComputedStyle(node).animationName } : null;
    });

    // The ring must still be there — the affordance is the shape, not the spin.
    expect(spinner?.present).toBe(true);
    expect(spinner?.animationName).toBe("none");
  });
});

test.describe("motion allowed", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
  });

  test("animates the loading spinner", async ({ page }) => {
    const animationName = await page.evaluate(() => {
      const host = document.querySelector('[data-testid="motion-button"]')!;
      return getComputedStyle(host.shadowRoot!.querySelector(".spinner")!).animationName;
    });

    expect(animationName).not.toBe("none");
  });

  test("keeps a non-zero transition on controls", async ({ page }) => {
    const duration = await controlStyle(page, "kb-first", "transition-duration");
    expect(duration.split(",").some((part) => parseFloat(part) > 0)).toBe(true);
  });
});

test.describe("forced colors", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/");
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
  });

  test("buttons keep a visible border from the system palette", async ({ page }) => {
    const width = await controlStyle(page, "kb-first", "border-top-width");
    const style = await controlStyle(page, "kb-first", "border-top-style");

    // Without the forced-colors rule the border is `transparent`, which the OS
    // palette renders invisible and leaves the button with no edge at all.
    expect(parseFloat(width)).toBeGreaterThan(0);
    expect(style).toBe("solid");
  });

  test("a raised card falls back to a heavier border, since shadows are dropped", async ({
    page,
  }) => {
    const widths = await page.evaluate(() => {
      const read = (elevation: string) => {
        const card = document.createElement("ui-card");
        card.setAttribute("elevation", elevation);
        document.body.append(card);
        const value = parseFloat(getComputedStyle(card).borderTopWidth);
        card.remove();
        return value;
      };
      return { flat: read("flat"), raised: read("raised") };
    });

    expect(widths.raised).toBeGreaterThan(widths.flat);
  });
});
