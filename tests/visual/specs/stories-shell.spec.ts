import { expect, test } from "@playwright/test";

const stories = [
  ["characters", ".characters-window"],
  ["studio", ".studio"],
  ["command-center", ".launcher-window"],
  ["documents", "#documents-title"],
  ["projects", "#issue-content"],
  ["commons", ".community-app"],
] as const;
for (const [id, selector] of stories)
  for (const theme of ["light", "dark"]) {
    test(`${id} opens directly with bounded layout and registered controls (${theme})`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`/stories/${id}?theme=${theme}`);
      await expect(page.locator(selector)).toBeVisible();
      await expect(page.locator(".story-mount")).not.toHaveAttribute("aria-busy", "true");
      await expect(page.locator(".story-mount")).not.toContainText(
        "This workspace could not open.",
      );
      const result = await page.evaluate(() => ({
        undefined: [...document.querySelectorAll(".story-mount *")]
          .filter((node) => node.localName.includes("-") && !customElements.get(node.localName))
          .map((node) => node.localName),
        selects: document.querySelectorAll(".story-mount select").length,
        overflow: document.documentElement.scrollWidth - innerWidth,
        top: document.querySelector(".site-header")!.getBoundingClientRect().top,
      }));
      expect(result.undefined).toEqual([]);
      expect(result.selects).toBe(0);
      expect(result.overflow).toBeLessThanOrEqual(2);
      expect(result.top).toBe(0);
      expect(errors).toEqual([]);
      await page.screenshot({ path: test.info().outputPath(`${id}-${theme}.png`) });
      expect(
        await page.locator(".site-header").evaluate((node) => node.getBoundingClientRect().top),
      ).toBe(0);
    });
  }
test("Stories and component navigation share one document and release workspace owners", async ({
  page,
}) => {
  await page.goto("/stories");
  await expect(page.locator(".story-card")).toHaveCount(6);
  const origin = await page.evaluate(() => performance.timeOrigin);
  await page.locator('a.story-card[href="/stories/command-center"]').click();
  await expect(page.locator(".launcher-window")).toBeVisible();
  await page.getByRole("link", { name: "Components", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Button", exact: true })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+K");
  await expect(page.locator(".launcher-window")).toHaveCount(0);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
});
