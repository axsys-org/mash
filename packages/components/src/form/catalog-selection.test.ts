import { describe, expect, it } from "vitest";
import { selectionExamples } from "../../../../apps/catalog/src/examples/selection.js";
import { fixture, settled } from "../test-support/fixture.js";
import type { UIInput } from "../input/input.js";
import type { UICombobox } from "../combobox/combobox.js";
import type { UICheckbox } from "../checkbox/checkbox.js";
import type { UIOtpField } from "../otp-field/otp-field.js";
import "./register.js";
import "../input/register.js";
import "../button/register.js";
import "../field/register.js";
import "../select/register.js";
import "../option/register.js";
import "../option-group/register.js";
import "../combobox/register.js";
import "../chip/register.js";
import "../checkbox/register.js";
import "../otp-field/register.js";

async function example(tag: string, name: string): Promise<HTMLElement> {
  const entry = selectionExamples[tag]!.find((item) => item.name === name)!;
  const root = await fixture<HTMLElement>(entry.code);
  new Function(entry.script!)();
  await settled(root);
  return root;
}

describe("catalogue selection outcomes", () => {
  it("submits the project form and resets its authored fields", async () => {
    const root = await example("ui-form", "Form");
    root.querySelector<UIInput>('[name="project"]')!.value = "Studio";
    root.querySelector<UIInput>('[name="email"]')!.value = "alex@example.com";
    await settled(root);
    root.querySelector<HTMLElement>('[type="submit"]')!.click();
    expect(root.querySelector("output")!.textContent).toBe(
      "Created Studio · Team · alex@example.com",
    );
    root.querySelector<HTMLElement>('[type="reset"]')!.click();
    await settled(root);
    expect(root.querySelector<UIInput>('[name="project"]')!.value).toBe("");
    expect(root.querySelector("output")!.textContent).toContain("Form reset");
  });

  it("keeps the pinned owner when optional selections are cleared", async () => {
    const root = await example("ui-combobox", "Selection limit and pinned chip");
    const combo = root.querySelector<UICombobox>("ui-combobox")!;
    combo.values = ["You", "Alex", "Sam"];
    combo.dispatchEvent(new CustomEvent("ui-combobox-change", { bubbles: true }));
    await settled(root);
    expect(combo.querySelector('[value="Taylor"]')!.hasAttribute("disabled")).toBe(true);
    root.querySelector<HTMLElement>('[slot="clear"]')!.click();
    await settled(root);
    expect(combo.values).toEqual(["You"]);
    expect(combo.querySelectorAll("ui-chip")).toHaveLength(1);
    expect(root.querySelector("output")!.textContent).toBe("1/3 reviewers: You");
  });

  it("updates selected outputs and the indeterminate master control", async () => {
    const root = await example("ui-checkbox", "Select all and mixed state");
    const all = root.querySelector<UICheckbox>("#select-all")!;
    expect(all.indeterminate).toBe(true);
    all.shadowRoot!.querySelector<HTMLInputElement>("input")!.click();
    await settled(root);
    expect(root.querySelector("output")!.textContent).toBe(
      "3/3 selected: Design, Content, Engineering",
    );
    expect(all.indeterminate).toBe(false);
    root
      .querySelector<UICheckbox>(".deliverable")!
      .shadowRoot!.querySelector<HTMLInputElement>("input")!
      .click();
    await settled(root);
    expect(all.indeterminate).toBe(true);
    expect(root.querySelector("output")!.textContent).toContain("2/3 selected");
  });

  it("shows failed and successful verification then clears the code", async () => {
    const root = await example("ui-otp-field", "Verify, retry, and reset");
    const code = root.querySelector<UIOtpField>("ui-otp-field")!;
    const paste = async (value: string) => {
      const data = new DataTransfer();
      data.setData("text", value);
      code
        .shadowRoot!.querySelector("input")!
        .dispatchEvent(
          new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
        );
      await settled(root);
    };
    await paste("111111");
    expect(root.querySelector("ui-field")!.hasAttribute("invalid")).toBe(true);
    await paste("123456");
    expect(root.querySelector("output")!.textContent).toBe("Verified. You can continue.");
    root.querySelector<HTMLElement>("#reset-code")!.click();
    await settled(root);
    expect(code.value).toBe("");
  });
});

it("ignores stale directory responses and recovers a failed search", async () => {
  const root = await example("ui-combobox", "Async search and recovery");
  const combo = root.querySelector<UICombobox>("ui-combobox")!;
  const input = combo.shadowRoot!.querySelector("input")!;
  const search = (value: string) => {
    input.value = value;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  };
  search("Alex");
  search("Sam");
  await expect.poll(() => combo.querySelector("ui-option")?.textContent).toBe("Sam Chen");
  expect(combo.querySelectorAll("ui-option")).toHaveLength(1);
  search("error");
  await expect.poll(() => root.querySelector<HTMLElement>("#retry-directory")!.hidden).toBe(false);
  root.querySelector<HTMLElement>("#retry-directory")!.click();
  await expect.poll(() => combo.querySelectorAll("ui-option").length).toBe(5);
  expect(combo.loading).toBe(false);
});
