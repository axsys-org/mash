import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cdp, page, server, userEvent } from "vitest/browser";
import "@mash/ui/catalogue/mash.css";
import "../catalogue/mash.css";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { ShrinePathRow } from "./path-row.js";
import "./register.js";

const part = (row: Element, name: string) => inShadow<HTMLElement>(row, `[part="${name}"]`);
const link = (row: Element) => part(row, "link") as HTMLAnchorElement;
const toggle = (row: Element) => part(part(row, "toggle"), "control") as HTMLButtonElement;
const coarse = () => matchMedia("(pointer: coarse)").matches;
const icon = '<ui-icon slot="icon" name="object.folder" size="small" label=""></ui-icon>';
const mount = (content = "", attributes = "previewable", width = 320) =>
  fixture<ShrinePathRow>(
    `<sh-path-row href="/debug/app" label="app" ${attributes} style="width:${width}px;background:var(--color-surface);color:var(--color-text)">${content}</sh-path-row>`,
  );

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});
afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

describe("sh-path-row semantics", () => {
  it("is a plain native link until previewability is explicitly enabled", async () => {
    const row = await mount("", "");
    expect(row.previewable).toBe(false);
    expect(row.open).toBe(false);
    expect(link(row).getAttribute("href")).toBe("/debug/app");
    await expect.element(page.getByRole("link", { name: "app", exact: true })).toBeVisible();
    expect(part(row, "toggle").hidden).toBe(true);
    expect(toggle(row).disabled).toBe(true);
    expect(toggle(row).hasAttribute("aria-expanded")).toBe(false);
    expect(part(row, "preview").hidden).toBe(true);
    expect(row.querySelector('[role="treeitem"]')).toBeNull();
    row.label = "";
    await settled(row);
    await expect.element(page.getByRole("link", { name: "/debug/app", exact: true })).toBeVisible();
  });

  it("preserves href/target/rel and leaves native click, modifiers and auxiliary events untouched", async () => {
    const row = await mount();
    row.href = "/debug/a%20b?before=900719925474099312345&limit=2";
    row.target = "_blank";
    await settled(row);
    expect(link(row).getAttribute("href")).toBe(row.href);
    expect(link(row).target).toBe("_blank");
    expect(link(row).rel).toBe("noopener noreferrer");
    row.rel = "author external";
    await settled(row);
    expect(link(row).rel).toBe("author external");
    const observed: boolean[] = [];
    for (const [type, options] of [
      ["click", {}],
      ["click", { metaKey: true }],
      ["click", { ctrlKey: true }],
      ["auxclick", { button: 1 }],
    ] as const) {
      const stop = (event: Event) => {
        observed.push(event.defaultPrevented);
        event.preventDefault();
      };
      document.addEventListener(type, stop, { once: true });
      link(row).dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          composed: true,
          cancelable: true,
          ...options,
        }),
      );
    }
    expect(observed).toEqual([false, false, false, false]);
    expect(row.open).toBe(false);
  });

  it("names each control separately and retains all rich authored labels and summaries", async () => {
    const row = await mount(
      `${icon}<span slot="label"><strong>Applications</strong> &amp; tools</span><span slot="meta">Authored lede.</span><span slot="meta">Distinct help text.</span><p slot="preview">Record content</p>`,
      'previewable preview-label="Preview /app"',
    );
    await expect
      .element(page.getByRole("link", { name: "Applications & tools", exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Preview /app", exact: true }))
      .toBeVisible();
    expect(part(row, "label").title).toBe("Applications & tools");
    expect(part(row, "meta").title).toBe("Authored lede. Distinct help text.");
    expect(row.querySelectorAll('[slot="meta"]').length).toBe(2);
    expect(link(row).getAttribute("aria-describedby")).toBe("meta");
    expect(link(row).getAttribute("aria-labelledby")).toBe("label");
    expect(toggle(row).hasAttribute("aria-controls")).toBe(false);
    await userEvent.click(toggle(row));
    await expect
      .element(page.getByRole("region", { name: "Preview /app", exact: true }))
      .toBeVisible();
  });

  it("toggles once for Enter and Space, bubbles the event, and keeps property changes silent", async () => {
    const row = await mount('<button slot="preview">Authored action</button>');
    const events: unknown[] = [];
    row.parentElement!.addEventListener("sh-path-row-toggle", (event) =>
      events.push((event as CustomEvent).detail),
    );
    toggle(row).focus();
    await userEvent.keyboard("{Enter}");
    await settled(row);
    expect(row.open).toBe(true);
    expect(toggle(row).getAttribute("aria-expanded")).toBe("true");
    expect(row.hasAttribute("open")).toBe(true);
    const preview = row.querySelector('[slot="preview"]');
    await userEvent.keyboard(" ");
    await settled(row);
    expect(row.open).toBe(false);
    expect(events).toEqual([{ open: true }, { open: false }]);
    row.open = true;
    await settled(row);
    row.open = false;
    await settled(row);
    expect(events).toHaveLength(2);
    expect(row.querySelector('[slot="preview"]')).toBe(preview);
  });

  it("returns only owned preview focus before hiding or removing previewability", async () => {
    const row = await mount('<button slot="preview">Authored action</button>');
    const action = row.querySelector<HTMLButtonElement>("button")!;
    row.open = true;
    await settled(row);
    action.focus();
    row.open = false;
    await settled(row);
    expect(toggle(row).matches(":focus")).toBe(true);
    row.open = true;
    await settled(row);
    action.focus();
    row.previewable = false;
    await settled(row);
    expect(row.open).toBe(false);
    expect(link(row).matches(":focus")).toBe(true);
    expect(part(row, "preview").hidden).toBe(true);
    const external = await fixture<HTMLButtonElement>("<button>Elsewhere</button>");
    external.focus();
    row.previewable = true;
    row.open = true;
    await settled(row);
    row.open = false;
    await settled(row);
    expect(document.activeElement).toBe(external);
  });

  it("refreshes full-text metadata, occupied lanes and reconnect observers", async () => {
    const row = await mount(
      '<span slot="label">Old label</span><span slot="meta">Old summary</span>',
    );
    const meta = row.querySelector('[slot="meta"]')!;
    meta.textContent = "New complete summary";
    await vi.waitFor(() => expect(part(row, "meta").title).toBe("New complete summary"));
    meta.remove();
    await settled(row);
    expect(row.matches(":state(has-meta)")).toBe(false);
    expect(link(row).hasAttribute("aria-describedby")).toBe(false);
    const parent = row.parentElement!;
    row.remove();
    row.querySelector('[slot="label"]')!.textContent = "Reconnected label";
    parent.append(row);
    await settled(row);
    expect(part(row, "label").title).toBe("Reconnected label");
    row.querySelector('[slot="label"]')!.textContent = "Updated after reconnect";
    await vi.waitFor(() => expect(part(row, "label").title).toBe("Updated after reconnect"));
  });

  it("keeps nested preview rows independent", async () => {
    const row = await mount(
      '<sh-path-row slot="preview" href="/debug/app/nested" label="nested" previewable><p slot="preview">Inner data</p></sh-path-row>',
      "previewable open",
    );
    const inner = row.querySelector<ShrinePathRow>("sh-path-row")!;
    await userEvent.click(toggle(inner));
    await settled(row);
    expect(inner.open).toBe(true);
    expect(row.open).toBe(true);
    expect(toggle(row).getAttribute("aria-expanded")).toBe("true");
  });

  it("does not invent summary lanes or descriptions for empty or hidden text", async () => {
    const row = await mount(
      '<span slot="meta"></span><span slot="meta" hidden>Hidden summary</span><span slot="meta"><span hidden>Nested hidden summary</span></span>',
    );
    expect(row.matches(":state(has-meta)")).toBe(false);
    expect(part(row, "meta").hidden).toBe(true);
    expect(link(row).hasAttribute("aria-describedby")).toBe(false);
    const hidden = row.querySelector<HTMLElement>('[slot="meta"][hidden]')!;
    hidden.hidden = false;
    await vi.waitFor(() => expect(row.matches(":state(has-meta)")).toBe(true));
    expect(part(row, "meta").title).toBe("Hidden summary");
    hidden.textContent = "   ";
    await vi.waitFor(() => expect(row.matches(":state(has-meta)")).toBe(false));
    expect(link(row).hasAttribute("aria-describedby")).toBe(false);
  });
});

describe("sh-path-row Mash recipe", () => {
  for (const theme of ["light", "dark"])
    for (const width of [160, 320, 720]) {
      it(`has distinct targets and complete wrapping content at ${width}px in ${theme}`, async () => {
        document.documentElement.dataset.theme = theme;
        const row = await mount(icon, "previewable", width);
        const target = coarse() ? 44 : 28;
        const anchor = link(row).getBoundingClientRect();
        const button = toggle(row).getBoundingClientRect();
        expect(anchor.height).toBe(target);
        expect(button.height).toBe(target);
        expect(button.width).toBe(target);
        expect(button.right + 4).toBeCloseTo(anchor.left, 1);
        expect(anchor.right).toBeLessThanOrEqual(row.getBoundingClientRect().right);
        expect(getComputedStyle(link(row)).fontSize).toBe("12px");
        expect(part(row, "disclosure").getBoundingClientRect().width).toBe(16);
        expect(part(part(row, "disclosure"), "root").getBoundingClientRect().width).toBe(16);
        const meta = document.createElement("span");
        meta.slot = "meta";
        meta.textContent =
          "Applications have complete authored metadata, including long_unbroken_identifiers_that_must_not_overflow.";
        row.append(meta);
        row.label = "application_with_long_unbroken_name";
        await settled(row);
        expect(link(row).scrollWidth).toBeLessThanOrEqual(
          Math.ceil(link(row).getBoundingClientRect().width),
        );
        expect(part(row, "meta").scrollHeight).toBeLessThanOrEqual(
          Math.ceil(part(row, "meta").getBoundingClientRect().height),
        );
        expect(getComputedStyle(part(row, "meta")).fontSize).toBe("11px");
        expect(getComputedStyle(part(row, "label")).whiteSpace).toBe("normal");
        expect(meta.textContent).toContain("must_not_overflow");
        expect(part(row, "toggle").getAttribute("tone")).toBe("neutral");
        expect(getComputedStyle(toggle(row)).getPropertyValue("-webkit-tap-highlight-color")).toBe(
          "rgba(0, 0, 0, 0)",
        );
        if (width <= 448) {
          expect(part(row, "meta").getBoundingClientRect().top).toBeGreaterThanOrEqual(
            part(row, "label").getBoundingClientRect().bottom,
          );
          expect(part(row, "meta").getBoundingClientRect().left).toBeCloseTo(
            part(row, "label").getBoundingClientRect().left,
            1,
          );
        } else {
          expect(part(row, "meta").getBoundingClientRect().left).toBeCloseTo(
            part(row, "label").getBoundingClientRect().right + 4,
            1,
          );
        }
      });
    }

  it("uses logical preview geometry and stock disclosure orientation in RTL", async () => {
    const row = await mount(`${icon}<p slot="preview">Preview</p>`, 'previewable dir="rtl"');
    expect(link(row).getBoundingClientRect().right + 4).toBeCloseTo(
      toggle(row).getBoundingClientRect().left,
      1,
    );
    expect(part(row, "disclosure").getAttribute("name")).toBe("navigation.disclosure");
    await Promise.all(
      part(row, "disclosure")
        .getAnimations()
        .map((animation) => animation.finished),
    );
    expect(getComputedStyle(part(row, "disclosure")).transform).toBe("matrix(-1, 0, 0, -1, 0, 0)");
    row.open = true;
    await settled(row);
    await Promise.all(
      part(row, "disclosure")
        .getAnimations()
        .map((animation) => animation.finished),
    );
    expect(getComputedStyle(part(row, "disclosure")).transform).toBe("matrix(0, 1, -1, 0, 0, 0)");
    expect(getComputedStyle(part(row, "guide")).borderRightWidth).toBe("1px");
    expect(getComputedStyle(part(row, "guide")).borderLeftWidth).toBe("0px");
    expect(getComputedStyle(part(row, "guide")).paddingRight).toBe("12px");
  });

  it("keeps native keyboard focus rings and hidden previews out of tab order", async () => {
    const row = await mount('<button slot="preview">Hidden action</button>');
    const end = await fixture<HTMLButtonElement>("<button>Next control</button>");
    await userEvent.keyboard("{Tab}");
    toggle(row).focus();
    expect(toggle(row).matches(":focus-visible")).toBe(true);
    expect(getComputedStyle(toggle(row)).outlineStyle).toBe("solid");
    await userEvent.keyboard("{Tab}");
    expect(link(row).matches(":focus-visible")).toBe(true);
    expect(getComputedStyle(link(row)).outlineStyle).toBe("solid");
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(end);
  });

  it.skipIf(server.browser !== "chromium")("honors forced colors and reduced motion", async () => {
    await cdp().send("Emulation.setEmulatedMedia", {
      features: [
        { name: "forced-colors", value: "active" },
        { name: "prefers-reduced-motion", value: "reduce" },
      ],
    });
    try {
      const row = await mount('<p slot="preview">Preview</p>', "previewable open");
      expect(getComputedStyle(part(row, "disclosure")).transitionDuration).toBe("0s");
      expect(getComputedStyle(part(row, "guide")).borderInlineStartColor).not.toBe(
        "rgba(0, 0, 0, 0)",
      );
      await userEvent.keyboard("{Tab}");
      toggle(row).focus();
      expect(toggle(row).matches(":focus-visible")).toBe(true);
      expect(getComputedStyle(toggle(row)).outlineColor).not.toBe(
        getComputedStyle(toggle(row)).backgroundColor,
      );
    } finally {
      await cdp().send("Emulation.setEmulatedMedia", { features: [] });
    }
  });

  for (const theme of ["light", "dark"])
    it(`captures ${theme} shared rows without application overrides`, async () => {
      document.documentElement.dataset.theme = theme;
      const sample =
        await fixture<HTMLElement>(`<div style="padding:12px;width:380px;background:var(--color-surface);color:var(--color-text)">
      <sh-path-row href="/debug/app" label="app" previewable>${icon}<span slot="meta">Applications.</span></sh-path-row>
      <sh-path-row href="/debug/app/cards" label="cards" previewable open>${icon}<span slot="meta">Review cards and their authored documentation.</span><span slot="meta">A separate complete description remains visible.</span><div slot="preview" style="font:12px/1.5 monospace;padding-block:4px">/title  Review queue<br>/state  live</div></sh-path-row>
      <sh-path-row href="/debug/long" label="a_long_authored_namespace_name" previewable>${icon}<span slot="meta">This entire summary wraps naturally at narrow widths rather than disappearing.</span></sh-path-row>
    </div>`);
      await page.screenshot({
        path: `test-results/path-row-${theme}-${coarse() ? "coarse" : "fine"}.png`,
        element: sample,
      });
    });
});
