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
      `<ui-number-field value="4" step="2" label="Seats"></ui-number-field>`,
    );
    const requests: Array<{ direction: string; value: number }> = [];
    field.addEventListener("ui-number-field-step", (event) => {
      const request = event as CustomEvent<{ direction: string; value: number }>;
      requests.push(request.detail);
      request.preventDefault();
    });

    inShadow<HTMLButtonElement>(field, '[part="increment"]').click();

    expect(requests).toEqual([{ direction: "increment", value: 6 }]);
    expect(field.value).toBe(4);
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

it("preserves out-of-range drafts and synchronizes form data before input callbacks", async () => {
  const form = await fixture<HTMLFormElement>(
    '<form><ui-number-field name="amount" value="120" min="100" max="500"></ui-number-field></form>',
  );
  const field = form.querySelector<UINumberField>("ui-number-field")!;
  const input = inShadow<HTMLInputElement>(field, "input");
  const submitted: FormDataEntryValue[] = [];
  field.addEventListener("ui-number-field-input", () =>
    submitted.push(new FormData(form).get("amount")!),
  );
  input.value = "2";
  input.dispatchEvent(new InputEvent("input"));
  await settled(form);
  expect(input.value).toBe("2");
  expect(field.value).toBe(2);
  expect(submitted).toEqual(["2"]);
  expect(form.checkValidity()).toBe(false);
  input.dispatchEvent(new Event("change"));
  await settled(form);
  expect(input.value).toBe("100");
  expect(new FormData(form).get("amount")).toBe("100");
  expect(form.checkValidity()).toBe(true);
});

it("steps decimals on the native grid and disables no-op controls", async () => {
  const field = await fixture<UINumberField>(
    '<ui-number-field value="0.2" min="0" max="0.35" step="0.1"></ui-number-field>',
  );
  const input = inShadow<HTMLInputElement>(field, "input");
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", cancelable: true }));
  await settled(field);
  expect(field.value).toBe(0.3);
  expect(input.value).toBe("0.3");
  expect(inShadow<HTMLButtonElement>(field, '[part="increment"]').disabled).toBe(true);
  input.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, cancelable: true }),
  );
  await settled(field);
  expect(field.value).toBe(0);
  expect(inShadow<HTMLButtonElement>(field, '[part="decrement"]').disabled).toBe(true);
});

it("keeps read-only values submitted and honors fieldset disabling", async () => {
  const form = await fixture<HTMLFormElement>(
    '<form><fieldset><ui-number-field name="count" value="12" readonly></ui-number-field></fieldset></form>',
  );
  const field = form.querySelector<UINumberField>("ui-number-field")!;
  const input = inShadow<HTMLInputElement>(field, "input");
  expect(input.readOnly).toBe(true);
  expect(new FormData(form).get("count")).toBe("12");
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", cancelable: true }));
  expect(field.value).toBe(12);
  field.readonly = false;
  form.querySelector("fieldset")!.disabled = true;
  await settled(form);
  expect(input.disabled).toBe(true);
  expect(new FormData(form).has("count")).toBe(false);
  form.querySelector("fieldset")!.disabled = false;
  await settled(form);
  expect(input.disabled).toBe(false);
  expect(new FormData(form).get("count")).toBe("12");
});
