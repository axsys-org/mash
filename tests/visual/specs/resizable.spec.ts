import { expect, test } from "@playwright/test";

for (const [example, key, orientation] of [
  ["Split panels", "ArrowRight", "vertical"],
  ["Vertical", "ArrowDown", "horizontal"],
]) {
  test(`resizes ${example} with the keyboard and exposes its constraints`, async ({ page }) => {
    await page.goto(`/components/ui-resizable?example=${encodeURIComponent(example!)}&theme=dark`);
    const stage = page.frameLocator("iframe.stage-frame");
    const control = stage.getByRole("separator");
    await expect(control).toHaveAttribute("aria-orientation", orientation!);
    const before = Number(await control.getAttribute("aria-valuenow"));
    const minimum = Number(await control.getAttribute("aria-valuemin"));
    expect(before).toBeGreaterThan(minimum);
    await control.focus();
    await page.keyboard.press(key!);
    await expect
      .poll(async () => Number(await control.getAttribute("aria-valuenow")))
      .toBeGreaterThan(before);
  });
}

test("dragging stays within the authored canvas", async ({ page }) => {
  await page.goto("/components/ui-draggable");
  const stage = page.frameLocator("iframe.stage-frame");
  const card = stage.locator("ui-card");
  const before = (await card.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 32, before.y + before.height / 2 + 24, {
    steps: 5,
  });
  await page.mouse.up();
  await expect.poll(async () => (await card.boundingBox())!.y).toBeGreaterThan(before.y);
  const canvas = (await stage.locator(".mash-panel").boundingBox())!;
  const after = (await card.boundingBox())!;
  expect(after.y + after.height).toBeLessThanOrEqual(canvas.y + canvas.height + 1);
});
