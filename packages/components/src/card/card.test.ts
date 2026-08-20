import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import "../catalogue/mash.css";
import { UICard } from "./card.js";
import "./register.js";

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});

afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
});

describe("ui-card: lifecycle", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("ui-card")).toBe(UICard);

    const card = await fixture<UICard>(`<ui-card>Body</ui-card>`);
    expect(card).toBeInstanceOf(UICard);
    expect(card.elevation).toBe("flat");
  });

  it("reflects elevation", async () => {
    const card = await fixture<UICard>(`<ui-card>Body</ui-card>`);
    card.elevation = "raised";
    await settled(card.parentElement!);

    expect(card.getAttribute("elevation")).toBe("raised");
  });
});

describe("ui-card: slots and regions", () => {
  it("hides the header and footer regions when their slots are empty", async () => {
    const card = await fixture<UICard>(`<ui-card>Body only</ui-card>`);

    expect(inShadow(card, ".header").hasAttribute("hidden")).toBe(true);
    expect(inShadow(card, ".footer").hasAttribute("hidden")).toBe(true);
    expect(inShadow(card, ".content").hasAttribute("hidden")).toBe(false);
  });

  it("shows semantic title, value, and footer regions once their slots are filled", async () => {
    const card = await fixture<UICard>(`
      <ui-card>
        <h2 slot="title">Title</h2>
        <strong slot="value">64%</strong>
        Body
        <div slot="footer">Actions</div>
      </ui-card>
    `);

    expect(inShadow(card, ".header").hasAttribute("hidden")).toBe(false);
    expect(inShadow(card, ".footer").hasAttribute("hidden")).toBe(false);
    expect(inShadow<HTMLSlotElement>(card, 'slot[name="title"]').assignedElements()).toHaveLength(
      1,
    );
    expect(inShadow<HTMLSlotElement>(card, 'slot[name="value"]').assignedElements()).toHaveLength(
      1,
    );
  });

  it("reveals the header when content is added after first render", async () => {
    const card = await fixture<UICard>(`<ui-card>Body</ui-card>`);
    expect(inShadow(card, ".header").hasAttribute("hidden")).toBe(true);

    const heading = document.createElement("h2");
    heading.slot = "title";
    heading.textContent = "Added later";
    card.append(heading);
    await settled(card.parentElement!);

    expect(inShadow(card, ".header").hasAttribute("hidden")).toBe(false);
  });

  it("exposes every documented part", async () => {
    const card = await fixture<UICard>(`<ui-card>Body</ui-card>`);
    const parts = [...shadow(card).querySelectorAll("[part]")].map((el) => el.getAttribute("part"));

    expect(parts).toEqual(
      expect.arrayContaining([
        "header",
        "prefix",
        "identity",
        "title",
        "description",
        "value",
        "meta",
        "actions",
        "content",
        "footer",
      ]),
    );
  });
});

describe("ui-card: Mash recipe", () => {
  it("takes its surface colour from the theme", async () => {
    const card = await fixture<UICard>(`<ui-card>Body</ui-card>`);
    const probe = await fixture<HTMLElement>(
      `<div style="background-color: var(--color-surface)"></div>`,
    );

    expect(getComputedStyle(card).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
  });

  it("renders differently in a nested dark theme", async () => {
    const root = await fixture<HTMLElement>(`
      <div data-theme="light">
        <ui-card id="light">Light</ui-card>
        <div data-theme="dark">
          <ui-card id="dark">Dark</ui-card>
        </div>
      </div>
    `);

    const light = getComputedStyle(root.querySelector("#light")!).backgroundColor;
    const dark = getComputedStyle(root.querySelector("#dark")!).backgroundColor;

    expect(light).not.toBe(dark);
  });

  it("applies a shadow only when raised", async () => {
    const flat = await fixture<UICard>(`<ui-card>Flat</ui-card>`);
    const raised = await fixture<UICard>(`<ui-card elevation="raised">Raised</ui-card>`);

    expect(getComputedStyle(flat).boxShadow).toBe("none");
    expect(getComputedStyle(raised).boxShadow).not.toBe("none");
  });

  it("takes region spacing from the active Mash recipe", async () => {
    const card = await fixture<UICard>(`<ui-card>Body</ui-card>`);
    expect(parseFloat(getComputedStyle(inShadow(card, ".content")).paddingTop)).toBeGreaterThan(0);
  });
});
