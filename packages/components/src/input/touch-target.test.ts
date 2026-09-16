import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { fixture, settled } from "../test-support/fixture.js";
import { UIInput } from "./input.js";
import "./register.js";
import "../input-group/register.js";
import "../catalogue/mash.css";

const coarse = () => matchMedia("(pointer: coarse)").matches;
const height = (input: UIInput) => input.control!.getBoundingClientRect().height;

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});
afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

describe("ui-input: opt-in touch targets", () => {
  it("defaults off and reflects independently without replacing the native editor", async () => {
    const input = await fixture<UIInput>(
      `<ui-input size="small" type="search" label="Filter" value="/app"></ui-input>`,
    );
    const control = input.control!;
    input.focus();
    input.setSelectionRange(1, 3);
    expect(input.touchTarget).toBe(false);
    expect(input.hasAttribute("touch-target")).toBe(false);
    input.touchTarget = true;
    await settled(input);
    expect(input.hasAttribute("touch-target")).toBe(true);
    expect([input.type, input.size, input.value, input.label]).toEqual([
      "search",
      "small",
      "/app",
      "Filter",
    ]);
    expect(input.control).toBe(control);
    expect(input.shadowRoot!.activeElement).toBe(control);
    expect([control.selectionStart, control.selectionEnd]).toEqual([1, 3]);
    expect(input.shadowRoot!.querySelectorAll("[part]")).toHaveLength(1);
    input.removeAttribute("touch-target");
    await settled(input);
    expect(input.touchTarget).toBe(false);
    expect(height(input)).toBe(24);
  });

  for (const theme of ["light", "dark"]) {
    for (const [size, fineHeight] of [
      ["small", 24],
      ["compact", 28],
      ["medium", 32],
      ["large", 44],
    ] as const) {
      it(`preserves ${size} fine density and native coarse targets in ${theme}`, async () => {
        document.documentElement.dataset.theme = theme;
        const row = await fixture<HTMLElement>(
          `<div style="display:flex;gap:8px;padding:8px;align-items:start"><ui-input size="${size}" touch-target label="Touch-ready path" value="/app/cards"></ui-input><ui-input size="${size}" label="Unchanged path" value="/app/cards"></ui-input></div>`,
        );
        const [input, ordinary] = [...row.querySelectorAll<UIInput>("ui-input")];
        const rect = input!.control!.getBoundingClientRect();
        expect(rect.height).toBe(coarse() ? Math.max(fineHeight, 44) : fineHeight);
        expect(height(ordinary!)).toBe(fineHeight);
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.right).toBeLessThanOrEqual(ordinary!.getBoundingClientRect().left);
        expect(getComputedStyle(input!.control!).fontFamily).toBe(
          getComputedStyle(ordinary!.control!).fontFamily,
        );
        if (size === "small") {
          await userEvent.tab();
          expect(input!.shadowRoot!.activeElement).toBe(input!.control);
          expect(getComputedStyle(input!.control!).outlineStyle).toBe("solid");
          await page.screenshot({
            path: `test-results/input-touch-${theme}-${coarse() ? "coarse" : "fine"}.png`,
            element: row,
          });
        }
      });
    }
  }

  it("inherits control size and preserves explicitly larger semantic dimensions", async () => {
    const context = await fixture<HTMLElement>(
      `<div data-mash-size="small"><ui-input touch-target label="Inherited"></ui-input><ui-input touch-target size="large" label="Larger" style="--layout-dimension-input-large:64px"></ui-input></div>`,
    );
    const [inherited, larger] = [...context.querySelectorAll<UIInput>("ui-input")];
    expect(inherited!.size).toBe("inherit");
    expect(height(inherited!)).toBe(coarse() ? 44 : 24);
    expect(height(larger!)).toBe(64);
    larger!.focus();
    await settled(context);
    expect(height(larger!)).toBe(64);
  });

  it("uses the touch dimension token instead of a fixed pixel override", async () => {
    const input = await fixture<UIInput>(
      `<ui-input size="small" touch-target label="Custom touch size" style="width:12px;--layout-dimension-control-touch:52px"></ui-input>`,
    );
    expect(height(input)).toBe(coarse() ? 52 : 24);
    if (coarse()) {
      expect(input.getBoundingClientRect().width).toBe(52);
      expect(input.control!.getBoundingClientRect().width).toBe(52);
    }
  });

  it("reserves the real editor footprint in wrapping narrow layouts", async () => {
    const row = await fixture<HTMLElement>(
      `<div style="display:flex;flex-wrap:wrap;gap:4px;width:80px"><ui-input size="small" touch-target label="First" style="flex:1 1 0"></ui-input><ui-input size="small" touch-target label="Second" style="flex:1 1 0"></ui-input></div>`,
    );
    const [first, second] = [...row.querySelectorAll<UIInput>("ui-input")].map((input) =>
      input.control!.getBoundingClientRect(),
    );
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
    if (coarse()) {
      expect(first!.width).toBeGreaterThanOrEqual(44);
      expect(first!.height).toBe(44);
      expect(second!.top).toBeGreaterThanOrEqual(first!.bottom);
    } else {
      expect(first!.height).toBe(24);
      expect(first!.right).toBeLessThanOrEqual(second!.left);
    }
  });

  it("keeps focus geometry stable inside existing input groups", async () => {
    const row = await fixture<HTMLElement>(
      `<div><ui-input-group size="small"><ui-input slot="control" touch-target label="Independent opt-in"></ui-input></ui-input-group><ui-input-group size="small" touch-target><ui-input slot="control" touch-target label="Both opt in"></ui-input></ui-input-group><ui-input-group size="small" touch-target><ui-input slot="control" label="Group opt-in"></ui-input></ui-input-group></div>`,
    );
    for (const input of row.querySelectorAll<UIInput>("ui-input")) {
      expect(height(input)).toBe(coarse() ? 44 : 22);
      input.focus();
      await settled(row);
      expect(height(input)).toBe(coarse() ? 44 : 22);
      expect(input.shadowRoot!.activeElement).toBe(input.control);
    }
  });

  it("retains editing, focus, validation, disabled, readonly and reset semantics", async () => {
    const form = await fixture<HTMLFormElement>(
      `<form><ui-input size="small" touch-target required name="path" label="Namespace path" value="/app"></ui-input></form>`,
    );
    const input = form.querySelector<UIInput>("ui-input")!;
    const control = input.control!;
    await userEvent.tab();
    input.select();
    await userEvent.keyboard("/next");
    expect(input.value).toBe("/next");
    expect(new FormData(form).get("path")).toBe("/next");
    input.invalid = true;
    await settled(form);
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(form.checkValidity()).toBe(true);
    input.readonly = true;
    await settled(form);
    await userEvent.keyboard("blocked");
    expect(input.value).toBe("/next");
    input.disabled = true;
    await settled(form);
    expect(control.disabled).toBe(true);
    expect(new FormData(form).has("path")).toBe(false);
    expect(control.hasAttribute("aria-invalid")).toBe(false);
    input.disabled = false;
    input.readonly = false;
    input.invalid = false;
    await settled(form);
    input.focus();
    input.select();
    await userEvent.keyboard("{Backspace}");
    expect(form.checkValidity()).toBe(false);
    expect(control.getAttribute("aria-invalid")).toBe("true");
    form.reset();
    await settled(form);
    expect(input.value).toBe("/app");
    expect(form.checkValidity()).toBe(true);
    expect(input.control).toBe(control);
    expect(height(input)).toBe(coarse() ? 44 : 24);
  });
});
