import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { ShrineMyth } from "./myth.js";
import "./register.js";

describe("sh-myth", () => {
  const projectRecord = `
    <sh-myth kind="Project" title="Billing Migration" path="/rec/project/billing-migration">
      <sh-limb>
        <sh-slot slot="slot" title="status"></sh-slot>
        <sh-pail slot="value" text="active"></sh-pail>
      </sh-limb>
      <sh-limb>
        <sh-slot slot="slot" title="goal"></sh-slot>
        <sh-pail slot="value" text="replace legacy invoicer"></sh-pail>
      </sh-limb>
    </sh-myth>
  `;

  it("registers the full composed record anatomy", async () => {
    const el = await fixture<ShrineMyth>(projectRecord);

    expect(customElements.get("sh-myth")).toBe(ShrineMyth);
    expect(customElements.get("sh-limb")).toBeDefined();
    expect(customElements.get("sh-slot")).toBeDefined();
    expect(customElements.get("sh-pail")).toBeDefined();
    expect(customElements.get("ui-card")).toBeDefined();
    expect(customElements.get("ui-badge")).toBeDefined();
    expect(inShadow(el, "ui-card").shadowRoot).not.toBeNull();
  });

  it("renders the record identity and uses the existing UI badge for kind", async () => {
    const el = await fixture<ShrineMyth>(projectRecord);

    expect(inShadow(el, "[part=title]").textContent).toBe("Billing Migration");
    expect(inShadow(el, "[part=path]").textContent).toBe("/rec/project/billing-migration");

    const badge = inShadow<HTMLElement>(el, "ui-badge");
    expect(badge.getAttribute("part")).toBe("kind");
    expect(badge.textContent).toBe("Project");
  });

  it("keeps labels and values owned by the projected limb anatomy", async () => {
    const el = await fixture<ShrineMyth>(projectRecord);
    const limbs = el.querySelectorAll("sh-limb");
    expect(limbs).toHaveLength(2);

    await settled(el);
    const firstLimb = limbs[0]!;
    const secondLimb = limbs[1]!;
    expect(inShadow<HTMLSlotElement>(firstLimb, "slot[name=slot]").assignedElements()).toHaveLength(
      1,
    );
    expect(
      inShadow<HTMLSlotElement>(firstLimb, "slot[name=value]").assignedElements(),
    ).toHaveLength(1);
    expect(inShadow(firstLimb.querySelector("sh-slot")!, "[part=root]").textContent).toBe("status");
    expect(inShadow(firstLimb.querySelector("sh-pail")!, "[part=root]").textContent).toBe("active");
    expect(inShadow(secondLimb.querySelector("sh-slot")!, "[part=root]").textContent).toBe("goal");
    expect(inShadow(secondLimb.querySelector("sh-pail")!, "[part=root]").textContent).toBe(
      "replace legacy invoicer",
    );
  });

  it("renders a bounded identity when optional metadata is absent", async () => {
    const el = await fixture<ShrineMyth>(`<sh-myth title="Untitled record"></sh-myth>`);

    expect(inShadow(el, "[part=title]").textContent).toBe("Untitled record");
    expect(shadow(el).querySelector("[part=kind]")).toBeNull();
    expect(shadow(el).querySelector("[part=path]")).toBeNull();
  });
});
