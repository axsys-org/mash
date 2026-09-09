import { expect, test } from "@playwright/test";

/**
 * Can a browser actually consume the built packages?
 *
 * `scripts/check-exports.mjs` is static analysis: it reads the `exports` map,
 * the `files` list, the `sideEffects` array and the emitted modules and checks
 * they agree. What it cannot do is resolve a subpath the way a runtime does —
 * the component modules reference `HTMLElement` at evaluation time and cannot
 * be loaded into Node at all.
 *
 * So this loads them in a real browser, through the published subpaths, and
 * asserts the three things that break silently: the paths resolve, the classes
 * are exported under the documented names, and normal imports define usable elements.
 *
 * Deliberately small. This is a smoke test for the package topology, not a
 * simulation of publishing.
 */

interface ExportReport {
  definedAfterComponentImports: string[];
  definedAfterPackageImports: string[];
  identical: Record<string, boolean>;
  constructible: Record<string, boolean>;
  completePackage: boolean;
  requiredChildrenDefined: boolean;
  error: string | null;
}

test.describe("package exports", () => {
  test("the published subpaths resolve and behave as documented", async ({ page }) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));

    await page.goto("/exports.html");

    const report: ExportReport = JSON.parse(
      await page.locator('[data-testid="export-report"]').innerText(),
    );

    // A module that failed to resolve surfaces here rather than as a confusing
    // assertion further down.
    expect(failures).toEqual([]);
    expect(report.error).toBeNull();

    expect(report.definedAfterComponentImports.sort()).toEqual([
      "shrine-confirm",
      "ui-button",
      "ui-card",
    ]);
    expect(report.definedAfterPackageImports.sort()).toEqual([
      "shrine-confirm",
      "ui-button",
      "ui-card",
    ]);
    expect(report.completePackage).toBe(true);
    expect(report.requiredChildrenDefined).toBe(true);

    // The barrel and the granular subpath must be the same module instance, not
    // two copies of the class — otherwise `instanceof` fails for consumers who
    // mix the two import styles.
    expect(report.identical).toEqual({
      "ui-button": true,
      "ui-card": true,
      "shrine-confirm": true,
    });

    expect(report.constructible).toEqual({
      "ui-button": true,
      "ui-card": true,
      "shrine-confirm": true,
    });
  });
});
