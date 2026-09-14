import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIOtpField } from "./otp-field.js";
import "./register.js";

describe("ui-otp-field", () => {
  it("uses an authored label for the group and cells", async () => {
    const field = await fixture<UIOtpField>(`
      <ui-otp-field label="Fallback" length="4">
        <span slot="label">Security code</span>
      </ui-otp-field>
    `);

    expect(inShadow<HTMLElement>(field, '[part="root"]').ariaLabel).toBe("Security code");
    expect(inShadow<HTMLInputElement>(field, '[part="cell"]').ariaLabel).toBe(
      "Security code, character 1 of 4",
    );
  });

  it("obscures a code without changing its semantic value", async () => {
    const field = await fixture<UIOtpField>(
      `<ui-otp-field value="4821" length="4" masked></ui-otp-field>`,
    );

    expect(inShadow<HTMLInputElement>(field, '[part="cell"]').type).toBe("password");
    expect(field.value).toBe("4821");
    expect(field.matches(":state(masked)")).toBe(true);
  });
});

it("keeps grouped paste and form values as one code", async () => {
  const form = await fixture<HTMLFormElement>(
    `<form><ui-otp-field name="code" length="6" group-size="3"></ui-otp-field></form>`,
  );
  const field = form.querySelector<UIOtpField>("ui-otp-field")!;
  const data = new DataTransfer();
  data.setData("text", "123456");
  inShadow<HTMLInputElement>(field, '[part="cell"]').dispatchEvent(
    new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
  );
  await settled(form);
  expect(field.shadowRoot!.querySelectorAll('[part="separator"]')).toHaveLength(1);
  expect(field.shadowRoot!.querySelectorAll("input")).toHaveLength(6);
  expect(new FormData(form).get("code")).toBe("123456");
  expect(field.matches(":state(complete)")).toBe(true);
});
