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
    document.documentElement.style.removeProperty("--mash-material-luminance");
    document.documentElement.style.removeProperty("--mash-material-display");
    document.documentElement.style.removeProperty("--mash-material-selection-background");
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

    expect(getComputedStyle(labelRoot).fontSize).toBe("16px");
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

    expect(menu.getAttribute("density")).toBe("regular");
    expect(getComputedStyle(itemControl).blockSize).toBe("26px");
    expect(getComputedStyle(keyRoot).borderTopWidth).toBe("0px");
    expect(getComputedStyle(keyRoot).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(keyRoot).boxShadow).toBe("none");
  });

  it("defaults context menus to the same regular command rhythm", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const menu = await fixture(`
      <ui-context-menu label="Project actions">
        <button slot="trigger">Project</button>
        <ui-menu-item value="open">Open project</ui-menu-item>
      </ui-context-menu>
    `);
    const item = menu.querySelector("ui-menu-item")!;
    const itemControl = inShadow<HTMLElement>(item, '[part="control"]');

    expect(menu.getAttribute("density")).toBe("regular");
    expect(getComputedStyle(itemControl).blockSize).toBe("26px");
  });

  it("opens menus instantly and closes root menus with an optical transient", async () => {
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
    expect(motion.animationName).toBe("none");
    expect(motion.animationDuration).toBe("0s");
    expect(motion.transformOrigin).toBe("0px 0px");
    expect(motion.willChange).not.toContain("opacity");

    menu.open = false;
    await menu.updateComplete;
    const exitMotion = getComputedStyle(popup);
    const materialMotion = getComputedStyle(inShadow<HTMLElement>(menu, '[part="material"]'));
    const viewportMotion = getComputedStyle(inShadow<HTMLElement>(menu, '[part="viewport"]'));

    expect(menu.matches(":state(exiting)")).toBe(true);
    expect(exitMotion.animationName).toBe("mash-menu-presence-closeout");
    expect(exitMotion.animationDuration).toBe("0.12s");
    expect(exitMotion.willChange).not.toContain("opacity");
    expect(materialMotion.animationName).toBe("mash-menu-closeout");
    expect(viewportMotion.animationName).toBe("mash-menu-closeout");
  });

  it("removes nested menu exits immediately during pointer leafing", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const menu = await fixture<HTMLElement>(`
      <ui-menu label="Project commands" open>
        <button slot="trigger">Project</button>
        <ui-menu-item value="share">
          Share
          <ui-menu slot="submenu" label="Share with" open>
            <ui-menu-item value="email">Email</ui-menu-item>
          </ui-menu>
        </ui-menu-item>
      </ui-menu>
    `);
    const submenu = menu.querySelector<
      HTMLElement & { open: boolean; updateComplete: Promise<unknown> }
    >("ui-menu[slot='submenu']")!;
    await submenu.updateComplete;
    const popup = inShadow<HTMLElement>(submenu, '[part="popup"]');

    submenu.open = false;
    await submenu.updateComplete;
    const motion = getComputedStyle(popup);

    expect(submenu.hasAttribute("nested")).toBe(true);
    expect(submenu.matches(":state(exiting)")).toBe(true);
    expect(motion.animationName).toBe("none");
    expect(motion.animationDuration).toBe("0s");
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

    const focusedState = (() => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--color-menu-selection)";
      probe.style.color = "var(--color-on-menu-selection)";
      document.body.append(probe);
      const focusStyle = getComputedStyle(focusedControl);
      const probeStyle = getComputedStyle(probe);
      const state = {
        background: focusStyle.backgroundColor,
        color: focusStyle.color,
        selectedBackground: probeStyle.backgroundColor,
        selectedColor: probeStyle.color,
      };
      probe.remove();
      return state;
    })();

    expect(getComputedStyle(focusedControl).boxShadow).toBe("none");
    expect(focusedState.background).toBe(focusedState.selectedBackground);
    expect(focusedState.color).toBe(focusedState.selectedColor);
    expect(getComputedStyle(checkedControl).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(focusedControl).backgroundColor).not.toBe(
      getComputedStyle(checkedControl).backgroundColor,
    );
    expect(focused?.matches(":state(checked)")).toBe(false);
    expect(checked?.matches(":state(checked)")).toBe(true);
  });

  it("keeps submenu branch focus on the neutral branch affordance", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const menu = await fixture(`
      <ui-menu label="Project commands" open>
        <ui-menu-item value="open">Open project</ui-menu-item>
        <ui-menu-item value="recent">
          Recent projects
          <ui-menu slot="submenu" label="Recent projects">
            <ui-menu-item value="billing">Billing migration</ui-menu-item>
          </ui-menu>
        </ui-menu-item>
      </ui-menu>
    `);
    const leaf = menu.querySelector<HTMLElement>('ui-menu-item[value="open"]')!;
    const branch = menu.querySelector<HTMLElement>('ui-menu-item[value="recent"]')!;
    const leafControl = inShadow<HTMLButtonElement>(leaf, "button");
    const branchControl = inShadow<HTMLButtonElement>(branch, "button");

    leafControl.focus();
    const leafBackground = getComputedStyle(leafControl).backgroundColor;
    branchControl.focus();

    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--color-surface-hover)";
    menu.append(probe);
    const branchBackground = getComputedStyle(branchControl).backgroundColor;
    const neutralBackground = getComputedStyle(probe).backgroundColor;

    expect(branch.matches(":state(has-submenu)")).toBe(true);
    expect(branchBackground).toBe(neutralBackground);
    expect(branchBackground).not.toBe(leafBackground);

    probe.remove();
  });

  it("routes menu material headroom and selection through shared runtime variables", async () => {
    document.documentElement.style.setProperty("--mash-material-display", "block");
    document.documentElement.dataset.mashCatalogue = "mash";
    const host = await fixture<HTMLElement>(`
      <div data-theme="dark">
        <ui-menu label="Project commands" open>
          <ui-menu-item value="open">Open project</ui-menu-item>
        </ui-menu>
      </div>
    `);
    host.style.setProperty("--mash-material-luminance", "1.05");
    host.style.setProperty("--mash-material-selection-background", "rgb(1, 2, 3)");
    const menu = host.querySelector("ui-menu")!;
    const item = menu.querySelector("ui-menu-item")!;
    const control = inShadow<HTMLButtonElement>(item, "button");
    const material = inShadow<HTMLElement>(menu, '[part="material"]');
    const popup = inShadow<HTMLElement>(menu, '[part="popup"]');

    control.focus();

    expect(getComputedStyle(control).backgroundColor).toBe("rgb(1, 2, 3)");
    expect(getComputedStyle(popup).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(material).backdropFilter).toContain("brightness(1.05)");
    expect(getComputedStyle(material).filter).toBe("none");
  });

  it("preserves light menu luminance outside the backdrop chain", async () => {
    document.documentElement.style.setProperty("--mash-material-display", "block");
    document.documentElement.dataset.mashCatalogue = "mash";
    const host = await fixture<HTMLElement>(`
      <div data-theme="light">
        <ui-menu label="Project commands" open>
          <ui-menu-item value="open">Open project</ui-menu-item>
        </ui-menu>
      </div>
    `);
    host.style.setProperty("--mash-material-luminance", "1.05");
    const menu = host.querySelector("ui-menu")!;
    const material = inShadow<HTMLElement>(menu, '[part="material"]');
    const popup = inShadow<HTMLElement>(menu, '[part="popup"]');
    const materialStyle = getComputedStyle(material);

    expect(getComputedStyle(popup).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(materialStyle.backdropFilter).toContain("brightness(1)");
    expect(materialStyle.filter).toContain("brightness(1.05)");
  });

  it("uses the dense material tier for dark nested menus", async () => {
    document.documentElement.style.setProperty("--mash-material-display", "block");
    document.documentElement.dataset.mashCatalogue = "mash";
    const host = await fixture<HTMLElement>(`
      <div data-theme="dark" data-vibrancy="vibrant">
        <ui-menu label="Project commands" open>
          <ui-menu-item value="recent">
            Recent projects
            <ui-menu slot="submenu" label="Recent projects" open>
              <ui-menu-item value="billing">Billing migration</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
        </ui-menu>
      </div>
    `);
    const submenu = host.querySelector<HTMLElement & { updateComplete: Promise<unknown> }>(
      "ui-menu[slot='submenu']",
    )!;
    await submenu.updateComplete;
    const material = inShadow<HTMLElement>(submenu, '[part="material"]');
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--color-background-material-thick)";
    host.append(probe);

    const materialStyle = getComputedStyle(material);
    const probeStyle = getComputedStyle(probe);

    expect(submenu.hasAttribute("nested")).toBe(true);
    expect(materialStyle.backgroundColor).toBe(probeStyle.backgroundColor);
    expect(materialStyle.backgroundImage).toContain("linear-gradient");
    expect(materialStyle.backdropFilter).toContain("blur(");
    expect(materialStyle.backgroundBlendMode).toBe("normal");

    probe.remove();
  });

  it("keeps context-menu submenus on the same frosted material plane", async () => {
    document.documentElement.style.setProperty("--mash-material-display", "block");
    document.documentElement.dataset.mashCatalogue = "mash";
    const host = await fixture<HTMLElement>(`
      <div data-theme="dark" data-vibrancy="vibrant">
        <ui-context-menu label="Project actions" open>
          <button slot="trigger">Project</button>
          <ui-menu-item value="share">
            Share
            <ui-menu slot="submenu" label="Share project" open>
              <ui-menu-item value="copy-link">Copy link</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
        </ui-context-menu>
      </div>
    `);
    const submenu = host.querySelector<HTMLElement & { updateComplete: Promise<unknown> }>(
      "ui-menu[slot='submenu']",
    )!;
    const contextMenu = host.querySelector<HTMLElement>("ui-context-menu")!;
    await submenu.updateComplete;
    const contextPopup = inShadow<HTMLElement>(contextMenu, '[part="popup"]');
    const popup = inShadow<HTMLElement>(submenu, '[part="popup"]');
    const material = inShadow<HTMLElement>(submenu, '[part="material"]');
    const contextPopupStyle = getComputedStyle(contextPopup);
    const popupStyle = getComputedStyle(popup);
    const materialStyle = getComputedStyle(material);

    expect(submenu.hasAttribute("nested")).toBe(true);
    expect(contextPopupStyle.isolation).toBe("auto");
    expect(popupStyle.backdropFilter).toBe("none");
    expect(materialStyle.backdropFilter).toContain("blur(");
    expect(materialStyle.backdropFilter).toContain("brightness(");
    expect(materialStyle.filter).toBe("none");
    expect(materialStyle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("uses the filled critical state for focused destructive menu commands", async () => {
    document.documentElement.dataset.mashCatalogue = "mash";
    const menu = await fixture(`
      <ui-menu label="Edit commands" open>
        <ui-menu-item value="delete" tone="critical">Delete</ui-menu-item>
      </ui-menu>
    `);
    const critical = menu.querySelector("ui-menu-item")!;
    const control = inShadow<HTMLButtonElement>(critical, "button");

    control.focus();

    const criticalState = (() => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--color-critical)";
      probe.style.color = "var(--color-on-critical)";
      document.body.append(probe);
      const controlStyle = getComputedStyle(control);
      const probeStyle = getComputedStyle(probe);
      const state = {
        background: controlStyle.backgroundColor,
        color: controlStyle.color,
        criticalBackground: probeStyle.backgroundColor,
        criticalColor: probeStyle.color,
        shadow: controlStyle.boxShadow,
      };
      probe.remove();
      return state;
    })();

    expect(criticalState.background).toBe(criticalState.criticalBackground);
    expect(criticalState.color).toBe(criticalState.criticalColor);
    expect(criticalState.shadow).toBe("none");
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
    const header = inShadow<HTMLElement>(menu, '[part="header"]');
    const footer = inShadow<HTMLElement>(menu, '[part="footer"]');
    const label = menu.querySelector("ui-menu-label")!;
    const labelRoot = inShadow<HTMLElement>(label, '[part="root"]');
    const item = menu.querySelector("ui-menu-item")!;
    const itemControl = inShadow<HTMLElement>(item, '[part="control"]');
    const separator = menu.querySelector("ui-separator")!;

    expect(getComputedStyle(popup).inlineSize).toBe("210px");
    expect(getComputedStyle(popup).minInlineSize).toBe("210px");
    expect(getComputedStyle(popup).maxInlineSize).toBe("210px");
    expect(getComputedStyle(popup).borderTopLeftRadius).toBe("6px");
    expect(getComputedStyle(actions).rowGap).toBe("0px");
    expect(menu.matches(":state(has-header)")).toBe(false);
    expect(menu.matches(":state(has-footer)")).toBe(false);
    expect(getComputedStyle(header).display).toBe("contents");
    expect(getComputedStyle(footer).display).toBe("contents");
    expect(getComputedStyle(itemControl).blockSize).toBe("20px");
    expect(getComputedStyle(itemControl).borderTopLeftRadius).toBe("4px");
    expect(getComputedStyle(itemControl).fontWeight).toBe("400");
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
