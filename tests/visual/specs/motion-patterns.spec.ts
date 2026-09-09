import { expect, test } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`motion examples replay, stop, and preserve feedback with ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/components/ui-motion");
    const gallery = page.frameLocator('iframe[data-variant="Recipe gallery"]');
    await expect(gallery.locator("html")).toHaveAttribute("data-example-ready", "true");
    const spin = gallery.locator('[data-recipe="spin"]');
    await spin.getByRole("button").click();
    await expect(spin.locator("ui-motion")).toHaveAttribute("state", "loading");
    await spin.getByRole("button").click();
    await expect(spin.locator("ui-motion")).toHaveAttribute("state", "idle");
    await page.locator('iframe[data-variant="States and lifecycle"]').scrollIntoViewIfNeeded();
    const lifecycle = page.frameLocator('iframe[data-variant="States and lifecycle"]');
    await expect(lifecycle.locator("html")).toHaveAttribute("data-example-ready", "true");
    await lifecycle.getByRole("button", { name: "entering", exact: true }).click();
    await expect(lifecycle.locator("#motion-events")).toContainText("Finished · entering");
    if (reducedMotion === "reduce")
      await expect(lifecycle.locator("#motion-events")).toContainText("reduced motion");
    await lifecycle.getByRole("button", { name: "entering", exact: true }).click();
    await expect(lifecycle.locator("#motion-events")).toContainText("Finished · entering");
    await lifecycle.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(lifecycle.locator("#motion-events")).toHaveText("Idle · reset");
    await page.locator('iframe[data-variant="Custom SVG motion"]').scrollIntoViewIfNeeded();
    const custom = page.frameLocator('iframe[data-variant="Custom SVG motion"]');
    await expect(custom.locator("html")).toHaveAttribute("data-example-ready", "true");
    await custom.getByRole("button", { name: "Replay checkmark" }).click();
    await expect(custom.locator("#draw-status")).toHaveText("Checkmark complete");
    await page.locator('iframe[data-variant="Gesture feedback"]').scrollIntoViewIfNeeded();
    const feedback = page.frameLocator('iframe[data-variant="Gesture feedback"]');
    await expect(feedback.locator("html")).toHaveAttribute("data-example-ready", "true");
    const action = feedback.getByRole("button", { name: "Check again" });
    await action.click();
    await expect(feedback.locator("#review-status")).toContainText("Review 1");
    await action.press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");
    await expect(feedback.locator("#review-status")).toContainText("Review 2");
  });
}

test("motion composition selects layers, changes sequence origin, and reveals content", async ({
  page,
}) => {
  await page.goto("/components/ui-motion?example=Scene%20layers");
  const layers = page.frameLocator('iframe[data-variant="Scene layers"]');
  await expect(layers.locator("html")).toHaveAttribute("data-example-ready", "true");
  await layers.getByRole("combobox", { name: "Animate layer" }).click();
  await layers.getByRole("option", { name: "indicator", exact: true }).click();
  await layers.getByRole("button", { name: "Replay layer" }).click();
  await expect(layers.locator("#layer-scene")).toHaveAttribute("target", "indicator");
  await page.locator('iframe[data-variant="Stagger origins"]').scrollIntoViewIfNeeded();
  const sequence = page.frameLocator('iframe[data-variant="Stagger origins"]');
  await expect(sequence.locator("html")).toHaveAttribute("data-example-ready", "true");
  await sequence.getByRole("combobox", { name: "Stagger origin" }).click();
  await sequence.getByRole("option", { name: "center", exact: true }).click();
  await sequence.getByRole("button", { name: "Replay sequence" }).click();
  const delays = await sequence
    .locator("ui-stagger > ui-motion")
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).style.getPropertyValue("--mash-stagger-delay")),
    );
  expect(delays).toEqual(["140ms", "70ms", "0ms", "70ms", "140ms"]);
  await page.locator('iframe[data-variant="Nested motion and reveal"]').scrollIntoViewIfNeeded();
  const nested = page.frameLocator('iframe[data-variant="Nested motion and reveal"]');
  await expect(nested.locator("html")).toHaveAttribute("data-example-ready", "true");
  const toggle = nested.getByRole("button", { name: "Details", exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(nested.getByText("Small improvements, ready to share.")).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(nested.getByText("Small improvements, ready to share.")).toBeHidden();
});
