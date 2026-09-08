import { afterEach, describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UILabel } from "./label.js";
import "./register.js";
import "../catalogue/mash.css";

const normalizedText = (element: Element): string =>
  (element.textContent ?? "").replace(/\s+/g, " ").trim();

describe("ui-label", () => {
  afterEach(() => {
    delete document.documentElement.dataset.mashCatalogue;
  });

  it("registers a text-first label with stable parts", async () => {
    expect(customElements.get("ui-label")).toBe(UILabel);

    const label = await fixture<UILabel>(
      `<ui-label secondary="(optional)">Company address</ui-label>`,
    );
    const value = inShadow<HTMLElement>(label, '[part="value"]');
    const secondary = inShadow<HTMLElement>(label, '[part~="secondary"]');

    expect(normalizedText(value)).toBe("Company address (optional)");
    expect(secondary.textContent).toContain("(optional)");
    expect(
      [...label.shadowRoot!.querySelectorAll("[part]")].map((part) => part.getAttribute("part")),
    ).toEqual(expect.arrayContaining(["root", "value", "secondary"]));
  });

  it("masks generated text with one bullet per displayed character", async () => {
    const label = await fixture<UILabel>(
      `<ui-label text="$9,182.50 USD" secondary="available" masked></ui-label>`,
    );
    const value = inShadow<HTMLElement>(label, '[part="value"]');

    expect(normalizedText(value)).toBe("•".repeat("$9,182.50 USD available".length));
  });

  it("supports full and prefix highlighting", async () => {
    const full = await fixture<UILabel>(
      `<ui-label text="Hello World Hello" highlight="hello"></ui-label>`,
    );
    const fullHighlights = [
      ...full.shadowRoot!.querySelectorAll<HTMLElement>('[part~="highlight"]'),
    ];

    expect(fullHighlights.map((highlight) => highlight.textContent)).toEqual(["Hello", "Hello"]);

    const prefix = await fixture<UILabel>(
      `<ui-label text="Hello World Hello" highlight="hello" highlight-match="prefix"></ui-label>`,
    );
    const prefixHighlights = [
      ...prefix.shadowRoot!.querySelectorAll<HTMLElement>('[part~="highlight"]'),
    ];

    expect(prefixHighlights.map((highlight) => highlight.textContent)).toEqual(["Hello"]);
  });

  it("applies text-size aliases through Mash type tokens", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const label = await fixture<UILabel>(
      `<ui-label text="Large label" size="large" align="end"></ui-label>`,
    );
    const root = inShadow<HTMLElement>(label, '[part="root"]');

    expect(getComputedStyle(root).fontSize).toBe("16px");
    expect(getComputedStyle(root).textAlign).toBe("end");
  });
});
