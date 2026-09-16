import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import "@mash/ui/catalogue/mash.css";
import "@mash/ui/button/register";
import "../catalogue/mash.css";
import "../myth/register.js";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { ShrinePail } from "./pail.js";
import "./register.js";

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});
afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

describe("sh-pail value projection", () => {
  it("retains the text fallback and the named value styling part", async () => {
    const pail = await fixture<ShrinePail>(`<sh-pail text="ready"></sh-pail>`);
    const value = inShadow<HTMLSlotElement>(pail, 'slot[name="value"]');
    const fallback = inShadow<HTMLSlotElement>(pail, "slot:not([name])");
    expect(value.part.contains("value")).toBe(true);
    expect(fallback.part.contains("value")).toBe(true);
    expect(value.hidden).toBe(true);
    expect(fallback.hidden).toBe(false);
    expect(fallback.textContent).toBe("ready");
    pail.text = "updated";
    await settled(pail);
    expect(fallback.textContent).toBe("updated");
  });

  it("gives named rich content priority and restores compatibility content on removal", async () => {
    const pail = await fixture<ShrinePail>(
      `<sh-pail text="fallback"><span>Default value</span><strong slot="value">Named value</strong></sh-pail>`,
    );
    const value = inShadow<HTMLSlotElement>(pail, 'slot[name="value"]');
    const fallback = inShadow<HTMLSlotElement>(pail, "slot:not([name])");
    const named = pail.querySelector("strong")!;
    const compatibility = pail.querySelector("span")!;
    expect(value.hidden).toBe(false);
    expect(fallback.hidden).toBe(true);
    expect(value.assignedElements()).toEqual([named]);
    expect(fallback.assignedElements()).toEqual([compatibility]);
    named.remove();
    await settled(pail);
    expect(value.hidden).toBe(true);
    expect(fallback.hidden).toBe(false);
    pail.append(named);
    await settled(pail);
    expect(value.hidden).toBe(false);
    expect(fallback.hidden).toBe(true);
  });

  it("never exposes duplicate or focusable fallback controls behind named content", async () => {
    const pail = await fixture<ShrinePail>(
      `<sh-pail><button>Fallback action</button><button slot="value">Named action</button></sh-pail>`,
    );
    const fallback = pail.querySelector<HTMLButtonElement>("button:not([slot])")!;
    const named = pail.querySelector<HTMLButtonElement>('button[slot="value"]')!;
    expect(fallback.getBoundingClientRect().height).toBe(0);
    expect(named.getBoundingClientRect().height).toBeGreaterThan(0);
    named.focus();
    expect(document.activeElement).toBe(named);
    fallback.focus();
    expect(document.activeElement).toBe(named);
    named.remove();
    await settled(pail);
    expect(fallback.getBoundingClientRect().height).toBeGreaterThan(0);
    fallback.focus();
    expect(document.activeElement).toBe(fallback);
  });
});

describe("sh-pail authored annotation", () => {
  it("reserves no annotation region when status and actions are unassigned", async () => {
    const pail = await fixture<ShrinePail>(
      `<sh-pail text="ready" data-mash-size="compact"></sh-pail>`,
    );
    const annotation = inShadow<HTMLElement>(pail, '[part="annotation"]');
    const originalHeight = pail.getBoundingClientRect().height;
    expect(originalHeight).toBeGreaterThan(0);
    for (const part of ["annotation", "status", "actions"]) {
      expect(inShadow<HTMLElement>(pail, `[part="${part}"]`).hidden).toBe(true);
      expect(inShadow(pail, `[part="${part}"]`).getBoundingClientRect().height).toBe(0);
    }
    const status = document.createElement("span");
    status.slot = "status";
    status.textContent = "Authored status";
    pail.append(status);
    await settled(pail);
    expect(annotation.hidden).toBe(false);
    expect(pail.getBoundingClientRect().height).toBeGreaterThan(originalHeight);
    status.remove();
    await settled(pail);
    expect(annotation.hidden).toBe(true);
    expect(pail.getBoundingClientRect().height).toBe(originalHeight);
    const action = document.createElement("ui-button");
    action.slot = "actions";
    action.textContent = "Inspect value";
    pail.append(action);
    await settled(pail);
    expect(annotation.hidden).toBe(false);
    expect(inShadow<HTMLElement>(pail, '[part="status"]').hidden).toBe(true);
    action.remove();
    await settled(pail);
    expect(pail.getBoundingClientRect().height).toBe(originalHeight);
  });

  it("keeps annotations outside named and compatibility value projection", async () => {
    const pail = await fixture<ShrinePail>(
      `<sh-pail text="fallback"><pre>Compatibility value</pre><strong slot="value">Named value</strong><span slot="status">Authored status</span><ui-button slot="actions" variant="ghost" size="small">Inspect value</ui-button></sh-pail>`,
    );
    const named = pail.querySelector("strong")!;
    const compatibility = pail.querySelector("pre")!;
    const status = pail.querySelector('[slot="status"]')!;
    const action = pail.querySelector('[slot="actions"]')!;
    const value = inShadow<HTMLSlotElement>(pail, 'slot[name="value"]');
    const fallback = inShadow<HTMLSlotElement>(pail, "slot:not([name])");
    expect(value.assignedElements()).toEqual([named]);
    expect(fallback.assignedElements()).toEqual([compatibility]);
    expect(inShadow<HTMLSlotElement>(pail, 'slot[name="status"]').assignedElements()).toEqual([
      status,
    ]);
    expect(inShadow<HTMLSlotElement>(pail, 'slot[name="actions"]').assignedElements()).toEqual([
      action,
    ]);
    expect(fallback.hidden).toBe(true);
    named.remove();
    await settled(pail);
    expect(fallback.hidden).toBe(false);
    expect(compatibility.textContent).toBe("Compatibility value");
    expect(pail.querySelector('[slot="status"]')).toBe(status);
    expect(pail.querySelector('[slot="actions"]')).toBe(action);
    expect(inShadow<HTMLElement>(pail, '[part="annotation"]').hidden).toBe(false);
  });

  it("announces authored status separately and preserves focused Mash actions across updates", async () => {
    const pail = await fixture<ShrinePail>(
      `<sh-pail text="Original representation" data-mash-size="compact"><span slot="status">Preview shown</span><ui-button slot="actions" variant="ghost" size="small">Inspect value</ui-button></sh-pail>`,
    );
    const statusRegion = inShadow<HTMLElement>(pail, '[part="status"]');
    const actionsRegion = inShadow(pail, '[part="actions"]');
    const status = pail.querySelector<HTMLElement>('[slot="status"]')!;
    const button = pail.querySelector<HTMLElement>("ui-button")!;
    const native = inShadow<HTMLButtonElement>(button, "button");
    expect(statusRegion.getAttribute("role")).toBe("status");
    expect(statusRegion.getAttribute("aria-atomic")).toBe("true");
    expect(statusRegion.contains(actionsRegion)).toBe(false);
    expect(statusRegion.querySelector('slot[name="actions"]')).toBeNull();
    let clicks = 0;
    button.addEventListener("click", () => clicks++);
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(clicks).toBe(1);
    for (const text of [
      "Loading requested value",
      "Full representation loaded",
      "Opaque representation",
      "Representation unavailable",
    ]) {
      status.textContent = text;
      pail.text = `Authored value for ${text}`;
      await settled(pail);
      expect(inShadow(pail, '[part="status"]')).toBe(statusRegion);
      expect(pail.querySelector("ui-button")).toBe(button);
      expect(button.shadowRoot!.activeElement).toBe(native);
      expect(inShadow(pail, "slot:not([name])").textContent).toBe(`Authored value for ${text}`);
      expect(status.textContent).toBe(text);
    }
    status.remove();
    await settled(pail);
    expect(inShadow<HTMLElement>(pail, '[part="annotation"]').hidden).toBe(false);
    expect(button.shadowRoot!.activeElement).toBe(native);
    button.setAttribute("loading", "");
    await settled(pail);
    expect(inShadow(button, "button")).toBe(native);
    expect(native.disabled).toBe(true);
    button.removeAttribute("loading");
    await settled(pail);
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(clicks).toBe(2);
    expect(getComputedStyle(native).outlineStyle).not.toBe("none");
    await userEvent.cleanup();
  });

  for (const theme of ["light", "dark"]) {
    for (const width of [1440, 390, 160]) {
      it(`wraps authored status and Mash actions at ${width}px in ${theme}`, async () => {
        await page.viewport(Math.max(390, width), 1000);
        document.documentElement.dataset.theme = theme;
        const wrapper = await fixture<HTMLElement>(
          `<div style="box-sizing:border-box;width:${width}px;padding:var(--space-control-inline-large);background:var(--color-surface);color:var(--color-text)"><sh-myth variant="embedded" data-mash-size="compact" title="Value representations"><sh-limb><sh-slot slot="label" title="/preview"></sh-slot><sh-pail><pre>Authored representation</pre><span slot="status">Preview · exact value not loaded</span><ui-button slot="actions" variant="ghost" size="small">Inspect value</ui-button><ui-button slot="actions" variant="ghost" size="small">Close value</ui-button></sh-pail></sh-limb><sh-limb><sh-slot slot="label" title="/full"></sh-slot><sh-pail><pre>Complete representation</pre><span slot="status">Full value loaded</span></sh-pail></sh-limb><sh-limb><sh-slot slot="label" title="/opaque"></sh-slot><sh-pail><pre>Opaque representation</pre><span slot="status">Displayed form is not the full value</span><span slot="actions"><ui-button variant="ghost" size="small">Earlier bytes</ui-button><ui-button variant="ghost" size="small">Next bytes</ui-button></span></sh-pail></sh-limb><sh-limb><sh-slot slot="label" title="/unknown"></sh-slot><sh-pail><pre>Unknown representation</pre><span slot="status">Completeness unavailable</span></sh-pail></sh-limb></sh-myth></div>`,
        );
        // The value region of a limb is explicit; annotations remain inside
        // the pail rather than accidentally being projected as limb labels.
        for (const pail of wrapper.querySelectorAll("sh-pail")) pail.slot = "value";
        await settled(wrapper);
        const pails = [...wrapper.querySelectorAll("sh-pail")];
        const valueStrings = [
          "Authored representation",
          "Complete representation",
          "Opaque representation",
          "Unknown representation",
        ];
        pails.forEach((pail, index) => {
          const pre = pail.querySelector("pre")!;
          const annotation = inShadow<HTMLElement>(pail, '[part="annotation"]');
          const status = inShadow(pail, '[part="status"]');
          expect(pre.textContent).toBe(valueStrings[index]);
          expect(annotation.getBoundingClientRect().top - pre.getBoundingClientRect().bottom).toBe(
            4,
          );
          expect(getComputedStyle(annotation).fontSize).toBe("11px");
          expect(getComputedStyle(annotation).fontFamily).not.toBe(
            getComputedStyle(pre).fontFamily,
          );
          expect(getComputedStyle(status).color).not.toBe(getComputedStyle(pre).color);
          expect(annotation.getBoundingClientRect().height).toBeGreaterThan(0);
          expect(annotation.getBoundingClientRect().right).toBeLessThanOrEqual(
            pail.getBoundingClientRect().right + 1,
          );
          for (const button of pail.querySelectorAll("ui-button")) {
            const native = inShadow<HTMLElement>(button, "button");
            expect(native.getBoundingClientRect().height).toBeGreaterThanOrEqual(
              matchMedia("(any-pointer:coarse)").matches ? 44 : 24,
            );
            expect(native.getBoundingClientRect().right).toBeLessThanOrEqual(
              pail.getBoundingClientRect().right + 1,
            );
            expect(native.scrollWidth).toBeLessThanOrEqual(native.clientWidth + 1);
          }
        });
        expect(wrapper.scrollWidth).toBeLessThanOrEqual(width);
        await page.screenshot({
          element: wrapper,
          path: `../../../../test-results/shrine-pail-annotations-${theme}-${width}.png`,
        });
      });
    }
  }
});
