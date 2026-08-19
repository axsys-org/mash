import { userEvent } from "vitest/browser";
import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "./test-support/fixture.js";
import type { UIAccordionItem } from "./accordion-item/accordion-item.js";
import type { UINumberField } from "./number-field/number-field.js";
import type { UIOtpField } from "./otp-field/otp-field.js";
import type { UIRadio } from "./radio/radio.js";
import type { UISlider } from "./slider/slider.js";
import type { UITabPanel } from "./tab-panel/tab-panel.js";
import type { UIToggle } from "./toggle/toggle.js";
import "./accordion/register.js";
import "./accordion-item/register.js";
import "./alert-dialog/register.js";
import "./autocomplete/register.js";
import "./checkbox-group/register.js";
import "./checkbox/register.js";
import "./collapsible/register.js";
import "./combobox/register.js";
import "./context-menu/register.js";
import "./dialog/register.js";
import "./drawer/register.js";
import "./field/register.js";
import "./fieldset/register.js";
import "./form/register.js";
import "./meter/register.js";
import "./menu/register.js";
import "./menu-item/register.js";
import "./menubar/register.js";
import "./navigation-menu/register.js";
import "./number-field/register.js";
import "./otp-field/register.js";
import "./option/register.js";
import "./popover/register.js";
import "./preview-card/register.js";
import "./radio-group/register.js";
import "./radio/register.js";
import "./scroll-area/register.js";
import "./select/register.js";
import "./slider/register.js";
import "./tab-panel/register.js";
import "./tab/register.js";
import "./tabs/register.js";
import "./toggle-group/register.js";
import "./toggle/register.js";
import "./toast/register.js";
import "./toolbar/register.js";
import "./tooltip/register.js";

describe("Base UI control families", () => {
  it("coordinates a radio group as one form value and Arrow-key choice", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form><ui-radio-group name="visibility" value="team">
        <ui-radio value="private">Private</ui-radio>
        <ui-radio value="team">Team</ui-radio>
      </ui-radio-group></form>
    `);
    const group = form.querySelector<HTMLElement>("ui-radio-group")!;
    const [privateRadio, teamRadio] = [...group.querySelectorAll<UIRadio>("ui-radio")];
    const changes: string[] = [];
    group.addEventListener("ui-radio-group-change", (event) => {
      changes.push((event as CustomEvent<{ value: string }>).detail.value);
    });

    expect(teamRadio!.checked).toBe(true);
    teamRadio!.focus();
    await userEvent.keyboard("{ArrowUp}");
    await settled(form);

    expect(privateRadio!.checked).toBe(true);
    expect(new FormData(form).get("visibility")).toBe("private");
    expect(changes).toEqual(["private"]);
  });

  it("coordinates toggle-group selection without styling its children", async () => {
    const group = await fixture<HTMLElement>(`
      <ui-toggle-group mode="single" value="center">
        <ui-toggle value="left">Left</ui-toggle>
        <ui-toggle value="center">Center</ui-toggle>
      </ui-toggle-group>
    `);
    const [left, center] = [...group.querySelectorAll<UIToggle>("ui-toggle")];

    expect(center!.pressed).toBe(true);
    inShadow<HTMLButtonElement>(left!, "button").click();
    await settled(group.parentElement!);

    expect(left!.pressed).toBe(true);
    expect(center!.pressed).toBe(false);
  });

  it("preserves native disclosure semantics for collapsibles and accordions", async () => {
    const collapsible = await fixture<HTMLElement>(`
      <ui-collapsible><span slot="trigger">Advanced</span><p>Details</p></ui-collapsible>
    `);
    const trigger = inShadow<HTMLButtonElement>(collapsible, "button");
    trigger.click();
    await settled(collapsible.parentElement!);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(collapsible.matches(":state(open)")).toBe(true);

    const accordion = await fixture<HTMLElement>(`
      <ui-accordion><ui-accordion-item title="One" value="one" open>One</ui-accordion-item>
        <ui-accordion-item title="Two" value="two">Two</ui-accordion-item></ui-accordion>
    `);
    const [one, two] = [...accordion.querySelectorAll<UIAccordionItem>("ui-accordion-item")];
    inShadow<HTMLButtonElement>(two!, "button").click();
    await settled(accordion.parentElement!);
    expect(one!.open).toBe(false);
    expect(two!.open).toBe(true);
  });

  it("maps a selected tab to exactly one labelled panel", async () => {
    const tabs = await fixture<HTMLElement>(`
      <ui-tabs value="general" label="Settings">
        <ui-tab slot="tab" value="general">General</ui-tab>
        <ui-tab slot="tab" value="members">Members</ui-tab>
        <ui-tab-panel slot="panel" value="general">General panel</ui-tab-panel>
        <ui-tab-panel slot="panel" value="members">Member panel</ui-tab-panel>
      </ui-tabs>
    `);
    const members = tabs.querySelector<HTMLElement>('ui-tab[value="members"]')!;
    const panels = [...tabs.querySelectorAll<UITabPanel>("ui-tab-panel")];

    inShadow<HTMLButtonElement>(members, "button").click();
    await settled(tabs.parentElement!);

    expect(tabs.getAttribute("value")).toBe("members");
    expect(panels[0]!.selected).toBe(false);
    expect(panels[1]!.selected).toBe(true);
    expect(inShadow<HTMLElement>(panels[1]!, "[role=tabpanel]").getAttribute("aria-label")).toBe(
      "Members",
    );
  });

  it("uses a native range for slider form and input events", async () => {
    const form = await fixture<HTMLFormElement>(
      `<form><ui-slider name="volume" value="20" label="Volume"></ui-slider></form>`,
    );
    const slider = form.querySelector<HTMLElement>("ui-slider")!;
    const input = inShadow<HTMLInputElement>(slider, "input");
    const values: number[] = [];
    slider.addEventListener("ui-slider-input", (event) =>
      values.push((event as CustomEvent<{ value: number }>).detail.value),
    );

    input.value = "45";
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(form);

    expect((slider as UISlider).value).toBe(45);
    expect(new FormData(form).get("volume")).toBe("45");
    expect(values).toEqual([45]);
  });

  it("keeps meter, scroll area, and toolbar on native semantic elements", async () => {
    const meter = await fixture<HTMLElement>(
      `<ui-meter value="3" max="5" label="Storage"></ui-meter>`,
    );
    expect(inShadow<HTMLMeterElement>(meter, "meter").value).toBe(3);

    const scrollArea = await fixture<HTMLElement>(
      `<ui-scroll-area label="Log"><p>Entry</p></ui-scroll-area>`,
    );
    expect(inShadow<HTMLElement>(scrollArea, "[role=region]").getAttribute("tabindex")).toBe("0");

    const toolbar = await fixture<HTMLElement>(
      `<ui-toolbar label="Tools"><ui-toggle>A</ui-toggle><ui-toggle>B</ui-toggle></ui-toolbar>`,
    );
    expect(inShadow<HTMLElement>(toolbar, "[role=toolbar]").getAttribute("aria-label")).toBe(
      "Tools",
    );
  });

  it("wires a field label, native description, and error announcement", async () => {
    const field = await fixture<HTMLElement>(`
      <ui-field label="Project name" description="Visible to the team." error="Required" invalid required>
        <input slot="control" />
      </ui-field>
    `);
    const input = field.querySelector<HTMLInputElement>("input")!;
    const label = inShadow<HTMLLabelElement>(field, "label");

    expect(label.htmlFor).toBe(input.id);
    expect(input.required).toBe(true);
    expect(input.getAttribute("aria-describedby")).toContain("ui-field-description");
    expect(inShadow<HTMLElement>(field, "[role=alert]").textContent).toContain("Required");
  });

  it("retains form participation for numeric and OTP values", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form>
        <ui-number-field name="seats" value="2" min="1" max="5" label="Seats"></ui-number-field>
        <ui-otp-field name="code" length="4" label="Code"></ui-otp-field>
      </form>
    `);
    const number = form.querySelector<UINumberField>("ui-number-field")!;
    const otp = form.querySelector<UIOtpField>("ui-otp-field")!;
    const increment = inShadow<HTMLButtonElement>(number, "button[part=increment]");
    increment.click();
    const cells = [...otp.shadowRoot!.querySelectorAll<HTMLInputElement>("input")];
    for (const [index, cell] of cells.entries()) {
      cell.value = String(index + 1);
      cell.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    }
    await settled(form);

    expect(number.value).toBe(3);
    expect(otp.value).toBe("1234");
    expect(otp.matches(":state(complete)")).toBe(true);
    expect(new FormData(form).get("seats")).toBe("3");
    expect(new FormData(form).get("code")).toBe("1234");
  });

  it("opens modal overlays with slotted focus, then closes through a close control or Escape", async () => {
    const dialog = await fixture<HTMLElement>(`
      <ui-dialog label="Rename project">
        <button slot="trigger">Rename</button>
        <input value="Billing migration" />
        <button slot="close">Save</button>
      </ui-dialog>
    `);
    const events: boolean[] = [];
    dialog.addEventListener("ui-dialog-open-change", (event) => {
      events.push((event as CustomEvent<{ open: boolean }>).detail.open);
    });

    dialog.querySelector<HTMLButtonElement>("button")!.click();
    await settled(dialog.parentElement!);
    const popup = inShadow<HTMLElement>(dialog, "[part=popup]");
    expect(dialog.getAttribute("open")).toBe("");
    expect(popup.getAttribute("role")).toBe("dialog");
    expect(document.activeElement).toBe(dialog.querySelector<HTMLInputElement>("input"));

    dialog.querySelector<HTMLButtonElement>("[slot=close]")!.click();
    await settled(dialog.parentElement!);
    expect(dialog.hasAttribute("open")).toBe(false);

    dialog.querySelector<HTMLButtonElement>("[slot=trigger]")!.click();
    await settled(dialog.parentElement!);

    popup.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
    );
    await settled(dialog.parentElement!);
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(events).toEqual([true, false, true, false]);
  });

  it("emits a selected command from a menu and closes its surface", async () => {
    const menu = await fixture<HTMLElement>(`
      <ui-menu label="Actions"><button slot="trigger">Actions</button><ui-menu-item value="archive">Archive</ui-menu-item></ui-menu>
    `);
    const selections: string[] = [];
    menu.addEventListener("ui-menu-select", (event) => {
      selections.push((event as CustomEvent<{ value: string }>).detail.value);
    });

    menu.querySelector<HTMLButtonElement>("button")!.click();
    await settled(menu.parentElement!);
    const item = menu.querySelector<HTMLElement>("ui-menu-item")!;
    inShadow<HTMLButtonElement>(item, "button").click();
    await settled(menu.parentElement!);

    expect(selections).toEqual(["archive"]);
    expect(menu.hasAttribute("open")).toBe(false);
  });

  it("selects listbox options and filters editable combobox suggestions", async () => {
    const select = await fixture<HTMLElement>(`
      <ui-select name="visibility" label="Visibility"><ui-option value="team">Team</ui-option><ui-option value="private">Private</ui-option></ui-select>
    `);
    const privateOption = select.querySelector<HTMLElement>('ui-option[value="private"]')!;
    inShadow<HTMLButtonElement>(privateOption, "button").click();
    await settled(select.parentElement!);
    expect((select as unknown as { value: string }).value).toBe("private");

    const combobox = await fixture<HTMLElement>(`
      <ui-combobox name="owner" label="Owner"><ui-option value="maya">Maya</ui-option><ui-option value="sam">Sam</ui-option></ui-combobox>
    `);
    const input = inShadow<HTMLInputElement>(combobox, "input");
    input.value = "ma";
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(combobox.parentElement!);
    expect(combobox.querySelector<HTMLElement>('ui-option[value="sam"]')!.hidden).toBe(true);
    inShadow<HTMLButtonElement>(
      combobox.querySelector<HTMLElement>('ui-option[value="maya"]')!,
      "button",
    ).click();
    await settled(combobox.parentElement!);
    expect((combobox as unknown as { value: string }).value).toBe("maya");
  });
});
