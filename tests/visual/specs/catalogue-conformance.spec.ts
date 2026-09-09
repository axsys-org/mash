import { expect, test } from "@playwright/test";

import uiManifest from "../../../packages/components/custom-elements.json" with { type: "json" };

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

const tags = ([uiManifest] as Manifest[])
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
      await expect(frame.locator("html")).toHaveAttribute("data-stage-ready", "true", {
        timeout: 15000,
      });
      // Passthrough timing boundaries intentionally have no CSS box. Their
      // animated children are the rendered surface covered by this check.
      const components = frame.locator(tag === "ui-stagger" ? "ui-stagger > ui-motion" : tag);
      await expect(components.first()).toBeAttached();
      let visibleIndex = -1;
      await expect
        .poll(async () => {
          const result = await components.evaluateAll((nodes) => {
            const visible = nodes.findIndex((node) => {
              const element = node as HTMLElement;
              const style = getComputedStyle(element);
              const hostBounds = element.getBoundingClientRect();
              const part = element.shadowRoot?.querySelector<HTMLElement>("[part~='root'], [part]");
              const partBounds = part?.getBoundingClientRect();
              const bounds =
                hostBounds.width > 0 && hostBounds.height > 0 ? hostBounds : partBounds;
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                Boolean(bounds && bounds.width > 0 && bounds.height > 0)
              );
            });
            const first = nodes[0] as HTMLElement | undefined;
            const root = first?.shadowRoot?.querySelector<HTMLElement>("[part~='root']");
            return {
              visible,
              ready: visible >= 0 || Boolean(root?.hidden && root.getAttribute("aria-hidden")),
            };
          });
          visibleIndex = result.visible;
          return result.ready;
        })
        .toBe(true);
      const component = visibleIndex >= 0 ? components.nth(visibleIndex) : components.first();

      const intentionallyHeadless = await component.evaluate((node) => {
        const root = node.shadowRoot?.querySelector<HTMLElement>("[part~='root'], [part]");
        return Boolean(root?.hidden && root.getAttribute("aria-hidden") === "true");
      });

      if (intentionallyHeadless) {
        await expect(component).toBeHidden();
        expect(errors).toEqual([]);
        return;
      }

      const geometry = await component.evaluate((node) => {
        const hostBounds = node.getBoundingClientRect();
        const root = node.shadowRoot?.querySelector<HTMLElement>("[part~='root'], [part]");
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
