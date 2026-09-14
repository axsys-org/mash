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
  test(`${theme}: custom duration marks clip without changing their source data`, async ({
    page,
  }) => {
    await page.goto(
      `/components/ui-chart?example=${encodeURIComponent("Custom marks · schedule")}&theme=${theme}`,
    );
    const frame = page.frameLocator('iframe[data-variant="Custom marks · schedule"]');
    await expect(frame.locator("#custom-plot svg")).toBeVisible();
    const before = await frame
      .locator("#custom-plot svg path")
      .evaluateAll((elements) => elements.map((path) => path.getAttribute("d")).join("|"));
    await choose(frame, "Time window", "Working hours");
    await expect
      .poll(() =>
        frame
          .locator("#custom-plot svg path")
          .evaluateAll((elements) => elements.map((path) => path.getAttribute("d")).join("|")),
      )
      .not.toBe(before);
    await frame.getByText("View data", { exact: true }).click();
    await expect(frame.locator("tbody tr").nth(1)).toHaveText("Build415");
    await choose(frame, "Renderer", "Canvas");
    await expect(frame.locator("#custom-plot canvas")).toBeVisible();
    await expect(frame.locator('[part="error"]')).toBeHidden();
  });

  test(`${theme}: custom arcs change outer radius while retaining quantities`, async ({ page }) => {
    await page.goto(
      `/components/ui-chart?example=${encodeURIComponent("Pie · variable radius")}&theme=${theme}`,
    );
    const frame = page.frameLocator('iframe[data-variant="Pie · variable radius"]');
    await expect(frame.locator("#custom-plot svg")).toBeVisible();
    const arcs = frame.locator("#custom-plot svg path");
    const before = await arcs.evaluateAll((elements) =>
      elements.map((path) => path.getAttribute("d")).join("|"),
    );
    await choose(frame, "Outer radius", "Equal radii");
    await expect
      .poll(() =>
        arcs.evaluateAll((elements) => elements.map((path) => path.getAttribute("d")).join("|")),
      )
      .not.toBe(before);
    await frame.getByText("View data", { exact: true }).click();
    await expect(frame.locator("tbody tr")).toHaveCount(6);
    await expect(frame.locator("tbody tr").first()).toHaveText("Jan186");
  });

  test(`${theme}: direct gradient gallery paints distinct bars with preserved source values`, async ({
    page,
  }) => {
    await page.goto(
      `/components/ui-chart?example=${encodeURIComponent("Bars · per-bar gradients")}&theme=${theme}`,
    );
    const frame = page.frameLocator('iframe[data-variant="Bars · per-bar gradients"]');
    await expect(frame.locator("ui-chart svg")).toBeVisible();
    await expect.poll(() => frame.locator("svg linearGradient").count()).toBeGreaterThanOrEqual(5);
    const fills = await frame
      .locator("svg linearGradient stop")
      .evaluateAll((stops) => [...new Set(stops.map((stop) => stop.getAttribute("stop-color")))]);
    expect(fills.length).toBeGreaterThanOrEqual(5);
    await frame.getByText("View data", { exact: true }).click();
    await expect(frame.locator("tbody tr")).toHaveCount(6);
    await expect(frame.locator("tbody tr").first()).toContainText("186");
    await expect(frame.locator('[part="error"]')).toBeHidden();
  });

  test(`${theme}: labeled pie and financial flow expose their actual values`, async ({ page }) => {
    await page.goto(
      `/components/ui-chart?example=${encodeURIComponent("Pie · labels")}&theme=${theme}`,
    );
    const pie = page.frameLocator('iframe[data-variant="Pie · labels"]');
    await expect(pie.locator("ui-chart svg")).toBeVisible();
    await expect(pie.locator("svg text").filter({ hasText: /Jan/ })).not.toHaveCount(0);
    await expect(pie.locator("svg text").filter({ hasText: /186/ })).not.toHaveCount(0);
    const flow = page.frameLocator('iframe[data-variant="Financial flow · period 1"]');
    await page.locator('iframe[data-variant="Financial flow · period 1"]').scrollIntoViewIfNeeded();
    await expect(flow.locator("ui-chart svg")).toBeVisible();
    await expect(flow.locator("svg text").filter({ hasText: /\$120m/ })).not.toHaveCount(0);
    await flow.getByText("View data", { exact: true }).click();
    await expect(flow.locator("tbody tr")).toHaveCount(7);
    await expect(flow.locator("tbody tr").first()).toHaveText("RevenueCost of sales72");
  });

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
