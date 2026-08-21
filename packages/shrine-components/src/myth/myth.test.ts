import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { ShrineMyth } from "./myth.js";
import "./register.js";

describe("sh-myth", () => {
  const projectRecord = `
    <sh-myth kind="Project" title="Billing Migration" path="/rec/project/billing-migration">
      <sh-limb>
        <sh-slot slot="label" title="status"></sh-slot>
        <sh-pail slot="value" text="active"></sh-pail>
      </sh-limb>
      <sh-limb>
        <sh-slot slot="label" title="goal"></sh-slot>
        <sh-pail slot="value" text="replace legacy invoicer"></sh-pail>
      </sh-limb>
    </sh-myth>
  `;

  it("registers the full composed record anatomy", async () => {
    const element = await fixture<ShrineMyth>(projectRecord);

    expect(customElements.get("sh-myth")).toBe(ShrineMyth);
    expect(customElements.get("sh-limb")).toBeDefined();
    expect(customElements.get("sh-slot")).toBeDefined();
    expect(customElements.get("sh-pail")).toBeDefined();
    expect(customElements.get("ui-card")).toBeDefined();
    expect(customElements.get("ui-badge")).toBeDefined();
    expect(inShadow(element, "ui-card").shadowRoot).not.toBeNull();
  });

  it("renders the record identity and uses the existing UI badge for kind", async () => {
    const element = await fixture<ShrineMyth>(projectRecord);

    expect(inShadow(element, "[part=title]").textContent?.trim()).toBe("Billing Migration");
    expect(inShadow(element, "[part=path]").textContent?.trim()).toBe(
      "/rec/project/billing-migration",
    );

    const badge = inShadow<HTMLElement>(element, "ui-badge");
    expect(badge.getAttribute("part")).toBe("kind");
    expect(badge.textContent?.trim()).toBe("Project");
  });

  it("keeps labels and values owned by the projected limb anatomy", async () => {
    const element = await fixture<ShrineMyth>(projectRecord);
    const limbs = element.querySelectorAll("sh-limb");
    expect(limbs).toHaveLength(2);

    await settled(element);
    const firstLimb = limbs[0]!;
    const secondLimb = limbs[1]!;
    expect(
      inShadow<HTMLSlotElement>(firstLimb, "slot[name=label]").assignedElements(),
    ).toHaveLength(1);
    expect(
      inShadow<HTMLSlotElement>(firstLimb, "slot[name=value]").assignedElements(),
    ).toHaveLength(1);
    expect(inShadow(firstLimb.querySelector("sh-slot")!, "[part=root]").textContent).toBe("status");
    expect(inShadow(firstLimb.querySelector("sh-pail")!, "[part=root]").textContent).toBe("active");
    expect(
      inShadow<HTMLSlotElement>(
        firstLimb.querySelector("sh-slot")!,
        'slot[name="label"]',
      ).part.contains("label"),
    ).toBe(true);
    expect(
      inShadow<HTMLSlotElement>(
        firstLimb.querySelector("sh-pail")!,
        'slot[name="value"]',
      ).part.contains("value"),
    ).toBe(true);
    expect(inShadow(secondLimb.querySelector("sh-slot")!, "[part=root]").textContent).toBe("goal");
    expect(inShadow(secondLimb.querySelector("sh-pail")!, "[part=root]").textContent).toBe(
      "replace legacy invoicer",
    );
  });

  it("renders a bounded identity when optional metadata is absent", async () => {
    const element = await fixture<ShrineMyth>(`<sh-myth title="Untitled record"></sh-myth>`);

    expect(inShadow(element, "[part=title]").textContent?.trim()).toBe("Untitled record");
    expect(inShadow<HTMLElement>(element, "[part=kind]").hidden).toBe(true);
    expect(inShadow<HTMLElement>(element, "[part=path]").hidden).toBe(true);
  });
});
