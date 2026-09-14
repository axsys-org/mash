import { afterEach, describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UIBubble, UIBubbleGroup } from "./bubble.js";
import "./register.js";
import "../button/register.js";
import "../catalogue/mash.css";

describe("ui-bubble", () => {
  afterEach(() => {
    delete document.documentElement.dataset.mashCatalogue;
  });

  it("registers a presentational bubble with content and reaction parts", async () => {
    expect(customElements.get("ui-bubble")).toBe(UIBubble);

    const bubble = await fixture<UIBubble>(`<ui-bubble>Can you review this draft?</ui-bubble>`);
    const contentSlot = inShadow<HTMLSlotElement>(bubble, "slot:not([name])");
    const reactions = inShadow<HTMLElement>(bubble, '[part="reactions"]');

    expect(
      contentSlot
        .assignedNodes({ flatten: true })
        .map((node) => node.textContent ?? "")
        .join("")
        .trim(),
    ).toBe("Can you review this draft?");
    expect(reactions.hasAttribute("hidden")).toBe(true);
    expect(
      [...bubble.shadowRoot!.querySelectorAll("[part]")].map((part) => part.getAttribute("part")),
    ).toEqual(expect.arrayContaining(["root", "content", "reactions"]));
  });

  it("reveals the reaction region when authored reactions are slotted", async () => {
    const bubble = await fixture<UIBubble>(`
      <ui-bubble alignment="end">
        Approved.
        <ui-button slot="reactions" size="xsmall" variant="ghost">Like 2</ui-button>
      </ui-bubble>
    `);
    const reactions = inShadow<HTMLElement>(bubble, '[part="reactions"]');
    const reactionSlot = inShadow<HTMLSlotElement>(bubble, 'slot[name="reactions"]');

    expect(reactions.hasAttribute("hidden")).toBe(false);
    expect(reactionSlot.assignedElements()[0]?.textContent?.trim()).toBe("Like 2");
  });

  it("registers bubble groups as the consecutive-message stack", async () => {
    expect(customElements.get("ui-bubble-group")).toBe(UIBubbleGroup);

    const group = await fixture<UIBubbleGroup>(`
      <ui-bubble-group>
        <ui-bubble alignment="start" variant="secondary">First.</ui-bubble>
        <ui-bubble alignment="start" variant="secondary">Second.</ui-bubble>
      </ui-bubble-group>
    `);
    const root = inShadow<HTMLElement>(group, '[part="root"]');

    expect(root.querySelectorAll("slot")).toHaveLength(1);
    expect(group.querySelectorAll("ui-bubble")).toHaveLength(2);
  });

  it("maps bubble geometry and ghost behavior through Mash tokens", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const host = await fixture<HTMLDivElement>(`
      <div style="width: 400px;">
        <ui-bubble variant="outline" alignment="start">Outlined</ui-bubble>
        <ui-bubble variant="ghost" alignment="end">Ghost</ui-bubble>
      </div>
    `);
    const [outline, ghost] = [...host.querySelectorAll<UIBubble>("ui-bubble")];
    const outlineRoot = inShadow<HTMLElement>(outline!, '[part="root"]');
    const outlineContent = inShadow<HTMLElement>(outline!, '[part="content"]');
    const ghostRoot = inShadow<HTMLElement>(ghost!, '[part="root"]');
    const ghostContent = inShadow<HTMLElement>(ghost!, '[part="content"]');

    expect(getComputedStyle(outlineRoot).maxInlineSize).toBe("80%");
    expect(getComputedStyle(outlineContent).paddingInlineStart).toBe("12px");
    expect(getComputedStyle(outlineContent).borderTopWidth).toBe("1px");
    expect(getComputedStyle(ghostRoot).maxInlineSize).toBe("100%");
    expect(getComputedStyle(ghostContent).paddingInlineStart).toBe("0px");
    expect(getComputedStyle(ghostContent).borderTopWidth).toBe("0px");
  });
});
