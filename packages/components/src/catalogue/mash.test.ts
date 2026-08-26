import { afterEach, describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import "../checkbox/register.js";
import "../input-group/register.js";
import "../input/register.js";
import "../kbd/register.js";
import "../menu-item/register.js";
import "../menu/register.js";
import "../switch/register.js";
import "../toggle/register.js";
import "./mash.css";

describe("Mash catalogue", () => {
  afterEach(() => {
    delete document.documentElement.dataset.mashCatalogue;
  });

  it("applies a recipe outside component definitions", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const toggle = await fixture(`<ui-toggle pressed>Bold</ui-toggle>`);
    const control = inShadow<HTMLButtonElement>(toggle, "button");

    expect(getComputedStyle(control).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(control).borderTopWidth).toBe("1px");
  });

  it("uses the same root opt-in for checkable controls", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const checkbox = await fixture(`<ui-checkbox>Release notes</ui-checkbox>`);
    const indicator = inShadow<HTMLElement>(checkbox, '[part="indicator"]');

    expect(getComputedStyle(indicator).display).toBe("grid");
    expect(getComputedStyle(indicator).borderTopWidth).toBe("1px");
  });

  it("lets a composed input group own one focus boundary", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const group = await fixture(`
      <ui-input-group>
        <span slot="prefix">Search</span>
        <ui-input slot="control" label="Search projects"></ui-input>
        <ui-kbd slot="suffix" command="workspace.search" shortcut="Primary+K"></ui-kbd>
      </ui-input-group>
    `);
    const input = group.querySelector("ui-input")!;
    const nativeInput = inShadow<HTMLInputElement>(input, "input");
    const groupRoot = inShadow<HTMLElement>(group, '[part="root"]');

    nativeInput.focus();

    expect(getComputedStyle(groupRoot).outlineStyle).toBe("solid");
    expect(getComputedStyle(nativeInput).outlineStyle).toBe("none");
    expect(getComputedStyle(nativeInput).boxShadow).toBe("none");
  });

  it("pronounces a semantic keyboard binding as a compact menu shortcut", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const menu = await fixture(`
      <ui-menu label="Edit commands" open>
        <button slot="trigger">Edit</button>
        <ui-menu-item value="undo">
          Undo
          <ui-kbd slot="shortcut" command="edit.undo" shortcut="Primary+Z"></ui-kbd>
        </ui-menu-item>
      </ui-menu>
    `);
    const key = menu.querySelector("ui-kbd")!;
    const keyRoot = inShadow<HTMLElement>(key, '[part="root"]');

    expect(getComputedStyle(keyRoot).borderTopWidth).toBe("0px");
    expect(getComputedStyle(keyRoot).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(keyRoot).boxShadow).toBe("none");
  });
});
