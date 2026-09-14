import { expect, it } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIStepper, UIStep } from "./stepper.js";
import "./register.js";
it("skips disabled steps and respects canceled navigation", async () => {
  const stepper = await fixture<UIStepper>(
    '<ui-stepper value="one"><ui-step value="one" label="One"></ui-step><ui-step value="two" label="Two" disabled></ui-step><ui-step value="three" label="Three"></ui-step></ui-stepper>',
  );
  const steps = [...stepper.querySelectorAll<UIStep>("ui-step")];
  const first = inShadow<HTMLButtonElement>(steps[0]!, "button");
  first.focus();
  first.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }),
  );
  expect(document.activeElement).toBe(steps[2]);
  stepper.addEventListener("ui-stepper-change", (event) => event.preventDefault(), { once: true });
  inShadow<HTMLButtonElement>(steps[2]!, "button").click();
  await settled(stepper);
  expect(stepper.value).toBe("one");
  inShadow<HTMLButtonElement>(steps[2]!, "button").click();
  await settled(stepper);
  expect(stepper.value).toBe("three");
  expect(steps[0]!.completed).toBe(true);
});
