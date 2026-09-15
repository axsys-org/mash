import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UILink } from "./link.js";
import "./register.js";
import "../icon/register.js";
import "../catalogue/mash.css";

// Run with both default fine input and POINTER=coarse. The latter uses a real
// touch-capable Chromium context through the shared Vitest configuration.
const control = (link: Element) => inShadow<HTMLAnchorElement>(link, "a");
const coarse = () => matchMedia("(pointer: coarse)").matches;
let legacyStyle: HTMLStyleElement | undefined;

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});
afterEach(() => {
  legacyStyle?.remove();
  legacyStyle = undefined;
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

describe("ui-link: native navigation targets", () => {
  it("uses the shared explicit control-size scale without changing inline prose", async () => {
    const link = await fixture<UILink>(
      `<ui-link href="#sized" variant="quiet"><ui-icon slot="prefix" name="object.folder" size="small"></ui-icon>app</ui-link>`,
    );
    expect(link.size).toBe("inherit");
    // setup.ts imports the built token CSS; assert those values explicitly so
    // a missing token or stale reference default cannot mask geometry errors.
    for (const [size, height, token] of [
      ["small", 24, "--layout-dimension-control-small"],
      ["compact", 28, "--layout-size-compact-control"],
      ["medium", 32, "--layout-dimension-control-medium"],
      ["large", 32, "--layout-dimension-control-large"],
    ] as const) {
      link.size = size;
      await settled(link);
      expect(link.getAttribute("size")).toBe(size);
      expect(getComputedStyle(link).getPropertyValue(token).trim()).not.toBe("");
      const box = control(link).getBoundingClientRect();
      expect(box.height).toBe(coarse() ? 44 : height);
      expect(link.getBoundingClientRect().height).toBe(box.height);
      expect(control(link).getAttribute("href")).toBe("#sized");
    }
    link.variant = "inline";
    await settled(link);
    expect(getComputedStyle(control(link)).display).toBe("inline");
    expect(control(link).getBoundingClientRect().height).toBeLessThan(24);
  });

  it("inherits a compact navigation context and permits a local size override", async () => {
    const nav = await fixture(
      `<nav data-mash-size="compact"><ui-link href="#app" variant="quiet">app</ui-link></nav>`,
    );
    const link = nav.querySelector<UILink>("ui-link")!;
    expect(control(link).getBoundingClientRect().height).toBe(coarse() ? 44 : 28);
    link.size = "small";
    await settled(link);
    expect(control(link).getBoundingClientRect().height).toBe(coarse() ? 44 : 24);
    link.size = "inherit";
    await settled(link);
    expect(control(link).getBoundingClientRect().height).toBe(coarse() ? 44 : 28);
  });

  for (const theme of ["light", "dark"]) {
    it(`resets legacy selection borders while preserving actual keyboard focus in ${theme}`, async () => {
      document.documentElement.dataset.theme = theme;
      // Progressive-enhancement clients may have an older Mash recipe before
      // this catalogue. An omitted declaration cannot remove its inset ring.
      legacyStyle = document.createElement("style");
      legacyStyle.textContent = `@layer mash.catalogue {
        :where([data-mash-catalogue="mash"]) ui-link[variant="quiet"][current]::part(control) {
          --legacy-link-rule: matched;
          box-shadow: inset 0 0 0 var(--border-hairline) var(--color-action-emphasis);
        }
      }`;
      document.head.prepend(legacyStyle);
      const nav = await fixture(
        `<nav aria-label="Namespace" style="display:flex;align-items:center;gap:4px;padding:4px;width:max-content"><button>Before</button><ui-link href="#root" variant="quiet" size="small">Root</ui-link><ui-link href="#app" variant="quiet" size="small" current>app</ui-link></nav>`,
      );
      const [regular, current] = [...nav.querySelectorAll<UILink>("ui-link")] as [UILink, UILink];
      const anchor = control(current);
      expect(getComputedStyle(anchor).getPropertyValue("--legacy-link-rule").trim()).toBe(
        "matched",
      );
      const selection = getComputedStyle(anchor).backgroundColor;
      expect(selection).not.toBe(getComputedStyle(control(regular)).backgroundColor);
      expect(selection).not.toBe("rgba(0, 0, 0, 0)");
      expect(getComputedStyle(anchor).boxShadow).toBe("none");
      expect(getComputedStyle(anchor).outlineStyle).toBe("none");
      expect(anchor.getAttribute("aria-current")).toBe("page");
      await page.screenshot({
        path: `test-results/quiet-current-${theme}-${coarse() ? "coarse" : "fine"}.png`,
        element: nav,
      });
      nav.querySelector("button")!.focus();
      await userEvent.tab();
      await userEvent.tab();
      expect(current.shadowRoot!.activeElement).toBe(anchor);
      expect(anchor.matches(":focus-visible")).toBe(true);
      expect(getComputedStyle(anchor).outlineStyle).toBe("solid");
      expect(parseFloat(getComputedStyle(anchor).outlineWidth)).toBeGreaterThan(0);
      expect(getComputedStyle(anchor).backgroundColor).toBe(selection);
      expect(getComputedStyle(anchor).boxShadow).toBe("none");
    });

    for (const variant of ["standalone", "quiet"]) {
      it(`keeps ${variant} compact on fine pointers and touchable on coarse pointers in ${theme}`, async () => {
        document.documentElement.dataset.theme = theme;
        const link = await fixture<UILink>(
          `<ui-link href="#destination" variant="${variant}">A</ui-link>`,
        );
        const anchor = control(link);
        const box = anchor.getBoundingClientRect();
        const touch = 44;
        if (coarse()) {
          expect(box.width).toBeGreaterThanOrEqual(touch);
          expect(box.height).toBeGreaterThanOrEqual(touch);
        } else {
          expect(box.width).toBeLessThan(touch);
          expect(box.height).toBeLessThan(touch);
          if (variant === "quiet") {
            expect(box.height).toBe(32);
          } else {
            expect(box.height).toBe(parseFloat(getComputedStyle(anchor).lineHeight));
          }
        }
        // The visible host reserves the real native target; no enlarged
        // pseudo-element can steal the neighbouring link's pointer events.
        expect(link.getBoundingClientRect().width).toBe(box.width);
        expect(link.getBoundingClientRect().height).toBe(box.height);
      });
    }
  }

  it("leaves inline prose at the surrounding text size under either pointer", async () => {
    const paragraph = await fixture(
      `<p style="width:360px;font:14px/20px sans-serif">Read <ui-link href="#docs" variant="inline">the documentation</ui-link> before continuing.</p>`,
    );
    const link = paragraph.querySelector("ui-link")!;
    const anchor = control(link);
    expect(getComputedStyle(link).display).toBe("inline");
    expect(getComputedStyle(anchor).display).toBe("inline");
    expect(getComputedStyle(anchor).fontSize).toBe(getComputedStyle(paragraph).fontSize);
    expect(anchor.getBoundingClientRect().height).toBeLessThan(44);
    expect(paragraph.getBoundingClientRect().height).toBe(20);
  });

  it("reserves adjacent targets when a narrow flex row wraps", async () => {
    const row = await fixture(
      `<nav aria-label="Pages" style="display:flex;flex-wrap:wrap;gap:4px;width:88px"><ui-link href="#a" variant="quiet">A</ui-link><ui-link href="#b" variant="quiet">B</ui-link></nav>`,
    );
    const links = [...row.querySelectorAll<UILink>("ui-link")];
    const boxes = links.map((link) => control(link).getBoundingClientRect());
    const [first, second] = boxes as [DOMRect, DOMRect];
    expect(first.right <= second.left || first.bottom <= second.top).toBe(true);
    if (coarse()) expect(second.top).toBeGreaterThanOrEqual(first.bottom + 4);
    else expect(first.top).toBe(second.top);
    for (const [index, link] of links.entries()) {
      const box = boxes[index]!;
      expect(box.left).toBeGreaterThanOrEqual(row.getBoundingClientRect().left);
      expect(box.right).toBeLessThanOrEqual(row.getBoundingClientRect().right);
      const hits: EventTarget[] = [];
      link.addEventListener("click", (event) => {
        event.preventDefault();
        hits.push(event.composedPath()[0]!);
      });
      // Exercise lower padding, inside the rounded control's hit region.
      // The extreme bounding-box corner is deliberately outside its radius.
      await userEvent.click(control(link), {
        position: { x: box.width / 2, y: box.height - 2 },
      });
      expect(hits).toEqual([control(link)]);
    }
  });

  it("stretches a quiet native anchor and its projected grid across a full navigation row", async () => {
    const link = await fixture<UILink>(
      `<ui-link href="#event" variant="quiet" style="width:280px"><span style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:4px"><span>72</span><span>Read record</span><span>now</span></span></ui-link>`,
    );
    const anchor = control(link);
    const box = anchor.getBoundingClientRect();
    const label = inShadow<HTMLElement>(link, '[part="label"]');
    const grid = link.querySelector("span")!;
    expect(box.width).toBe(280);
    expect(box.left).toBe(link.getBoundingClientRect().left);
    expect(grid.getBoundingClientRect().width).toBe(label.getBoundingClientRect().width);
    expect(grid.getBoundingClientRect().width).toBeGreaterThan(240);
    let clicks = 0;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      clicks++;
    });
    await userEvent.click(anchor, {
      position: { x: box.width - 2, y: box.height / 2 },
    });
    expect(clicks).toBe(1);
  });

  it("preserves native keyboard navigation, focus treatment and disabled suppression", async () => {
    const row = await fixture(
      `<nav><button>Before</button><ui-link href="#first" variant="quiet">First</ui-link><ui-link href="#disabled" variant="quiet" disabled>Disabled</ui-link><ui-link href="#last" variant="quiet">Last</ui-link></nav>`,
    );
    const [first, disabled, last] = [...row.querySelectorAll<UILink>("ui-link")] as [
      UILink,
      UILink,
      UILink,
    ];
    const clicks: UILink[] = [];
    for (const link of [first, disabled, last]) {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        clicks.push(link);
      });
    }
    row.querySelector("button")!.focus();
    await userEvent.tab();
    expect(first.shadowRoot!.activeElement).toBe(control(first));
    expect(control(first).matches(":focus-visible")).toBe(true);
    expect(parseFloat(getComputedStyle(control(first)).outlineWidth)).toBeGreaterThan(0);
    await userEvent.keyboard("{Enter}");
    expect(clicks).toEqual([first]);
    await userEvent.keyboard(" ");
    expect(clicks).toEqual([first]);
    await userEvent.tab();
    expect(last.shadowRoot!.activeElement).toBe(control(last));
    expect(control(disabled).hasAttribute("href")).toBe(false);
    expect(control(disabled).getAttribute("aria-disabled")).toBe("true");
    expect(control(disabled).tabIndex).toBe(-1);
    control(disabled).click();
    expect(clicks).toEqual([first]);
    disabled.disabled = false;
    await settled(disabled);
    first.focus();
    await userEvent.tab();
    expect(disabled.shadowRoot!.activeElement).toBe(control(disabled));
    await userEvent.keyboard("{Enter}");
    expect(clicks).toEqual([first, disabled]);
  });
});
