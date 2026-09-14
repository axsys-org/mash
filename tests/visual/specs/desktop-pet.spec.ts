import { expect, test } from "@playwright/test";

test("desktop pet can be moved, paused, hidden and restored across reloads and viewport sizes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/stories/desktop");
  const pet = page.locator(".desktop-pet");
  const body = page.getByRole("button", { name: "Pet your desktop companion" });
  await expect(body).toBeVisible();
  await expect
    .poll(() => pet.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(281);
  const start = (await body.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2 - 200, start.y + start.height / 2 - 120, {
    steps: 12,
  });
  await page.mouse.up();
  expect((await body.boundingBox())!.x).toBeLessThan(start.x - 150);
  await expect(page.locator(".desktop")).not.toHaveAttribute("data-pet-dragging");
  const moved = (await pet.boundingBox())!;
  await body.focus();
  await page.getByRole("button", { name: "Pause pet", exact: true }).click();
  await expect(pet.locator("canvas")).toBeVisible();
  await expect(pet.locator("img")).toBeHidden();
  await page.reload();
  await expect(pet.locator("canvas")).toBeVisible();
  expect((await pet.boundingBox())!.x).toBeCloseTo(moved.x, 0);
  await body.focus();
  await body.press("ArrowLeft");
  expect((await pet.boundingBox())!.x).toBeLessThan(moved.x - 10);
  await page.getByRole("button", { name: "Hide desktop pet", exact: true }).click();
  await expect(pet).toBeHidden();
  await page.reload();
  await expect(pet).toBeHidden();
  await page.getByRole("button", { name: "Desktop settings", exact: true }).click();
  await page.getByRole("button", { name: "Show pet", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(pet).toBeVisible();
  await body.focus();
  await page.getByRole("button", { name: "Resume pet", exact: true }).click();
  await expect(pet.locator("img")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 660 });
  await expect
    .poll(async () => {
      const box = (await pet.boundingBox())!;
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 660;
    })
    .toBe(true);
});

test("desktop pet starts still when reduced motion is preferred", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/stories/desktop");
  await expect(page.locator(".desktop-pet canvas")).toBeVisible();
  await expect(page.locator(".desktop-pet img")).toBeHidden();
});
