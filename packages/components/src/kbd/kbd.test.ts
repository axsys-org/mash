import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UIKbd } from "./kbd.js";
import "./register.js";

describe("ui-kbd", () => {
  it("registers and keeps native keyboard-key semantics", async () => {
    expect(customElements.get("ui-kbd")).toBe(UIKbd);

    const key = await fixture<UIKbd>(`<ui-kbd>⌘ K</ui-kbd>`);
    const surface = inShadow<HTMLElement>(key, '[part="root"]');

    expect(key).toBeInstanceOf(UIKbd);
    expect(surface.localName).toBe("kbd");
    const content = inShadow<HTMLSlotElement>(key, "slot");
    expect(content.assignedNodes().map((node) => node.textContent?.trim())).toContain("⌘ K");
  });
});
