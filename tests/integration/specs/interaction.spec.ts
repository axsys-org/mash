import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

/**
 * Whether this engine puts buttons in the tab order at all.
 *
 * WebKit on macOS does not: "Press Tab to highlight each item on a webpage" is
 * off by default, so Tab moves between text fields and skips buttons and links.
 * That is a platform preference a component cannot override — a plain
 * `<button>` behaves identically — so the specs measure the native baseline
 * instead of assuming one, and assert that `ui-button` matches it.
 */
async function engineTabsToButtons(page: Page): Promise<boolean> {
  await page.locator("#probe-input").focus();
  await page.keyboard.press("Tab");
  return (await page.evaluate(() => document.activeElement?.id)) === "probe-native";
}

test.describe("form composition", () => {
  test("a button inside a card's footer submits the form two shadow roots up", async ({ page }) => {
    await page.fill("#email", "someone@example.com");
    await page.getByTestId("submit").click();

    await expect(page.getByTestId("form-status")).toHaveText("submitted:someone@example.com");
  });

  test("a reset button restores the form", async ({ page }) => {
    await page.fill("#email", "someone@example.com");
    await page.getByTestId("reset").click();

    await expect(page.getByTestId("form-status")).toHaveText("reset");
    await expect(page.locator("#email")).toHaveValue("");
  });
});

test.describe("keyboard-only interaction", () => {
  test("Enter activates a focused button", async ({ page }) => {
    await page.getByTestId("kb-first").focus();
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("kb-log")).toHaveText("kb-first;");
  });

  test("tab order matches native buttons and skips disabled ones", async ({ page }) => {
    const tabsToButtons = await engineTabsToButtons(page);

    await page.getByTestId("kb-first").focus();
    await page.keyboard.press("Tab");

    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.id ?? "",
    );

    if (tabsToButtons) {
      // Straight past the disabled button to the last one.
      expect(focused).toBe("kb-last");
    } else {
      // The engine tabs over buttons entirely, so a custom element standing in
      // for one must not be reachable either.
      expect(focused).not.toBe("kb-last");
      expect(focused).not.toBe("kb-disabled");
    }
  });

  test("Space activates a focused button", async ({ page }) => {
    await page.getByTestId("kb-last").focus();
    await page.keyboard.press("Space");

    await expect(page.getByTestId("kb-log")).toHaveText("kb-last;");
  });

  test("a form can be completed without a pointer", async ({ page }) => {
    const tabsToButtons = await engineTabsToButtons(page);

    await page.locator("#email").focus();
    await page.keyboard.type("keyboard@example.com");

    if (tabsToButtons) {
      await page.keyboard.press("Tab"); // reset
      await page.keyboard.press("Tab"); // submit
    } else {
      // This engine does not tab to buttons, so a keyboard user reaches the
      // submit control by whatever means the platform provides. What matters
      // here is that activating it by keyboard still submits the form.
      await page.getByTestId("submit").focus();
    }

    await page.keyboard.press("Enter");

    await expect(page.getByTestId("form-status")).toHaveText("submitted:keyboard@example.com");
  });

  test("focus is visible on the inner control when reached by keyboard", async ({ page }) => {
    await page.getByTestId("kb-first").focus();

    const outline = await page.evaluate(() => {
      const host = document.querySelector('[data-testid="kb-first"]')!;
      const control = host.shadowRoot!.querySelector("button")!;
      return getComputedStyle(control).outlineWidth;
    });

    expect(parseFloat(outline)).toBeGreaterThan(0);
  });
});

test.describe("writing direction", () => {
  test("prefix spacing follows the writing direction", async ({ page }) => {
    const gaps = await page.evaluate(() => {
      const measure = (hostId: string, prefixId: string) => {
        const host = document.querySelector(`[data-testid="${hostId}"]`)!;
        const prefix = document.querySelector(`[data-testid="${prefixId}"]`)!;
        const style = getComputedStyle(prefix);
        return {
          left: style.marginLeft,
          right: style.marginRight,
          hostDir: getComputedStyle(host).direction,
        };
      };
      return { ltr: measure("ltr-button", "ltr-prefix"), rtl: measure("rtl-button", "rtl-prefix") };
    });

    expect(gaps.ltr.hostDir).toBe("ltr");
    expect(gaps.rtl.hostDir).toBe("rtl");

    // The component uses margin-inline-end, so the physical side must flip.
    expect(parseFloat(gaps.ltr.right)).toBeGreaterThan(0);
    expect(parseFloat(gaps.ltr.left)).toBe(0);
    expect(parseFloat(gaps.rtl.left)).toBeGreaterThan(0);
    expect(parseFloat(gaps.rtl.right)).toBe(0);
  });
});
