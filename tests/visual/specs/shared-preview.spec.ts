import { catalogueThemes } from "./helpers/catalogue-themes.js";
import { expect, test } from "@playwright/test";

for (const theme of catalogueThemes)
  for (const tag of ["ui-tabs", "ui-chart"]) {
    test(`shared ${tag} renders every example in ${theme}`, async ({ page }) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`/components/${tag}?preview=shared&theme=${theme}`);
      await expect(page.locator("iframe")).toHaveCount(1);
      const frame = page.frameLocator("iframe.shared-frame");
      await expect(frame.locator("html")).toHaveAttribute("data-stage-ready", "true");
      const sections = frame.locator(".shared-section");
      expect(await sections.count()).toBe(tag === "ui-tabs" ? 9 : 51);
      for (const section of await sections.all()) {
        await section.scrollIntoViewIfNeeded();
        await expect(section.locator(".shared-example")).toHaveAttribute(
          "data-example-ready",
          "true",
        );
        await expect(
          section.locator(tag === "ui-chart" ? "ui-chart svg, ui-chart canvas" : "ui-tabs").first(),
        ).toBeVisible();
        await expect(section.locator('[part="error"]')).toBeHidden();
      }
      await expect(frame.locator("[data-example-error]")).toHaveCount(0);
      expect(errors).toEqual([]);
      expect(
        await frame.locator("html").evaluate((html) => html.scrollWidth - innerWidth),
      ).toBeLessThanOrEqual(2);
      const sharedSheets = await frame
        .locator(".shared-example")
        .evaluateAll(
          (hosts) => new Set(hosts.map((host) => host.shadowRoot!.adoptedStyleSheets[0])).size,
        );
      expect(sharedSheets).toBe(1);
    });
  }

test("shared tabs keep drafts through reorder, close, zoom, theme, and restoration", async ({
  page,
}) => {
  await page.goto("/components/ui-tabs?preview=shared&example=Dynamic%20tabs");
  const frame = page.frameLocator("iframe.shared-frame");
  const section = frame.locator('[data-variant="Dynamic tabs"]');
  await expect(frame.locator("html")).toHaveAttribute("data-stage-ready", "true", {
    timeout: 15_000,
  });
  const draft = section.getByRole("textbox", { name: "Your notes", exact: true });
  await expect(section.getByRole("heading")).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await draft.fill("Keep this composed draft");
  const notes = section.getByRole("tab", { name: "Notes", exact: true });
  await notes.focus();
  await notes.press("Alt+Shift+ArrowRight");
  await expect(section.getByRole("tab").last()).toHaveAccessibleName("Notes");
  await notes.press("Delete");
  await section.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(draft).toHaveValue("Keep this composed draft");
  const start = (await notes.boundingBox())!;
  const destination = (await section
    .getByRole("tab", { name: "Tasks", exact: true })
    .boundingBox())!;
  await page.mouse.move(start.x + 30, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination.x + 8, destination.y + destination.height / 2, { steps: 14 });
  await page.mouse.up();
  await expect(section.getByRole("tab").first()).toHaveAccessibleName("Notes");
  await page.getByRole("button", { name: "Expand preview", exact: true }).click();
  const zoom = page.getByRole("combobox", { name: "Preview zoom" });
  await zoom.click();
  await page.getByRole("option", { name: "75%", exact: true }).click();
  await expect(frame.locator(".shared-examples")).toHaveCSS("zoom", "0.75");
  await page.getByRole("button", { name: "Restore preview", exact: true }).click();
  await page.getByRole("button", { name: "Switch color theme" }).click();
  await expect(frame.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(draft).toHaveValue("Keep this composed draft");
  await page.getByRole("link", { name: "Overflow", exact: true }).click();
  const overflow = frame.locator('[data-variant="Overflow"]');
  await expect(overflow.getByRole("heading")).toBeInViewport();
  await overflow.getByRole("button", { name: "Choose tab in Open files" }).click();
  await expect(overflow.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Expand preview", exact: true }).click();
  await zoom.click();
  await page.getByRole("option", { name: "150%", exact: true }).click();
  expect(
    await frame.locator("html").evaluate((html) => html.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(2);
});

test("shared charts isolate repeated IDs, redraw, and release setup listeners", async ({
  page,
}) => {
  await page.goto("/components/ui-chart?preview=shared&example=Live%20data");
  const frame = page.frameLocator("iframe.shared-frame");
  // Use the existing adjacent-control examples, whose source IDs deliberately repeat.
  await page.getByRole("link", { name: "Curves and axes", exact: true }).click();
  const curves = frame.locator('[data-variant="Curves and axes"]');
  await expect(curves.locator("#plot svg")).toBeVisible();
  const before = await curves
    .locator("#plot svg path")
    .evaluateAll((paths) => paths.map((path) => path.getAttribute("d")).join("|"));
  await curves.getByRole("combobox", { name: "Curve", exact: true }).click();
  await curves.getByRole("option", { name: "Smooth", exact: true }).click();
  await expect
    .poll(() =>
      curves
        .locator("#plot svg path")
        .evaluateAll((paths) => paths.map((path) => path.getAttribute("d")).join("|")),
    )
    .not.toBe(before);
  await page.getByRole("link", { name: "Bar arrangements", exact: true }).click();
  const bars = frame.locator('[data-variant="Bar arrangements"]');
  await expect(bars.locator("#plot svg")).toBeVisible();
  expect(await frame.locator("#plot").count()).toBeGreaterThanOrEqual(2);
  await bars.getByRole("combobox", { name: "Growth direction", exact: true }).click();
  await bars.getByRole("option", { name: "Left", exact: true }).click();
  await page.getByRole("link", { name: "Curves and axes", exact: true }).click();
  await expect(curves.getByRole("combobox", { name: "Curve", exact: true })).toContainText(
    "Smooth",
  );
  await curves.getByText("Code", { exact: true }).click();
  await expect(curves.locator("pre")).toContainText("function mountExample(root)");
  await expect(curves.locator("pre")).toContainText("lifecycle.abort()");
  const cleaned = await frame
    .locator("#plot")
    .first()
    .evaluate((plot) => {
      (window as unknown as { mashSharedPreview: { dispose(): void } }).mashSharedPreview.dispose();
      return !plot.isConnected && document.querySelectorAll(".shared-section").length === 0;
    });
  expect(cleaned).toBe(true);
});
