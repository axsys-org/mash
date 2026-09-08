import { afterEach, describe, expect, it } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import "../button/register.js";
import "../input/register.js";
import "../input-group/register.js";
import "../select/register.js";
import "../combobox/register.js";
import "../option/register.js";
import "../toggle/register.js";
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
    expect(critical!.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });
});
