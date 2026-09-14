import { describe, expect, it } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIRating } from "./rating.js";
import "./register.js";

describe("rating", () => {
  it("submits, resets, and disables a chosen score through a native form", async () => {
    const form = await fixture<HTMLFormElement>(
      '<form><ui-rating name="score" value="2" required></ui-rating></form>',
    );
    const rating = form.querySelector<UIRating>("ui-rating")!;
    await settled(rating);
    const inputs = [...rating.shadowRoot!.querySelectorAll<HTMLInputElement>("input")];
    inputs[3]!.click();
    await settled(rating);
    expect(new FormData(form).get("score")).toBe("4");
    form.reset();
    await settled(rating);
    expect(new FormData(form).get("score")).toBe("2");
    rating.disabled = true;
    await settled(rating);
    expect(new FormData(form).has("score")).toBe(false);
    expect(inShadow<HTMLInputElement>(rating, "input").disabled).toBe(true);
  });
  it("makes a read-only score readable without adding focus stops", async () => {
    const rating = await fixture<UIRating>(
      '<ui-rating readonly value="3" label="Quality"></ui-rating>',
    );
    expect(rating.shadowRoot!.querySelectorAll("input")).toHaveLength(0);
    expect(inShadow<HTMLElement>(rating, '[part="root"]').getAttribute("aria-label")).toBe(
      "Quality: 3 of 5",
    );
  });
});
