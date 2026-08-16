import { expect, test } from "@playwright/test";

/** The computed background of a button's inner control, reaching into the shadow root. */
async function controlBackground(page: import("@playwright/test").Page, testId: string) {
  return page.evaluate((id) => {
    const host = document.querySelector(`[data-testid="${id}"]`)!;
    const control = host.shadowRoot!.querySelector("button")!;
    return getComputedStyle(control).backgroundColor;
  }, testId);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("theme nesting", () => {
  test("each nested [data-theme] scope re-resolves the tokens beneath it", async ({ page }) => {
    const outerLight = await controlBackground(page, "outer-light");
    const innerDark = await controlBackground(page, "inner-dark");
    const innermostLight = await controlBackground(page, "innermost-light");

    // A dark scope inside a light one must differ...
    expect(innerDark).not.toBe(outerLight);
    // ...and a light scope nested back inside the dark one must return to the
    // outer value. This is the property that makes themes composable rather
    // than a single global switch.
    expect(innermostLight).toBe(outerLight);
  });

  test("cards carry elevation differently per theme", async ({ page }) => {
    const shadows = await page.evaluate(() => {
      const read = (theme: string) => {
        const host = document.createElement("div");
        host.dataset.theme = theme;
        host.innerHTML = `<ui-card elevation="raised">x</ui-card>`;
        document.body.append(host);
        const card = host.firstElementChild!;
        const value = getComputedStyle(card).boxShadow;
        host.remove();
        return value;
      };
      return { light: read("light"), dark: read("dark") };
    });

    expect(shadows.light).not.toBe("none");
    expect(shadows.dark).not.toBe("none");
    // The shadow colour is a theme token, so the two themes must not agree.
    expect(shadows.light).not.toBe(shadows.dark);
  });
});

test.describe("colour scheme preference", () => {
  test("follows the OS preference when no theme is declared", async ({ page }) => {
    const read = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--color-canvas").trim(),
      );

    await page.emulateMedia({ colorScheme: "light" });
    const light = await read();

    await page.emulateMedia({ colorScheme: "dark" });
    const dark = await read();

    expect(light).not.toBe("");
    expect(dark).not.toBe(light);
  });

  test("an explicit light scope wins over a dark OS preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });

    const values = await page.evaluate(() => {
      const scope = document.createElement("div");
      scope.dataset.theme = "light";
      document.body.append(scope);
      const scoped = getComputedStyle(scope).getPropertyValue("--color-canvas").trim();
      const root = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-canvas")
        .trim();
      scope.remove();
      return { scoped, root };
    });

    expect(values.scoped).not.toBe(values.root);
  });
});
