import { expect, test } from "@playwright/test";

// Full-size registration, rendering, errors and overflow are covered by the
// all-example sweep. These compositions need additional small-screen checks.
const themes = ["light", "dark"] as const;

const compactSurfaces = [
  "ui-color-picker",
  "ui-dialog",
  "ui-scroll-area",
  "ui-toolbar",
  "ui-tree",
] as const;

for (const tag of compactSurfaces) {
  for (const theme of themes) {
    test(`${tag} ${theme} compact viewport`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/components/${tag}?theme=${theme}`);
      const frame = page.frameLocator("iframe.stage-frame");
      const component = frame.locator(tag).first();
      await expect(component).toBeVisible();

      const geometry = await component.evaluate((node) => {
        const documentElement = node.ownerDocument.documentElement;
        const bounds = node.getBoundingClientRect();
        return {
          left: bounds.left,
          right: bounds.right,
          width: bounds.width,
          viewport: documentElement.clientWidth,
          overflowInline: documentElement.scrollWidth - documentElement.clientWidth,
        };
      });

      expect(geometry.width).toBeGreaterThan(0);
      expect(geometry.left).toBeGreaterThanOrEqual(-2);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 2);
      expect(geometry.overflowInline).toBeLessThanOrEqual(2);

      if (tag === "ui-scroll-area") {
        const scroll = await component.evaluate((node) => {
          const viewport = node.shadowRoot?.querySelector<HTMLElement>("[part~='viewport']");
          return {
            bounded: Boolean(viewport && viewport.clientHeight < viewport.scrollHeight),
            height: viewport?.clientHeight ?? 0,
          };
        });
        expect(scroll.bounded).toBe(true);
        expect(scroll.height).toBeGreaterThan(0);
      }
    });
  }
}
