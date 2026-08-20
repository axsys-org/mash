import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UILink } from "./link.js";
import "./register.js";

describe("ui-link", () => {
  it("realizes its destination with native link semantics", async () => {
    const link = await fixture<UILink>(
      `<ui-link href="/projects/billing">Billing migration</ui-link>`,
    );
    const control = inShadow<HTMLAnchorElement>(link, "[part='control']");
    const label = inShadow<HTMLSlotElement>(link, "slot:not([name])");

    expect(control.getAttribute("href")).toBe("/projects/billing");
    expect(
      label
        .assignedNodes()
        .map((node) => node.textContent)
        .join("")
        .trim(),
    ).toBe("Billing migration");
  });

  it("uses the label fallback and suppresses disabled activation", async () => {
    const link = await fixture<UILink>(
      `<ui-link href="/projects/billing" label="Billing migration" disabled></ui-link>`,
    );
    const control = inShadow<HTMLAnchorElement>(link, "[part='control']");
    const onClick = vi.fn();
    link.addEventListener("click", onClick);

    expect(control.textContent?.trim()).toBe("Billing migration");
    expect(control.hasAttribute("href")).toBe(false);
    expect(link.matches(":state(disabled)")).toBe(true);

    control.click();
    await settled(link);
    expect(onClick).not.toHaveBeenCalled();
  });
});
