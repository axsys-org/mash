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
  test("light primary action keeps readable foreground text", async ({ page }) => {
    const pair = await page.evaluate(async () => {
      const host = document.createElement("div");
      host.dataset.theme = "light";
      host.innerHTML = `<ui-button variant="primary">Primary</ui-button>`;
      document.body.append(host);
      await customElements.whenDefined("ui-button");
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const control = host.firstElementChild!.shadowRoot!.querySelector("button")!;
      const styles = getComputedStyle(control);
      const result = { background: styles.backgroundColor, foreground: styles.color };
      host.remove();
      return result;
    });

    const luminance = (value: string) => {
      const oklch = value.match(/oklch\(([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/);
      if (oklch) {
        const lightness = Number(oklch[1]);
        const chroma = Number(oklch[2]);
        const hue = Number(oklch[3]);
        const radians = (hue * Math.PI) / 180;
        const a = chroma * Math.cos(radians);
        const b = chroma * Math.sin(radians);
        const l = Math.pow(lightness + 0.3963377774 * a + 0.2158037573 * b, 3);
        const m = Math.pow(lightness - 0.1055613458 * a - 0.0638541728 * b, 3);
        const s = Math.pow(lightness - 0.0894841775 * a - 1.291485548 * b, 3);
        return (
          0.2126 * (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) +
          0.7152 * (-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) +
          0.0722 * (-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
        );
      }

      const channels = value
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
      const rgb = channels.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : Math.pow((normalized + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * (rgb[0] ?? 0) + 0.7152 * (rgb[1] ?? 0) + 0.0722 * (rgb[2] ?? 0);
    };

    const background = luminance(pair.background);
    const foreground = luminance(pair.foreground);
    const contrast =
      (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);

    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

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
