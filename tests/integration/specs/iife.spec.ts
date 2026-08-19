import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const bundle = resolve(import.meta.dirname, "../../../apps/catalog/dist/mash.js");

const expectedTags = [
  "sh-limb",
  "sh-locator",
  "sh-myth",
  "sh-pail",
  "sh-slot",
  "sh-triptych",
  "shrine-confirm",
  "ui-accordion",
  "ui-accordion-item",
  "ui-alert-dialog",
  "ui-autocomplete",
  "ui-avatar",
  "ui-badge",
  "ui-button",
  "ui-card",
  "ui-checkbox",
  "ui-checkbox-group",
  "ui-collapsible",
  "ui-combobox",
  "ui-context-menu",
  "ui-dialog",
  "ui-drawer",
  "ui-field",
  "ui-fieldset",
  "ui-form",
  "ui-input",
  "ui-kbd",
  "ui-menu",
  "ui-menu-item",
  "ui-menubar",
  "ui-meter",
  "ui-navigation-menu",
  "ui-number-field",
  "ui-option",
  "ui-otp-field",
  "ui-path",
  "ui-popover",
  "ui-preview-card",
  "ui-progress",
  "ui-radio",
  "ui-radio-group",
  "ui-scroll-area",
  "ui-select",
  "ui-separator",
  "ui-slider",
  "ui-spinner",
  "ui-switch",
  "ui-tab",
  "ui-tab-panel",
  "ui-tabs",
  "ui-toast",
  "ui-toggle",
  "ui-toggle-group",
  "ui-toolbar",
  "ui-tooltip",
  "ui-tree",
  "ui-tree-item",
];

const expectedGlobalExports = [
  "ShrineConfirm",
  "ShrineLimb",
  "ShrineLocator",
  "ShrineMyth",
  "ShrinePail",
  "ShrineSlot",
  "ShrineTriptych",
  "UIAccordion",
  "UIAccordionItem",
  "UIAlertDialog",
  "UIAutocomplete",
  "UIAvatar",
  "UIBadge",
  "UIButton",
  "UICard",
  "UICheckbox",
  "UICheckboxGroup",
  "UICollapsible",
  "UICombobox",
  "UIContextMenu",
  "UIDialog",
  "UIDrawer",
  "UIField",
  "UIFieldset",
  "UIForm",
  "UIInput",
  "UIKbd",
  "UIMenu",
  "UIMenuItem",
  "UIMenubar",
  "UIMeter",
  "UINavigationMenu",
  "UINumberField",
  "UIOption",
  "UIOtpField",
  "UIPath",
  "UIPopover",
  "UIPreviewCard",
  "UIProgress",
  "UIRadio",
  "UIRadioGroup",
  "UIScrollArea",
  "UISelect",
  "UISeparator",
  "UISlider",
  "UISpinner",
  "UISwitch",
  "UITab",
  "UITabPanel",
  "UITabs",
  "UIToast",
  "UIToggle",
  "UIToggleGroup",
  "UIToolbar",
  "UITooltip",
  "UITree",
  "UITreeItem",
];

test.describe("single-file browser distribution", () => {
  test("registers every element and installs its token styles", async ({ page }) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));

    await page.setContent(`
      <!doctype html>
      <html>
        <head></head>
        <body><ui-button>Bundled button</ui-button></body>
      </html>
    `);
    await page.addScriptTag({ path: bundle });
    await page.addScriptTag({ path: bundle });

    const report = await page.evaluate((tags) => {
      return {
        defined: tags.filter((tag) => customElements.get(tag)).sort(),
        globalExports: Object.keys(
          (globalThis as typeof globalThis & { Mash?: object }).Mash ?? {},
        ).sort(),
        styleCount: document.head.querySelectorAll("style[data-mash-tokens]").length,
        hasActionToken: Array.from(
          document.head.querySelectorAll<HTMLStyleElement>("style[data-mash-tokens]"),
        ).some((style) => style.textContent?.includes("--color-action")),
      };
    }, expectedTags);

    expect(failures).toEqual([]);
    expect(report.defined).toEqual(expectedTags);
    expect(report.globalExports).toEqual(expectedGlobalExports);
    expect(report.styleCount).toBe(1);
    expect(report.hasActionToken).toBe(true);
  });
});
