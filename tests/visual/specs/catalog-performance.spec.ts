import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("basic catalogue preview stays bounded and navigation reuses its document", async ({
  page,
}) => {
  await page.goto("/components/ui-button", { waitUntil: "domcontentloaded" });
  const stage = page.frameLocator("iframe.stage-frame");
  await expect(stage.getByRole("button", { name: "Default", exact: true })).toBeVisible();
  const startup = await page.evaluate(() => ({
    readyMs: performance.now(),
    timeOrigin: performance.timeOrigin,
    resources: performance.getEntriesByType("resource").map((entry) => {
      const resource = entry as PerformanceResourceTiming;
      return { url: resource.name, bytes: resource.decodedBodySize, type: resource.initiatorType };
    }),
    mountedFrames: [...document.querySelectorAll("iframe")].filter((frame) =>
      frame.hasAttribute("src"),
    ).length,
  }));
  const previewResources = await Promise.all(
    page
      .frames()
      .filter((frame) => frame !== page.mainFrame() && frame.url().includes("/fixture.html"))
      .map((frame) =>
        frame.evaluate(() =>
          performance.getEntriesByType("resource").map((entry) => {
            const resource = entry as PerformanceResourceTiming;
            return {
              url: resource.name,
              bytes: resource.decodedBodySize,
              type: resource.initiatorType,
            };
          }),
        ),
      ),
  );
  const uniqueResources = [
    ...new Map(
      [...startup.resources, ...previewResources.flat()].map((resource) => [
        resource.url,
        resource,
      ]),
    ).values(),
  ];
  const scripts = uniqueResources.filter(
    (resource) => resource.type === "script" || /\.js(?:\?|$)/.test(resource.url),
  );
  const scriptBytes = scripts.reduce((total, resource) => total + resource.bytes, 0);
  await page.getByRole("link", { name: "Tabs", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tabs", exact: true })).toBeVisible();
  const reusedDocument = await page.evaluate(
    (origin) => performance.timeOrigin === origin,
    startup.timeOrigin,
  );
  const report = { ...startup, scriptBytes, reusedDocument };
  if (process.env.MASH_PERF_REPORT)
    await writeFile(process.env.MASH_PERF_REPORT, JSON.stringify(report, null, 2));
  if (!process.env.MASH_PERF_BASELINE) {
    expect(scriptBytes).toBeLessThan(300_000);
    expect(startup.mountedFrames).toBeLessThanOrEqual(4);
    expect(reusedDocument).toBe(true);
    expect(
      scripts.some((resource) =>
        /renderer|chart-engine|blocksuite|shrine|stories|studio|launcher|community|documents|issues/.test(
          resource.url,
        ),
      ),
    ).toBe(false);
  }
});
