import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import "@mash/ui/catalogue/mash.css";
import "@mash/ui/button/register";
import "@mash/ui/scroll-area/register";
import "@mash/ui/icon/register";
import "../catalogue/mash.css";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { ShrineMyth } from "./myth.js";
import "./register.js";

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});
afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

const cardPart = (myth: Element, part: string) =>
  inShadow<HTMLElement>(inShadow(myth, "ui-card"), `[part="${part}"]`);

describe("sh-myth: static record annotation", () => {
  for (const variant of ["record", "embedded", "preview"] as const) {
    it(`adds, removes and reinserts ${variant} context without inventing a header or replacing focused fields`, async () => {
      const myth = await fixture<ShrineMyth>(
        `<sh-myth variant="${variant}" data-mash-size="compact"><sh-limb><sh-slot slot="label"><ui-button variant="text">/state</ui-button></sh-slot><sh-pail slot="value"><pre>Original representation</pre></sh-pail></sh-limb></sh-myth>`,
      );
      const annotation = inShadow<HTMLElement>(myth, '[part="annotation"]');
      const slot = inShadow<HTMLSlotElement>(myth, 'slot[name="annotation"]');
      const limbs = inShadow<HTMLElement>(myth, '[part="limbs"]');
      const limb = myth.querySelector("sh-limb")!;
      const button = myth.querySelector<HTMLElement>("ui-button")!;
      const native = inShadow<HTMLButtonElement>(button, "button");
      const before = myth.getBoundingClientRect().height;
      expect(annotation.hidden).toBe(true);
      expect(annotation.getBoundingClientRect().height).toBe(0);
      expect(cardPart(myth, "header").hidden).toBe(true);
      button.focus();
      const note = document.createElement("span");
      note.slot = "annotation";
      note.textContent = "Values from the captured snapshot.";
      for (let round = 0; round < 2; round++) {
        myth.append(note);
        await settled(myth);
        expect(slot.assignedElements()).toEqual([note]);
        expect(annotation.hidden).toBe(false);
        expect(annotation.hasAttribute("role")).toBe(false);
        expect(annotation.hasAttribute("aria-live")).toBe(false);
        expect(annotation.contains(limbs)).toBe(false);
        expect(cardPart(myth, "header").hidden).toBe(true);
        expect(myth.shadowRoot!.querySelectorAll("ui-card")).toHaveLength(1);
        expect(myth.querySelector("sh-limb")).toBe(limb);
        expect(button.shadowRoot!.activeElement).toBe(native);
        expect(myth.querySelector("pre")!.textContent).toBe("Original representation");
        expect(myth.getBoundingClientRect().height).toBeGreaterThan(before);
        note.remove();
        await settled(myth);
        expect(annotation.hidden).toBe(true);
        expect(myth.getBoundingClientRect().height).toBe(before);
        expect(button.shadowRoot!.activeElement).toBe(native);
      }
    });
  }

  it("supports an explicit light-DOM description while keeping live value status independent", async () => {
    const myth = await fixture<ShrineMyth>(
      `<sh-myth variant="embedded"><span slot="annotation" id="record-context-note">Values from the captured snapshot.</span><sh-limb><sh-slot slot="label" title="/state"></sh-slot><sh-pail slot="value" role="group" aria-label="Value of /state" aria-describedby="record-context-note" text="ready"><span slot="status">Read position remains value-specific.</span></sh-pail></sh-limb></sh-myth>`,
    );
    const note = myth.querySelector<HTMLElement>('[slot="annotation"]')!;
    const pail = myth.querySelector<HTMLElement>("sh-pail")!;
    const status = inShadow<HTMLElement>(pail, '[part="status"]');
    expect(pail.ariaDescribedByElements).toEqual([note]);
    await expect
      .element(page.getByRole("group", { name: "Value of /state" }))
      .toHaveAccessibleDescription("Values from the captured snapshot.");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-atomic")).toBe("true");
    expect(status.querySelector('slot[name="annotation"]')).toBeNull();
    expect(inShadow<HTMLSlotElement>(myth, 'slot[name="annotation"]').assignedElements()).toEqual([
      note,
    ]);
  });

  for (const theme of ["light", "dark"]) {
    for (const variant of ["record", "embedded", "preview"]) {
      for (const width of [160, 720]) {
        it(`keeps ${variant} context quiet and complete at ${width}px in ${theme}`, async () => {
          document.documentElement.dataset.theme = theme;
          const prose =
            "Context belongs to these displayed values. " + "long_unbroken_context_".repeat(10);
          const myth = await fixture<ShrineMyth>(
            `<sh-myth variant="${variant}" data-mash-size="compact" title="Fields" style="width:${width}px"><span slot="annotation"></span><sh-limb><sh-slot slot="label" title="/state"></sh-slot><sh-pail slot="value" text="ready"></sh-pail></sh-limb></sh-myth>`,
          );
          const note = myth.querySelector('[slot="annotation"]')!;
          note.textContent = prose;
          const annotation = inShadow<HTMLElement>(myth, '[part="annotation"]');
          const limbs = inShadow<HTMLElement>(myth, '[part="limbs"]');
          const value = inShadow(myth.querySelector("sh-pail")!, '[part="root"]');
          await settled(myth);
          const box = annotation.getBoundingClientRect();
          expect(box.height).toBeGreaterThan(0);
          expect(box.top).toBeGreaterThanOrEqual(
            cardPart(myth, "header").getBoundingClientRect().bottom,
          );
          expect(limbs.getBoundingClientRect().top - box.bottom).toBe(4);
          expect(annotation.scrollWidth).toBeLessThanOrEqual(annotation.clientWidth + 1);
          expect(box.right).toBeLessThanOrEqual(myth.getBoundingClientRect().right);
          expect(getComputedStyle(annotation).fontSize).toBe("11px");
          expect(getComputedStyle(annotation).fontFamily).not.toBe(
            getComputedStyle(value).fontFamily,
          );
          expect(getComputedStyle(annotation).color).not.toBe(getComputedStyle(value).color);
          expect(getComputedStyle(annotation).backgroundColor).toBe("rgba(0, 0, 0, 0)");
          expect(getComputedStyle(annotation).borderWidth).toBe("0px");
          expect(getComputedStyle(annotation).boxShadow).toBe("none");
          expect(note.textContent).toBe(prose);
        });
      }
    }

    it(`captures shared static record context in ${theme}`, async () => {
      document.documentElement.dataset.theme = theme;
      const wrapper = await fixture<HTMLElement>(
        `<div style="width:320px;padding:12px;background:var(--color-surface);color:var(--color-text)"><sh-myth variant="embedded" data-mash-size="compact" title="Fields"><span slot="annotation">Values from the captured snapshot. Supporting context applies only to this record.</span><sh-limb><sh-slot slot="label" title="/state"></sh-slot><sh-pail slot="value" text="ready"></sh-pail></sh-limb><sh-limb><sh-slot slot="label" title="/title"></sh-slot><sh-pail slot="value" text="Review queue"></sh-pail></sh-limb></sh-myth></div>`,
      );
      await page.screenshot({
        element: wrapper,
        path: `../../../../test-results/shrine-record-annotation-${theme}.png`,
      });
    });
  }
});

describe("sh-myth: shared record recipe", () => {
  it("renders authored descriptions as text and supports rich slot overrides", async () => {
    const myth = await fixture<ShrineMyth>(
      `<sh-myth title="Demo" description="&lt;img src=x&gt;"><em slot="description">Authored lore</em></sh-myth>`,
    );
    expect(myth.description).toBe("<img src=x>");
    expect(inShadow(myth, "[part=description]").querySelector("img")).toBeNull();
    const slot = inShadow<HTMLSlotElement>(myth, 'slot[name="description"]');
    expect(slot.assignedElements()).toEqual([myth.querySelector("em")]);
    myth.querySelector("em")!.remove();
    await settled(myth);
    expect(slot.assignedElements()).toHaveLength(0);
    expect(slot.textContent).toBe("<img src=x>");
    myth.description = "";
    await settled(myth);
    expect(inShadow<HTMLElement>(myth, "[part=description]").hidden).toBe(true);
    expect(cardPart(myth, "description").hidden).toBe(true);
  });

  it("aligns a stock Mash icon and rich title without consumer header styles", async () => {
    const myth = await fixture<ShrineMyth>(
      `<sh-myth variant="embedded" data-mash-size="compact"><span slot="title"><ui-icon name="object.document"></ui-icon><span>Fields</span></span><ui-badge slot="meta">2</ui-badge></sh-myth>`,
    );
    const title = myth.querySelector<HTMLElement>('[slot="title"]')!;
    const icon = title.querySelector("ui-icon")!.getBoundingClientRect();
    const label = title.querySelector("span")!.getBoundingClientRect();
    expect(getComputedStyle(title).display).toBe("flex");
    expect(icon.width).toBeGreaterThan(0);
    expect(label.left - icon.right).toBe(4);
    expect(Math.abs(icon.y + icon.height / 2 - label.y - label.height / 2)).toBeLessThan(1);
    expect(getComputedStyle(title).fontSize).toBe("12px");
  });

  it("does not reserve empty identity or footer regions, including after removal", async () => {
    const myth = await fixture<ShrineMyth>(
      `<sh-myth variant="embedded"><sh-limb><sh-slot slot="label" title="/state"></sh-slot><sh-pail slot="value" text="ready"></sh-pail></sh-limb></sh-myth>`,
    );
    expect(cardPart(myth, "header").hidden).toBe(true);
    expect(cardPart(myth, "footer").hidden).toBe(true);
    const title = document.createElement("strong");
    title.slot = "title";
    title.textContent = "Fields";
    myth.append(title);
    await settled(myth);
    expect(cardPart(myth, "header").hidden).toBe(false);
    title.remove();
    await settled(myth);
    expect(cardPart(myth, "header").hidden).toBe(true);
    myth.title = "Temporary identity";
    await settled(myth);
    myth.title = "";
    await settled(myth);
    expect(cardPart(myth, "header").hidden).toBe(true);
  });

  it("moves metadata and actions between full identity and the preview footer", async () => {
    const myth = await fixture<ShrineMyth>(
      `<sh-myth variant="embedded" title="Fields"><span slot="meta">2 fields</span><a slot="actions" href="#demo">Open record</a></sh-myth>`,
    );
    expect(inShadow(myth, "[part=meta]").getAttribute("slot")).toBe("meta");
    expect(inShadow(myth, "[part=actions]").getAttribute("slot")).toBe("actions");
    myth.variant = "preview";
    await settled(myth);
    expect(inShadow(myth, "[part=meta]").getAttribute("slot")).toBe("footer");
    expect(inShadow(myth, "[part=actions]").getAttribute("slot")).toBe("footer");
    expect(cardPart(myth, "footer").hidden).toBe(false);
    myth.querySelector('[slot="meta"]')!.remove();
    myth.querySelector('[slot="actions"]')!.remove();
    await settled(myth);
    expect(cardPart(myth, "footer").hidden).toBe(true);
  });

  for (const theme of ["light", "dark"]) {
    for (const [variant, fontSize, rowInset] of [
      ["embedded", "12px", "8px"],
      ["preview", "11px", "4px"],
    ] as const) {
      it(`uses compact ${variant} typography and row rhythm in ${theme}`, async () => {
        document.documentElement.dataset.theme = theme;
        const myth = await fixture<ShrineMyth>(
          `<sh-myth variant="${variant}" data-mash-size="compact" title="Fields" description="Authored lore" style="width:320px"><sh-limb><sh-slot slot="label" title="/state"></sh-slot><sh-pail slot="value" text="ready"></sh-pail></sh-limb></sh-myth>`,
        );
        const row = inShadow(myth.querySelector("sh-limb")!, "[part=root]");
        const label = inShadow(myth.querySelector("sh-slot")!, "[part=root]");
        const value = inShadow(myth.querySelector("sh-pail")!, "[part=root]");
        expect(getComputedStyle(row).paddingBlockStart).toBe(rowInset);
        expect(getComputedStyle(row).paddingBlockEnd).toBe(rowInset);
        expect(getComputedStyle(label).fontSize).toBe(fontSize);
        expect(getComputedStyle(value).fontSize).toBe(fontSize);
        expect(getComputedStyle(label).fontFamily).toBe(getComputedStyle(value).fontFamily);
        expect(getComputedStyle(inShadow(myth, "[part=root]")).borderWidth).toBe("0px");
        expect(getComputedStyle(inShadow(myth, "[part=root]")).backgroundColor).toBe(
          "rgba(0, 0, 0, 0)",
        );
        expect(getComputedStyle(value).color).not.toBe(getComputedStyle(label).color);
        const tokenProbe = document.createElement("span");
        tokenProbe.style.color = "var(--color-text)";
        myth.append(tokenProbe);
        expect(getComputedStyle(value).color).toBe(getComputedStyle(tokenProbe).color);
      });
    }

    for (const width of [1440, 640, 448, 390, 280, 240, 160]) {
      it(`retains complete keys and values at ${width}px in ${theme}`, async () => {
        document.documentElement.dataset.theme = theme;
        const key = "/unbroken_namespace_field".repeat(20);
        const value = "literal\n  " + "unbroken_value".repeat(100);
        const myth = await fixture<ShrineMyth>(
          `<sh-myth variant="embedded" data-mash-size="compact" title="Complete values" style="width:${width}px"><sh-limb><sh-slot slot="label"><ui-button variant="text" aria-label="Inspect definition">${key}</ui-button></sh-slot><sh-pail slot="value"><pre></pre></sh-pail></sh-limb><sh-limb><sh-slot slot="label" title="/state"></sh-slot><sh-pail slot="value" text="ready"></sh-pail></sh-limb></sh-myth>`,
        );
        const pre = myth.querySelector("pre")!;
        pre.textContent = value;
        await settled(myth);
        const [first, second] = [...myth.querySelectorAll("sh-limb")];
        const firstValue = inShadow(first!, "[part=value]").getBoundingClientRect();
        const secondValue = inShadow(second!, "[part=value]").getBoundingClientRect();
        const label = inShadow(first!, '[part="label slot"]').getBoundingClientRect();
        const right = myth.getBoundingClientRect().right;
        expect(firstValue.height).toBeGreaterThan(0);
        // A pathological key uses the row width at every size. Only ordinary
        // short keys share the desktop column; no content-length flag is used.
        expect(firstValue.left).toBe(label.left);
        expect(firstValue.top).toBeGreaterThanOrEqual(label.bottom);
        expect(label.width).toBeGreaterThanOrEqual(width - 1);
        if (width <= 448) expect(secondValue.left).toBe(label.left);
        else expect(secondValue.left).toBeGreaterThan(label.left);
        expect(pre.textContent).toBe(value);
        expect(myth.querySelector("ui-button")!.textContent).toBe(key);
        expect(getComputedStyle(pre).whiteSpace).toBe("pre-wrap");
        expect(getComputedStyle(pre).fontSize).toBe("12px");
        for (const node of [
          pre,
          inShadow(myth.querySelector("ui-button")!, "button"),
          ...myth.querySelectorAll("sh-slot, sh-pail"),
        ]) {
          expect(node.getBoundingClientRect().right).toBeLessThanOrEqual(right + 1);
          expect(node.scrollWidth).toBeLessThanOrEqual(node.clientWidth + 1);
        }
      });
    }

    for (const [viewportWidth, containerWidth] of [
      [1440, 1440],
      [390, 390],
      [1440, 280],
    ] as const) {
      it(`adapts short and long fields within ${containerWidth}px at a ${viewportWidth}px viewport in ${theme}`, async () => {
        await page.viewport(viewportWidth, 1000);
        document.documentElement.dataset.theme = theme;
        const longKey = "/unbroken_namespace_field".repeat(20);
        const wrapper = await fixture<HTMLElement>(
          `<div style="box-sizing:border-box;width:${containerWidth}px;padding:var(--space-control-inline-large);background:var(--color-surface);color:var(--color-text)"><sh-myth variant="embedded" data-mash-size="compact"><span slot="title"><ui-icon name="object.document"></ui-icon><span>Fields</span></span><ui-badge slot="meta">4</ui-badge><sh-limb><sh-slot slot="label"><ui-button variant="text" aria-label="Inspect title">/title</ui-button></sh-slot><sh-pail slot="value" text="Demo card"></sh-pail></sh-limb><sh-limb><sh-slot slot="label" title="/state"></sh-slot><sh-pail slot="value" text="ready"></sh-pail></sh-limb><sh-limb><sh-slot slot="label"><ui-button variant="text" aria-label="Inspect long definition">${longKey}</ui-button></sh-slot><sh-pail slot="value" text="Unbroken key value"></sh-pail></sh-limb><sh-limb><sh-slot slot="label" title="/reference"></sh-slot><sh-pail slot="value"><a href="#demo">/app/srs/cards/demo</a></sh-pail></sh-limb></sh-myth></div>`,
        );
        const myth = wrapper.querySelector("sh-myth")!;
        const rows = [...myth.querySelectorAll("sh-limb")];
        const boxes = rows.map((row) => ({
          label: inShadow(row, '[part="label slot"]').getBoundingClientRect(),
          value: inShadow(row, "[part=value]").getBoundingClientRect(),
        }));
        const narrow = myth.getBoundingClientRect().width <= 448;
        for (const index of [0, 1, 3]) {
          const { label, value } = boxes[index]!;
          if (narrow) {
            expect(value.left).toBe(label.left);
            expect(value.top - label.bottom).toBe(4);
          } else {
            expect(value.left).toBe(boxes[0]!.value.left);
            expect(value.top).toBe(label.top);
            expect(value.left - label.right).toBe(4);
          }
        }
        const long = boxes[2]!;
        expect(long.value.left).toBe(long.label.left);
        expect(long.value.top - long.label.bottom).toBe(4);
        expect(long.label.width).toBe(myth.getBoundingClientRect().width);
        expect(long.label.height).toBeLessThan(300);
        expect(myth.querySelector('[aria-label="Inspect long definition"]')!.textContent).toBe(
          longKey,
        );
        expect(rows[2]!.querySelector("sh-pail")!.getAttribute("text")).toBe("Unbroken key value");
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(viewportWidth);
        const buttons = [...myth.querySelectorAll<HTMLElement>("ui-button")];
        const activated: number[] = [];
        buttons.forEach((button, index) =>
          button.addEventListener("click", () => activated.push(index)),
        );
        buttons[0]!.focus();
        await userEvent.keyboard("{Enter}");
        await userEvent.tab();
        expect(buttons[1]!.shadowRoot!.activeElement).toBe(inShadow(buttons[1]!, "button"));
        await userEvent.keyboard("{Enter}");
        expect(activated).toEqual([0, 1]);
        expect(getComputedStyle(inShadow(buttons[1]!, "button")).outlineStyle).not.toBe("none");
        await userEvent.cleanup();
        inShadow<HTMLElement>(buttons[1]!, "button").blur();
        await page.screenshot({
          element: wrapper,
          path: `../../../../test-results/shrine-record-layout-${theme}-${viewportWidth}-${containerWidth}.png`,
        });
      });
    }
  }

  it("preserves native keyboard, focus, and disabled state in fields", async () => {
    const myth = await fixture<ShrineMyth>(
      `<sh-myth variant="embedded" data-mash-size="compact"><sh-limb><sh-slot slot="label"><ui-button variant="text">/definition</ui-button></sh-slot><sh-pail slot="value"><a href="/namespace/record" target="_blank" rel="noopener">/namespace/record</a></sh-pail></sh-limb></sh-myth>`,
    );
    const button = myth.querySelector<HTMLElement>("ui-button")!;
    const native = inShadow<HTMLButtonElement>(button, "button");
    let clicks = 0;
    button.addEventListener("click", () => clicks++);
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(clicks).toBe(1);
    expect(button.shadowRoot!.activeElement).toBe(native);
    expect(native.matches(":focus-visible")).toBe(true);
    expect(getComputedStyle(native).outlineStyle).not.toBe("none");
    button.setAttribute("disabled", "");
    await settled(myth);
    expect(native.disabled).toBe(true);
    await userEvent.cleanup();
  });

  for (const theme of ["light", "dark"]) {
    it(`stacks narrow preview fields over an earlier legacy variant grid in ${theme}`, async () => {
      document.documentElement.dataset.theme = theme;
      const legacy = document.createElement("style");
      legacy.textContent = `@layer mash.catalogue {
        :where([data-mash-catalogue="mash"]) sh-myth[variant="preview"] sh-limb::part(root) {
          --legacy-preview-grid: matched;
          grid-template-columns: 4.5rem minmax(0, 1fr);
          gap: var(--space-control-gap);
        }
      }`;
      document.head.prepend(legacy);
      try {
        const key = "/author_supplied_definition_".repeat(8);
        const value = "Exact value\n  " + "unbroken_literal".repeat(48);
        const myth = await fixture<ShrineMyth>(
          `<sh-myth variant="preview" data-mash-size="compact" style="width:280px"><sh-limb><sh-slot slot="label"><ui-button variant="text" aria-label="Inspect complete definition">${key}</ui-button></sh-slot><sh-pail slot="value"><pre></pre></sh-pail></sh-limb><sh-limb><sh-slot slot="label" title="/state"></sh-slot><sh-pail slot="value" text="ready"></sh-pail></sh-limb></sh-myth>`,
        );
        const pre = myth.querySelector("pre")!;
        pre.textContent = value;
        await settled(myth);
        const button = myth.querySelector<HTMLElement>("ui-button")!;
        const native = inShadow<HTMLButtonElement>(button, "button");
        let activations = 0;
        button.addEventListener("click", () => activations++);
        button.focus();
        for (const width of [280, 160, 448, 390]) {
          myth.style.width = `${width}px`;
          await settled(myth);
          for (const row of myth.querySelectorAll("sh-limb")) {
            const root = inShadow<HTMLElement>(row, "[part=root]");
            expect(getComputedStyle(root).getPropertyValue("--legacy-preview-grid").trim()).toBe(
              "matched",
            );
            const label = inShadow(row, '[part="label slot"]').getBoundingClientRect();
            const valueBox = inShadow(row, "[part=value]").getBoundingClientRect();
            expect(valueBox.left).toBe(label.left);
            expect(valueBox.top - label.bottom).toBe(4);
            expect(valueBox.right).toBeLessThanOrEqual(myth.getBoundingClientRect().right);
          }
          expect(pre.textContent).toBe(value);
          expect(button.textContent).toBe(key);
          expect(button.shadowRoot!.activeElement).toBe(native);
          expect(myth.querySelector("pre")).toBe(pre);
        }
        await userEvent.keyboard("{Enter}");
        expect(activations).toBe(1);
        expect(native.matches(":focus-visible")).toBe(true);
      } finally {
        legacy.remove();
      }
    });
  }

  it("reflows the same focused preview without replacing its field action or value", async () => {
    const myth = await fixture<ShrineMyth>(
      `<sh-myth variant="preview" data-mash-size="compact" style="width:640px"><sh-limb><sh-slot slot="label"><ui-button variant="text">/state</ui-button></sh-slot><sh-pail slot="value" text="ready"></sh-pail></sh-limb></sh-myth>`,
    );
    const button = myth.querySelector<HTMLElement>("ui-button")!;
    const native = inShadow(button, "button");
    const limb = myth.querySelector("sh-limb")!;
    const pail = myth.querySelector("sh-pail")!;
    let clicks = 0;
    button.addEventListener("click", () => clicks++);
    button.focus();
    for (const width of [640, 448, 390, 280, 449, 640]) {
      myth.style.width = `${width}px`;
      await settled(myth);
      const label = inShadow(limb, '[part="label slot"]').getBoundingClientRect();
      const value = inShadow(limb, "[part=value]").getBoundingClientRect();
      expect(button.shadowRoot!.activeElement).toBe(native);
      expect(myth.querySelector("sh-pail")).toBe(pail);
      expect(pail.getAttribute("text")).toBe("ready");
      if (width <= 448) {
        expect(value.left).toBe(label.left);
        expect(value.top - label.bottom).toBe(4);
      } else {
        expect(value.left).toBeGreaterThan(label.right);
        expect(value.top).toBe(label.top);
      }
    }
    await userEvent.keyboard("{Enter}");
    expect(clicks).toBe(1);
    await userEvent.cleanup();
  });

  it("preserves native modified-link semantics through the record", async () => {
    const myth = await fixture<ShrineMyth>(
      `<sh-myth variant="embedded"><sh-limb><sh-slot slot="label" title="/reference"></sh-slot><sh-pail slot="value"><a href="/namespace/record" target="_blank" rel="noopener">/namespace/record</a></sh-pail></sh-limb></sh-myth>`,
    );
    const link = myth.querySelector("a")!;
    expect(getComputedStyle(link).color).toBe(
      getComputedStyle(inShadow(myth.querySelector("sh-pail")!, "[part=root]")).color,
    );
    expect(getComputedStyle(link).textDecorationLine).toBe("underline");
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    let forwarded = false;
    // Check the component's entire composed event path, then suppress the
    // fixture's actual navigation so it cannot interrupt the next test.
    document.addEventListener(
      "click",
      (click) => {
        forwarded = !click.defaultPrevented;
        click.preventDefault();
      },
      { once: true },
    );
    link.dispatchEvent(event);
    expect(forwarded).toBe(true);
    expect(link.getAttribute("href")).toBe("/namespace/record");
    expect(link.target).toBe("_blank");
  });

  it("preserves full values and typography after promotion into a Mash scroll area", async () => {
    // Exercise the lifecycle that invalidated nested native fallback layout:
    // focus a composed action, remove that record, then promote a new value.
    const previous = await fixture<ShrineMyth>(
      `<sh-myth><sh-limb><sh-slot slot="label"><ui-button variant="text">/definition</ui-button></sh-slot><sh-pail slot="value" text="ready"></sh-pail></sh-limb></sh-myth>`,
    );
    previous.querySelector<HTMLElement>("ui-button")!.focus();
    await userEvent.keyboard("{Enter}");
    previous.remove();
    const myth = await fixture<ShrineMyth>(
      `<sh-myth variant="embedded" data-mash-size="compact" style="width:240px"><sh-limb><sh-slot slot="label" title="/source"></sh-slot><sh-pail slot="value"><pre></pre></sh-pail></sh-limb></sh-myth>`,
    );
    const pail = myth.querySelector("sh-pail")!;
    const pre = myth.querySelector("pre")!;
    const value = "  literal_record_value\n".repeat(800);
    pre.textContent = value;
    const area = document.createElement("ui-scroll-area");
    area.style.blockSize = "120px";
    area.setAttribute("label", "Complete /source value");
    pre.replaceWith(area);
    area.append(pre);
    await settled(myth);
    const viewport = inShadow<HTMLElement>(area, "[part=viewport]");
    expect(value.length).toBeGreaterThan(12000);
    expect(pre.textContent).toBe(value);
    expect(getComputedStyle(pre).fontSize).toBe("12px");
    expect(getComputedStyle(pre).fontFamily).toBe(
      getComputedStyle(inShadow(pail, "[part=root]")).fontFamily,
    );
    expect(getComputedStyle(pre).whiteSpace).toBe("pre-wrap");
    await expect.poll(() => viewport.clientHeight, { timeout: 1000 }).toBeGreaterThan(0);
    expect(viewport.clientHeight).toBeLessThanOrEqual(120);
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
    viewport.scrollTop = viewport.scrollHeight;
    expect(viewport.scrollTop + viewport.clientHeight).toBeGreaterThanOrEqual(
      viewport.scrollHeight - 1,
    );
    expect(pre.getBoundingClientRect().right).toBeLessThanOrEqual(
      myth.getBoundingClientRect().right + 1,
    );
  });

  it("wraps long identity, kind, metadata, and footer actions within a narrow preview", async () => {
    const myth = await fixture<ShrineMyth>(
      `<sh-myth variant="preview" data-mash-size="compact" title="${"longrecordidentity".repeat(8)}" kind="Authored record kind" description="${"Full authored description. ".repeat(12)}" style="width:160px"><span slot="meta">12345 fields · 6789 children</span><ui-button slot="actions" variant="text">Open record</ui-button></sh-myth>`,
    );
    const right = myth.getBoundingClientRect().right;
    for (const node of [
      cardPart(myth, "header"),
      cardPart(myth, "footer"),
      inShadow(myth, "[part=title]"),
      inShadow(myth, "[part=description]"),
      inShadow(myth, "[part=meta]"),
    ]) {
      expect(node.getBoundingClientRect().width).toBeGreaterThan(0);
      expect(node.getBoundingClientRect().right).toBeLessThanOrEqual(right + 1);
      expect(node.scrollWidth).toBeLessThanOrEqual(node.clientWidth + 1);
    }
    expect(getComputedStyle(inShadow(myth, "[part=description]")).webkitLineClamp).toBe("none");
  });
});
