import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIInputGroup } from "./input-group.js";
import { UIInput } from "../input/input.js";
import { UIButton } from "../button/button.js";
import "./register.js";
import "../input/register.js";
import "../button/register.js";
import "../icon/register.js";
import "../catalogue/mash.css";

const coarse = () => matchMedia("(pointer: coarse)").matches;
const root = (group: Element) => inShadow<HTMLElement>(group, '[part="root"]');
const native = (button: Element) => inShadow<HTMLButtonElement>(button, "button");
beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});
afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

describe("ui-input-group: compact control composition", () => {
  it("inherits sizes, permits explicit overrides and reserves no empty adornment space", async () => {
    const fixtureRoot = await fixture(
      `<div data-mash-size="compact"><ui-input-group><ui-input slot="control" label="Path"></ui-input></ui-input-group></div>`,
    );
    const group = fixtureRoot.querySelector<UIInputGroup>("ui-input-group")!;
    const input = group.querySelector<UIInput>("ui-input")!;
    expect(group.size).toBe("inherit");
    expect(group.typography).toBe("body");
    expect(group.touchTarget).toBe(false);
    expect(group.invalid).toBe(false);
    expect(root(group).getBoundingClientRect().height).toBe(28);
    for (const [size, height] of [
      ["small", 24],
      ["medium", 32],
      ["large", 44],
      ["compact", 28],
    ] as const) {
      group.size = size;
      await settled(group);
      expect(root(group).getBoundingClientRect().height).toBe(height);
      expect(input.control!.getBoundingClientRect().height).toBe(height - 2);
    }
    input.size = "large";
    await settled(group);
    expect(root(group).getBoundingClientRect().height).toBe(44);
    expect(group.matches(":state(has-prefix), :state(has-suffix)")).toBe(false);
  });

  it("removes hidden optional slots and their separators, including slot changes and reconnect", async () => {
    const group = await fixture<UIInputGroup>(
      `<ui-input-group size="small"><ui-input slot="control" label="Filter"></ui-input><ui-button slot="suffix" size="small" hidden>Clear</ui-button></ui-input-group>`,
    );
    const clear = group.querySelector<UIButton>("ui-button")!;
    const input = group.querySelector<UIInput>("ui-input")!;
    const initialWidth = input.control!.getBoundingClientRect().width;
    expect(group.matches(":state(has-suffix)")).toBe(false);
    clear.hidden = false;
    await settled(group);
    expect(group.matches(":state(has-suffix)")).toBe(true);
    expect(inShadow<HTMLElement>(group, '[part="suffix-separator"]').hidden).toBe(false);
    clear.slot = "prefix";
    await settled(group);
    expect(group.matches(":state(has-prefix)")).toBe(true);
    expect(group.matches(":state(has-suffix)")).toBe(false);
    clear.hidden = true;
    await settled(group);
    expect(group.matches(":state(has-prefix)")).toBe(false);
    expect(input.control!.getBoundingClientRect().width).toBe(initialWidth);
    const parent = group.parentElement!;
    group.remove();
    clear.slot = "suffix";
    clear.hidden = false;
    parent.append(group);
    await settled(group);
    expect(group.matches(":state(has-suffix)")).toBe(true);
    expect(group.querySelector("ui-button")).toBe(clear);
    input.focus();
    input.control!.setSelectionRange(0, 0);
    clear.hidden = true;
    await settled(group);
    expect(input.shadowRoot!.activeElement).toBe(input.control);
    expect(group.matches(":state(has-suffix)")).toBe(false);
  });

  it("shares focus and invalid treatment while preserving native input editing and form submission", async () => {
    const form = await fixture<HTMLFormElement>(
      `<form><ui-input-group size="small" typography="code"><ui-input slot="control" label="Namespace path" name="path" value="/app"></ui-input><ui-button slot="suffix" type="submit" size="small" variant="ghost">Open</ui-button></ui-input-group></form>`,
    );
    const group = form.querySelector<UIInputGroup>("ui-input-group")!;
    const input = group.querySelector<UIInput>("ui-input")!;
    const button = group.querySelector<UIButton>("ui-button")!;
    const before = getComputedStyle(root(group)).borderColor;
    await userEvent.tab();
    expect(input.shadowRoot!.activeElement).toBe(input.control);
    expect(getComputedStyle(root(group)).outlineStyle).toBe("solid");
    input.select();
    await userEvent.keyboard("/next");
    expect(input.value).toBe("/next");
    expect(new FormData(form).get("path")).toBe("/next");
    input.invalid = true;
    await settled(group);
    expect(getComputedStyle(root(group)).borderColor).not.toBe(before);
    expect(input.control!.getAttribute("aria-invalid")).toBe("true");
    input.invalid = false;
    await settled(group);
    expect(getComputedStyle(root(group)).borderColor).toBe(before);
    group.invalid = true;
    await settled(group);
    expect(getComputedStyle(root(group)).borderColor).not.toBe(before);
    group.invalid = false;
    await settled(group);
    let submissions = 0;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submissions++;
    });
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(submissions).toBe(1);
    expect(getComputedStyle(input.control!).fontFamily).not.toBe(
      getComputedStyle(native(button)).fontFamily,
    );
  });

  it("styles native input validity without taking ownership of its semantics", async () => {
    const group = await fixture<UIInputGroup>(
      `<ui-input-group size="small" touch-target><input slot="control" aria-label="Path" required value="/app"></ui-input-group>`,
    );
    const input = group.querySelector("input")!;
    const before = getComputedStyle(root(group)).borderColor;
    input.value = "";
    expect(input.checkValidity()).toBe(false);
    expect(getComputedStyle(root(group)).borderColor).not.toBe(before);
    input.disabled = true;
    expect(getComputedStyle(root(group)).borderColor).toBe(before);
    expect(input.getBoundingClientRect().height).toBe(coarse() ? 44 : 22);
  });

  for (const theme of ["light", "dark"]) {
    for (const width of [390, 192, 160]) {
      it(`keeps code/filter inputs and their action targets separate at ${width}px in ${theme}`, async () => {
        document.documentElement.dataset.theme = theme;
        const panel = await fixture(
          `<div style="width:${width}px;display:grid;gap:8px"><ui-input-group size="small" touch-target typography="code"><ui-input slot="control" label="Namespace path" value="/app/very-long-canonical-path"></ui-input><ui-button slot="suffix" touch-target size="small" variant="ghost">Open</ui-button><ui-button slot="suffix" icon-only size="small" variant="ghost" aria-label="Cancel"><ui-icon name="action.dismiss" size="small"></ui-icon></ui-button></ui-input-group><ui-input-group size="small" touch-target><ui-button slot="prefix" icon-only size="small" variant="ghost" aria-label="Places"><ui-icon name="action.search" size="small"></ui-icon></ui-button><ui-input slot="control" label="Filter paths" value="app"></ui-input><ui-button slot="suffix" icon-only size="small" variant="ghost" aria-label="Clear"><ui-icon name="action.dismiss" size="small"></ui-icon></ui-button></ui-input-group></div>`,
        );
        for (const group of panel.querySelectorAll<UIInputGroup>("ui-input-group")) {
          const input = group.querySelector<UIInput>("ui-input")!;
          const inputBox = input.control!.getBoundingClientRect();
          if (coarse()) {
            expect(inputBox.height).toBeGreaterThanOrEqual(44);
            expect(inputBox.width).toBeGreaterThanOrEqual(44);
          }
          const boxes = [
            inputBox,
            ...[...group.querySelectorAll("ui-button")].map((host) =>
              native(host).getBoundingClientRect(),
            ),
          ];
          for (const [index, box] of boxes.entries()) {
            expect(box.left).toBeGreaterThanOrEqual(group.getBoundingClientRect().left);
            expect(box.right).toBeLessThanOrEqual(group.getBoundingClientRect().right + 1);
            if (coarse()) {
              expect(box.height).toBeGreaterThanOrEqual(44);
              expect(box.width).toBeGreaterThanOrEqual(44);
            }
            for (const other of boxes.slice(index + 1)) {
              expect(
                box.right <= other.left + 1 ||
                  other.right <= box.left + 1 ||
                  box.bottom <= other.top + 1 ||
                  other.bottom <= box.top + 1,
              ).toBe(true);
            }
          }
          if (width >= 192)
            expect(root(group).getBoundingClientRect().height).toBeLessThanOrEqual(
              coarse() ? 48 : 32,
            );
          expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth);
        }
        await page.screenshot({
          path: `test-results/input-group-${theme}-${width}-${coarse() ? "coarse" : "fine"}.png`,
          element: panel,
        });
      });
    }
  }
});
