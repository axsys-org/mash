import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
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

it("clears the submitted value and blocks required submission after empty editing", async () => {
  const form = await fixture<HTMLFormElement>(
    '<form><ui-number-field name="seats" value="3" min="1" max="12" required></ui-number-field></form>',
  );
  const field = form.querySelector<UINumberField>("ui-number-field")!;
  const input = inShadow<HTMLInputElement>(field, '[part="control"]');
  const values: number[] = [];
  field.addEventListener("ui-number-field-input", (event) =>
    values.push((event as CustomEvent<{ value: number }>).detail.value),
  );
  input.value = "";
  input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await settled(form);
  expect(Number.isNaN(field.value)).toBe(true);
  expect(Number.isNaN(values[0])).toBe(true);
  expect(input.value).toBe("");
  expect(new FormData(form).get("seats")).toBe("");
  expect(form.checkValidity()).toBe(false);
  expect(field.matches(":state(invalid)")).toBe(true);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  inShadow<HTMLButtonElement>(field, '[part="increment"]').click();
  await settled(form);
  expect(field.value).toBe(1);
  expect(input.hasAttribute("aria-invalid")).toBe(false);
  expect(form.checkValidity()).toBe(true);
  expect(new FormData(form).get("seats")).toBe("1");
  form.reset();
  await settled(form);
  expect(field.value).toBe(3);
});

it("allows an optional empty value and forwards native step validity", async () => {
  const form = await fixture<HTMLFormElement>(
    '<form><ui-number-field name="hours" value="1.5" min="0" step="1"></ui-number-field></form>',
  );
  const field = form.querySelector<UINumberField>("ui-number-field")!;
  expect(form.checkValidity()).toBe(false);
  field.value = Number.NaN;
  await settled(form);
  expect(form.checkValidity()).toBe(true);
  expect(new FormData(form).get("hours")).toBe("");
  field.formStateRestoreCallback("");
  await settled(form);
  expect(Number.isNaN(field.value)).toBe(true);
  field.value = 2;
  await settled(form);
  expect(form.checkValidity()).toBe(true);
});
