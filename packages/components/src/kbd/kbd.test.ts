import { describe, expect, it } from "vitest";

import { fixture, inShadow, shadow } from "../test-support/fixture.js";
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

  it("generates styleable tokens from the same portable chord used by gestures", async () => {
    const kbd = await fixture<UIKbd>(
      `<ui-kbd platform="windows" command="workspace.search" shortcut="Primary+Shift+K"></ui-kbd>`,
    );

    expect(shadow(kbd).querySelectorAll('[part~="key"]')).toHaveLength(3);
    expect(shadow(kbd).querySelectorAll('[part~="modifier"]')).toHaveLength(2);
    expect(shadow(kbd).querySelectorAll('[part~="separator"]')).toHaveLength(2);
    expect(shadow(kbd).querySelector('[part="root"]')?.getAttribute("data-command")).toBe(
      "workspace.search",
    );
  });

  it("advertises command metadata without owning shortcut execution", async () => {
    const key = await fixture<UIKbd>(
      `<ui-kbd command="workspace.search" shortcut="Primary+K">⌘ K</ui-kbd>`,
    );
    const surface = inShadow<HTMLElement>(key, '[part="root"]');

    expect(surface.dataset.command).toBe("workspace.search");
    expect(surface.dataset.shortcut).toBe("Primary+K");
    expect(key.getAttribute("aria-keyshortcuts")).toBeNull();
  });
  it("uses platform conventions for modifiers and special keys", async () => {
    const kbd = await fixture<UIKbd>(
      '<ui-kbd platform="mac" shortcut="Meta+Shift+Enter"></ui-kbd>',
    );
    expect(shadow(kbd).querySelectorAll('[part~="separator"]')).toHaveLength(0);
    expect(shadow(kbd).textContent).toContain("⌘");
    kbd.platform = "windows";
    await kbd.updateComplete;
    expect(shadow(kbd).textContent).toContain("Shift");
    expect(shadow(kbd).textContent).toContain("Enter");
    expect(shadow(kbd).textContent).not.toContain("↩");
  });
  it("keeps punctuation keys distinct from modifier separators", async () => {
    const kbd = await fixture<UIKbd>(
      '<ui-kbd platform="windows" shortcut="Primary++" appearance="outline"></ui-kbd>',
    );
    expect(shadow(kbd).querySelector('[part="key"]')?.textContent).toBe("+");
    expect(shadow(kbd).querySelector('[part="separator"]')?.textContent).toBe("+");
    kbd.shortcut = "Primary+-";
    await kbd.updateComplete;
    expect(shadow(kbd).querySelector('[part="key"]')?.textContent).toBe("-");
  });
});
