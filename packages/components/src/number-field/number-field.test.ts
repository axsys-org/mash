import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import type { UINumberField } from "./number-field.js";
import "./register.js";

describe("ui-number-field", () => {
  it("uses an authored label for its controls and mirrors required state", async () => {
    const field = await fixture<UINumberField>(`
      <ui-number-field label="Fallback" required>
        <span slot="label">Seat count</span>
      </ui-number-field>
    `);

    expect(
      inShadow<HTMLSlotElement>(field, 'slot[name="label"]').assignedElements()[0]?.textContent,
    ).toBe("Seat count");
    expect(inShadow<HTMLInputElement>(field, '[part="control"]').ariaLabel).toBe("Seat count");
    expect(inShadow<HTMLButtonElement>(field, '[part="increment"]').ariaLabel).toBe(
      "Increase Seat count",
    );
    expect(field.matches(":state(required)")).toBe(true);
  });

  it("reports a cancellable semantic step request before changing value", async () => {
    const field = await fixture<UINumberField>(
      `<ui-number-field value="3" step="2" label="Seats"></ui-number-field>`,
    );
    const requests: Array<{ direction: string; value: number }> = [];
    field.addEventListener("ui-number-field-step", (event) => {
      const request = event as CustomEvent<{ direction: string; value: number }>;
      requests.push(request.detail);
      request.preventDefault();
    });

    inShadow<HTMLButtonElement>(field, '[part="increment"]').click();

    expect(requests).toEqual([{ direction: "increment", value: 5 }]);
    expect(field.value).toBe(3);
  });
});
