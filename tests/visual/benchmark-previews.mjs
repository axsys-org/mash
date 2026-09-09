import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const results = [];
const browser = await chromium.launch();
try {
  for (const tag of ["ui-tabs", "ui-chart"])
    for (const mode of process.argv[2] ? [process.argv[2]] : ["frames", "shared"]) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      const session = await context.newCDPSession(page);
      await session.send("Performance.enable");
      await page.goto(
        `${process.env.MASH_CATALOG_URL ?? "http://localhost:5176"}/components/${tag}?preview=${mode}`,
        { waitUntil: "domcontentloaded" },
      );
      const shared = mode === "shared";
      const frame = page.frameLocator("iframe.stage-frame");
      await frame
        .locator(shared ? '[data-example-ready="true"]' : 'html[data-example-ready="true"]')
        .first()
        .waitFor();
      await frame
        .locator(tag === "ui-chart" ? "ui-chart svg" : "ui-tab")
        .first()
        .waitFor();
      const ready = await page.evaluate(() => performance.now());
      async function snapshot() {
        await session.send("HeapProfiler.collectGarbage");
        const metrics = Object.fromEntries(
          (await session.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]),
        );
        const resources = (
          await Promise.all(
            page
              .frames()
              .map((f) =>
                f
                  .evaluate(() =>
                    performance
                      .getEntriesByType("resource")
                      .map((r) => ({ url: r.name, bytes: r.decodedBodySize })),
                  )
                  .catch(() => []),
              ),
          )
        ).flat();
        const unique = [
          ...resources
            .reduce((map, r) => {
              if (!map.has(r.url) || map.get(r.url).bytes < r.bytes) map.set(r.url, r);
              return map;
            }, new Map())
            .values(),
        ];
        return {
          frames: page.frames().length - 1,
          loadedFrames: page.frames().filter((f) => f.url().includes("fixture")).length,
          documents: metrics.Documents,
          nodes: metrics.Nodes,
          heapBytes: metrics.JSHeapUsedSize,
          uniqueBytes: unique.reduce((s, r) => s + r.bytes, 0),
          scriptBytes: unique
            .filter((r) => /\.js(?:\?|$)/.test(r.url))
            .reduce((s, r) => s + r.bytes, 0),
        };
      }
      const initial = await snapshot();
      if (shared) {
        const sections = frame.locator(".shared-section");
        for (let i = 0; i < (await sections.count()); i++) {
          await sections.nth(i).scrollIntoViewIfNeeded();
          await sections.nth(i).locator('[data-example-ready="true"]').waitFor();
          if (tag === "ui-chart")
            await sections.nth(i).locator("ui-chart svg,ui-chart canvas").first().waitFor();
        }
      } else {
        const frames = page.locator("iframe.variant-frame");
        for (let i = 0; i < (await frames.count()); i++) {
          await frames.nth(i).scrollIntoViewIfNeeded();
          await frames.nth(i).contentFrame().locator('html[data-example-ready="true"]').waitFor();
          if (tag === "ui-chart")
            await frames
              .nth(i)
              .contentFrame()
              .locator("ui-chart svg,ui-chart canvas")
              .first()
              .waitFor();
        }
      }
      const full = await snapshot();
      results.push({ tag, mode, readyMs: ready, initial, full });
      console.log(JSON.stringify(results.at(-1)));
      await context.close();
    }
} finally {
  await browser.close();
}
if (process.env.MASH_PERF_REPORT)
  await writeFile(process.env.MASH_PERF_REPORT, JSON.stringify(results, null, 2));
