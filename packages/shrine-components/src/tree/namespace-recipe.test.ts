import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cdp, page, server, userEvent } from "vitest/browser";
import "@mash/ui/catalogue/mash.css";
import "@mash/ui/icon/register";
import "@mash/ui/path/register";
import "@mash/ui/button/register";
import "@mash/ui/input/register";
import type { UITreeItem } from "@mash/ui/tree-item";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { ShrineTree } from "./tree.js";
import "./register.js";
import "../catalogue/mash.css";

const part = (host: Element, name: string) => inShadow<HTMLElement>(host, `[part="${name}"]`);
const control = (item: Element) => part(item, "control") as HTMLButtonElement;
const coarse = () => matchMedia("(pointer: coarse)").matches;
const mark = `<ui-icon slot="icon" name="object.document" size="small" label=""></ui-icon>`;
const disclosure = `<ui-icon slot="disclosure" name="navigation.disclosure" size="small" label=""></ui-icon>`;
const action = `<ui-button slot="actions" icon-only size="small" variant="ghost" aria-label="Inspect value"><ui-icon name="object.code" size="small" label=""></ui-icon></ui-button>`;
let legacyStyle: HTMLStyleElement;

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
  legacyStyle = document.createElement("style");
  legacyStyle.textContent = `@layer mash.catalogue {
    :where([data-mash-catalogue="mash"]) ui-tree-item::part(control) {
      --legacy-tree-rule: matched; min-block-size:32px; border-inline-start:2px solid transparent;
    }
    :where([data-mash-catalogue="mash"]) ui-tree-item[current]::part(control) { box-shadow:inset 2px 0 black; }
    :where([data-mash-catalogue="mash"]) ui-tree-item[expanded]::part(disclosure) { display:inline-grid; }
  }`;
  document.head.prepend(legacyStyle);
});
afterEach(() => {
  legacyStyle.remove();
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

async function mount(markup: string, width = 320, dir = "ltr"): Promise<ShrineTree> {
  return fixture<ShrineTree>(
    `<sh-tree variant="namespace" dir="${dir}" style="width:${width}px;background:var(--color-surface);color:var(--color-text)"><ui-tree slot="tree" label="Namespace">${markup}</ui-tree></sh-tree>`,
  );
}

describe("namespace tree recipe", () => {
  it("declares overlay actions without reserving an idle lane", async () => {
    const tree = await mount(
      `<ui-tree-item actions-display="overlay" title="Applications" current selected>${mark}
      <ui-path slot="meta" size="small" path="/app"><span slot="title">A very long authored description that must fade at the row edge instead of clipping abruptly.</span></ui-path>
      <ui-button slot="actions" icon-only size="small" variant="ghost" aria-label="Save /app"><ui-icon name="object.bookmark" size="small"></ui-icon></ui-button>
    </ui-tree-item>`,
      240,
    );
    const item = tree.querySelector<UITreeItem>("ui-tree-item")!;
    const root = part(item, "root");
    const actions = part(item, "actions");
    const button = item.querySelector<HTMLElement>("ui-button")!;
    expect(item.actionsDisplay).toBe("overlay");
    if (coarse()) {
      expect(getComputedStyle(actions).position).toBe("static");
      expect(control(item).getBoundingClientRect().right).toBeLessThan(
        part(button, "control").getBoundingClientRect().left,
      );
    } else {
      await cdp().send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 700, y: 500 });
      await vi.waitFor(() => expect(Number(getComputedStyle(actions).opacity)).toBe(0));
      const idleWidth = control(item).getBoundingClientRect().width;
      expect(idleWidth).toBeCloseTo(root.getBoundingClientRect().width, 1);
      await userEvent.hover(control(item));
      await vi.waitFor(() => expect(Number(getComputedStyle(actions).opacity)).toBe(1));
      expect(control(item).getBoundingClientRect().width).toBe(idleWidth);
      expect(getComputedStyle(actions).position).toBe("absolute");
      const rowFill = getComputedStyle(control(item)).backgroundColor;
      expect(getComputedStyle(actions).backgroundImage).toContain(rowFill);
      await userEvent.hover(part(button, "control"));
      expect(getComputedStyle(control(item)).backgroundColor).toBe(rowFill);
      expect(getComputedStyle(actions).backgroundImage).toContain(rowFill);
      await cdp().send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 700, y: 500 });
      button.focus();
      await vi.waitFor(() => expect(Number(getComputedStyle(actions).opacity)).toBe(1));
      expect(part(button, "control").getBoundingClientRect().width).toBeLessThanOrEqual(24);
    }
    const path = item.querySelector('ui-path[slot="meta"]')!;
    await vi.waitFor(() => expect(path.matches(":state(overflow-end)")).toBe(true));
    expect(getComputedStyle(part(path, "viewport")).maskImage).not.toBe("none");
  });
  for (const theme of ["light", "dark"]) {
    for (const width of [160, 320, 720]) {
      it(`keeps row targets, complete labels and subordinate metadata at ${width}px in ${theme}`, async () => {
        document.documentElement.dataset.theme = theme;
        const title = "application_namespace_with_a_deliberately_long_name";
        const lede = "Authored namespace documentation remains complete and subordinate.";
        const tree = await mount(
          `<ui-tree-item title="app" value="app" kind="folder" activation="split" current>${disclosure}${mark}<ui-path slot="label" size="small" path="/app"><span slot="title">app</span></ui-path>${action}</ui-tree-item>
          <ui-tree-item title="${title}" value="long">${mark}<ui-path slot="label" size="small" path="/long"><span slot="title">${title}</span></ui-path><span slot="meta">${lede}</span></ui-tree-item>
          <ui-tree-item title="leaf" value="leaf">${mark}</ui-tree-item>`,
          width,
        );
        const [branch, long, leaf] = [...tree.querySelectorAll<UITreeItem>("ui-tree-item")] as [
          UITreeItem,
          UITreeItem,
          UITreeItem,
        ];
        const native = control(branch).getBoundingClientRect();
        const target = part(branch.querySelector("ui-button")!, "control").getBoundingClientRect();
        expect(part(branch.querySelector("ui-button")!, "control").getAttribute("aria-label")).toBe(
          "Inspect value",
        );
        const split = part(branch, "disclosure").getBoundingClientRect();
        expect(
          getComputedStyle(control(branch)).getPropertyValue("--legacy-tree-rule").trim(),
        ).toBe("matched");
        expect(native.height).toBe(coarse() ? 44 : 24);
        expect(getComputedStyle(control(branch)).borderRadius).toBe("8px");
        expect(getComputedStyle(control(branch)).borderInlineStartWidth).toBe("0px");
        expect(native.width).toBeGreaterThanOrEqual(44);
        expect(target.width).toBe(coarse() ? 44 : 24);
        expect(target.height).toBe(coarse() ? 44 : 24);
        expect(split.width).toBe(coarse() ? 44 : 16);
        expect(split.height).toBe(coarse() ? 44 : 16);
        expect(native.right).toBeLessThanOrEqual(target.left - 4);
        expect(split.left).toBeGreaterThanOrEqual(native.left);
        expect(split.right).toBeLessThanOrEqual(native.right);
        expect(target.right).toBeLessThanOrEqual(tree.getBoundingClientRect().right);
        expect(target.right).toBeCloseTo(tree.getBoundingClientRect().right, 1);
        expect(part(branch, "root").getBoundingClientRect().right).toBeCloseTo(
          tree.getBoundingClientRect().right,
          1,
        );
        const actionGap = Number.parseFloat(getComputedStyle(part(branch, "root")).columnGap);
        expect(native.right + actionGap).toBeCloseTo(target.left, 1);
        expect(control(leaf).getBoundingClientRect().right).toBeCloseTo(
          tree.getBoundingClientRect().right,
          1,
        );
        expect(getComputedStyle(control(branch)).fontSize).toBe("12px");
        expect(getComputedStyle(part(long, "meta")).fontSize).toBe("11px");
        expect(part(branch, "icon").getBoundingClientRect().width).toBe(16);
        expect(getComputedStyle(part(leaf, "disclosure")).display).toBe("none");
        expect(control(leaf).hasAttribute("aria-expanded")).toBe(false);
        expect(getComputedStyle(part(leaf, "meta")).display).toBe("none");
        expect(getComputedStyle(part(leaf, "actions")).display).toBe("none");
        expect(getComputedStyle(control(branch)).boxShadow).toBe("none");
        const path = long.querySelector("ui-path")!;
        expect(getComputedStyle(part(path, "root")).padding).toBe("0px");
        expect(getComputedStyle(part(path, "root")).borderTopWidth).toBe("0px");
        expect(getComputedStyle(part(path, "root")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(getComputedStyle(part(path, "root")).fontSize).toBe("12px");
        expect(path.textContent).toBe(title);
        expect(long.querySelector('[slot="meta"]')!.textContent).toBe(lede);
        expect(part(long, "meta").getBoundingClientRect().width).toBeGreaterThan(0);
        expect(part(long, "meta").getBoundingClientRect().right).toBeLessThanOrEqual(
          control(long).getBoundingClientRect().right,
        );
        expect(tree.scrollWidth).toBeLessThanOrEqual(width);
        await page.screenshot({
          path: `test-results/namespace-${theme}-${width}-${coarse() ? "coarse" : "fine"}.png`,
          element: tree,
        });
      });
    }
  }

  it("keeps empty lanes absent through live slot changes", async () => {
    const tree = await mount(
      `<ui-tree-item title="plain" expanded preview-open="false"><span slot="preview">Record</span></ui-tree-item>`,
    );
    const item = tree.querySelector<UITreeItem>("ui-tree-item")!;
    expect(item.branch).toBe(false);
    expect(getComputedStyle(part(item, "disclosure")).display).toBe("none");
    expect(getComputedStyle(part(item, "icon")).display).toBe("none");
    expect(getComputedStyle(part(item, "meta")).display).toBe("none");
    const meta = document.createElement("span");
    meta.slot = "meta";
    meta.textContent = "Authored summary";
    item.append(meta);
    await settled(tree);
    expect(getComputedStyle(part(item, "meta")).display).not.toBe("none");
    meta.hidden = true;
    await settled(tree);
    expect(getComputedStyle(part(item, "meta")).display).toBe("none");
    meta.remove();
    expect(part(item, "label").getBoundingClientRect().right).toBeCloseTo(
      control(item).getBoundingClientRect().right - 4,
      0,
    );
  });

  for (const withIcon of [true, false]) {
    it(`reclaims the leaf disclosure lane ${withIcon ? "with" : "without"} icons`, async () => {
      const tree = await mount(
        `<ui-tree-item title="branch" kind="folder">${disclosure}${withIcon ? mark : ""}</ui-tree-item><ui-tree-item title="leaf">${withIcon ? mark : ""}</ui-tree-item>`,
      );
      const [branch, leaf] = [...tree.querySelectorAll<UITreeItem>("ui-tree-item")] as [
        UITreeItem,
        UITreeItem,
      ];
      const first = withIcon ? "icon" : "label";
      expect(part(leaf, first).getBoundingClientRect().left).toBe(
        part(branch, "disclosure").getBoundingClientRect().left,
      );
      const lane =
        part(branch, "disclosure").getBoundingClientRect().width +
        parseFloat(getComputedStyle(control(branch)).columnGap);
      expect(
        part(branch, "label").getBoundingClientRect().left -
          part(leaf, "label").getBoundingClientRect().left,
      ).toBe(lane);
      expect(getComputedStyle(part(leaf, "disclosure")).display).toBe("none");
      expect(control(leaf).hasAttribute("aria-expanded")).toBe(false);
      const toggle = vi.fn();
      leaf.addEventListener("ui-tree-item-toggle", toggle);
      await userEvent.click(control(leaf));
      expect(toggle).not.toHaveBeenCalled();
    });
  }

  it("aligns a child leaf's first lane with its parent identity", async () => {
    const tree = await mount(
      `<ui-tree-item title="parent" kind="folder" expanded>${disclosure}${mark}<ui-tree-item slot="children" title="leaf">${mark}</ui-tree-item></ui-tree-item>`,
    );
    const [parent, child] = [...tree.querySelectorAll("ui-tree-item")];
    expect(part(child!, "icon").getBoundingClientRect().left).toBe(
      part(parent!, "icon").getBoundingClientRect().left,
    );
  });

  it("distinguishes current identity from selection while retaining native focus and disabled state", async () => {
    const tree = await mount(
      `<ui-tree-item title="Current" current>${mark}${action}</ui-tree-item><ui-tree-item title="Selected" selected>${mark}${action}</ui-tree-item><ui-tree-item title="Both" current selected>${mark}</ui-tree-item><ui-tree-item title="Unavailable" disabled>${mark}</ui-tree-item>`,
    );
    const [current, selected, both, disabled] = [
      ...tree.querySelectorAll<UITreeItem>("ui-tree-item"),
    ] as [UITreeItem, UITreeItem, UITreeItem, UITreeItem];
    await userEvent.hover(control(disabled));
    const currentStyle = getComputedStyle(control(current));
    const selectedStyle = getComputedStyle(control(selected));
    expect(currentStyle.borderInlineStartWidth).toBe("0px");
    expect(selectedStyle.borderInlineStartWidth).toBe("0px");
    expect(currentStyle.backgroundColor).not.toBe(selectedStyle.backgroundColor);
    expect(getComputedStyle(control(both)).borderInlineStartWidth).toBe("0px");
    expect(getComputedStyle(control(both)).backgroundColor).toBe(selectedStyle.backgroundColor);
    expect(control(current).getAttribute("aria-current")).toBe("page");
    expect(control(selected).getAttribute("aria-selected")).toBe("true");
    expect(control(disabled).disabled).toBe(true);
    expect(Number(getComputedStyle(control(disabled)).opacity)).toBeLessThan(1);
    const clicks = vi.fn();
    disabled.addEventListener("ui-tree-item-select", clicks);
    control(disabled).click();
    expect(clicks).not.toHaveBeenCalled();
    await userEvent.keyboard("{Tab}");
    current.focusControl();
    expect(control(current).matches(":focus-visible")).toBe(true);
    expect(getComputedStyle(control(current)).outlineStyle).toBe("solid");
    expect(Number.parseFloat(getComputedStyle(control(current)).outlineOffset)).toBeLessThan(0);
    await userEvent.keyboard("{ArrowDown}");
    expect(selected.shadowRoot!.activeElement).toBe(control(selected));
    await expect.poll(() => getComputedStyle(part(selected, "actions")).opacity).toBe("1");
    await userEvent.tab();
    expect(document.activeElement).toBe(selected.querySelector("ui-button"));
  });

  it("reveals sibling actions on hover, keyboard focus, current and independent preview state", async () => {
    const tree = await mount(
      `<ui-tree-item title="Rest">${action}</ui-tree-item><ui-tree-item title="Current" current>${action}</ui-tree-item><ui-tree-item title="Preview" preview-open>${action}<span slot="preview">Value</span></ui-tree-item><ui-tree-item title="Parking"></ui-tree-item>`,
    );
    const [rest, current, preview, parking] = [
      ...tree.querySelectorAll<UITreeItem>("ui-tree-item"),
    ] as [UITreeItem, UITreeItem, UITreeItem, UITreeItem];
    await userEvent.hover(control(parking));
    await expect
      .poll(() => getComputedStyle(part(rest, "actions")).opacity)
      .toBe(coarse() ? "1" : "0");
    expect(getComputedStyle(part(current, "actions")).opacity).toBe("1");
    expect(getComputedStyle(part(preview, "actions")).opacity).toBe("1");
    expect(part(rest, "actions").contains(control(rest))).toBe(false);
    expect(control(rest).contains(part(rest, "actions"))).toBe(false);
    await userEvent.hover(control(rest));
    await expect.poll(() => getComputedStyle(part(rest, "actions")).opacity).toBe("1");
    rest.focusControl();
    await userEvent.hover(control(parking));
    expect(getComputedStyle(part(rest, "actions")).opacity).toBe("1");
  });

  it("preserves split activation and preview-before-children without giving preview leaves a disclosure", async () => {
    const tree = await mount(
      `<ui-tree-item title="app" value="app" kind="folder" activation="split" preview-open="false">${disclosure}${mark}${action}<div slot="preview"><ui-input label="Edit value" value="exact"></ui-input></div><ui-tree-item slot="children" title="cards" value="cards">${mark}</ui-tree-item></ui-tree-item>`,
    );
    const item = tree.querySelector<UITreeItem>("ui-tree-item")!;
    const toggles = vi.fn(),
      selections = vi.fn();
    item.addEventListener("ui-tree-item-toggle", toggles);
    item.addEventListener("ui-tree-item-select", selections);
    await userEvent.click(part(item, "disclosure"));
    await settled(tree);
    expect(toggles).toHaveBeenCalledTimes(1);
    expect(selections).not.toHaveBeenCalled();
    await userEvent.click(part(item, "label"));
    expect(selections).toHaveBeenCalledTimes(1);
    expect(toggles).toHaveBeenCalledTimes(1);
    item.expanded = true;
    item.previewOpen = true;
    await settled(tree);
    const preview = part(item, "preview"),
      children = part(item, "children");
    expect(preview.hidden).toBe(false);
    expect(children.hidden).toBe(false);
    expect(preview.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      children.getBoundingClientRect().top,
    );
    expect(getComputedStyle(preview).marginInlineStart).toBe(
      getComputedStyle(children).marginInlineStart,
    );
    const input = item.querySelector("ui-input")!;
    await userEvent.fill(part(input, "control"), "retained value");
    item.expanded = false;
    await settled(tree);
    expect(preview.hidden).toBe(false);
    expect(children.hidden).toBe(true);
    expect(item.querySelector("ui-input")).toBe(input);
    expect((part(input, "control") as HTMLInputElement).value).toBe("retained value");
  });

  it("mirrors branch glyph and guides in RTL without a decorative current border", async () => {
    const tree = await mount(
      `<ui-tree-item title="app" kind="folder" current>${disclosure}${mark}<ui-tree-item slot="children" title="child"></ui-tree-item></ui-tree-item>`,
      240,
      "rtl",
    );
    const item = tree.querySelector<UITreeItem>("ui-tree-item")!;
    const icon = item.querySelector<HTMLElement>('[slot="disclosure"]')!;
    expect(getComputedStyle(control(item)).borderRightWidth).toBe("0px");
    expect(getComputedStyle(control(item)).borderLeftWidth).toBe("0px");
    expect(getComputedStyle(icon).rotate).toBe("180deg");
    expect(part(item, "disclosure").getBoundingClientRect().left).toBeGreaterThan(
      part(item, "icon").getBoundingClientRect().right,
    );
    item.expanded = true;
    await settled(tree);
    await expect.poll(() => getComputedStyle(icon).rotate).toBe("90deg");
    expect(getComputedStyle(part(item, "children")).marginRight).toBe(coarse() ? "26px" : "12px");
    expect(getComputedStyle(part(item, "children")).borderLeftWidth).toBe("0px");
  });

  it("limits namespace row paint at preview and independent tree boundaries", async () => {
    const tree = await mount(
      `<ui-tree-item title="Outer" kind="folder" expanded>${disclosure}<div slot="preview"><ui-tree id="independent"><ui-tree-item title="Nested" kind="folder" current>${disclosure}${mark}${action}</ui-tree-item></ui-tree><sh-tree variant="namespace" id="inner"><ui-tree slot="tree"><ui-tree-item title="Inner namespace">${mark}</ui-tree-item></ui-tree></sh-tree></div><ui-tree-item slot="children" title="Owned child"></ui-tree-item></ui-tree-item>`,
    );
    const outer = tree.querySelector<UITreeItem>("ui-tree-item")!;
    const nested = tree.querySelector<UITreeItem>("#independent ui-tree-item")!;
    const child = outer.querySelector<UITreeItem>(':scope > [slot="children"]')!;
    const inner = tree.querySelector<UITreeItem>("#inner ui-tree-item")!;
    expect(getComputedStyle(control(outer)).display).toBe("flex");
    expect(getComputedStyle(control(child)).display).toBe("flex");
    expect(getComputedStyle(control(inner)).display).toBe("flex");
    expect(getComputedStyle(control(nested)).display).toBe("grid");
    expect(getComputedStyle(control(nested)).boxShadow).not.toBe("none");
    const baseline = await fixture<HTMLElement>(
      `<ui-tree><ui-tree-item title="Baseline" kind="folder">${disclosure}</ui-tree-item></ui-tree>`,
    );
    expect(getComputedStyle(part(nested, "disclosure")).width).toBe(
      getComputedStyle(part(baseline.querySelector("ui-tree-item")!, "disclosure")).width,
    );
    expect(getComputedStyle(part(nested, "actions")).opacity).toBe("1");
    expect(getComputedStyle(part(tree.querySelector("#independent")!, "root")).borderTopWidth).toBe(
      "1px",
    );
  });

  it.skipIf(server.browser !== "chromium")(
    "respects reduced motion and exposes distinct forced-color identity and selection",
    async () => {
      await cdp().send("Emulation.setEmulatedMedia", {
        features: [
          { name: "prefers-reduced-motion", value: "reduce" },
          { name: "forced-colors", value: "active" },
        ],
      });
      try {
        const tree = await mount(
          `<ui-tree-item title="Current" current kind="folder">${disclosure}${mark}${action}</ui-tree-item><ui-tree-item title="Selected" selected>${mark}</ui-tree-item><ui-tree-item title="Disabled" disabled>${mark}</ui-tree-item>`,
        );
        const [current, selected, disabled] = [
          ...tree.querySelectorAll<UITreeItem>("ui-tree-item"),
        ] as [UITreeItem, UITreeItem, UITreeItem];
        await userEvent.hover(control(disabled));
        expect(
          getComputedStyle(current.querySelector('[slot="disclosure"]')!).transitionDuration,
        ).toBe("0s");
        expect(getComputedStyle(part(current, "actions")).transitionDuration).toBe("0s");
        expect(getComputedStyle(control(current)).borderInlineStartWidth).toBe("0px");
        expect(getComputedStyle(control(selected)).backgroundColor).not.toBe(
          getComputedStyle(control(current)).backgroundColor,
        );
        expect(getComputedStyle(control(disabled)).opacity).toBe("1");
        expect(getComputedStyle(control(disabled)).color).not.toBe(
          getComputedStyle(control(current)).color,
        );
        await userEvent.keyboard("{Tab}");
        selected.focusControl();
        expect(control(selected).matches(":focus-visible")).toBe(true);
        expect(getComputedStyle(control(selected)).outlineColor).toBe(
          getComputedStyle(control(selected)).color,
        );
        expect(getComputedStyle(control(selected)).outlineColor).not.toBe(
          getComputedStyle(control(selected)).backgroundColor,
        );
      } finally {
        await cdp().send("Emulation.setEmulatedMedia", { features: [] });
      }
    },
  );
});
