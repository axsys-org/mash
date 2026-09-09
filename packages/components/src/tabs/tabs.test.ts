import { describe, expect, it, vi } from "vitest";

import type { UITab } from "../tab/tab.js";
import type { UITabPanel } from "../tab-panel/tab-panel.js";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UITabs } from "./tabs.js";
import "../tab-panel/register.js";
import "../tab/register.js";
import "./register.js";

describe("ui-tabs", () => {
  it("selects a slotted tab through its native control", async () => {
    const element = await fixture<UITabs>(`
      <ui-tabs value="controls" label="Selection accessories">
        <ui-tab slot="tab" value="controls">Controls</ui-tab>
        <ui-tab slot="tab" value="comments">Comments</ui-tab>
        <ui-tab-panel slot="panel" value="controls">Controls panel</ui-tab-panel>
        <ui-tab-panel slot="panel" value="comments">Comments panel</ui-tab-panel>
      </ui-tabs>
    `);
    const tabs = [...element.querySelectorAll<UITab>("ui-tab")];
    const panels = [...element.querySelectorAll<UITabPanel>("ui-tab-panel")];
    const onChange = vi.fn();
    element.addEventListener("ui-tabs-change", onChange);

    inShadow<HTMLButtonElement>(tabs[1]!, "button").click();
    await settled(element);

    expect(element.value).toBe("comments");
    expect(tabs.map((tab) => tab.selected)).toEqual([false, true]);
    expect(panels.map((panel) => panel.selected)).toEqual([false, true]);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("requests closure with Delete and selects an adjacent tab after removal", async () => {
    const element = await fixture<UITabs>(`<ui-tabs value="b">
      <ui-tab slot="tab" value="a">Alpha</ui-tab>
      <ui-tab slot="tab" value="b" closable>Beta</ui-tab>
      <ui-tab slot="tab" value="c">Gamma</ui-tab>
      <ui-tab-panel slot="panel" value="b">Beta panel</ui-tab-panel>
    </ui-tabs>`);
    const middle = element.querySelector<UITab>('[value="b"]')!;
    const request = vi.fn();
    element.addEventListener("ui-tab-close", request);
    middle.focus();
    inShadow(middle, '[part="control"]').dispatchEvent(
      new KeyboardEvent("keydown", { key: "Delete", bubbles: true, composed: true }),
    );
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0]![0].detail.value).toBe("b");
    expect(middle.isConnected).toBe(true);
    middle.remove();
    element.querySelector("ui-tab-panel")!.remove();
    await settled(element);
    expect(element.value).toBe("c");
    expect(element.querySelector<UITab>('[value="c"]')!.selected).toBe(true);
  });

  it("keeps nested tab selections independent and reconciles disabled tabs", async () => {
    const element = await fixture<UITabs>(
      `<ui-tabs value="outer"><ui-tab slot="tab" value="outer">Outer</ui-tab><ui-tab slot="tab" value="other">Other</ui-tab><ui-tab-panel slot="panel" value="outer"><ui-tabs><ui-tab slot="tab" value="one">One</ui-tab><ui-tab slot="tab" value="two">Two</ui-tab></ui-tabs></ui-tab-panel></ui-tabs>`,
    );
    const inner = element.querySelector<UITabs>("ui-tabs")!;
    inShadow(inner.querySelector<UITab>('[value="two"]')!, "button").click();
    await settled(element);
    expect(inner.value).toBe("two");
    expect(element.value).toBe("outer");
    element.querySelector<UITab>('ui-tab[value="outer"]')!.disabled = true;
    await settled(element);
    expect(element.value).toBe("other");
  });
});
