import { expect, test, type Locator } from "@playwright/test";

// Chromium's cross-frame box API omits an ancestor CSS zoom. Map the child's
// CSS viewport into the actual iframe box before driving a physical pointer.
async function pageBounds(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  return locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const frame = node.ownerDocument.defaultView!.frameElement as HTMLIFrameElement;
    const outer = frame.getBoundingClientRect();
    const scale = outer.width / frame.offsetWidth;
    return {
      x: outer.left + (frame.clientLeft + rect.left) * scale,
      y: outer.top + (frame.clientTop + rect.top) * scale,
      width: rect.width * scale,
      height: rect.height * scale,
    };
  });
}

for (const zoom of [75, 100])
  test(`a compact dock tab follows the pointer at ${zoom}% while siblings make room`, async ({
    page,
  }, testInfo) => {
    await page.goto("/components/ui-dock?example=Workspace%20panels", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Expand preview", exact: true }).click();
    if (zoom !== 100) {
      await page.getByRole("combobox", { name: "Preview zoom", exact: true }).click();
      await page.getByRole("option", { name: `${zoom}%`, exact: true }).click();
      await expect(page.locator(".showcase-variants")).toHaveCSS("zoom", String(zoom / 100));
    }
    const frame = page.frameLocator("iframe.stage-frame");
    const draft = frame.getByRole("textbox", { name: "Working notes", exact: true });
    await draft.fill("Keep this draft while the tab moves.");
    const source = frame.getByRole("tab", { name: "Notes", exact: true });
    const start = await pageBounds(source);
    const end = await pageBounds(frame.getByRole("tab", { name: "Console", exact: true }));
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    const targetX = end.x + end.width + 8;
    const targetY = start.y + start.height / 2;
    await page.mouse.move(targetX, targetY, { steps: 12 });
    const preview = frame.locator('[part="drag-preview"]');
    await expect(preview).toBeVisible();
    const bounds = await pageBounds(preview);
    expect(bounds.width).toBeLessThanOrEqual(start.width + 1);
    expect(bounds.height).toBeLessThanOrEqual(start.height + 1);
    expect(Math.abs(bounds.x + bounds.width / 2 - targetX)).toBeLessThan(3);
    await expect(frame.locator('[part="drop-target"]')).toHaveCount(0);
    await expect
      .poll(() =>
        frame
          .getByRole("tab", { name: "Preview", exact: true })
          .evaluate((node) => parseFloat(getComputedStyle(node).translate) || 0),
      )
      .toBeLessThan(-2);
    await page.screenshot({ path: testInfo.outputPath("dock-tab-drag.png") });
    await page.mouse.up();
    await expect(frame.locator('[role="tab"]')).toHaveText(["Preview", "Console", "Notes"]);
    await expect(draft).toHaveValue("Keep this draft while the tab moves.");
    await expect(preview).toHaveCount(0);
  });

test("edge docking stays compact and Escape cancels without touching panel state", async ({
  page,
}, testInfo) => {
  await page.goto("/components/ui-dock?example=Workspace%20panels", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Expand preview", exact: true }).click();
  const frame = page.frameLocator("iframe.stage-frame");
  const draft = frame.getByRole("textbox", { name: "Working notes", exact: true });
  await draft.fill("Still here after cancel and split.");
  const source = frame.getByRole("tab", { name: "Notes", exact: true });
  const start = (await source.boundingBox())!;
  const body = (await frame.locator('ui-dock [part="body"]').boundingBox())!;
  const dragToEdge = async () => {
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(body.x + body.width - 10, body.y + body.height / 2, { steps: 12 });
  };
  await dragToEdge();
  const hint = frame.locator('[part="drop-target"]');
  await expect(hint).toHaveText("Split right");
  const bounds = (await hint.boundingBox())!;
  expect(bounds.width).toBeLessThan(160);
  expect(bounds.height).toBeLessThan(40);
  const ghost = (await frame.locator('[part="drag-preview"]').boundingBox())!;
  expect(bounds.y + bounds.height <= ghost.y || bounds.y >= ghost.y + ghost.height).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("dock-edge-intent.png") });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(hint).toHaveCount(0);
  await expect(frame.locator('[part="drag-preview"]')).toHaveCount(0);
  await expect(frame.getByRole("separator")).toHaveCount(0);
  await expect(draft).toHaveValue("Still here after cancel and split.");
  await dragToEdge();
  await page.mouse.up();
  await expect(frame.getByRole("separator")).toHaveCount(1);
  await expect(draft).toHaveValue("Still here after cancel and split.");
});

test("moving a tab between groups retains its existing checked controls", async ({ page }) => {
  await page.goto("/components/ui-dock?example=Moving%20between%20groups", {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Expand preview", exact: true }).click();
  const frame = page.frameLocator("iframe.stage-frame");
  const tasks = frame.getByRole("tab", { name: "Tasks", exact: true });
  await tasks.click();
  const checkbox = frame.getByRole("checkbox", { name: "Review typography", exact: true });
  await checkbox.check();
  const original = await checkbox.elementHandle();
  const start = (await tasks.boundingBox())!;
  const end = (await frame.getByRole("tab", { name: "Activity", exact: true }).boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width + 8, end.y + end.height / 2, { steps: 15 });
  await expect(frame.locator('[part="drop-target"]')).toHaveCount(0);
  await page.mouse.up();
  await expect(frame.locator('[part="group"]').first().getByRole("tab")).toHaveText(["Brief"]);
  await expect(frame.locator('[part="group"]').last().getByRole("tab")).toHaveText([
    "Review",
    "Activity",
    "Tasks",
  ]);
  await expect(checkbox).toBeChecked();
  expect(await original!.evaluate((node) => node.isConnected)).toBe(true);
});
