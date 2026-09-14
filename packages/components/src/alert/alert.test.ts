import { expect, it } from "vitest";
import { fixture, inShadow } from "../test-support/fixture.js";
import type { UIAlert } from "./alert.js";
import "./register.js";
it("allows dismissal to be canceled and exposes urgent feedback as an alert", async () => {
  const alert = await fixture<UIAlert>('<ui-alert tone="critical" closable>Save failed</ui-alert>');
  expect(inShadow(alert, '[part="root"]').getAttribute("role")).toBe("alert");
  alert.addEventListener("ui-alert-dismiss", (event) => event.preventDefault(), { once: true });
  inShadow<HTMLButtonElement>(alert, "button").click();
  expect(alert.hidden).toBe(false);
  inShadow<HTMLButtonElement>(alert, "button").click();
  expect(alert.hidden).toBe(true);
});
