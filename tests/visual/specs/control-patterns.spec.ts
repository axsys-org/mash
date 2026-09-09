import { expect, test } from "@playwright/test";

test("button async action completes and can be repeated", async ({ page }) => {
  await page.goto("/components/ui-button?example=Async%20action", {
    waitUntil: "domcontentloaded",
  });
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(frame.getByRole("button", { name: "Saving", exact: true })).toBeDisabled();
  await expect(frame.locator("#save-result")).toHaveText("All changes saved");
  await frame.getByRole("button", { name: "Make another change", exact: true }).click();
  await expect(frame.getByRole("button", { name: "Save changes", exact: true })).toBeEnabled();
});

test("formatting and filter toggles change their actual content", async ({ page }) => {
  await page.goto("/components/ui-toggle?example=Formatting%20controls", {
    waitUntil: "domcontentloaded",
  });
  let frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Bold", exact: true }).click();
  await frame.getByRole("button", { name: "Italic", exact: true }).click();
  await expect(frame.locator("#formatted-text")).toHaveCSS("font-weight", "700");
  await expect(frame.locator("#formatted-text")).toHaveCSS("font-style", "italic");
  await page.goto("/components/ui-toggle-group?example=Multiple%20filters", {
    waitUntil: "domcontentloaded",
  });
  frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Documents", exact: true }).click();
  await expect(frame.locator("#filtered-files li")).toHaveCount(1);
  await frame.getByRole("button", { name: "Images", exact: true }).click();
  await expect(frame.locator("#filter-count")).toHaveText("No file types selected");
});

test("keyboard hint and effective binding change together", async ({ page }) => {
  await page.goto("/components/ui-kbd?example=Live%20command%20binding", {
    waitUntil: "domcontentloaded",
  });
  const frame = page.frameLocator("iframe.stage-frame");
  const run = frame.getByRole("button", { name: "Run command", exact: true });
  await run.focus();
  await run.press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");
  await expect(frame.locator("#binding-result")).toHaveText("Command ran 1 time");
  await frame.getByRole("combobox", { name: "Shortcut", exact: true }).click();
  await frame.getByRole("option", { name: "Primary + Shift + K", exact: true }).click();
  await expect(frame.locator("#binding-hint")).toHaveAttribute("shortcut", "Primary+Shift+K");
  await run.press(process.platform === "darwin" ? "Meta+Shift+K" : "Control+Shift+K");
  await expect(frame.locator("#binding-result")).toHaveText("Command ran 2 times");
});

test("outlined punctuation and Windows separators are visible", async ({ page }) => {
  await page.goto("/components/ui-kbd?example=Treatments%20and%20punctuation", {
    waitUntil: "domcontentloaded",
  });
  const frame = page.frameLocator("iframe.stage-frame");
  const plus = frame.locator('ui-kbd[appearance="outline"][shortcut="Primary++"]');
  await plus.evaluate((node) => node.setAttribute("platform", "windows"));
  await expect(plus.locator('[part="separator"]')).toBeVisible();
  await expect(plus.locator('[part="key"]')).toHaveText("+");
});

test("progress action cancels cleanly and produces a downloadable report", async ({ page }) => {
  await page.goto("/components/ui-button?example=Progress%20action", {
    waitUntil: "domcontentloaded",
  });
  const frame = page.frameLocator("iframe.stage-frame");
  await expect(frame.locator("#export-progress")).toBeVisible();
  expect((await frame.locator("#export-progress").boundingBox())!.width).toBeLessThanOrEqual(24);
  expect(
    (await frame.getByRole("button", { name: "Export report", exact: true }).boundingBox())!.height,
  ).toBeLessThanOrEqual(40);
  await frame.getByRole("button", { name: "Export report", exact: true }).click();
  await frame.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(frame.locator("#export-result")).toHaveText("Export cancelled");
  await frame.getByRole("button", { name: "Export report", exact: true }).click();
  const link = frame.getByRole("link", { name: "Download report.csv" });
  await expect(link).toBeVisible();
  expect(
    await link.evaluate(async (node) => (await fetch((node as HTMLAnchorElement).href)).text()),
  ).toBe("Document,Status\nRelease notes,Reviewed\nDesign notes,Ready\n");
});

test("range fill stays between its handles across direction and orientation", async ({ page }) => {
  await page.goto("/components/ui-slider?example=Range");
  const host = page.locator('iframe[data-variant="Range"]');
  await host.scrollIntoViewIfNeeded();
  const frame = page.frameLocator('iframe[data-variant="Range"]');
  await expect(frame.locator("html")).toHaveAttribute("data-example-ready", "true");
  const slider = frame.locator("ui-slider");
  for (const orientation of ["horizontal", "vertical"]) {
    for (const reversed of [false, true]) {
      for (const dir of ["ltr", "rtl"]) {
        const bounds = await slider.evaluate(
          async (element, state) => {
            element.setAttribute("orientation", state.orientation);
            element.toggleAttribute("reversed", state.reversed);
            element.setAttribute("dir", state.dir);
            await (element as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
            const box = (part: string) =>
              element.shadowRoot!.querySelector(`[part~="${part}"]`)!.getBoundingClientRect();
            const start = box("start-thumb"),
              end = box("end-thumb"),
              fill = box("indicator");
            const vertical = state.orientation === "vertical";
            return {
              centers: vertical
                ? [start.y + start.height / 2, end.y + end.height / 2]
                : [start.x + start.width / 2, end.x + end.width / 2],
              fill: vertical ? [fill.top, fill.bottom] : [fill.left, fill.right],
            };
          },
          { orientation, reversed, dir },
        );
        expect(Math.abs(bounds.fill[0]! - Math.min(...bounds.centers))).toBeLessThan(1);
        expect(Math.abs(bounds.fill[1]! - Math.max(...bounds.centers))).toBeLessThan(1);
      }
    }
  }
});
