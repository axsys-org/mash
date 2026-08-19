import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const bundle = resolve(import.meta.dirname, "../../../apps/catalog/dist/mash.js");

test.describe("single-file browser distribution", () => {
  test("registers every element and installs its token styles", async ({ page }) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));

    await page.setContent(`
      <!doctype html>
      <html>
        <head></head>
        <body><ui-button>Bundled button</ui-button></body>
      </html>
    `);
    await page.addScriptTag({ path: bundle });
    await page.addScriptTag({ path: bundle });

    const report = await page.evaluate(() => {
      const tags = [
        "ui-button",
        "ui-card",
        "ui-path",
        "ui-tree",
        "ui-tree-item",
        "shrine-confirm",
        "sh-triptych",
        "sh-locator",
      ];

      return {
        defined: tags.filter((tag) => customElements.get(tag)).sort(),
        globalExports: Object.keys(
          (globalThis as typeof globalThis & { Mash?: object }).Mash ?? {},
        ).sort(),
        styleCount: document.head.querySelectorAll("style[data-mash-tokens]").length,
        hasActionToken: Array.from(
          document.head.querySelectorAll<HTMLStyleElement>("style[data-mash-tokens]"),
        ).some((style) => style.textContent?.includes("--color-action")),
      };
    });

    expect(failures).toEqual([]);
    expect(report.defined).toEqual([
      "sh-locator",
      "sh-triptych",
      "shrine-confirm",
      "ui-button",
      "ui-card",
      "ui-path",
      "ui-tree",
      "ui-tree-item",
    ]);
    expect(report.globalExports).toEqual([
      "ShrineConfirm",
      "ShrineLocator",
      "ShrineTriptych",
      "UIButton",
      "UICard",
      "UIPath",
      "UITree",
      "UITreeItem",
    ]);
    expect(report.styleCount).toBe(1);
    expect(report.hasActionToken).toBe(true);
  });
});
