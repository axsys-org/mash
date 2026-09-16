import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIToolbar } from "./toolbar.js";
import { UIButton } from "../button/button.js";
import "./register.js";
import "../button/register.js";
import "../input/register.js";
import "../collapsible/register.js";

const controls = (toolbar: Element) => [...toolbar.querySelectorAll<UIButton>("ui-button")];
const key = (target: Element, name: string, options: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", {
    key: name,
    bubbles: true,
    composed: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
};

describe("ui-toolbar: authored action ownership", () => {
  it("retains a reachable action when a hidden external ancestor is revealed", async () => {
    const host = await fixture(
      `<div hidden><ui-toolbar><ui-button>A</ui-button><ui-button>B</ui-button></ui-toolbar></div>`,
    );
    const toolbar = host.querySelector("ui-toolbar")!;
    expect(controls(toolbar).map((item) => item.tabIndex)).toEqual([0, -1]);
    host.hidden = false;
    await settled(host);
    controls(toolbar)[0]!.focus();
    expect(document.activeElement).toBe(controls(toolbar)[0]);
    expect(controls(toolbar).map((item) => item.tabIndex)).toEqual([0, -1]);
  });

  it("keeps the roving stop through a Mash collapsible's shadow reveal", async () => {
    const host = await fixture<HTMLElement & { open: boolean }>(
      `<ui-collapsible><span slot="trigger">Tree</span><ui-toolbar><ui-button>A</ui-button><ui-button>B</ui-button></ui-toolbar></ui-collapsible>`,
    );
    const toolbar = host.querySelector("ui-toolbar")!;
    expect(controls(toolbar).map((item) => item.tabIndex)).toEqual([0, -1]);
    host.open = true;
    await settled(host);
    controls(toolbar)[0]!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(controls(toolbar)[1]);
    host.open = false;
    await settled(host);
    host.open = true;
    await settled(host);
    expect(controls(toolbar).map((item) => item.tabIndex)).toEqual([-1, 0]);
  });

  it("gives a real ui-button group one Tab stop and supports Arrow/Home/End", async () => {
    const host = await fixture(
      `<div><input id="before"><ui-toolbar label="Actions"><ui-button>A</ui-button><ui-button>B</ui-button><ui-button>C</ui-button></ui-toolbar><input id="after"></div>`,
    );
    const toolbar = host.querySelector("ui-toolbar")!;
    const [a, b, c] = controls(toolbar);
    expect(controls(toolbar).map((item) => item.tabIndex)).toEqual([0, -1, -1]);
    a!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(b);
    expect(b!.shadowRoot!.activeElement).toBe(inShadow(b!, "button"));
    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(c);
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(a);
    await userEvent.keyboard("{Home}{Tab}");
    expect(document.activeElement).toBe(host.querySelector("#after"));
  });

  it("updates tab stops when actions become disabled, loading, hidden or inert", async () => {
    const toolbar = await fixture<UIToolbar>(
      `<ui-toolbar><ui-button>A</ui-button><ui-button>B</ui-button><ui-button>C</ui-button></ui-toolbar>`,
    );
    const [a, b, c] = controls(toolbar);
    a!.disabled = true;
    await settled(toolbar);
    expect(controls(toolbar).map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
    b!.loading = true;
    await settled(toolbar);
    expect(controls(toolbar).map((item) => item.tabIndex)).toEqual([-1, -1, 0]);
    c!.hidden = true;
    await settled(toolbar);
    expect(controls(toolbar).map((item) => item.tabIndex)).toEqual([-1, -1, -1]);
    a!.disabled = false;
    await settled(toolbar);
    expect(a!.tabIndex).toBe(0);
    a!.inert = true;
    c!.hidden = false;
    await settled(toolbar);
    expect(c!.tabIndex).toBe(0);
  });

  it("skips unavailable actions and respects RTL and non-looping edges", async () => {
    const toolbar = await fixture<UIToolbar>(
      `<ui-toolbar dir="rtl"><ui-button>A</ui-button><ui-button disabled>B</ui-button><ui-button>C</ui-button></ui-toolbar>`,
    );
    const [a, , c] = controls(toolbar);
    toolbar.loopFocus = false;
    a!.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(c);
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(c);
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(a);
  });

  it("does not consume modified or already-handled navigation keys", async () => {
    const toolbar = await fixture(
      `<ui-toolbar><ui-button>A</ui-button><ui-button>B</ui-button></ui-toolbar>`,
    );
    const [a] = controls(toolbar);
    a!.focus();
    for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
      expect(key(a!, "ArrowRight", { [modifier]: true }).defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(a);
    }
    a!.addEventListener("keydown", (event) => event.preventDefault(), {
      once: true,
    });
    key(a!, "End");
    expect(document.activeElement).toBe(a);
  });

  it("leaves text selection and native select navigation alone", async () => {
    const toolbar = await fixture(
      `<ui-toolbar><ui-input value="abc"></ui-input><select><option>A</option><option>B</option></select><ui-button>Done</ui-button></ui-toolbar>`,
    );
    const input = inShadow<HTMLInputElement>(toolbar.querySelector("ui-input")!, "input");
    input.focus();
    input.setSelectionRange(1, 1);
    expect(key(input, "ArrowRight").defaultPrevented).toBe(false);
    expect(key(input, "Home").defaultPrevented).toBe(false);
    const select = toolbar.querySelector("select")!;
    select.focus();
    expect(key(select, "End").defaultPrevented).toBe(false);
  });

  it("supports an authored popup trigger without taking keys from popup content", async () => {
    const toolbar = await fixture(
      `<ui-toolbar><div><ui-button slot="trigger">Menu</ui-button><div role="menu"><button role="menuitem">Item</button></div></div><ui-button>Next</ui-button></ui-toolbar>`,
    );
    const item = toolbar.querySelector('[role="menuitem"]') as HTMLButtonElement;
    item.focus();
    expect(key(item, "Home").defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(item);
    controls(toolbar)[0]!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(controls(toolbar)[1]);
  });

  it("restores authored tabindex when actions leave or the toolbar disconnects", async () => {
    const host = await fixture(
      `<div><ui-toolbar><ui-button>A</ui-button><ui-button tabindex="3">B</ui-button></ui-toolbar></div>`,
    );
    const toolbar = host.querySelector("ui-toolbar")!;
    const [a, b] = controls(toolbar);
    host.append(b!);
    await settled(host);
    expect(b!.getAttribute("tabindex")).toBe("3");
    toolbar.remove();
    expect(a!.hasAttribute("tabindex")).toBe(false);
  });
});
