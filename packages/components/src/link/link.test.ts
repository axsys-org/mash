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
    expect(link.variant).toBe("standalone");
    expect(link.getAttribute("variant")).toBe("standalone");
    expect(
      label
        .assignedNodes()
        .map((node) => node.textContent)
        .join("")
        .trim(),
    ).toBe("Billing migration");
  });

  it("reflects stable presentation roles without changing native semantics", async () => {
    const link = await fixture<UILink>(
      `<ui-link href="/docs" variant="inline">Documentation</ui-link>`,
    );
    const control = inShadow<HTMLAnchorElement>(link, "[part='control']");

    expect(link.variant).toBe("inline");
    expect(control.getAttribute("href")).toBe("/docs");

    link.variant = "quiet";
    await settled(link);
    expect(link.getAttribute("variant")).toBe("quiet");
    expect(control.getAttribute("href")).toBe("/docs");
  });

  it("exposes current-page semantics and state", async () => {
    const link = await fixture<UILink>(`<ui-link href="/issues" current>Issues</ui-link>`);
    const control = inShadow<HTMLAnchorElement>(link, "[part='control']");

    expect(control.getAttribute("aria-current")).toBe("page");
    expect(link.matches(":state(current)")).toBe(true);

    link.current = false;
    await settled(link);
    expect(control.hasAttribute("aria-current")).toBe(false);
    expect(link.matches(":state(current)")).toBe(false);
  });

  it("only realizes authored prefix and suffix anatomy", async () => {
    const link = await fixture<UILink>(`<ui-link href="/issues">Issues</ui-link>`);
    const prefix = inShadow<HTMLElement>(link, "[part='prefix']");
    const suffix = inShadow<HTMLElement>(link, "[part='suffix']");

    expect(prefix.hidden).toBe(true);
    expect(suffix.hidden).toBe(true);

    const icon = document.createElement("span");
    icon.slot = "prefix";
    icon.textContent = "#";
    const count = document.createElement("span");
    count.slot = "suffix";
    count.textContent = "24";
    link.append(icon, count);
    await settled(link);

    expect(prefix.hidden).toBe(false);
    expect(suffix.hidden).toBe(false);
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
