import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { ShrineMyth } from "./myth.js";
import "./register.js";

describe("sh-myth", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("sh-myth")).toBe(ShrineMyth);

    const el = await fixture<ShrineMyth>(`<sh-myth></sh-myth>`);
    expect(el).toBeInstanceOf(ShrineMyth);
    expect(el.shadowRoot).not.toBeNull();
    expect(el.label).toBe("Myth");
    expect(el.entries).toEqual([]);
  });

  it("registers and upgrades the path and card elements it composes", async () => {
    const el = await fixture<ShrineMyth>(`<sh-myth></sh-myth>`);

    expect(customElements.get("ui-card")).toBeDefined();
    expect(customElements.get("ui-path")).toBeDefined();
    expect(inShadow(el, "ui-card").shadowRoot).not.toBeNull();
  });

  it("renders declarative JSON as slot paths and code blocks", async () => {
    const el = await fixture<ShrineMyth>(`
      <sh-myth label="Observed mapping" data='[
        {"slot":"/shrine/alpha","title":"Alpha","value":{"kind":"leaf","count":2}},
        {"slot":"/shrine/beta","value":"line one\\nline two"}
      ]'></sh-myth>
    `);

    const entries = shadow(el).querySelectorAll<HTMLElement>("[part=entry]");
    expect(entries).toHaveLength(2);
    expect(shadow(el).querySelector("[part=heading]")?.textContent).toBe("Observed mapping");

    const paths = shadow(el).querySelectorAll<HTMLElement>("ui-path");
    expect(paths).toHaveLength(2);
    expect(paths[0]!.getAttribute("path")).toBe("/shrine/alpha");
    expect(paths[0]!.getAttribute("title")).toBe("Alpha");

    const blocks = shadow(el).querySelectorAll("pre code");
    expect(blocks[0]!.textContent).toContain('"kind": "leaf"');
    expect(blocks[0]!.textContent).toContain('"count": 2');
    expect(blocks[1]!.textContent).toBe("line one\nline two");
  });

  it("renders structured entries and pretty-prints non-string values", async () => {
    const el = await fixture<ShrineMyth>(`<sh-myth></sh-myth>`);

    el.entries = [{ slot: "/runtime/value", value: { ready: true, depth: 3 } }];
    await settled(el.parentElement!);

    expect(inShadow(el, "ui-path").getAttribute("path")).toBe("/runtime/value");
    expect(inShadow(el, "pre code").textContent).toContain('"ready": true');
  });

  it("shows a bounded empty state for invalid or empty input", async () => {
    const el = await fixture<ShrineMyth>(`<sh-myth data="not-json"></sh-myth>`);

    expect(inShadow(el, "[part=empty]").textContent).toBe("No mappings.");
    expect(shadow(el).querySelectorAll("[part=entry]")).toHaveLength(0);
  });
});
