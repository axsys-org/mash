import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIField } from "./field.js";
import type { UIInput } from "../input/input.js";
import type { UISelect } from "../select/select.js";
import type { UITextarea } from "../textarea/textarea.js";
import "../input/register.js";
import "../input-group/register.js";
import "../option/register.js";
import "../select/register.js";
import "../textarea/register.js";
import "./register.js";

describe("ui-field", () => {
  it("uses an authored label and mirrors validation requirements", async () => {
    const field = await fixture<UIField>(`
      <ui-field label="Fallback" invalid required>
        <span slot="label">Authored label</span>
        <input slot="control" />
      </ui-field>
    `);
    const input = field.querySelector<HTMLInputElement>("input")!;

    expect(
      inShadow<HTMLSlotElement>(field, 'slot[name="label"]').assignedElements()[0]?.textContent,
    ).toBe("Authored label");
    expect(input.required).toBe(true);
    expect(field.matches(":state(invalid)")).toBe(true);
    expect(field.matches(":state(required)")).toBe(true);
  });

  it("passes label, description, validity and focus through an input group", async () => {
    const field = await fixture<UIField>(`
      <ui-field label="Search projects" description="Search by project name." error="Try again." invalid required>
        <ui-input-group slot="control">
          <ui-input slot="control"></ui-input>
        </ui-input-group>
      </ui-field>
    `);
    await settled(field.parentElement!);
    const input = field.querySelector<UIInput>("ui-input")!;
    const control = inShadow<HTMLInputElement>(input, '[part="control"]');

    expect(input.label).toBe("Search projects");
    expect(input.required).toBe(true);
    expect(control.getAttribute("aria-description")).toBe("Search by project name. Try again.");
    expect(control.getAttribute("aria-invalid")).toBe("true");

    inShadow<HTMLLabelElement>(field, '[part="label"]').click();
    expect(input.shadowRoot?.activeElement).toBe(control);
  });

  it("uses the same field protocol for textareas and composite controls", async () => {
    const field = await fixture<UIField>(`
      <ui-field label="Notes" description="Visible to reviewers." error="Required." invalid required>
        <ui-textarea slot="control"></ui-textarea>
      </ui-field>
    `);
    await settled(field.parentElement!);
    const textarea = field.querySelector<UITextarea>("ui-textarea")!;
    const textareaControl = inShadow<HTMLTextAreaElement>(textarea, '[part="control"]');

    expect(textarea.label).toBe("Notes");
    expect(textarea.required).toBe(true);
    expect(textarea.matches(":state(invalid)")).toBe(true);
    expect(textareaControl.getAttribute("aria-description")).toBe(
      "Visible to reviewers. Required.",
    );
    expect(textareaControl.getAttribute("aria-invalid")).toBe("true");

    field.innerHTML = `
      <ui-select slot="control">
        <ui-option value="active">Active</ui-option>
      </ui-select>
    `;
    await settled(field.parentElement!);
    const select = field.querySelector<UISelect>("ui-select")!;
    const trigger = inShadow<HTMLButtonElement>(select, '[part="trigger"]');

    expect(select.label).toBe("Notes");
    expect(select.matches(":state(invalid)")).toBe(true);
    expect(trigger.getAttribute("aria-description")).toBe("Visible to reviewers. Required.");
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
  });
});
