import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UITooltip } from "./tooltip.js";
import "../button/register.js";
import "./register.js";

describe("ui-tooltip", () => {
  it("supports click-controlled visibility through the same open-change event", async () => {
    const tooltip = await fixture<UITooltip>(`
      <ui-tooltip trigger="click" label="Details">
        <ui-button slot="trigger" type="button">Details</ui-button>
        Project details
      </ui-tooltip>
    `);
    const listener = vi.fn();
    tooltip.addEventListener("ui-tooltip-open-change", listener);

    tooltip.querySelector("ui-button")!.click();
    await settled(tooltip.parentElement!);

    expect(tooltip.open).toBe(true);
    expect(listener.mock.calls[0]?.[0].detail).toEqual({
      open: true,
      reason: "trigger",
    });
    expect(inShadow(tooltip, '[part="popup"]').getAttribute("role")).toBe("tooltip");
  });

  it("keeps manual tooltips inert until their imperative state API is used", async () => {
    const tooltip = await fixture<UITooltip>(`
      <ui-tooltip trigger="manual" label="Details">
        <button slot="trigger">Details</button>
        Project details
      </ui-tooltip>
    `);

    tooltip
      .querySelector("button")!
      .dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    await settled(tooltip.parentElement!);
    expect(tooltip.open).toBe(false);

    tooltip.show();
    await settled(tooltip.parentElement!);
    expect(tooltip.open).toBe(true);
  });
});

it("opens immediately on keyboard focus and describes the native Mash control", async () => {
  const tip = await fixture<UITooltip>(`<ui-tooltip label="Save your work" open-delay="10000">
    <ui-button slot="trigger" aria-label="Save">Save</ui-button>
  </ui-tooltip>`);
  await settled(tip);
  const button = tip.querySelector("ui-button")!;
  const control = inShadow<HTMLButtonElement>(button, "button");
  control.focus();
  await settled(tip);
  expect(tip.open).toBe(true);
  expect(control.ariaDescribedByElements?.map((node) => node.textContent)).toContain(
    "Save your work",
  );
  expect(inShadow(tip, '[part="description"]').textContent).toContain("Save your work");
  const escape = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  const ownerKeydown = vi.fn();
  button.addEventListener("keydown", ownerKeydown);
  control.dispatchEvent(escape);
  expect(tip.open).toBe(false);
  expect(escape.defaultPrevented).toBe(false);
  expect(ownerKeydown).toHaveBeenCalledOnce();
  expect(button.shadowRoot!.activeElement).toBe(control);
  const description = control.ariaDescribedByElements!.at(-1)!;
  tip.label = "Save the latest draft";
  await settled(tip);
  expect(description.textContent).toBe("Save the latest draft");
  tip.remove();
  expect(control.ariaDescribedByElements).not.toContain(description);
});

it("pins visibility and cancels pending hover before returning to automatic behavior", async () => {
  const tip = await fixture<UITooltip>(
    '<ui-tooltip open-delay="50" label="Hint"><button slot="trigger">Trigger</button></ui-tooltip>',
  );
  const button = tip.querySelector("button")!;
  button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
  tip.forceOpen = false;
  await settled(tip);
  tip.forceOpen = undefined;
  await settled(tip);
  await new Promise((resolve) => setTimeout(resolve, 80));
  expect(tip.open).toBe(false);
  tip.forceOpen = true;
  await settled(tip);
  expect(tip.open).toBe(true);
  tip.dismiss("escape");
  expect(tip.open).toBe(true);
  tip.forceOpen = false;
  await settled(tip);
  tip.show();
  expect(tip.open).toBe(false);
});

it("describes an external native Mash anchor in its own shadow tree without reparenting", async () => {
  const host = await fixture<HTMLElement>(`<div>
    <ui-button id="external-action" aria-label="Refresh">Refresh</ui-button>
    <ui-tooltip trigger="manual"><strong>Refresh record</strong><span>Read the current namespace state.</span></ui-tooltip>
  </div>`);
  const tip = host.querySelector<UITooltip>("ui-tooltip")!;
  const button = host.querySelector("ui-button")!;
  const control = inShadow<HTMLButtonElement>(button, "button");
  const authored = document.createElement("span");
  authored.id = "authored-external-description";
  authored.textContent = "Existing context";
  button.shadowRoot!.append(authored);
  control.setAttribute("aria-describedby", authored.id);
  const parent = button.parentNode;
  control.focus();
  tip.anchorElement = control;
  tip.show();
  await settled(host);
  const descriptions = control.ariaDescribedByElements!;
  expect(descriptions).toContain(authored);
  const supplied = descriptions.find((node) => node !== authored)!;
  expect(supplied.textContent).toContain("Refresh record");
  expect(supplied.textContent).toContain("Read the current namespace state.");
  expect(supplied.getRootNode()).toBe(control.getRootNode());
  expect(button.parentNode).toBe(parent);
  expect(button.shadowRoot!.activeElement).toBe(control);
  control.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  expect(tip.open).toBe(false);
  expect(button.shadowRoot!.activeElement).toBe(control);
  tip.remove();
  expect(control.getAttribute("aria-describedby")).toBe(authored.id);
  expect(supplied.isConnected).toBe(false);
});

it("rebinds external descriptions immediately and preserves slotted fallback and authored IDs", async () => {
  const host = await fixture<HTMLElement>(`<div>
    <button id="one" aria-describedby="authored-one">One</button>
    <span id="authored-one">Authored one</span>
    <ui-button id="two">Two</ui-button>
    <ui-tooltip trigger="manual" label="Shared hint"><button slot="trigger">Fallback</button></ui-tooltip>
  </div>`);
  const tip = host.querySelector<UITooltip>("ui-tooltip")!;
  const one = host.querySelector<HTMLButtonElement>("#one")!;
  const two = host.querySelector<HTMLElement>("#two")!;
  const nativeTwo = inShadow<HTMLButtonElement>(two, "button");
  const fallback = tip.querySelector<HTMLButtonElement>("button")!;
  tip.anchorElement = one;
  expect(one.ariaDescribedByElements?.some((node) => node.textContent === "Shared hint")).toBe(
    true,
  );
  expect(fallback.hasAttribute("aria-describedby")).toBe(false);
  tip.anchorElement = two;
  expect(one.getAttribute("aria-describedby")).toBe("authored-one");
  expect(
    nativeTwo.ariaDescribedByElements?.some((node) => node.textContent === "Shared hint"),
  ).toBe(true);
  tip.label = "Updated shared hint";
  await settled(host);
  expect(
    nativeTwo.ariaDescribedByElements?.some((node) => node.textContent === "Updated shared hint"),
  ).toBe(true);
  tip.anchorElement = null;
  expect(nativeTwo.hasAttribute("aria-describedby")).toBe(false);
  expect(
    fallback.ariaDescribedByElements?.some((node) => node.textContent === "Updated shared hint"),
  ).toBe(true);
  tip.remove();
  host.append(tip);
  await settled(host);
  expect(fallback.ariaDescribedByElements).toHaveLength(1);
  tip.anchorElement = document.createElement("button");
  expect(fallback.hasAttribute("aria-describedby")).toBe(false);
});

it("tracks one cursor axis and falls back to the control anchor on keyboard focus", async () => {
  const tip = await fixture<UITooltip>(
    '<ui-tooltip follow-cursor="x" label="Timeline" open-delay="0"><button slot="trigger" style="width:300px;height:50px;margin:80px">Timeline</button></ui-tooltip>',
  );
  const trigger = tip.querySelector("button")!;
  inShadow<HTMLElement>(tip, '[part="popup"]').style.width = "100px";
  const move = async (x: number) => {
    const rect = trigger.getBoundingClientRect();
    trigger.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        composed: true,
        pointerType: "mouse",
        clientX: rect.left + x,
        clientY: rect.top + 20,
      }),
    );
    tip.show();
    await settled(tip);
    await new Promise(requestAnimationFrame);
    return tip.positionSnapshot!;
  };
  const first = await move(60),
    second = await move(160);
  expect(second.left - first.left).toBeCloseTo(100, 0);
  expect(second.top).toBe(first.top);
  trigger.focus();
  await settled(tip);
  await new Promise(requestAnimationFrame);
  expect(tip.positionSnapshot!.left).not.toBe(second.left);
});

it("settles scaled entry geometry without waiting for another pointer move", async () => {
  const host = await fixture<HTMLElement>(`
    <div>
      <style>
        @keyframes tooltip-test-entry { from { scale: 0.5; } }
        #settling-tooltip::part(popup) { display: block; width: 100px; height: 30px; }
        #settling-tooltip:state(entering)::part(popup) {
          animation: tooltip-test-entry 100ms linear both;
        }
      </style>
      <ui-tooltip id="settling-tooltip" trigger="manual" placement="left" offset="8" label="Details">
        <button slot="trigger" style="width:100px;height:30px;margin:150px">Details</button>
      </ui-tooltip>
    </div>
  `);
  const tip = host.querySelector<UITooltip>("ui-tooltip")!;
  const trigger = tip.querySelector("button")!;
  tip.show();
  await expect.poll(() => tip.matches(":state(active)")).toBe(true);
  const popup = inShadow<HTMLElement>(tip, '[part="popup"]');
  expect(popup.getBoundingClientRect().right).toBeCloseTo(
    trigger.getBoundingClientRect().left - 8,
    0,
  );
});
