import { expect, test } from "@playwright/test";
import { componentExamples } from "../../../apps/catalog/src/examples/components.js";
import { controlExamples } from "../../../apps/catalog/src/examples/controls.js";

for (const [tag, examples] of Object.entries({ ...componentExamples, ...controlExamples }).filter(
  ([name]) => name.startsWith("ui-"),
)) {
  for (const example of examples) {
    for (const theme of ["light", "dark"]) {
      test(`${tag}: ${example.name} ${theme}`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(
          `/components/${tag}?theme=${theme}&example=${encodeURIComponent(example.name)}`,
        );
        const stage = page.frameLocator("iframe.stage-frame");
        await expect(stage.locator("html")).toHaveAttribute("data-stage-ready", "true");
        await expect(stage.locator(tag).first()).toBeAttached();
        await expect(stage.locator("html")).not.toHaveAttribute("data-stage-error", /.+/);
        const frame = (await (await page
          .locator("iframe.stage-frame")
          .elementHandle())!.contentFrame())!;
        await frame.evaluate(async () => {
          await Promise.all(
            [...document.querySelectorAll("*")].map(
              (node) =>
                (node as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete,
            ),
          );
        });
        expect(
          await frame.evaluate(() =>
            [...document.querySelectorAll("*")]
              .filter(
                (node) => node.localName.startsWith("ui-") || node.localName.startsWith("sh-"),
              )
              .every((node) => customElements.get(node.localName)),
          ),
        ).toBe(true);
        expect(
          await frame.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
        ).toBeLessThanOrEqual(2);
        expect(errors).toEqual([]);
      });
    }
  }
}

test("dynamic tab example adds, closes, and restores an adjacent panel", async ({ page }) => {
  await page.goto("/components/ui-tabs?example=Dynamic%20tabs");
  const stage = page.frameLocator("iframe.stage-frame");
  await stage.getByRole("button", { name: "Add document" }).click();
  await expect(stage.getByRole("tab", { name: "Document 1", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await stage.getByRole("tab", { name: "Document 1", exact: true }).focus();
  await page.keyboard.press("Delete");
  await expect(stage.getByRole("tab", { name: "Document 1", exact: true })).toHaveCount(0);
  await expect(stage.getByRole("tab", { name: "Tasks", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("table example commits and cancels edits through the displayed script", async ({ page }) => {
  await page.goto("/components/ui-data-table?example=Editing");
  const stage = page.frameLocator("iframe.stage-frame");
  const first = stage.locator("ui-table-body ui-table-cell").first();
  await first.dblclick();
  const input = stage.getByRole("textbox", { name: "Cell value" });
  await expect(input).toHaveValue("Website");
  await input.fill("New website");
  await stage.getByRole("button", { name: "Save", exact: true }).click();
  await expect(first).toHaveText("New website");
  await first.dblclick();
  await input.fill("Discarded");
  await page.keyboard.press("Escape");
  await expect(first).toHaveText("New website");
});

test("sorting updates visible rows and accessible header direction", async ({ page }) => {
  await page.goto("/components/ui-data-table?example=Sorting");
  const stage = page.frameLocator("iframe.stage-frame");
  await stage.getByRole("button", { name: "Project ↕" }).click();
  await expect(stage.locator("ui-table-body ui-table-row").first()).toContainText("Components");
  await expect(stage.getByRole("columnheader").first()).toHaveAttribute("aria-sort", "ascending");
});
