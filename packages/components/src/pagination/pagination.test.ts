import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIPagination } from "./pagination.js";
import "./register.js";

describe("ui-pagination", () => {
  it("calculates a bounded page window", async () => {
    const pagination = await fixture<UIPagination>(
      `<ui-pagination current-page="5" total-pages="10" visible-pages="7"></ui-pagination>`,
    );

    expect(pagination.items).toEqual([
      { kind: "page", page: 1 },
      { kind: "ellipsis" },
      { kind: "page", page: 3 },
      { kind: "page", page: 4 },
      { kind: "page", page: 5 },
      { kind: "page", page: 6 },
      { kind: "page", page: 7 },
      { kind: "ellipsis" },
      { kind: "page", page: 10 },
    ]);
    expect(inShadow(pagination, `[part~="page"][aria-current="page"]`).textContent?.trim()).toBe(
      "5",
    );
  });

  it("emits controlled requests without mutating current-page", async () => {
    const pagination = await fixture<UIPagination>(
      `<ui-pagination current-page="2" total-pages="4"></ui-pagination>`,
    );
    const onChange = vi.fn();
    pagination.addEventListener("ui-page-change", onChange);

    inShadow<HTMLButtonElement>(pagination, `[part~="page"][data-page="3"]`).click();
    await settled(pagination);

    expect(onChange).toHaveBeenCalledOnce();
    const event = onChange.mock.calls[0]?.[0] as CustomEvent<{ page: number }>;
    expect(event.detail).toEqual({ page: 3 });
    expect(pagination.currentPage).toBe(2);
  });

  it("supports authored controls through semantic slots", async () => {
    const pagination = await fixture<UIPagination>(`
      <ui-pagination current-page="1" total-pages="2">
        <button slot="previous">Back</button>
        <span>Authored pages</span>
        <button slot="next">Forward</button>
      </ui-pagination>
    `);

    expect(
      inShadow<HTMLSlotElement>(pagination, `slot[name="previous"]`).assignedElements(),
    ).toHaveLength(1);
    expect(
      inShadow<HTMLSlotElement>(pagination, `slot:not([name])`).assignedElements(),
    ).toHaveLength(1);
    expect(
      inShadow<HTMLSlotElement>(pagination, `slot[name="next"]`).assignedElements(),
    ).toHaveLength(1);
  });
});
