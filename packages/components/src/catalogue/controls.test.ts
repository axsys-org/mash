import { colorChannels } from "../test-support/color.js";
import { afterEach, describe, expect, it } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import "../button/register.js";
import "../input/register.js";
import "../input-group/register.js";
import "../select/register.js";
import "../combobox/register.js";
import "../option/register.js";
import "../toggle/register.js";
import "../checkbox/register.js";
import "../toolbar/register.js";
import "./mash.css";

describe("composed control geometry", () => {
  afterEach(() => {
    delete document.documentElement.dataset.mashCatalogue;
    delete document.documentElement.dataset.theme;
  });

  const row = async (size: string) => {
    document.documentElement.dataset.mashCatalogue = "mash";
    return fixture(`<div class="mash-row" data-mash-size="${size}">
      <ui-button>Save</ui-button>
      <ui-toggle>Bold</ui-toggle>
      <ui-input label="Title" placeholder="Title"></ui-input>
      <ui-select label="Status" value="draft"><ui-option value="draft">Draft</ui-option></ui-select>
      <ui-combobox label="Find" placeholder="Find"><ui-option value="draft">Draft</ui-option></ui-combobox>
    </div>`);
  };
  const frames = (host: Element) =>
    [...host.children].map((node) =>
      inShadow<HTMLElement>(
        node,
        node.localName === "ui-select"
          ? '[part="trigger"]'
          : node.localName === "ui-combobox"
            ? '[part="input-group"]'
            : '[part="control"]',
      ),
    );

  for (const theme of ["light", "dark"]) {
    for (const [size, height] of [
      ["small", 24],
      ["medium", 32],
    ] as const) {
      it(`aligns mixed ${size} controls in ${theme}`, async () => {
        document.documentElement.dataset.theme = theme;
        const host = await row(size);
        const boxes = frames(host).map((control) => control.getBoundingClientRect());
        for (const box of boxes) {
          expect(box.height).toBe(height);
          expect(box.top).toBe(boxes[0]!.top);
        }
      });
    }
  }

  it("reflows an existing composition when its size context changes", async () => {
    const host = await row("small");
    host.dataset.mashSize = "medium";
    await settled(host);
    expect(frames(host).map((control) => control.getBoundingClientRect().height)).toEqual([
      32, 32, 32, 32, 32,
    ]);
  });

  it("lets explicit sizes override the inherited context", async () => {
    const host = await row("small");
    host.querySelector("ui-button")!.setAttribute("size", "medium");
    host.querySelector("ui-input")!.setAttribute("size", "large");
    await settled(host);
    expect(frames(host).map((control) => control.getBoundingClientRect().height)).toEqual([
      32, 24, 44, 24, 24,
    ]);
  });

  it("keeps the default button bordered and the primary action filled", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const host = await fixture(
      `<div class="mash-row"><ui-button>Cancel</ui-button><ui-button variant="primary">Save</ui-button></div>`,
    );
    const [normal, primary] = frames(host).map((control) => getComputedStyle(control));
    expect(normal!.borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(primary!.backgroundColor).not.toBe(normal!.backgroundColor);
    expect(primary!.color).not.toBe(normal!.color);
  });

  it("keeps semantic meaning on a quiet action", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const host = await fixture(
      `<div class="mash-row"><ui-button variant="ghost" tone="critical">Delete</ui-button><ui-button variant="ghost">Cancel</ui-button></div>`,
    );
    const [critical, neutral] = frames(host).map((control) => getComputedStyle(control));
    expect(critical!.color).not.toBe(neutral!.color);
    expect(colorChannels(critical!.backgroundColor)[3]).toBe(0);
  });
});

describe("coordinated size contexts", () => {
  afterEach(() => {
    delete document.documentElement.dataset.mashCatalogue;
  });

  it("resizes controls, gaps, glyphs and popup rows together without replacing inputs", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const host = await fixture(`<div class="mash-row" data-mash-size="default">
      <ui-button>Save</ui-button><ui-input label="Title" value="Keep this draft"></ui-input>
      <ui-combobox label="Find" value="draft"><ui-option value="draft">Draft</ui-option></ui-combobox>
      <ui-select label="Status" value="draft"><ui-option value="draft">Draft</ui-option></ui-select><ui-checkbox>Selected</ui-checkbox>
    </div>`);
    const input = inShadow<HTMLInputElement>(host.querySelector("ui-input")!, "input");
    for (const [size, height, gap, text] of [
      ["default", 36, 8, 13],
      ["compact", 28, 4, 12],
    ] as const) {
      host.dataset.mashSize = size;
      await settled(host);
      expect(getComputedStyle(host).gap).toBe(`${gap}px`);
      for (const [tag, part] of [
        ["ui-button", "control"],
        ["ui-input", "control"],
        ["ui-select", "trigger"],
        ["ui-combobox", "input-group"],
        ["ui-option", "control"],
      ]) {
        const frame = inShadow<HTMLElement>(host.querySelector(tag!)!, `[part="${part}"]`);
        if (tag !== "ui-option") expect(frame.getBoundingClientRect().height).toBe(height);
        else expect(getComputedStyle(frame).minHeight).toBe(`${height}px`);
        expect(getComputedStyle(frame).fontSize).toBe(`${text}px`);
      }
      expect(input.value).toBe("Keep this draft");
      expect(
        inShadow<HTMLElement>(
          host.querySelector("ui-checkbox")!,
          '[part="indicator"]',
        ).getBoundingClientRect().width,
      ).toBe(size === "compact" ? 14 : 16);
    }
  });

  it("honors nested boundaries and explicit pins on the context owner", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const host = await fixture(
      `<div data-mash-size="compact"><ui-button id="outer">Outer</ui-button><div data-mash-size="default"><ui-button id="inner">Inner</ui-button><ui-button id="pin" size="compact">Pin</ui-button></div><ui-button id="owner" data-mash-size="compact" size="default">Owner</ui-button><ui-button id="legacy" size="medium">Legacy</ui-button></div>`,
    );
    for (const [id, height] of [
      ["outer", 28],
      ["inner", 36],
      ["pin", 28],
      ["owner", 36],
      ["legacy", 32],
    ] as const) {
      expect(
        inShadow<HTMLElement>(
          host.querySelector(`#${id}`)!,
          '[part="control"]',
        ).getBoundingClientRect().height,
      ).toBe(height);
    }
  });
});
