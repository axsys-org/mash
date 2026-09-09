import { expect, test } from "@playwright/test";
import { examplesFor } from "../../../apps/catalog/src/examples.js";
import { components } from "../../../apps/catalog/src/schema.js";
import { hasRenderedContent } from "./helpers/rendered-content.js";

// One page per component/theme: exercise the actual consolidated preview,
// including lazy mounts, without repeatedly loading its already-checked siblings.
for (const component of components.filter((item) => item.packageName === "@mash/ui")) {
  const tag = component.tagName;
  const examples = examplesFor(component);
  for (const theme of ["light", "dark"]) {
    test(`${tag}: every example in ${theme}`, async ({ page }, testInfo) => {
      test.setTimeout(Math.max(30_000, examples.length * 10_000));
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`/components/${tag}?theme=${theme}`);
      for (const example of examples) {
        await test.step(example.name, async () => {
          const host = page.locator(`iframe[data-variant=${JSON.stringify(example.name)}]`);
          await host.scrollIntoViewIfNeeded();
          await expect(host).toHaveAttribute("src", /\/fixture\.html/);
          const stage = host.contentFrame();
          await expect(stage.locator("html")).toHaveAttribute("data-stage-ready", "true");
          await expect(stage.locator("html")).toHaveAttribute("data-example-ready", "true");
          // Native description lists, grouping, and passive status layouts are
          // documented beside their composition ingredients, without inventing
          // wrapper elements solely to make the preview contain the route tag.
          if (new RegExp(`<${tag}(?:\\s|>)`).test(example.code))
            await expect(stage.locator(tag).first()).toBeAttached();
          // Labels and controls may live entirely in shadow DOM; light-DOM
          // textContent cannot distinguish their preview from an empty body.
          await expect.poll(() => stage.locator("body").evaluate(hasRenderedContent)).toBe(true);
          await expect(stage.locator("html")).not.toHaveAttribute("data-stage-error", /.+/);
          const state = await stage.locator("html").evaluate(async () => {
            await Promise.all(
              [...document.querySelectorAll("*")].map(
                (node) =>
                  (node as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete,
              ),
            );
            return {
              undefined: [...document.querySelectorAll("*")]
                .filter(
                  (node) => node.localName.startsWith("ui-") || node.localName.startsWith("sh-"),
                )
                .filter((node) => !customElements.get(node.localName))
                .map((node) => node.localName),
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            };
          });
          expect(state.undefined).toEqual([]);
          expect(state.overflow).toBeLessThanOrEqual(2);
          expect(errors).toEqual([]);
          if (process.env.MASH_CAPTURE_AUDIT === "1") {
            const filename = `${tag}-${theme}-${example.name.replace(/[^a-z0-9]+/gi, "-")}.png`;
            const path = testInfo.outputPath(filename);
            await host.screenshot({ path });
            await testInfo.attach(filename, { path, contentType: "image/png" });
          }
        });
      }
    });
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
