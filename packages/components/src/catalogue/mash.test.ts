import { afterEach, describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import "../bubble/register.js";
import "../checkbox/register.js";
import "../context-menu/register.js";
import "../input-group/register.js";
import "../input/register.js";
import "../kbd/register.js";
import "../label/register.js";
import "../menu-item/register.js";
import "../menu-label/register.js";
import "../menu/register.js";
import "../separator/register.js";
import "../switch/register.js";
import "../toggle/register.js";
import "../typeset/register.js";
import "./mash.css";

describe("Mash catalogue", () => {
  afterEach(() => {
    delete document.documentElement.dataset.mashCatalogue;
  });

  it("applies a recipe outside component definitions", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const toggle = await fixture(`<ui-toggle pressed>Bold</ui-toggle>`);
    const control = inShadow<HTMLButtonElement>(toggle, "button");

    expect(getComputedStyle(control).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(control).borderTopWidth).toBe("1px");
  });

  it("uses the same root opt-in for checkable controls", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const checkbox = await fixture(`<ui-checkbox>Release notes</ui-checkbox>`);
    const indicator = inShadow<HTMLElement>(checkbox, '[part="indicator"]');

    expect(getComputedStyle(indicator).display).toBe("grid");
    expect(getComputedStyle(indicator).borderTopWidth).toBe("1px");
  });

  it("maps label and bubble recipes through semantic tokens", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const host = await fixture(`
      <div>
        <ui-label text="Billing migration" size="large" highlight="migration"></ui-label>
        <ui-bubble variant="outline" alignment="start">Ready for review.</ui-bubble>
      </div>
    `);
    const label = host.querySelector("ui-label")!;
    const bubble = host.querySelector("ui-bubble")!;
    const labelRoot = inShadow<HTMLElement>(label, '[part="root"]');
    const highlight = inShadow<HTMLElement>(label, '[part~="highlight"]');
    const content = inShadow<HTMLElement>(bubble, '[part="content"]');

    expect(getComputedStyle(labelRoot).fontSize).toBe("15px");
    expect(getComputedStyle(highlight).color).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(content).borderTopWidth).toBe("1px");
    expect(getComputedStyle(content).borderRadius).toBe("16px");
  });

  it("lets a composed input group own one focus boundary", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const group = await fixture(`
      <ui-input-group>
        <span slot="prefix">Search</span>
        <ui-input slot="control" label="Search projects"></ui-input>
        <ui-kbd slot="suffix" command="workspace.search" shortcut="Primary+K"></ui-kbd>
      </ui-input-group>
    `);
    const input = group.querySelector("ui-input")!;
    const nativeInput = inShadow<HTMLInputElement>(input, "input");
    const groupRoot = inShadow<HTMLElement>(group, '[part="root"]');

    nativeInput.focus();

    expect(getComputedStyle(groupRoot).outlineStyle).toBe("solid");
    expect(getComputedStyle(nativeInput).outlineStyle).toBe("none");
    expect(getComputedStyle(nativeInput).boxShadow).toBe("none");
  });

  it("pronounces a semantic keyboard binding as a compact menu shortcut", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const menu = await fixture(`
      <ui-menu label="Edit commands" open>
        <button slot="trigger">Edit</button>
        <ui-menu-item value="undo">
          Undo
          <ui-kbd slot="shortcut" command="edit.undo" shortcut="Primary+Z"></ui-kbd>
        </ui-menu-item>
      </ui-menu>
    `);
    const key = menu.querySelector("ui-kbd")!;
    const keyRoot = inShadow<HTMLElement>(key, '[part="root"]');
    const item = menu.querySelector("ui-menu-item")!;
    const itemControl = inShadow<HTMLElement>(item, '[part="control"]');

    expect(menu.getAttribute("density")).toBe("compact");
    expect(getComputedStyle(itemControl).blockSize).toBe("20px");
    expect(getComputedStyle(keyRoot).borderTopWidth).toBe("0px");
    expect(getComputedStyle(keyRoot).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(keyRoot).boxShadow).toBe("none");
  });

  it("defaults context menus to the same compact command rhythm", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const menu = await fixture(`
      <ui-context-menu label="Project actions">
        <button slot="trigger">Project</button>
        <ui-menu-item value="open">Open project</ui-menu-item>
      </ui-context-menu>
    `);
    const item = menu.querySelector("ui-menu-item")!;
    const itemControl = inShadow<HTMLElement>(item, '[part="control"]');

    expect(menu.getAttribute("density")).toBe("compact");
    expect(getComputedStyle(itemControl).blockSize).toBe("20px");
  });

  it("uses the snappy transient motion contract for menu surfaces", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const menu = await fixture<HTMLElement & { open: boolean; updateComplete: Promise<unknown> }>(`
      <ui-menu label="Project commands">
        <button slot="trigger">Project</button>
        <ui-menu-item value="open">Open project</ui-menu-item>
      </ui-menu>
    `);

    menu.open = true;
    await menu.updateComplete;
    const popup = inShadow<HTMLElement>(menu, '[part="popup"]');
    const motion = getComputedStyle(popup);

    expect(menu.matches(":state(entering)")).toBe(true);
    expect(motion.animationName).toBe("mash-menu-enter");
    expect(motion.animationDuration).toBe("0.12s");
  });

  it("separates initial keyboard focus from checked menu selection", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const menu = await fixture(`
      <ui-menu label="View options" open>
        <ui-menu-item value="sidebar">Show sidebar</ui-menu-item>
        <ui-menu-item kind="checkbox" value="details" checked>Show details</ui-menu-item>
      </ui-menu>
    `);
    const [focused, checked] = [...menu.querySelectorAll("ui-menu-item")];
    const focusedControl = inShadow<HTMLButtonElement>(focused!, "button");
    const checkedControl = inShadow<HTMLButtonElement>(checked!, "button");

    focusedControl.focus();

    expect(getComputedStyle(focusedControl).boxShadow).not.toBe("none");
    expect(getComputedStyle(checkedControl).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(focusedControl).backgroundColor).not.toBe(
      getComputedStyle(checkedControl).backgroundColor,
    );
    expect(focused?.matches(":state(checked)")).toBe(false);
    expect(checked?.matches(":state(checked)")).toBe(true);
  });

  it("uses declarable menu sizing and applies tokenized menu density", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const menu = await fixture(`
      <ui-menu label="Project commands" density="compact" sizing="fixed" open>
        <ui-menu-label>Navigate</ui-menu-label>
        <ui-menu-item value="open">Open project</ui-menu-item>
        <ui-separator></ui-separator>
        <ui-menu-item value="archive">Archive project</ui-menu-item>
      </ui-menu>
    `);
    const popup = inShadow<HTMLElement>(menu, '[part="popup"]');
    const actions = inShadow<HTMLElement>(menu, '[part="actions"]');
    const label = menu.querySelector("ui-menu-label")!;
    const labelRoot = inShadow<HTMLElement>(label, '[part="root"]');
    const item = menu.querySelector("ui-menu-item")!;
    const itemControl = inShadow<HTMLElement>(item, '[part="control"]');
    const separator = menu.querySelector("ui-separator")!;

    expect(getComputedStyle(popup).inlineSize).toBe("210px");
    expect(getComputedStyle(popup).minInlineSize).toBe("210px");
    expect(getComputedStyle(popup).maxInlineSize).toBe("210px");
    expect(getComputedStyle(actions).rowGap).toBe("0px");
    expect(getComputedStyle(itemControl).blockSize).toBe("20px");
    expect(getComputedStyle(itemControl).borderTopLeftRadius).toBe("4px");
    expect(getComputedStyle(labelRoot).paddingInlineStart).toBe("8px");
    expect(getComputedStyle(separator).blockSize).toBe("8px");
  });

  it("keeps labelled compact command groups inside the ten-row menu viewport", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const menu = await fixture(`
      <ui-menu label="Workspace view options" density="compact" sizing="fixed" open>
        <ui-menu-label>Layout</ui-menu-label>
        <ui-menu-item kind="checkbox" value="breadcrumbs">Breadcrumbs</ui-menu-item>
        <ui-menu-item kind="checkbox" value="sidebar" checked>Show sidebar</ui-menu-item>
        <ui-separator></ui-separator>
        <ui-menu-label>Theme</ui-menu-label>
        <ui-menu-item kind="radio" value="system" checked>System</ui-menu-item>
        <ui-menu-item kind="radio" value="light">Light</ui-menu-item>
        <ui-menu-item kind="radio" value="dark">Dark</ui-menu-item>
        <ui-separator></ui-separator>
        <ui-menu-label>Danger zone</ui-menu-label>
        <ui-menu-item value="reset" tone="critical">Reset layout</ui-menu-item>
      </ui-menu>
    `);
    const viewport = inShadow<HTMLElement>(menu, '[part="viewport"]');

    expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.clientHeight);
  });

  it("pronounces typeset preset and tone tokens through parts", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const typeset = await fixture(
      `<ui-typeset preset="title2" tone="accent">Interzone</ui-typeset>`,
    );
    const content = inShadow<HTMLElement>(typeset, '[part="content"]');

    expect(getComputedStyle(content).fontSize).toBe("17px");
    expect(getComputedStyle(content).color).not.toBe("rgba(0, 0, 0, 0)");
  });
});
