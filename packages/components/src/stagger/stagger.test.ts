import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIStagger, type StaggerChangeDetail } from "./stagger.js";
import "./register.js";

describe("ui-stagger", () => {
  it("registers and exposes a passthrough default slot", async () => {
    expect(customElements.get("ui-stagger")).toBe(UIStagger);

    const stagger = await fixture<UIStagger>(`
      <ui-stagger>
        <span>Alpha</span>
      </ui-stagger>
    `);
    const slot = inShadow<HTMLSlotElement>(stagger, "slot:not([name])");

    expect(stagger).toBeInstanceOf(UIStagger);
    expect(inShadow(stagger, '[part="root"]')).toBeInstanceOf(HTMLElement);
    expect(slot.assignedElements()).toHaveLength(1);
  });

  it("publishes deterministic delay variables from the configured origin", async () => {
    const stagger = await fixture<UIStagger>(`
      <ui-stagger step="25" origin="center">
        <span>One</span>
        <span>Two</span>
        <span>Three</span>
      </ui-stagger>
    `);
    const items = [...stagger.querySelectorAll<HTMLElement>("span")];

    expect(items.map((item) => item.style.getPropertyValue("--mash-stagger-index"))).toEqual([
      "0",
      "1",
      "2",
    ]);
    expect(items.map((item) => item.style.getPropertyValue("--mash-stagger-count"))).toEqual([
      "3",
      "3",
      "3",
    ]);
    expect(items.map((item) => item.style.getPropertyValue("--mash-stagger-delay"))).toEqual([
      "25ms",
      "0ms",
      "25ms",
    ]);

    stagger.origin = "last";
    await settled(stagger.parentElement!);

    expect(items.map((item) => item.style.getPropertyValue("--mash-stagger-origin"))).toEqual([
      "2",
      "2",
      "2",
    ]);
    expect(items.map((item) => item.style.getPropertyValue("--mash-stagger-delay"))).toEqual([
      "50ms",
      "25ms",
      "0ms",
    ]);
  });

  it("announces recomputed maps and marks the empty state", async () => {
    const stagger = await fixture<UIStagger>(`<ui-stagger step="10"></ui-stagger>`);
    const changes: StaggerChangeDetail[] = [];
    stagger.addEventListener("mash-stagger-change", (event) => changes.push(event.detail));

    expect(stagger.matches(":state(empty)")).toBe(true);

    stagger.append(document.createElement("span"), document.createElement("span"));
    await settled(stagger.parentElement!);

    expect(stagger.matches(":state(empty)")).toBe(false);
    expect(changes.at(-1)).toMatchObject({
      count: 2,
      maxDelay: 10,
      origin: "first",
      originIndex: 0,
      step: 10,
    });
  });
});
