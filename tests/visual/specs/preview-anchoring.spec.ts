import { expect, test } from "@playwright/test";

test("late content above an engaged example preserves the visible control position", async ({
  page,
}) => {
  await page.goto("/components/ui-chart?example=Custom%20marks%20%C2%B7%20schedule&theme=dark");
  const frame = page.frameLocator('iframe[data-variant="Custom marks · schedule"]');
  const renderer = frame.getByRole("combobox", { name: "Renderer", exact: true });
  await expect(frame.locator("#custom-plot svg")).toBeVisible();
  const previousName = await page.evaluate(() => {
    const frames = [...document.querySelectorAll<HTMLIFrameElement>(".variant-frame")];
    const index = frames.findIndex((item) => item.dataset.variant === "Custom marks · schedule");
    return frames[index - 1]!.dataset.variant!;
  });
  const preceding = page.locator(`iframe[data-variant="${previousName}"]`);
  await preceding.scrollIntoViewIfNeeded();
  await expect(preceding.contentFrame().locator("ui-chart svg")).toBeVisible();
  await page.locator('iframe[data-variant="Custom marks · schedule"]').scrollIntoViewIfNeeded();
  await renderer.click();
  await frame.getByRole("option", { name: "SVG", exact: true }).click();
  await expect(renderer).toBeFocused();
  const before = (await renderer.boundingBox())!;
  // A real body resize in an earlier mounted frame exercises the preview's
  // ResizeObserver, as a delayed chart/image or expanded content would.
  const initialHeight = await page.evaluate((variantName) => {
    const first = document.querySelector<HTMLIFrameElement>(
      `iframe[data-variant="${variantName}"]`,
    )!;
    const block = first.contentDocument!.createElement("div");
    block.dataset.latePreviewContent = "";
    block.style.height = "400px";
    const old = first.height;
    first.contentDocument!.body.append(block);
    return old;
  }, previousName);
  await expect(preceding).not.toHaveAttribute("height", initialHeight);
  await expect
    .poll(async () => Math.abs((await renderer.boundingBox())!.y - before.y))
    .toBeLessThan(2);
  await renderer.click();
  await frame.getByRole("option", { name: "Canvas", exact: true }).click();
  await expect(frame.locator("#custom-plot canvas")).toBeVisible();
  // An intentionally scrolled-away old focus must not drag the reader back.
  const afterScroll = await page.evaluate((variantName) => {
    const viewport = document.querySelector<HTMLElement>(".preview-viewport")!;
    viewport.scrollTop = 0;
    const first = document.querySelector<HTMLIFrameElement>(
      `iframe[data-variant="${variantName}"]`,
    )!;
    first.contentDocument!.querySelector<HTMLElement>("[data-late-preview-content]")!.style.height =
      "600px";
    return { scrollTop: viewport.scrollTop, height: first.height };
  }, previousName);
  await expect(preceding).not.toHaveAttribute("height", afterScroll.height);
  await expect
    .poll(() => page.locator(".preview-viewport").evaluate((el) => el.scrollTop))
    .toBe(afterScroll.scrollTop);
});

test("late content preserves an example before the reader first focuses it", async ({ page }) => {
  await page.goto("/components/ui-motion?example=Custom%20SVG%20motion");
  const current = page.locator('iframe[data-variant="Custom SVG motion"]');
  await current.scrollIntoViewIfNeeded();
  const frame = current.contentFrame();
  await expect(frame.locator("html")).toHaveAttribute("data-example-ready", "true");
  const button = frame.getByRole("button", { name: "Replay checkmark" });
  await button.scrollIntoViewIfNeeded();
  const earlier = page.locator('iframe[data-variant="Recipe gallery"]');
  await expect(earlier.contentFrame().locator("html")).toHaveAttribute(
    "data-example-ready",
    "true",
  );
  const before = (await button.boundingBox())!;
  const oldHeight = await earlier.getAttribute("height");
  await earlier.evaluate((element) => {
    const document = (element as HTMLIFrameElement).contentDocument!;
    const block = document.createElement("div");
    block.style.height = "400px";
    document.body.append(block);
  });
  await expect(earlier).not.toHaveAttribute("height", oldHeight!);
  await expect
    .poll(async () => Math.abs((await button.boundingBox())!.y - before.y))
    .toBeLessThan(2);
  await button.click();
  await expect(frame.locator("#draw-status")).toHaveText("Checkmark complete");
});
