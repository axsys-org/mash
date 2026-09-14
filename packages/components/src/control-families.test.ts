import { userEvent } from "vitest/browser";
import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "./test-support/fixture.js";
import type { UIAccordionItem } from "./accordion-item/accordion-item.js";
import type { UICombobox } from "./combobox/combobox.js";
import type { OverlayOpenChangeDetail } from "./internal/overlay.js";
import type { UIMenuItem } from "./menu-item/menu-item.js";
import type { UIMenu } from "./menu/menu.js";
import type { UINumberField } from "./number-field/number-field.js";
import type { UIOption } from "./option/option.js";
import type { UIOtpField } from "./otp-field/otp-field.js";
import type { UIRadio } from "./radio/radio.js";
import type { UISelect } from "./select/select.js";
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
import "./tree/register.js";
import "./tooltip/register.js";

function forceFinePointer(): () => void {
  const original = window.matchMedia.bind(window);
  const spy = vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
    if (query !== "(hover: hover) and (pointer: fine)") return original(query);
    return {
      matches: true,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    } as MediaQueryList;
  });
  return () => spy.mockRestore();
}

function stubMenuPositionSnapshot(
  menu: UIMenu,
  popup: DOMRect,
  placement: "left" | "right" = "right",
): void {
  Object.defineProperty(menu, "positionSnapshot", {
    configurable: true,
    get: () => ({
      placement,
      align: "start",
      left: popup.left,
      top: popup.top,
      popup,
    }),
  });
}

describe("Control families", () => {
  it("realizes authored collection and control slots as semantic parts", async () => {
    const cases: Array<{ markup: string; part: string }> = [
      { markup: "<ui-accordion></ui-accordion>", part: "children" },
      { markup: "<ui-autocomplete></ui-autocomplete>", part: "children" },
      { markup: "<ui-combobox></ui-combobox>", part: "children" },
      { markup: "<ui-checkbox-group></ui-checkbox-group>", part: "children" },
      {
        markup: '<ui-field><input slot="control" /></ui-field>',
        part: "control",
      },
      { markup: "<ui-fieldset></ui-fieldset>", part: "children" },
      { markup: "<ui-form></ui-form>", part: "children" },
      { markup: "<ui-radio-group></ui-radio-group>", part: "children" },
      { markup: "<ui-select></ui-select>", part: "children" },
      { markup: "<ui-tabs></ui-tabs>", part: "tab" },
      { markup: "<ui-tabs></ui-tabs>", part: "panel" },
      { markup: "<ui-tab-panel></ui-tab-panel>", part: "content" },
      { markup: "<ui-tree></ui-tree>", part: "children" },
      { markup: "<ui-toolbar></ui-toolbar>", part: "actions" },
    ];

    for (const contract of cases) {
      const element = await fixture<HTMLElement>(contract.markup);
      expect(inShadow(element, `[part~="${contract.part}"]`)).toBeInstanceOf(HTMLElement);
    }
  });

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
    expect(inShadow(teamRadio!, "input").getAttribute("aria-posinset")).toBe("2");
    expect(inShadow(teamRadio!, "input").getAttribute("aria-setsize")).toBe("2");
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

  it("uses logical horizontal Arrow keys for RTL groups and tabs", async () => {
    const root = await fixture<HTMLElement>(`
      <div dir="rtl">
        <ui-radio-group orientation="horizontal" value="one">
          <ui-radio value="one">One</ui-radio><ui-radio value="two">Two</ui-radio>
        </ui-radio-group>
        <ui-toggle-group orientation="horizontal">
          <ui-toggle value="one">One</ui-toggle><ui-toggle value="two">Two</ui-toggle>
        </ui-toggle-group>
        <ui-tabs value="one">
          <ui-tab slot="tab" value="one">One</ui-tab><ui-tab slot="tab" value="two">Two</ui-tab>
          <ui-tab-panel slot="panel" value="one">One</ui-tab-panel><ui-tab-panel slot="panel" value="two">Two</ui-tab-panel>
        </ui-tabs>
      </div>
    `);
    await settled(root);

    const radioGroup = root.querySelector<HTMLElement>("ui-radio-group")!;
    const [radioOne, radioTwo] = [...radioGroup.querySelectorAll<UIRadio>("ui-radio")];
    radioOne!.focus();
    inShadow<HTMLButtonElement>(radioOne!, "input").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, composed: true }),
    );
    await settled(root);
    expect(radioTwo!.checked).toBe(true);

    const toggleGroup = root.querySelector<HTMLElement>("ui-toggle-group")!;
    const [toggleOne, toggleTwo] = [...toggleGroup.querySelectorAll<UIToggle>("ui-toggle")];
    toggleOne!.focus();
    inShadow<HTMLButtonElement>(toggleOne!, "button").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, composed: true }),
    );
    expect(toggleTwo!.shadowRoot?.activeElement).toBe(inShadow(toggleTwo!, "button"));

    const tabs = root.querySelector<HTMLElement>("ui-tabs")!;
    const [tabOne, tabTwo] = [...tabs.querySelectorAll<HTMLElement>("ui-tab")];
    tabOne!.focus();
    inShadow<HTMLButtonElement>(tabOne!, "button").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, composed: true }),
    );
    await settled(root);
    expect(tabs.getAttribute("value")).toBe("two");
    expect(tabTwo!.shadowRoot?.activeElement).toBe(inShadow(tabTwo!, "button"));
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

  it("keeps nested accordion changes inside their owning collection", async () => {
    const accordion = await fixture<HTMLElement>(`<ui-accordion>
      <ui-accordion-item title="Outer" value="outer" open>
        <ui-accordion><ui-accordion-item title="Inner" value="inner">Details</ui-accordion-item></ui-accordion>
      </ui-accordion-item>
      <ui-accordion-item title="Sibling" value="sibling">Sibling details</ui-accordion-item>
    </ui-accordion>`);
    const outer = accordion.querySelector<UIAccordionItem>('[value="outer"]')!;
    const inner = accordion.querySelector<UIAccordionItem>('[value="inner"]')!;
    inShadow<HTMLButtonElement>(inner, "button").click();
    await settled(accordion.parentElement!);
    expect(inner.open).toBe(true);
    expect(outer.open).toBe(true);
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
    expect(inShadow(members, "button").getAttribute("aria-posinset")).toBe("2");
    expect(inShadow(members, "button").getAttribute("aria-setsize")).toBe("2");
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
    expect(inShadow(slider, '[part="track"]')).toBeInstanceOf(HTMLElement);
    expect(inShadow<HTMLElement>(slider, '[part="indicator"]').style.inlineSize).toBe("45%");
    expect(inShadow<HTMLElement>(slider, '[part="thumb"]').style.insetInlineStart).toBe("45%");
  });

  it("reports a radio item's value as well as its checked state", async () => {
    const radio = await fixture<UIRadio>(`<ui-radio value="team">Team</ui-radio>`);
    const changes: Array<{ checked: boolean; value: string }> = [];
    radio.addEventListener("ui-radio-change", (event) => {
      changes.push((event as CustomEvent<{ checked: boolean; value: string }>).detail);
    });

    inShadow<HTMLInputElement>(radio, "input").click();
    await settled(radio.parentElement!);

    expect(changes).toEqual([{ checked: true, value: "team" }]);
    expect(inShadow(radio, '[part="indicator"]')).toBeInstanceOf(HTMLElement);
  });

  it("keeps meter, scroll area, and toolbar on native semantic elements", async () => {
    const meter = await fixture<HTMLElement>(
      `<ui-meter value="3" max="5" label="Storage"></ui-meter>`,
    );
    expect(inShadow<HTMLMeterElement>(meter, "meter").value).toBe(3);

    const scrollArea = await fixture<HTMLElement>(
      `<ui-scroll-area label="Log"><p slot="content">Entry</p></ui-scroll-area>`,
    );
    expect(inShadow<HTMLElement>(scrollArea, "[role=region]").getAttribute("tabindex")).toBe("0");
    expect(
      inShadow<HTMLSlotElement>(scrollArea, 'slot[name="content"]').assignedElements(),
    ).toHaveLength(1);

    const toolbar = await fixture<HTMLElement>(
      `<ui-toolbar label="Tools"><ui-toggle>A</ui-toggle><ui-toggle>B</ui-toggle></ui-toolbar>`,
    );
    expect(inShadow<HTMLElement>(toolbar, "[role=toolbar]").getAttribute("aria-label")).toBe(
      "Tools",
    );
  });

  it("keeps toolbar focus movement behavioural, with optional edge wrapping", async () => {
    const toolbar = await fixture<HTMLElement & { loopFocus: boolean }>(`
      <ui-toolbar label="Tools">
        <ui-toggle>A</ui-toggle><ui-toggle>B</ui-toggle>
      </ui-toolbar>
    `);
    toolbar.loopFocus = false;
    await settled(toolbar.parentElement!);
    const [first, last] = [...toolbar.querySelectorAll<HTMLElement>("ui-toggle")];
    const firstControl = inShadow<HTMLButtonElement>(first!, "button");
    const lastControl = inShadow<HTMLButtonElement>(last!, "button");

    expect(first!.tabIndex).toBe(0);
    expect(last!.tabIndex).toBe(-1);

    lastControl.focus();
    lastControl.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }),
    );
    expect(document.activeElement).toBe(last);

    firstControl.focus();
    firstControl.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }),
    );
    expect(document.activeElement).toBe(last);
    expect(first!.tabIndex).toBe(-1);
    expect(last!.tabIndex).toBe(0);
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

  it("opens pointer menus without preselecting a command and preserves keyboard entry", async () => {
    const menu = await fixture<UIMenu>(`
      <ui-menu label="Actions">
        <button slot="trigger">Actions</button>
        <ui-menu-item value="open">Open project</ui-menu-item>
        <ui-menu-item value="search">Search project</ui-menu-item>
      </ui-menu>
    `);
    const trigger = menu.querySelector<HTMLButtonElement>("[slot=trigger]")!;
    const [first] = [...menu.querySelectorAll<UIMenuItem>("ui-menu-item")];

    trigger.focus();
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 1 }));
    await settled(menu.parentElement!);

    const popup = inShadow<HTMLElement>(menu, "[part=popup]");
    expect(menu.shadowRoot?.activeElement).toBe(popup);
    expect(first?.shadowRoot?.activeElement).toBeNull();

    popup.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }),
    );
    expect(first?.shadowRoot?.activeElement).toBe(inShadow(first!, "button"));

    menu.dismiss();
    await settled(menu.parentElement!);
    trigger.focus();
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 0 }));
    await settled(menu.parentElement!);

    expect(first?.shadowRoot?.activeElement).toBe(inShadow(first!, "button"));
  });

  it("supports trigger arrows, typeahead, native viewport anatomy, and Tab dismissal", async () => {
    const menu = await fixture<UIMenu>(`
      <ui-menu label="Actions">
        <button slot="trigger">Actions</button>
        <ui-menu-item value="open">Open project</ui-menu-item>
        <ui-menu-item value="search">Search project</ui-menu-item>
        <ui-menu-item value="archive">Archive project</ui-menu-item>
      </ui-menu>
    `);
    const trigger = menu.querySelector<HTMLButtonElement>("[slot=trigger]")!;
    const items = [...menu.querySelectorAll<UIMenuItem>("ui-menu-item")];

    trigger.focus();
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, composed: true }),
    );
    await settled(menu.parentElement!);

    expect(menu.open).toBe(true);
    expect(items.at(-1)?.shadowRoot?.activeElement).toBe(inShadow(items.at(-1)!, "button"));
    expect(inShadow(menu, '[part="viewport"]')).toBeInstanceOf(HTMLElement);

    inShadow<HTMLButtonElement>(items.at(-1)!, "button").dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", bubbles: true, composed: true }),
    );
    expect(items[1]?.shadowRoot?.activeElement).toBe(inShadow(items[1]!, "button"));

    inShadow<HTMLButtonElement>(items[1]!, "button").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true }),
    );
    await settled(menu.parentElement!);
    expect(menu.open).toBe(false);
    expect(document.activeElement).not.toBe(trigger);
  });

  it("skips hidden menu items during keyboard navigation and typeahead", async () => {
    const menu = await fixture<UIMenu>(`
      <ui-menu label="Actions" open>
        <button slot="trigger">Actions</button>
        <ui-menu-item value="open">Open project</ui-menu-item>
        <ui-menu-item value="search" hidden>Search project</ui-menu-item>
        <ui-menu-item value="share">Share project</ui-menu-item>
      </ui-menu>
    `);
    const items = [...menu.querySelectorAll<UIMenuItem>("ui-menu-item")];
    const firstButton = inShadow<HTMLButtonElement>(items[0]!, "button");
    const lastButton = inShadow<HTMLButtonElement>(items[2]!, "button");

    firstButton.focus();
    firstButton.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }),
    );
    expect(items[2]?.shadowRoot?.activeElement).toBe(lastButton);

    lastButton.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", bubbles: true, composed: true }),
    );
    expect(items[2]?.shadowRoot?.activeElement).toBe(lastButton);
    expect(items[1]?.shadowRoot?.activeElement).toBeNull();
  });

  it("keeps menu header and footer chrome outside the scrollable command viewport", async () => {
    for (const tag of ["ui-menu", "ui-context-menu"]) {
      const menu = await fixture<HTMLElement>(`
        <${tag} label="Recent projects" open>
          <button slot="trigger">Recent</button>
          <span slot="header">Recent projects</span>
          <ui-menu-item value="billing">Billing migration</ui-menu-item>
          <ui-menu-item value="invoice">Invoice reconciliation</ui-menu-item>
          <span slot="footer">9 projects</span>
        </${tag}>
      `);
      const header = inShadow<HTMLElement>(menu, '[part="header"]');
      const viewport = inShadow<HTMLElement>(menu, '[part="viewport"]');
      const actions = inShadow<HTMLElement>(menu, '[part="actions"]');
      const footer = inShadow<HTMLElement>(menu, '[part="footer"]');
      const firstItem = menu.querySelector<UIMenuItem>("ui-menu-item")!;

      expect(header.querySelector("slot")?.assignedElements()[0]?.textContent).toBe(
        "Recent projects",
      );
      expect(footer.querySelector("slot")?.assignedElements()[0]?.textContent).toBe("9 projects");
      expect(menu.matches(":state(has-header)")).toBe(true);
      expect(menu.matches(":state(has-footer)")).toBe(true);
      expect(viewport.contains(actions)).toBe(true);
      expect(viewport.contains(header)).toBe(false);
      expect(viewport.contains(footer)).toBe(false);

      inShadow<HTMLElement>(menu, "[part=popup]").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }),
      );
      expect(firstItem.shadowRoot?.activeElement).toBe(inShadow(firstItem, "button"));
    }
  });

  it("exposes semantic menu lanes and checked item roles", async () => {
    const item = await fixture<UIMenuItem>(`
      <ui-menu-item kind="checkbox" value="sidebar" checked>
        Show sidebar
        <span slot="prefix">□</span>
        <span slot="shortcut">⌘S</span>
      </ui-menu-item>
    `);
    const control = inShadow<HTMLButtonElement>(item, "[part~=control]");

    expect(control.getAttribute("role")).toBe("menuitemcheckbox");
    expect(control.getAttribute("aria-checked")).toBe("true");
    for (const part of [
      "selection",
      "prefix",
      "label",
      "label-viewport",
      "label-content",
      "shortcut",
      "chevron",
      "safe-triangle",
    ]) {
      expect(inShadow(item, `[part~="${part}"]`)).toBeInstanceOf(HTMLElement);
    }
  });

  it("toggles checkbox items and keeps radio selection exclusive", async () => {
    const menu = await fixture<HTMLElement>(`
      <ui-menu label="View options" open>
        <ui-menu-item kind="checkbox" value="sidebar">Show sidebar</ui-menu-item>
        <ui-menu-item kind="radio" value="comfortable" checked>Comfortable</ui-menu-item>
        <ui-menu-item kind="radio" value="compact">Compact</ui-menu-item>
      </ui-menu>
    `);
    const [checkbox, comfortable, compact] = [...menu.querySelectorAll<UIMenuItem>("ui-menu-item")];
    const selections: Array<{ value: string; checked: boolean }> = [];
    menu.addEventListener("ui-menu-select", (event) => {
      selections.push((event as CustomEvent<{ value: string; checked: boolean }>).detail);
    });

    inShadow<HTMLButtonElement>(checkbox!, "button").click();
    await settled(menu.parentElement!);
    expect(checkbox?.checked).toBe(true);
    expect(selections.at(-1)).toMatchObject({ value: "sidebar", checked: true });

    menu.setAttribute("open", "");
    await settled(menu.parentElement!);
    inShadow<HTMLButtonElement>(compact!, "button").click();
    await settled(menu.parentElement!);
    expect(comfortable?.checked).toBe(false);
    expect(compact?.checked).toBe(true);
    expect(selections.at(-1)).toMatchObject({ value: "compact", checked: true });
  });

  it("opens a nested menu from its branch and closes the full leaf after selection", async () => {
    const menu = await fixture<UIMenu>(`
      <ui-menu label="Actions" open>
        <button slot="trigger">Actions</button>
        <ui-menu-item value="share">
          Share
          <ui-menu slot="submenu" label="Share with">
            <ui-menu-item value="email">Email</ui-menu-item>
          </ui-menu>
        </ui-menu-item>
      </ui-menu>
    `);
    const branch = menu.querySelector<UIMenuItem>(":scope > ui-menu-item")!;
    const submenu = branch.querySelector<UIMenu>(":scope > ui-menu")!;
    const selections: string[] = [];
    menu.addEventListener("ui-menu-select", (event) => {
      selections.push((event as CustomEvent<{ value: string }>).detail.value);
    });

    expect(inShadow(menu, '[part~="material"]')).toBeInstanceOf(HTMLElement);
    expect(branch.shadowRoot?.activeElement).toBeNull();

    inShadow<HTMLButtonElement>(branch, "button").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }),
    );
    await settled(menu.parentElement!);

    expect(submenu.open).toBe(true);
    expect(submenu.nested).toBe(true);
    expect(submenu.anchorElement).toBe(inShadow(branch, "button"));
    expect(submenu.offset).toBe(0);
    expect(inShadow(branch, "button").getAttribute("aria-expanded")).toBe("true");

    const leaf = submenu.querySelector<UIMenuItem>("ui-menu-item")!;
    expect(leaf.shadowRoot?.activeElement).toBe(inShadow(leaf, "button"));
    inShadow<HTMLButtonElement>(leaf, "button").click();
    await settled(menu.parentElement!);

    expect(selections).toEqual(["email"]);
    expect(submenu.open).toBe(false);
    expect(menu.open).toBe(false);
  });

  it("opens pointer-owned submenus without adding a second focused row", async () => {
    const menu = await fixture<UIMenu>(`
      <ui-menu label="Actions" open>
        <button slot="trigger">Actions</button>
        <ui-menu-item value="share">
          Share
          <ui-menu slot="submenu" label="Share with">
            <ui-menu-item value="email">Email</ui-menu-item>
          </ui-menu>
        </ui-menu-item>
      </ui-menu>
    `);
    const branch = menu.querySelector<UIMenuItem>(":scope > ui-menu-item")!;
    const submenu = branch.querySelector<UIMenu>(":scope > ui-menu")!;
    const leaf = submenu.querySelector<UIMenuItem>("ui-menu-item")!;

    branch.showSubmenu(false);
    await settled(menu.parentElement!);

    expect(submenu.open).toBe(true);
    expect(leaf.shadowRoot?.activeElement).toBeNull();
  });

  it("opens hovered submenus after the pointer rests on a branch", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const restoreFinePointer = forceFinePointer();
    try {
      const menu = await fixture<UIMenu>(`
        <ui-menu label="Actions" open>
          <button slot="trigger">Actions</button>
          <ui-menu-item value="share">
            Share
            <ui-menu slot="submenu" label="Share with">
              <ui-menu-item value="email">Email</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
        </ui-menu>
      `);
      const branch = menu.querySelector<UIMenuItem>(":scope > ui-menu-item")!;
      const submenu = branch.querySelector<UIMenu>(":scope > ui-menu")!;
      const control = inShadow<HTMLButtonElement>(branch, "button");

      expect(submenu.submenuOpenDelay).toBe(175);

      control.dispatchEvent(
        new PointerEvent("pointerenter", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 12,
          clientY: 12,
        }),
      );

      await vi.advanceTimersByTimeAsync(174);
      expect(submenu.open).toBe(false);

      control.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 20,
          clientY: 12,
        }),
      );

      await vi.advanceTimersByTimeAsync(174);
      expect(submenu.open).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(submenu.open).toBe(true);
    } finally {
      restoreFinePointer();
      vi.useRealTimers();
    }
  });

  it("keeps rapid pointer sweeps across submenu branches quiet", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const restoreFinePointer = forceFinePointer();
    try {
      const menu = await fixture<UIMenu>(`
        <ui-menu label="Actions" open>
          <button slot="trigger">Actions</button>
          <ui-menu-item value="share">
            Share
            <ui-menu slot="submenu" label="Share with">
              <ui-menu-item value="email">Email</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
          <ui-menu-item value="export">
            Export
            <ui-menu slot="submenu" label="Export as">
              <ui-menu-item value="pdf">PDF</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
          <ui-menu-item value="move">
            Move
            <ui-menu slot="submenu" label="Move to">
              <ui-menu-item value="inbox">Inbox</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
        </ui-menu>
      `);
      const branches = [...menu.querySelectorAll<UIMenuItem>(":scope > ui-menu-item")];
      const submenus = branches.map((branch) => branch.querySelector<UIMenu>(":scope > ui-menu")!);
      const controls = branches.map((branch) => inShadow<HTMLButtonElement>(branch, "button"));

      controls[0]!.dispatchEvent(
        new PointerEvent("pointerenter", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 16,
          clientY: 16,
        }),
      );
      await vi.advanceTimersByTimeAsync(70);
      controls[0]!.dispatchEvent(
        new PointerEvent("pointerleave", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
        }),
      );
      controls[1]!.dispatchEvent(
        new PointerEvent("pointerenter", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 16,
          clientY: 40,
        }),
      );
      await vi.advanceTimersByTimeAsync(70);
      controls[1]!.dispatchEvent(
        new PointerEvent("pointerleave", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
        }),
      );
      controls[2]!.dispatchEvent(
        new PointerEvent("pointerenter", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 16,
          clientY: 64,
        }),
      );

      await vi.advanceTimersByTimeAsync(174);
      expect(submenus.map((submenu) => submenu.open)).toEqual([false, false, false]);

      await vi.advanceTimersByTimeAsync(1);
      expect(submenus.map((submenu) => submenu.open)).toEqual([false, false, true]);
    } finally {
      restoreFinePointer();
      vi.useRealTimers();
    }
  });

  it("applies submenu hover intent inside context menus", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const restoreFinePointer = forceFinePointer();
    try {
      const contextMenu = await fixture<HTMLElement>(`
        <ui-context-menu label="Actions" open>
          <span slot="trigger">Project row</span>
          <ui-menu-item value="share">
            Share
            <ui-menu slot="submenu" label="Share with">
              <ui-menu-item value="email">Email</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
        </ui-context-menu>
      `);
      const branch = contextMenu.querySelector<UIMenuItem>(":scope > ui-menu-item")!;
      const submenu = branch.querySelector<UIMenu>(":scope > ui-menu")!;
      const control = inShadow<HTMLButtonElement>(branch, "button");

      control.dispatchEvent(
        new PointerEvent("pointerenter", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 16,
          clientY: 16,
        }),
      );

      await vi.advanceTimersByTimeAsync(174);
      expect(submenu.open).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(submenu.open).toBe(true);
    } finally {
      restoreFinePointer();
      vi.useRealTimers();
    }
  });

  it("switches submenu branches after dwell when the pointer is not aimed into the active submenu", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const restoreFinePointer = forceFinePointer();
    try {
      const menu = await fixture<UIMenu>(`
        <ui-menu label="Actions" open>
          <button slot="trigger">Actions</button>
          <ui-menu-item value="share">
            Share
            <ui-menu slot="submenu" label="Share with">
              <ui-menu-item value="email">Email</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
          <ui-menu-item value="export">
            Export
            <ui-menu slot="submenu" label="Export as">
              <ui-menu-item value="pdf">PDF</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
        </ui-menu>
      `);
      const [share, exportItem] = [...menu.querySelectorAll<UIMenuItem>(":scope > ui-menu-item")];
      const shareSubmenu = share!.querySelector<UIMenu>(":scope > ui-menu")!;
      const exportSubmenu = exportItem!.querySelector<UIMenu>(":scope > ui-menu")!;
      const shareControl = inShadow<HTMLButtonElement>(share!, "button");
      const exportControl = inShadow<HTMLButtonElement>(exportItem!, "button");

      share!.showSubmenu(false);
      await settled(menu.parentElement!);
      stubMenuPositionSnapshot(shareSubmenu, new DOMRect(150, 20, 120, 120));

      shareControl.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 80,
          clientY: 20,
        }),
      );
      exportControl.dispatchEvent(
        new PointerEvent("pointerover", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 88,
          clientY: 120,
        }),
      );
      exportControl.dispatchEvent(
        new PointerEvent("pointerenter", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 88,
          clientY: 120,
        }),
      );
      expect(exportItem!.matches(":state(hover-suppressed)")).toBe(false);

      await vi.advanceTimersByTimeAsync(174);
      expect(shareSubmenu.open).toBe(true);
      expect(exportSubmenu.open).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(shareSubmenu.open).toBe(false);
      expect(exportSubmenu.open).toBe(true);
    } finally {
      restoreFinePointer();
      vi.useRealTimers();
    }
  });

  it("cancels pending submenu intent when the pointer leaves the branch", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const restoreFinePointer = forceFinePointer();
    try {
      const menu = await fixture<UIMenu>(`
        <ui-menu label="Actions" open>
          <button slot="trigger">Actions</button>
          <ui-menu-item value="share">
            Share
            <ui-menu slot="submenu" label="Share with">
              <ui-menu-item value="email">Email</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
        </ui-menu>
      `);
      const branch = menu.querySelector<UIMenuItem>(":scope > ui-menu-item")!;
      const submenu = branch.querySelector<UIMenu>(":scope > ui-menu")!;
      const control = inShadow<HTMLButtonElement>(branch, "button");

      control.dispatchEvent(
        new PointerEvent("pointerenter", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 12,
          clientY: 12,
        }),
      );
      control.dispatchEvent(
        new PointerEvent("pointerleave", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
        }),
      );

      await vi.advanceTimersByTimeAsync(200);
      expect(submenu.open).toBe(false);
    } finally {
      restoreFinePointer();
      vi.useRealTimers();
    }
  });

  it("preserves an active submenu while the pointer is aimed through a sibling branch", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const restoreFinePointer = forceFinePointer();
    try {
      const menu = await fixture<UIMenu>(`
        <ui-menu label="Actions" open>
          <button slot="trigger">Actions</button>
          <ui-menu-item value="share">
            Share
            <ui-menu slot="submenu" label="Share with">
              <ui-menu-item value="email">Email</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
          <ui-menu-item value="export">
            Export
            <ui-menu slot="submenu" label="Export as">
              <ui-menu-item value="pdf">PDF</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
        </ui-menu>
      `);
      const [share, exportItem] = [...menu.querySelectorAll<UIMenuItem>(":scope > ui-menu-item")];
      const shareSubmenu = share!.querySelector<UIMenu>(":scope > ui-menu")!;
      const exportSubmenu = exportItem!.querySelector<UIMenu>(":scope > ui-menu")!;
      const shareControl = inShadow<HTMLButtonElement>(share!, "button");
      const exportControl = inShadow<HTMLButtonElement>(exportItem!, "button");

      share!.showSubmenu(false);
      await settled(menu.parentElement!);
      stubMenuPositionSnapshot(shareSubmenu, new DOMRect(150, 32, 120, 140));

      shareControl.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 100,
          clientY: 80,
        }),
      );
      exportControl.dispatchEvent(
        new PointerEvent("pointerover", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 126,
          clientY: 96,
        }),
      );
      expect(exportItem!.matches(":state(hover-suppressed)")).toBe(true);

      exportControl.dispatchEvent(
        new PointerEvent("pointerenter", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 126,
          clientY: 96,
        }),
      );
      exportControl.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          clientX: 136,
          clientY: 108,
        }),
      );
      expect(exportItem!.matches(":state(hover-suppressed)")).toBe(true);

      await vi.advanceTimersByTimeAsync(175);

      expect(shareSubmenu.open).toBe(true);
      expect(exportSubmenu.open).toBe(false);

      exportControl.dispatchEvent(
        new PointerEvent("pointerleave", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
        }),
      );
      expect(exportItem!.matches(":state(hover-suppressed)")).toBe(false);
      await vi.advanceTimersByTimeAsync(80);

      expect(shareSubmenu.open).toBe(true);
      expect(exportSubmenu.open).toBe(false);
    } finally {
      restoreFinePointer();
      vi.useRealTimers();
    }
  });

  it("selects listbox options and filters editable combobox suggestions", async () => {
    const select = await fixture<HTMLElement>(`
      <ui-select name="visibility" label="Visibility"><ui-option value="team">Team</ui-option><ui-option value="private">Private</ui-option></ui-select>
    `);
    const privateOption = select.querySelector<HTMLElement>('ui-option[value="private"]')!;
    privateOption.click();
    await settled(select.parentElement!);
    expect((select as unknown as { value: string }).value).toBe("private");

    const searchableSelect = await fixture<UISelect>(`
      <ui-select name="country" label="Country" searchable open>
        <span slot="empty">No countries</span>
        <ui-option-group label="Countries">
          <ui-option value="japan">Japan</ui-option>
          <ui-option value="singapore">Singapore</ui-option>
        </ui-option-group>
      </ui-select>
    `);
    const search = inShadow<HTMLInputElement>(searchableSelect, "[part~=search-control]");
    search.value = "jap";
    search.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(searchableSelect.parentElement!);
    expect(
      searchableSelect.querySelector<HTMLElement>('ui-option[value="singapore"]')!.hidden,
    ).toBe(true);
    expect(inShadow<HTMLElement>(searchableSelect, "[part~=empty]").hidden).toBe(true);
    search.value = "missing";
    search.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(searchableSelect.parentElement!);
    expect(searchableSelect.querySelector<HTMLElement>("ui-option-group")!.hidden).toBe(true);
    expect(inShadow<HTMLElement>(searchableSelect, "[part~=empty]").hidden).toBe(false);
    expect(inShadow<HTMLElement>(searchableSelect, "[part~=status]").textContent).toContain(
      "0 options",
    );

    const combobox = await fixture<HTMLElement>(`
      <ui-combobox name="owner" label="Owner"><ui-option value="maya">Maya</ui-option><ui-option value="sam">Sam</ui-option></ui-combobox>
    `);
    const input = inShadow<HTMLInputElement>(combobox, "input");
    input.value = "ma";
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(combobox.parentElement!);
    expect(combobox.querySelector<HTMLElement>('ui-option[value="sam"]')!.hidden).toBe(true);
    combobox.querySelector<HTMLElement>('ui-option[value="maya"]')!.click();
    await settled(combobox.parentElement!);
    expect((combobox as unknown as { value: string }).value).toBe("maya");
  });

  it("reports portable open reasons and resynchronizes async option collections", async () => {
    const select = await fixture<UISelect>(`
      <ui-select label="Visibility"><ui-option value="team">Team</ui-option></ui-select>
    `);
    const selectReasons: string[] = [];
    const selectConfirms: string[] = [];
    select.addEventListener("ui-select-open-change", (event) => {
      selectReasons.push((event as CustomEvent<OverlayOpenChangeDetail>).detail.reason);
    });
    select.addEventListener("ui-select-confirm", (event) => {
      selectConfirms.push((event as CustomEvent<{ value: string }>).detail.value);
    });

    select.show();
    await settled(select.parentElement!);
    select.dismiss();
    await settled(select.parentElement!);
    inShadow<HTMLButtonElement>(select, "button[part=trigger]").click();
    await settled(select.parentElement!);
    expect(selectReasons).toEqual(["imperative", "imperative", "trigger"]);

    const group = document.createElement("div");
    const lateOption = document.createElement("ui-option") as UIOption;
    lateOption.value = "private";
    lateOption.textContent = "Private";
    group.append(lateOption);
    select.append(group);
    await settled(select.parentElement!);
    lateOption.click();
    await settled(select.parentElement!);
    expect(select.value).toBe("private");
    expect(selectReasons.at(-1)).toBe("select");
    expect(selectConfirms).toEqual(["", "private"]);

    const combobox = await fixture<UICombobox>(`
      <ui-combobox label="Owner"><ui-option value="maya">Maya</ui-option></ui-combobox>
    `);
    const comboboxReasons: string[] = [];
    const confirmedValues: string[][] = [];
    combobox.addEventListener("ui-combobox-open-change", (event) => {
      comboboxReasons.push((event as CustomEvent<OverlayOpenChangeDetail>).detail.reason);
    });
    combobox.addEventListener("ui-combobox-confirm", (event) => {
      confirmedValues.push((event as CustomEvent<{ values: string[] }>).detail.values);
    });
    const input = inShadow<HTMLInputElement>(combobox, "input");
    input.value = "sa";
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(combobox.parentElement!);

    combobox.insertAdjacentHTML(
      "beforeend",
      '<ui-option-row><ui-option value="sam">Sam</ui-option></ui-option-row>',
    );
    const lateSuggestion = combobox.querySelector<UIOption>('ui-option[value="sam"]')!;
    await settled(combobox.parentElement!);
    expect(lateSuggestion.hidden).toBe(false);
    lateSuggestion.click();
    await settled(combobox.parentElement!);
    expect(combobox.value).toBe("sam");
    expect(comboboxReasons).toEqual(["input", "select"]);
    expect(confirmedValues).toEqual([["sam"]]);
  });

  it("realizes compound selection anatomy without making DOM-only portal mechanics portable", async () => {
    const combobox = await fixture<HTMLElement & { size: string; value: string }>(`
      <ui-combobox name="owner" label="Owner" size="large">
        <span slot="icon">Search</span>
        <button slot="trigger" type="button">Show</button>
        <button slot="clear" type="button">Clear</button>
        <span slot="empty">No matches</span>
        <button slot="footer" type="button">Add owner</button>
        <ui-option value="maya">Maya</ui-option>
      </ui-combobox>
    `);

    for (const part of [
      "root",
      "input-group",
      "control",
      "icon",
      "trigger",
      "clear",
      "positioner",
      "popup",
      "status",
      "empty",
      "viewport",
      "listbox",
      "children",
      "footer",
    ]) {
      expect(inShadow(combobox, `[part~="${part}"]`)).toBeInstanceOf(HTMLElement);
    }
    expect(combobox.shadowRoot!.querySelector("[part~=portal]")).toBeNull();
    expect(combobox.size).toBe("large");

    const input = inShadow<HTMLInputElement>(combobox, "input");
    const trigger = combobox.querySelector<HTMLButtonElement>("[slot=trigger]")!;
    trigger.click();
    await settled(combobox.parentElement!);
    expect(combobox.hasAttribute("open")).toBe(true);
    expect(input.getAttribute("aria-controls")).toBeTruthy();

    input.value = "missing";
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(combobox.parentElement!);
    expect(inShadow<HTMLElement>(combobox, "[part~=empty]").hidden).toBe(false);
    expect(inShadow<HTMLElement>(combobox, "[part~=status]").textContent).toContain("0 results");

    combobox.querySelector<HTMLButtonElement>("[slot=clear]")!.click();
    await settled(combobox.parentElement!);
    expect(combobox.value).toBe("");
    expect(combobox.querySelector<HTMLElement>("ui-option")!.hidden).toBe(false);
  });

  it("keeps select value, search, empty, popup, list, and option indicator independently addressable", async () => {
    const select = await fixture<UISelect>(`
      <ui-select name="visibility" value="team" label="Visibility" size="large" searchable>
        <span slot="icon">Open</span>
        <button slot="clear" type="button">Clear</button>
        <span slot="empty">No options</span>
        <ui-option value="team">Team<span slot="indicator">Selected</span></ui-option>
      </ui-select>
    `);

    for (const part of [
      "root",
      "control",
      "trigger",
      "value",
      "icon",
      "clear",
      "positioner",
      "popup",
      "search",
      "search-control",
      "status",
      "empty",
      "viewport",
      "listbox",
      "children",
    ]) {
      expect(inShadow(select, `[part~="${part}"]`)).toBeInstanceOf(HTMLElement);
    }

    const option = select.querySelector<HTMLElement>("ui-option")!;
    expect(inShadow(option, "[part~=text]")).toBeInstanceOf(HTMLSlotElement);
    expect(inShadow(option, "[part~=indicator]")).toBeInstanceOf(HTMLSlotElement);
    expect(inShadow<HTMLElement>(select, "[part~=value]").textContent).toContain("Team");
    expect(select.size).toBe("large");
    select.querySelector<HTMLButtonElement>("[slot=clear]")!.click();
    await settled(select.parentElement!);
    expect(select.value).toBe("");
  });

  it("shares anchored placement and outside dismissal across select and combobox", async () => {
    const select = await fixture<HTMLElement>(`
      <ui-select label="Visibility">
        <ui-option value="team">Team</ui-option>
      </ui-select>
    `);
    const selectPresenceEvents: string[] = [];
    select.addEventListener("mash-presence-start", (event) => {
      const detail = event.detail as { open: boolean; phase: string };
      selectPresenceEvents.push(`${event.type}:${detail.phase}:${detail.open}`);
    });
    select.addEventListener("mash-presence-end", (event) => {
      const detail = event.detail as { open: boolean; phase: string };
      selectPresenceEvents.push(`${event.type}:${detail.phase}:${detail.open}`);
    });
    inShadow<HTMLButtonElement>(select, "[part~=trigger]").click();
    await settled(select.parentElement!);
    const selectPositioner = inShadow<HTMLElement>(select, "[part~=positioner]");
    expect(selectPositioner.style.position).toBe("fixed");
    expect(selectPositioner.dataset.side).toBeTruthy();
    expect(select.matches(":state(open)")).toBe(true);
    expect(select.matches(":state(present)")).toBe(true);
    expect(select.matches(":state(active)")).toBe(true);

    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    await settled(select.parentElement!);
    expect(select.hasAttribute("open")).toBe(false);
    expect(select.matches(":state(present)")).toBe(false);
    expect(selectPositioner.getAttribute("style")).toBeNull();
    expect(selectPresenceEvents).toEqual([
      "mash-presence-start:entering:true",
      "mash-presence-end:entering:true",
      "mash-presence-start:exiting:false",
      "mash-presence-end:exiting:false",
    ]);

    const combobox = await fixture<HTMLElement>(`
      <ui-combobox label="Owner">
        <ui-option value="maya">Maya</ui-option>
      </ui-combobox>
    `);
    const comboboxPresenceEvents: string[] = [];
    combobox.addEventListener("mash-presence-start", (event) => {
      const detail = event.detail as { open: boolean; phase: string };
      comboboxPresenceEvents.push(`${event.type}:${detail.phase}:${detail.open}`);
    });
    combobox.addEventListener("mash-presence-end", (event) => {
      const detail = event.detail as { open: boolean; phase: string };
      comboboxPresenceEvents.push(`${event.type}:${detail.phase}:${detail.open}`);
    });
    const input = inShadow<HTMLInputElement>(combobox, "input");
    input.value = "m";
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(combobox.parentElement!);
    const comboboxPositioner = inShadow<HTMLElement>(combobox, "[part~=positioner]");
    expect(comboboxPositioner.style.position).toBe("fixed");
    expect(comboboxPositioner.dataset.side).toBeTruthy();
    expect(combobox.matches(":state(open)")).toBe(true);
    expect(combobox.matches(":state(present)")).toBe(true);
    expect(combobox.matches(":state(active)")).toBe(true);

    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    await settled(combobox.parentElement!);
    expect(combobox.hasAttribute("open")).toBe(false);
    expect(combobox.matches(":state(present)")).toBe(false);
    expect(comboboxPositioner.getAttribute("style")).toBeNull();
    expect(comboboxPresenceEvents).toEqual([
      "mash-presence-start:entering:true",
      "mash-presence-end:entering:true",
      "mash-presence-start:exiting:false",
      "mash-presence-end:exiting:false",
    ]);
  });

  it("coordinates grouped single select values and one form entry", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form>
        <ui-select name="visibility" label="Visibility" value="team" open>
          <ui-option-group label="Workspace">
            <ui-option value="team">Team</ui-option>
            <ui-option value="private">Private</ui-option>
          </ui-option-group>
        </ui-select>
      </form>
    `);
    const select = form.querySelector<UISelect>("ui-select")!;
    const group = select.querySelector<HTMLElement>("ui-option-group")!;
    const privateOption = select.querySelector<HTMLElement>('ui-option[value="private"]')!;

    expect(inShadow(group, "[role=group]").getAttribute("aria-labelledby")).toBeTruthy();
    expect(inShadow(select, "[role=listbox]").hasAttribute("aria-multiselectable")).toBe(false);

    privateOption.click();
    await settled(form);

    expect(select.value).toBe("private");
    expect(select.hasAttribute("open")).toBe(false);
    expect(new FormData(form).getAll("visibility")).toEqual(["private"]);
  });

  it("lets a multiple combobox own values while chips only request removal", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form>
        <ui-combobox name="owner" label="Owner" multiple values='["maya"]'>
          <span slot="chips">
            <ui-chip value="maya">Maya<button slot="remove" type="button">Remove</button></ui-chip>
          </span>
          <ui-option-group label="People">
            <ui-option value="maya">Maya</ui-option>
            <ui-option value="sam">Sam</ui-option>
          </ui-option-group>
        </ui-combobox>
      </form>
    `);
    const combobox = form.querySelector<HTMLElement & { values: string[]; readonly: boolean }>(
      "ui-combobox",
    )!;
    const sam = combobox.querySelector<HTMLElement>('ui-option[value="sam"]')!;

    sam.click();
    await settled(form);
    expect(combobox.values).toEqual(["maya", "sam"]);

    combobox.querySelector<HTMLButtonElement>("ui-chip [slot=remove]")!.click();
    await settled(form);
    expect(combobox.values).toEqual(["sam"]);
    expect(new FormData(form).getAll("owner")).toEqual(["sam"]);

    combobox.readonly = true;
    await settled(form);
    sam.click();
    expect(combobox.values).toEqual(["sam"]);
  });

  it("moves from an empty multiple-combobox input to compact chips for keyboard removal", async () => {
    const combobox = await fixture<UICombobox>(`
      <ui-combobox label="Frameworks" multiple values='["React", "Angular"]'>
        <ui-chip slot="chips" value="React">React<button slot="remove" type="button" tabindex="-1">Remove React</button></ui-chip>
        <ui-chip slot="chips" value="Angular">Angular<button slot="remove" type="button" tabindex="-1">Remove Angular</button></ui-chip>
        <ui-option value="React">React</ui-option>
        <ui-option value="Angular">Angular</ui-option>
      </ui-combobox>
    `);
    const input = inShadow<HTMLInputElement>(combobox, "input");
    const chips = [...combobox.querySelectorAll<HTMLElement>("ui-chip")];

    expect(inShadow(combobox, '[part="chips"]').getAttribute("role")).toBe("toolbar");
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, composed: true }),
    );
    expect(document.activeElement).toBe(chips[1]);

    inShadow(chips[1]!, '[part="root"]').dispatchEvent(
      new KeyboardEvent("keydown", { key: "Delete", bubbles: true, composed: true }),
    );
    await settled(combobox.parentElement!);
    expect(combobox.values).toEqual(["React"]);
  });

  it("keeps editable-combobox focus on the input while exposing one active option", async () => {
    const combobox = await fixture<
      HTMLElement & { value: string; open: boolean; readonly: boolean }
    >(`
      <ui-combobox name="owner" label="Owner">
        <ui-option value="alex" disabled>Alex</ui-option>
        <ui-option value="maya">Maya</ui-option>
        <ui-option value="sam">Sam</ui-option>
      </ui-combobox>
    `);
    const input = inShadow<HTMLInputElement>(combobox, "input");
    const maya = combobox.querySelector<UIOption>('ui-option[value="maya"]')!;
    const sam = combobox.querySelector<UIOption>('ui-option[value="sam"]')!;

    input.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }),
    );
    await settled(combobox.parentElement!);

    expect(combobox.shadowRoot!.activeElement).toBe(input);
    expect(input.ariaActiveDescendantElement).toBe(maya);
    expect(maya.active).toBe(true);
    expect(sam.active).toBe(false);

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }),
    );
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }),
    );
    await settled(combobox.parentElement!);

    expect(combobox.value).toBe("sam");
    expect(combobox.open).toBe(false);
    expect(input.ariaActiveDescendantElement).toBeNull();

    combobox.readonly = true;
    combobox.open = true;
    await settled(combobox.parentElement!);
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
    );
    await settled(combobox.parentElement!);
    expect(combobox.open).toBe(false);
  });

  it("provides roving listbox focus, edge keys, and closed-select typeahead", async () => {
    const select = await fixture<
      HTMLElement & { value: string; open: boolean; readonly: boolean }
    >(`
      <ui-select name="visibility" value="team" label="Visibility">
        <ui-option value="private">Private</ui-option>
        <ui-option value="team">Team</ui-option>
        <ui-option value="public">Public</ui-option>
      </ui-select>
    `);
    const trigger = inShadow<HTMLButtonElement>(select, "button[part~=trigger]");
    const [privateOption, teamOption, publicOption] = [
      ...select.querySelectorAll<UIOption>("ui-option"),
    ];

    trigger.focus();
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }),
    );
    await settled(select.parentElement!);
    expect(select.open).toBe(true);
    expect(document.activeElement).toBe(teamOption);
    expect(teamOption!.active).toBe(true);

    teamOption!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "End", bubbles: true, composed: true }),
    );
    await settled(select.parentElement!);
    expect(document.activeElement).toBe(publicOption);

    publicOption!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Home", bubbles: true, composed: true }),
    );
    privateOption!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }),
    );
    await settled(select.parentElement!);
    expect(select.value).toBe("private");
    expect(select.open).toBe(false);
    expect(select.shadowRoot!.activeElement).toBe(trigger);

    trigger.focus();
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "t", bubbles: true, composed: true }),
    );
    await settled(select.parentElement!);
    expect(select.value).toBe("team");

    select.readonly = true;
    select.open = true;
    await settled(select.parentElement!);
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
    );
    await settled(select.parentElement!);
    expect(select.open).toBe(false);
  });

  it("maps combobox rows to a navigable ARIA grid without owning their layout", async () => {
    const combobox = await fixture<HTMLElement & { grid: boolean; open: boolean }>(`
      <ui-combobox label="Assignee matrix" grid>
        <ui-option-row>
          <ui-option value="maya">Maya</ui-option>
          <ui-option value="sam">Sam</ui-option>
        </ui-option-row>
        <ui-option-row>
          <ui-option value="alex">Alex</ui-option>
          <ui-option value="jo">Jo</ui-option>
        </ui-option-row>
      </ui-combobox>
    `);
    const input = inShadow<HTMLInputElement>(combobox, "input");
    const [maya, sam, alex, jo] = [...combobox.querySelectorAll<UIOption>("ui-option")];

    expect(input.getAttribute("aria-haspopup")).toBe("grid");
    expect(inShadow(combobox, "[part~=listbox]").getAttribute("role")).toBe("grid");
    expect(maya!.getAttribute("role")).toBe("gridcell");

    input.focus();
    for (const key of ["ArrowDown", "ArrowRight", "ArrowDown"] as const) {
      input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }));
      await settled(combobox.parentElement!);
    }

    expect(maya!.active).toBe(false);
    expect(sam!.active).toBe(false);
    expect(alex!.active).toBe(false);
    expect(jo!.active).toBe(true);
    expect(input.ariaActiveDescendantElement).toBe(jo);
  });
});
