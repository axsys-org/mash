import { expect, test, type FrameLocator, type Page } from "@playwright/test";

test.use({ contextOptions: { reducedMotion: "reduce" } });

async function openChart(page: Page, name: string, theme: string): Promise<FrameLocator> {
  await page.goto(`/components/ui-chart?example=${encodeURIComponent(name)}&theme=${theme}`);
  const frame = page.frameLocator(`iframe[data-variant="${name}"]`);
  await expect(frame.locator("#plot svg")).toBeVisible();
  return frame;
}

async function choose(frame: FrameLocator, label: string, option: string): Promise<void> {
  await frame.getByRole("combobox", { name: label, exact: true }).click();
  await frame.getByRole("option", { name: option, exact: true }).click();
}

async function paths(frame: FrameLocator): Promise<string> {
  return frame
    .locator("#plot svg path")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d")).join("\n"));
}

for (const theme of ["light", "dark"]) {
  test(`${theme}: curve and axis controls redraw the plotted geometry`, async ({ page }) => {
    const frame = await openChart(page, "Curves and axes", theme);
    const linear = await paths(frame);
    await choose(frame, "Curve", "Smooth");
    await expect.poll(() => paths(frame)).not.toBe(linear);
    const smooth = await paths(frame);
    await choose(frame, "Curve", "Step after");
    await expect.poll(() => paths(frame)).not.toBe(smooth);
    await choose(frame, "Category labels", "Every other month");
    await expect(frame.locator("#plot svg text", { hasText: /^Feb$/ })).toHaveCount(0);
    await expect(frame.locator("#plot svg text", { hasText: /^Jan$/ })).toHaveCount(1);
    await frame.getByRole("checkbox", { name: "Legend", exact: true }).uncheck();
    await expect(frame.locator("#plot svg text", { hasText: /^Desktop$/ })).toHaveCount(0);
    await expect(frame.locator('[part="error"]')).toBeHidden();
  });

  test(`${theme}: bar direction and arrangement keep source values intact`, async ({ page }) => {
    const frame = await openChart(page, "Bar arrangements", theme);
    const vertical = await paths(frame);
    await choose(frame, "Growth direction", "Left");
    await expect.poll(() => paths(frame)).not.toBe(vertical);
    const grouped = await paths(frame);
    await choose(frame, "Arrangement", "Stacked");
    await expect.poll(() => paths(frame)).not.toBe(grouped);
    await frame.getByRole("checkbox", { name: "Value labels", exact: true }).uncheck();
    await expect(frame.locator("#plot svg text", { hasText: /^186$/ })).toHaveCount(0);
    await frame.getByText("View data", { exact: true }).click();
    await expect(frame.locator("#data-rows tr").first()).toHaveText("Jan18680");
    await expect(frame.locator('[part="error"]')).toBeHidden();
  });

  test(`${theme}: gradient, width, and corners change the rendered bars`, async ({ page }) => {
    const frame = await openChart(page, "Fills and corners", theme);
    await expect(frame.locator("#plot svg linearGradient")).not.toHaveCount(0);
    await choose(frame, "Bar fill", "Solid");
    await expect(frame.locator("#plot svg linearGradient")).toHaveCount(0);
    const regular = await paths(frame);
    await choose(frame, "Bar width", "Thin");
    await expect.poll(() => paths(frame)).not.toBe(regular);
    const soft = await paths(frame);
    await choose(frame, "Corners", "Square");
    await expect.poll(() => paths(frame)).not.toBe(soft);
    await expect(frame.locator('[part="error"]')).toBeHidden();
  });

  test(`${theme}: flow controls update alignment and original-value labels`, async ({ page }) => {
    const frame = await openChart(page, "Flow alignment", theme);
    await choose(frame, "Labels", "Names and throughput");
    await expect(frame.locator("#plot svg text", { hasText: /^130 visits$/ })).toHaveCount(1);
    const justified = await paths(frame);
    await choose(frame, "Node alignment", "Left");
    await expect.poll(() => paths(frame)).not.toBe(justified);
    await expect(frame.locator("#plot svg linearGradient")).not.toHaveCount(0);
    await frame.getByRole("checkbox", { name: "Gradient ribbons", exact: true }).uncheck();
    await expect(frame.locator("#plot svg linearGradient")).toHaveCount(0);
    await frame.getByText("View data", { exact: true }).click();
    await expect(frame.locator("#data-rows tr")).toHaveCount(6);
    await expect(frame.locator("#data-rows tr").first()).toHaveText("VisitorsSearch80");
    await expect(frame.locator('[part="error"]')).toBeHidden();
  });

  test(`${theme}: live data append, empty, reset, and renderer switch stay synchronized`, async ({
    page,
  }) => {
    const frame = await openChart(page, "Live data", theme);
    await frame.getByRole("button", { name: "Add day", exact: true }).click();
    await expect(frame.locator("#chart-status")).toContainText("Added day 8");
    await frame.getByText("View data", { exact: true }).click();
    await expect(frame.locator("#data-rows tr")).toHaveCount(8);
    await expect(frame.locator("#plot svg text", { hasText: /^Day 8$/ })).toHaveCount(1);
    await frame.getByRole("button", { name: "Clear data", exact: true }).click();
    await expect(frame.locator("#data-rows tr")).toHaveCount(0);
    await expect(frame.locator("#chart-status")).toContainText("No data");
    await frame.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(frame.locator("#data-rows tr")).toHaveCount(7);
    await choose(frame, "Renderer", "Canvas");
    await expect(frame.locator('#plot [part="canvas"] canvas')).toBeVisible();
    await expect(frame.locator("#plot svg")).toHaveCount(0);
    await choose(frame, "Renderer", "SVG");
    await expect(frame.locator("#plot svg")).toBeVisible();
    await expect(frame.locator('[part="error"]')).toBeHidden();
  });
}
