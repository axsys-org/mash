import { expect, test } from "@playwright/test";

test("catalogue chrome and stage are realized by semantic utilities", async ({ page }) => {
  await page.goto("/components/ui-tree?theme=dark");

  const dark = page.locator(".segment", { hasText: "dark" });
  await expect(dark).toBeVisible();
  await expect(dark).toHaveClass(/bg-action/);
  await expect(dark).not.toHaveClass(/bg-transparent/);

  const colors = await dark.evaluate((node) => {
    const styles = getComputedStyle(node);
    const root = getComputedStyle(document.documentElement);
    const probe = document.createElement("span");
    probe.style.backgroundColor = root.getPropertyValue("--color-action").trim();
    document.body.append(probe);
    const semantic = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return {
      actual: styles.backgroundColor,
      semantic,
    };
  });
  expect(colors.actual).toBe(colors.semantic);

  const stageBody = page.frameLocator("iframe.stage-frame").locator("body");
  await expect(stageBody).toHaveClass(/bg-canvas/);
  await expect(stageBody).toHaveClass(/type-body/);
  await expect(stageBody).toHaveCSS("font-size", "13px");
  await expect(stageBody).toHaveCSS("line-height", "16px");

  const legacyStylesheets = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => /(?:catalog|stage)\.css(?:$|\?)/.test(name)),
  );
  expect(legacyStylesheets).toEqual([]);

  await page.goto("/components/ui-bubble?example=Message+rows");
  const outgoingBubble = page
    .frameLocator("iframe.stage-frame")
    .locator('ui-bubble[alignment="end"]')
    .first();
  await expect(outgoingBubble).toBeVisible();
  await expect
    .poll(() =>
      outgoingBubble.evaluate((node) => {
        const root = node.shadowRoot?.querySelector<HTMLElement>('[part~="root"]');
        return root ? getComputedStyle(root).alignSelf : "";
      }),
    )
    .toBe("flex-end");
});

test("material utilities keep thickness, vibrancy, and accessibility policy independent", async ({
  page,
}) => {
  await page.goto("/components/ui-card?example=Background%20materials&theme=dark&vibrancy=auto");

  const preview = page.frameLocator("iframe.stage-frame");
  const materials = preview.locator(".example-material[class*='material-']");
  await expect(materials).toHaveCount(5);

  const auto = await materials.first().evaluate(async (material) => {
    const card = material.querySelector<HTMLElement>("ui-card")!;
    const title = card.shadowRoot!.querySelector<HTMLElement>('[part~="title"]')!;
    const description = card.shadowRoot!.querySelector<HTMLElement>('[part~="description"]')!;
    const body = material.querySelector<HTMLElement>(".vibrant-label-primary")!;
    const materialProbe = document.createElement("section");
    materialProbe.className = "material-thin";
    materialProbe.innerHTML = '<ui-menu-item value="rename">Rename project</ui-menu-item>';
    const opaqueProbe = document.createElement("ui-menu-item");
    opaqueProbe.textContent = "Opaque command";
    material.parentElement!.append(materialProbe, opaqueProbe);
    await customElements.whenDefined("ui-menu-item");
    await Promise.all([
      (materialProbe.firstElementChild as { updateComplete?: Promise<unknown> }).updateComplete,
      (opaqueProbe as unknown as { updateComplete?: Promise<unknown> }).updateComplete,
    ]);
    const materialLabel =
      materialProbe.firstElementChild!.shadowRoot!.querySelector<HTMLElement>('[part~="label"]')!;
    const opaqueLabel = opaqueProbe.shadowRoot!.querySelector<HTMLElement>('[part~="label"]')!;
    const materialStyle = getComputedStyle(material);
    const result = {
      backdrop: materialStyle.backdropFilter,
      background: materialStyle.backgroundColor,
      title: getComputedStyle(title).color,
      description: getComputedStyle(description).color,
      titleBlend: getComputedStyle(title).mixBlendMode,
      bodyBlend: getComputedStyle(body).mixBlendMode,
      menuBlend: getComputedStyle(materialLabel).mixBlendMode,
      opaqueMenuBlend: getComputedStyle(opaqueLabel).mixBlendMode,
    };
    materialProbe.remove();
    opaqueProbe.remove();
    return result;
  });

  expect(auto.backdrop).toContain("blur(15px)");
  expect(auto.backdrop).toContain("saturate(1.2)");
  expect(auto.title).not.toBe(auto.description);
  expect(auto.titleBlend).toBe("plus-lighter");
  expect(auto.bodyBlend).toBe("plus-lighter");
  // Menus already resolve material-aware foreground tokens. A compositor on
  // their labels makes selected and disabled states flare against the popup.
  expect(auto.menuBlend).toBe("normal");
  expect(auto.opaqueMenuBlend).toBe("normal");

  await page.goto("/components/ui-card?example=Background%20materials&theme=dark&vibrancy=reduced");
  const reducedMaterial = page
    .frameLocator("iframe.stage-frame")
    .locator(".example-material[class*='material-']")
    .first();
  await expect(reducedMaterial).toBeVisible();
  const reduced = await reducedMaterial.evaluate((material) => {
    const card = material.querySelector<HTMLElement>("ui-card")!;
    const title = card.shadowRoot!.querySelector<HTMLElement>('[part~="title"]')!;
    const body = material.querySelector<HTMLElement>(".vibrant-label-primary")!;
    const materialStyle = getComputedStyle(material);
    return {
      backdrop: materialStyle.backdropFilter,
      background: materialStyle.backgroundColor,
      title: getComputedStyle(title).color,
      titleBlend: getComputedStyle(title).mixBlendMode,
      bodyBlend: getComputedStyle(body).mixBlendMode,
    };
  });

  expect(reduced.backdrop).toBe("none");
  expect(reduced.titleBlend).toBe("normal");
  expect(reduced.bodyBlend).toBe("normal");
  expect(reduced.background).not.toBe(auto.background);
  expect(reduced.title).not.toBe(auto.title);
});

test("component recipes separate outer boundaries, internal dividers, and material inheritance", async ({
  page,
}) => {
  const preview = page.frameLocator("iframe.stage-frame");
  const card = preview.locator("ui-card").first();
  const appearance = () =>
    card.evaluate((element) => {
      const host = getComputedStyle(element);
      const header = getComputedStyle(
        element.shadowRoot!.querySelector<HTMLElement>('[part~="header"]')!,
      );
      const boundaryProbe = document.createElement("span");
      const dividerProbe = document.createElement("span");
      boundaryProbe.style.color = "var(--color-border-strong)";
      dividerProbe.style.color = "var(--color-separator-opaque)";
      document.body.append(boundaryProbe, dividerProbe);
      const roleBoundary = getComputedStyle(boundaryProbe).color;
      const roleDivider = getComputedStyle(dividerProbe).color;
      boundaryProbe.remove();
      dividerProbe.remove();
      return {
        surface: host.backgroundColor,
        boundary: host.borderTopColor,
        boundaryWidth: host.borderTopWidth,
        materialWidth: host.getPropertyValue("--border-material").trim(),
        divider: header.borderBottomColor,
        roleBoundary,
        roleDivider,
      };
    });

  await page.goto("/components/ui-card?theme=light&example=Project+card");
  const light = await appearance();
  expect(Number.parseFloat(light.materialWidth)).toBe(0.5);
  // Chromium clamps a half-CSS-pixel border to one physical pixel at DPR 1;
  // Retina review surfaces retain the authored half-pixel optical boundary.
  expect(Number.parseFloat(light.boundaryWidth)).toBeLessThanOrEqual(1);
  expect(light.boundary).toBe(light.roleBoundary);
  expect(light.divider).toBe(light.roleDivider);
  expect(light.boundary).not.toBe(light.divider);

  await page.goto("/components/ui-card?theme=dark&example=Project+card");
  const dark = await appearance();
  expect(dark.boundary).not.toBe(light.boundary);
  expect(dark.divider).not.toBe(light.divider);
  expect(dark.surface).not.toBe(light.surface);

  await page.goto("/components/ui-card?theme=dark&vibrancy=vibrant&example=Background+materials");
  const materialCard = preview.locator(".example-material ui-card").first();
  const materialRoles = await materialCard.evaluate((element) => {
    const style = getComputedStyle(element);
    const dividerProbe = document.createElement("span");
    const materialDividerProbe = document.createElement("span");
    dividerProbe.style.color = "var(--_mash-component-divider)";
    materialDividerProbe.style.color = "var(--mash-material-separator)";
    element.append(dividerProbe, materialDividerProbe);
    const divider = getComputedStyle(dividerProbe).color;
    const materialDivider = getComputedStyle(materialDividerProbe).color;
    dividerProbe.remove();
    materialDividerProbe.remove();
    return {
      surface: style.getPropertyValue("--_mash-component-surface").trim(),
      divider,
      materialDivider,
      shadow: style.getPropertyValue("--_mash-component-shadow").trim(),
    };
  });
  expect(materialRoles.surface).not.toBe("transparent");
  expect(materialRoles.divider).toBe(materialRoles.materialDivider);
  expect(materialRoles.shadow).not.toBe("transparent");
});

test("separator part follows theme and vibrancy compositing", async ({ page }) => {
  const preview = page.frameLocator("iframe.stage-frame");
  const separator = preview.locator("ui-separator [part~='root']").first();
  const appearance = () =>
    separator.evaluate((root) => {
      const style = getComputedStyle(root);
      return {
        background: style.backgroundColor,
        blend: style.mixBlendMode,
      };
    });

  await page.goto("/components/ui-separator?theme=light&vibrancy=auto");
  await expect(separator).toBeVisible();
  const lightAuto = await appearance();
  expect(lightAuto.blend).toBe("multiply");

  await page.goto("/components/ui-separator?theme=light&vibrancy=vibrant");
  const lightVibrant = await appearance();
  expect(lightVibrant.blend).toBe("multiply");
  expect(lightVibrant.background).toBe(lightAuto.background);

  await page.goto("/components/ui-separator?theme=dark&vibrancy=auto");
  const darkAuto = await appearance();
  expect(darkAuto.blend).toBe("plus-lighter");
  expect(darkAuto.background).not.toBe(lightAuto.background);

  await page.goto("/components/ui-separator?theme=dark&vibrancy=vibrant");
  const darkVibrant = await appearance();
  expect(darkVibrant.blend).toBe("color-dodge");
  expect(darkVibrant.background).toBe(darkAuto.background);

  await page.goto("/components/ui-separator?theme=dark&vibrancy=reduced");
  const darkReduced = await appearance();
  expect(darkReduced.blend).toBe("normal");
  expect(darkReduced.background).not.toBe(darkVibrant.background);
});
