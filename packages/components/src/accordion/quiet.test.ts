import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cdp, page, server, userEvent } from "vitest/browser";

import { componentExamples } from "../../../../apps/catalog/src/examples/components.js";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIAccordion } from "./accordion.js";
import type { UIAccordionItem } from "../accordion-item/accordion-item.js";
import type { UIInput } from "../input/input.js";
import "./register.js";
import "../icon/register.js";
import "../input/register.js";
import "../button/register.js";
import "../checkbox/register.js";
import "../link/register.js";
import "../catalogue/mash.css";

const part = (element: Element, name: string) => inShadow<HTMLElement>(element, `[part="${name}"]`);
const trigger = (item: Element) => part(item, "trigger") as HTMLButtonElement;
const coarse = () => matchMedia("(pointer: coarse)").matches;
const icons = `<ui-icon slot="disclosure" name="navigation.disclosure" size="small" label=""></ui-icon><ui-icon slot="prefix" name="object.bookmark" size="small" label=""></ui-icon>`;
const items = (accordion: UIAccordion) => [
  ...accordion.querySelectorAll<UIAccordionItem>(":scope > ui-accordion-item"),
];
let legacyStyle: HTMLStyleElement;

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
  legacyStyle = document.createElement("style");
  legacyStyle.textContent = `@layer mash.catalogue {
    :where([data-mash-catalogue="mash"]) ui-accordion > ui-accordion-item:not(:last-child) {
      --legacy-accordion-rule: matched; border-block-end:1px solid black;
    }
    :where([data-mash-catalogue="mash"]) ui-accordion > ui-accordion-item::part(reveal-measure) { padding:12px; }
  }`;
  document.head.prepend(legacyStyle);
});
afterEach(() => {
  legacyStyle.remove();
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

async function revealSettled(item: UIAccordionItem): Promise<void> {
  await settled(item);
  const content = part(item, "content");
  await expect.poll(() => content.matches(":state(active)")).toBe(item.open);
  await expect.poll(() => part(content, "root").hidden).toBe(!item.open);
}

describe("quiet accordion sections", () => {
  for (const theme of ["light", "dark"]) {
    for (const width of [160, 320, 720]) {
      it(`keeps complete labels and bounded counts in ${theme} at ${width}px`, async () => {
        document.documentElement.dataset.theme = theme;
        const longTitle = "Saved application namespace paths with a long title";
        const longCount = "40 of 10000 names";
        const accordion =
          await fixture<UIAccordion>(`<ui-accordion variant="quiet" mode="multiple" size="compact" style="width:${width}px;background:var(--color-surface);color:var(--color-text)">
          <ui-accordion-item title="Saved" value="saved" heading-level="2" open>${icons}<span slot="suffix">2 pages</span><p>Saved pages retain their own content.</p></ui-accordion-item>
          <ui-accordion-item title="${longTitle}" value="long">${icons}<span slot="suffix">${longCount}</span></ui-accordion-item>
        </ui-accordion>`);
        const [first, long] = items(accordion) as [UIAccordionItem, UIAccordionItem];
        await revealSettled(first);
        const native = trigger(first);
        const rect = native.getBoundingClientRect();
        expect(rect.height).toBe(coarse() ? 44 : 28);
        expect(rect.width).toBe(width);
        expect(getComputedStyle(native).fontSize).toBe("12px");
        expect(getComputedStyle(native).fontWeight).toBe("600");
        expect(getComputedStyle(part(first, "suffix")).fontSize).toBe("11px");
        expect(getComputedStyle(part(first, "suffix")).fontVariantNumeric).toBe("tabular-nums");
        expect(getComputedStyle(first).getPropertyValue("--legacy-accordion-rule").trim()).toBe(
          "matched",
        );
        expect(getComputedStyle(first).borderBottomWidth).toBe("0px");
        expect(getComputedStyle(first).backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(getComputedStyle(part(part(first, "content"), "measure")).padding).toBe("0px");
        const [disclosure, prefix, title, suffix] = ["disclosure", "prefix", "title", "suffix"].map(
          (name) => part(long, name).getBoundingClientRect(),
        );
        expect(disclosure!.width).toBe(16);
        expect(prefix!.width).toBe(16);
        expect(disclosure!.right).toBeLessThan(prefix!.left);
        expect(prefix!.right).toBeLessThan(title!.left);
        expect(title!.right).toBeLessThanOrEqual(suffix!.left);
        expect(suffix!.right).toBeLessThanOrEqual(trigger(long).getBoundingClientRect().right);
        expect(suffix!.width).toBeLessThanOrEqual(width / 2);
        expect(long.title).toBe(longTitle);
        expect(long.querySelector('[slot="suffix"]')!.textContent).toBe(longCount);
        expect(getComputedStyle(part(long, "title")).textOverflow).toBe("ellipsis");
        expect(getComputedStyle(part(long, "suffix")).whiteSpace).toBe("normal");
        expect(accordion.scrollWidth).toBeLessThanOrEqual(width);
        if (width === 160) expect(suffix!.height).toBeGreaterThan(16);
        expect(trigger(long).getBoundingClientRect().height).toBeGreaterThanOrEqual(
          coarse() ? 44 : 28,
        );
        expect(trigger(long).getBoundingClientRect().top).toBeGreaterThanOrEqual(
          first.getBoundingClientRect().bottom,
        );
        await expect
          .element(
            page.getByRole("button", {
              name: `${longTitle} ${longCount}`,
              exact: true,
            }),
          )
          .toBeVisible();
        await page.screenshot({
          path: `test-results/accordion-quiet-${theme}-${width}-${coarse() ? "coarse" : "fine"}.png`,
          element: accordion,
        });
      });
    }
  }

  it("preserves default and explicitly bordered appearance when quiet is opted out", async () => {
    const accordion = await fixture<UIAccordion>(
      `<ui-accordion bordered size="compact"><ui-accordion-item title="One" open>Body</ui-accordion-item><ui-accordion-item title="Two">Other body</ui-accordion-item></ui-accordion>`,
    );
    const item = items(accordion)[0]!;
    await revealSettled(item);
    expect(accordion.variant).toBe("default");
    expect(accordion.getAttribute("variant")).toBe("default");
    const before = {
      surface: getComputedStyle(item).backgroundColor,
      divider: getComputedStyle(item).borderBottomWidth,
      padding: getComputedStyle(part(part(item, "content"), "measure")).padding,
    };
    expect(before.divider).toBe("1px");
    expect(before.padding).not.toBe("0px");
    expect(getComputedStyle(part(accordion, "root")).borderTopWidth).toBe("1px");
    accordion.variant = "quiet";
    await settled(accordion);
    expect(getComputedStyle(item).borderBottomWidth).toBe("0px");
    expect(getComputedStyle(part(accordion, "root")).borderTopWidth).toBe("1px");
    accordion.variant = "default";
    await settled(accordion);
    expect(getComputedStyle(item).backgroundColor).toBe(before.surface);
    expect(getComputedStyle(item).borderBottomWidth).toBe(before.divider);
    expect(getComputedStyle(part(part(item, "content"), "measure")).padding).toBe(before.padding);
  });

  it("does not reserve empty adornments and updates them without replacing the trigger", async () => {
    const accordion = await fixture<UIAccordion>(
      `<ui-accordion variant="quiet" size="compact"><ui-accordion-item title="Tree"></ui-accordion-item></ui-accordion>`,
    );
    const item = items(accordion)[0]!;
    const native = trigger(item);
    expect(part(item, "prefix").hidden).toBe(true);
    expect(part(item, "suffix").hidden).toBe(true);
    expect(part(item, "prefix").getBoundingClientRect().width).toBe(0);
    const suffix = document.createElement("span");
    suffix.slot = "suffix";
    suffix.textContent = "10 names";
    item.append(suffix);
    await settled(item);
    expect(part(item, "suffix").hidden).toBe(false);
    suffix.remove();
    await settled(item);
    expect(part(item, "suffix").hidden).toBe(true);
    expect(trigger(item)).toBe(native);
    accordion.remove();
    document.body.append(accordion);
    await settled(accordion);
    expect(part(item, "suffix").getBoundingClientRect().width).toBe(0);
    accordion.remove();
  });

  it("uses real headings, native keyboard activation and independent open state", async () => {
    const root = await fixture<HTMLElement>(
      `<div><button>Before</button><ui-accordion variant="quiet" mode="multiple" size="compact"><ui-accordion-item title="Saved" value="saved" heading-level="2">${icons}<span slot="suffix">2 pages</span><ui-button>Body action</ui-button></ui-accordion-item><ui-accordion-item title="Tree" value="tree" open>Names</ui-accordion-item></ui-accordion><button>After</button></div>`,
    );
    const accordion = root.querySelector<UIAccordion>("ui-accordion")!;
    const [saved, tree] = items(accordion) as [UIAccordionItem, UIAccordionItem];
    const changes = vi.fn();
    accordion.addEventListener("ui-accordion-change", changes);
    const native = trigger(saved);
    expect(part(saved, "header").getAttribute("role")).toBe("heading");
    expect(part(saved, "header").getAttribute("aria-level")).toBe("2");
    expect(native.getAttribute("aria-controls")).toBe(part(saved, "content").id);
    expect(part(saved, "content").getAttribute("aria-labelledby")).toBe(native.id);
    expect(part(saved, "content").getAttribute("role")).toBe("region");
    root.querySelector("button")!.focus();
    await userEvent.tab();
    expect(saved.shadowRoot!.activeElement).toBe(native);
    expect(native.matches(":focus-visible")).toBe(true);
    expect(getComputedStyle(native).outlineStyle).toBe("solid");
    expect(parseFloat(getComputedStyle(native).outlineOffset)).toBeLessThan(0);
    await userEvent.keyboard("{Enter}");
    await revealSettled(saved);
    expect(saved.open).toBe(true);
    expect(tree.open).toBe(true);
    expect(native.getAttribute("aria-expanded")).toBe("true");
    expect(changes).toHaveBeenCalledTimes(1);
    expect(changes.mock.calls[0]![0].detail.values).toEqual(["saved", "tree"]);
    await userEvent.tab();
    expect(document.activeElement).toBe(saved.querySelector("ui-button"));
    await userEvent.keyboard("{Enter}");
    expect(changes).toHaveBeenCalledTimes(1);
    native.focus();
    await userEvent.keyboard(" ");
    await revealSettled(saved);
    expect(saved.open).toBe(false);
    expect(tree.open).toBe(true);
    expect(changes).toHaveBeenCalledTimes(2);
    await userEvent.tab();
    expect(tree.shadowRoot!.activeElement).toBe(trigger(tree));
    saved.open = true;
    await revealSettled(saved);
    expect(changes).toHaveBeenCalledTimes(2);
  });

  it("preserves edited body nodes and interactive actions through collapse and reopen", async () => {
    const accordion = await fixture<UIAccordion>(
      `<ui-accordion variant="quiet" mode="multiple" size="compact"><ui-accordion-item title="Tree" open><ui-input label="Filter names" value="app"></ui-input><button>Refresh names</button></ui-accordion-item></ui-accordion>`,
    );
    const item = items(accordion)[0]!;
    const input = item.querySelector<UIInput>("ui-input")!;
    const action = item.querySelector("button")!;
    const clicked = vi.fn();
    action.addEventListener("click", clicked);
    await revealSettled(item);
    await userEvent.fill(part(input, "control"), "app/cards");
    await userEvent.click(action);
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(item.open).toBe(true);
    await userEvent.click(trigger(item));
    await revealSettled(item);
    await userEvent.click(trigger(item));
    await revealSettled(item);
    expect(item.querySelector("ui-input")).toBe(input);
    expect(input.value).toBe("app/cards");
    expect(item.querySelector("button")).toBe(action);
  });

  it("keeps disabled behavior and parent disabled restoration unchanged", async () => {
    const accordion = await fixture<UIAccordion>(
      `<ui-accordion variant="quiet" mode="multiple" size="compact"><ui-accordion-item title="Saved"></ui-accordion-item><ui-accordion-item title="Unavailable" disabled></ui-accordion-item></ui-accordion>`,
    );
    const [enabled, disabled] = items(accordion) as [UIAccordionItem, UIAccordionItem];
    expect(trigger(disabled).disabled).toBe(true);
    expect(parseFloat(getComputedStyle(trigger(disabled)).opacity)).toBeLessThan(1);
    trigger(disabled).click();
    expect(disabled.open).toBe(false);
    accordion.disabled = true;
    await settled(accordion);
    expect(trigger(enabled).disabled).toBe(true);
    accordion.disabled = false;
    await settled(accordion);
    expect(trigger(enabled).disabled).toBe(false);
    expect(trigger(disabled).disabled).toBe(true);
  });

  it("uses shared hover paint without giving unavailable sections an active treatment", async () => {
    const accordion = await fixture<UIAccordion>(
      `<ui-accordion variant="quiet" mode="multiple" size="compact"><ui-accordion-item title="Saved"></ui-accordion-item><ui-accordion-item title="Unavailable" disabled></ui-accordion-item></ui-accordion>`,
    );
    const [enabled, disabled] = items(accordion) as [UIAccordionItem, UIAccordionItem];
    // Pointer coordinates persist across fixtures; first park away from the
    // enabled header so the resting measurement is genuinely not hovered.
    await userEvent.hover(trigger(disabled));
    const resting = getComputedStyle(trigger(enabled)).backgroundColor;
    await userEvent.hover(trigger(enabled));
    expect(getComputedStyle(trigger(enabled)).backgroundColor).not.toBe(resting);
    await userEvent.hover(trigger(disabled));
    expect(getComputedStyle(trigger(disabled)).backgroundColor).toBe(resting);
    expect(getComputedStyle(trigger(enabled)).backgroundColor).toBe(resting);
  });

  it("does not paint nested default accordions or treat their toggles as parent changes", async () => {
    const accordion = await fixture<UIAccordion>(
      `<ui-accordion variant="quiet" mode="multiple" size="compact"><ui-accordion-item title="Outer" value="outer" open><ui-accordion bordered><ui-accordion-item title="Nested" value="nested">Nested body</ui-accordion-item></ui-accordion></ui-accordion-item></ui-accordion>`,
    );
    const outer = items(accordion)[0]!;
    await revealSettled(outer);
    const nestedAccordion = outer.querySelector<UIAccordion>("ui-accordion")!;
    const nested = items(nestedAccordion)[0]!;
    const own = vi.fn();
    accordion.addEventListener("ui-accordion-change", (event) => {
      if (event.target === accordion) own(event);
    });
    await userEvent.click(trigger(nested));
    await revealSettled(nested);
    expect(outer.open).toBe(true);
    expect(nested.open).toBe(true);
    expect(own).not.toHaveBeenCalled();
    expect(getComputedStyle(part(part(nested, "content"), "measure")).padding).not.toBe("0px");
    expect(getComputedStyle(part(nested, "disclosure")).order).toBe("0");
  });

  it.skipIf(server.browser !== "chromium")(
    "respects reduced motion without changing disclosure completion",
    async () => {
      await cdp().send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      try {
        const accordion = await fixture<UIAccordion>(
          `<ui-accordion variant="quiet" size="compact"><ui-accordion-item title="Tree">Names</ui-accordion-item></ui-accordion>`,
        );
        const item = items(accordion)[0]!;
        expect(getComputedStyle(part(item, "disclosure")).transitionDuration).toBe("0s");
        await userEvent.click(trigger(item));
        await revealSettled(item);
        expect(getComputedStyle(part(item, "disclosure")).rotate).toBe("90deg");
        await userEvent.click(trigger(item));
        await revealSettled(item);
      } finally {
        await cdp().send("Emulation.setEmulatedMedia", { features: [] });
      }
    },
  );

  it("publishes an actual independently open quiet example without an unsupported arrow-key claim", async () => {
    const examples = componentExamples["ui-accordion"]!;
    const example = examples.find((candidate) => candidate.name === "Quiet sections")!;
    expect(example).toBeDefined();
    const exampleRoot = await fixture<HTMLElement>(example.code);
    const accordion = exampleRoot.querySelector<UIAccordion>("ui-accordion")!;
    expect(accordion.variant).toBe("quiet");
    expect(accordion.mode).toBe("multiple");
    expect(
      items(accordion)
        .filter((item) => item.open)
        .map((item) => item.value),
    ).toEqual(["saved", "tree"]);
    expect(
      accordion.querySelectorAll('ui-icon[slot="disclosure"][name="navigation.disclosure"]').length,
    ).toBe(3);
    expect(accordion.querySelector("ui-link")!.getAttribute("href")).toBe("/components/ui-tree");
    expect(
      examples.find((candidate) => candidate.name === "Interactive panels")!.code,
    ).not.toContain("Arrow keys move");
    const tree = items(accordion)[2]!;
    await revealSettled(tree);
    const input = tree.querySelector<UIInput>("ui-input")!;
    await userEvent.fill(part(input, "control"), "hello");
    await userEvent.click(trigger(tree));
    await revealSettled(tree);
    await userEvent.click(trigger(tree));
    await revealSettled(tree);
    expect(input.value).toBe("hello");
  });
});
