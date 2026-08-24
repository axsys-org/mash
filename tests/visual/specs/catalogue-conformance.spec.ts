import { expect, test } from "@playwright/test";

import uiManifest from "../../../packages/components/custom-elements.json" with { type: "json" };
import shrineManifest from "../../../packages/shrine-components/custom-elements.json" with { type: "json" };

interface ManifestDeclaration {
  customElement?: boolean;
  tagName?: string;
}

interface ManifestModule {
  declarations?: ManifestDeclaration[];
}

interface Manifest {
  modules?: ManifestModule[];
}

const tags = ([uiManifest, shrineManifest] as Manifest[])
  .flatMap((manifest) => manifest.modules ?? [])
  .flatMap((module) => module.declarations ?? [])
  .filter(
    (declaration): declaration is ManifestDeclaration & { tagName: string } =>
      declaration.customElement === true && Boolean(declaration.tagName),
  )
  .map((declaration) => declaration.tagName)
  .sort();

const themes = ["light", "dark"] as const;

for (const tag of tags) {
  for (const theme of themes) {
    test(`${tag} ${theme} catalogue conformance`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      await page.goto(`/components/${tag}?theme=${theme}`);
      const frame = page.frameLocator("iframe.stage-frame");
      const component = frame.locator(tag).first();
      await expect(component).toBeAttached();
      await expect(component).toBeVisible();

      const geometry = await component.evaluate((node) => {
        const hostBounds = node.getBoundingClientRect();
        const root = node.shadowRoot?.querySelector<HTMLElement>("[part~='root']");
        const target = hostBounds.width > 0 && hostBounds.height > 0 ? node : root;
        const bounds = target?.getBoundingClientRect() ?? hostBounds;
        const documentElement = node.ownerDocument.documentElement;
        return {
          width: bounds.width,
          height: bounds.height,
          finite: [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite),
          overflowInline: documentElement.scrollWidth - documentElement.clientWidth,
        };
      });

      expect(geometry.finite).toBe(true);
      expect(geometry.width).toBeGreaterThan(0);
      expect(geometry.height).toBeGreaterThan(0);
      expect(geometry.overflowInline).toBeLessThanOrEqual(2);
      expect(errors).toEqual([]);

      if (process.env.MASH_CAPTURE_AUDIT === "1") {
        const path = testInfo.outputPath(`${tag}-${theme}.png`);
        await page.locator("iframe.stage-frame").screenshot({ path });
        await testInfo.attach(`${tag}-${theme}`, { path, contentType: "image/png" });
      }
    });
  }
}

const compactSurfaces = [
  "sh-triptych",
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

      if (tag === "sh-triptych") {
        const regions = await component.evaluate((node) => {
          const shell = node.shadowRoot?.querySelector<HTMLElement>("[part~='shell']");
          const sidebar = node.shadowRoot?.querySelector<HTMLElement>("[part~='sidebar']");
          const main = node.shadowRoot?.querySelector<HTMLElement>("[part~='main']");
          const inspector = node.shadowRoot?.querySelector<HTMLElement>("[part~='inspector']");
          return {
            shellWidth: shell?.getBoundingClientRect().width ?? 0,
            widths: [sidebar, main, inspector].map(
              (region) => region?.getBoundingClientRect().width ?? 0,
            ),
          };
        });
        expect(regions.shellWidth).toBeGreaterThan(0);
        expect(regions.widths.every((width) => width > 0)).toBe(true);
      }
    });
  }
}
