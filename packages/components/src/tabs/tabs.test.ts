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
});
