import { describe, expect, it, vi } from "vitest";
import { getInstanceByDom } from "echarts/core";
import type { EChartsOption } from "echarts";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIChart } from "./chart.js";
import "./register.js";

const options: EChartsOption = {
  xAxis: { type: "category", data: ["Mon", "Tue"] },
  yAxis: { type: "value" },
  series: [{ type: "line", data: [12, 20] }],
};
describe("chart", () => {
  it("draws SVG with semantic colors, updates its theme, and disposes on disconnect", async () => {
    const chart = await fixture<UIChart>(
      `<ui-chart label="Visits" style="display:block;width:480px;--color-chart1:#3b82f6;--type-label-small-font-size:13px"><script type="application/json">${JSON.stringify(options)}</script></ui-chart>`,
    );
    const viewport = inShadow<HTMLElement>(chart, '[part="canvas"]');
    await vi.waitFor(() => expect(viewport.querySelector("svg")).not.toBeNull(), {
      timeout: 15000,
    });
    expect(getInstanceByDom(viewport)?.getOption().color).toContain("rgba(59,130,246,1)");
    expect(
      (getInstanceByDom(viewport)!.getOption().textStyle as { fontSize: number }).fontSize,
    ).toBe(13);
    chart.style.setProperty("--color-chart1", "#22c55e");
    await vi.waitFor(() =>
      expect(getInstanceByDom(viewport)?.getOption().color).toContain("rgba(34,197,94,1)"),
    );
    chart.remove();
    expect(getInstanceByDom(viewport)).toBeUndefined();
  }, 20000);
  it("reports malformed JSON and recovers when valid options are supplied", async () => {
    const chart = await fixture<UIChart>(
      '<ui-chart style="display:block;width:400px"><script type="application/json">invalid</script></ui-chart>',
    );
    await vi.waitFor(() =>
      expect(inShadow<HTMLElement>(chart, '[part="error"]').hidden).toBe(false),
    );
    chart.option = { series: [{ type: "pie", data: [{ name: "Visits", value: 5 }] }] };
    await settled(chart);
    await vi.waitFor(
      () => expect(inShadow<HTMLElement>(chart, '[part="error"]').hidden).toBe(true),
      { timeout: 15000 },
    );
  }, 20000);
  it("preserves zoom and legend choices when semantic colors change", async () => {
    const chart = await fixture<UIChart>('<ui-chart style="display:block;width:480px"></ui-chart>');
    chart.option = {
      ...options,
      legend: {},
      dataZoom: [{ type: "inside" }],
      series: [{ type: "line", name: "Visits", data: [12, 20] }],
    };
    const viewport = inShadow<HTMLElement>(chart, '[part="canvas"]');
    await vi.waitFor(() => expect(getInstanceByDom(viewport)?.getOption().series).toHaveLength(1), {
      timeout: 15000,
    });
    const instance = getInstanceByDom(viewport)!;
    instance.dispatchAction({ type: "dataZoom", start: 20, end: 80 });
    instance.dispatchAction({ type: "legendUnSelect", name: "Visits" });
    chart.style.setProperty("--color-chart1", "#22c55e");
    await vi.waitFor(() => expect(getInstanceByDom(viewport)).not.toBe(instance));
    const updated = getInstanceByDom(viewport)!.getOption();
    expect(updated.dataZoom).toMatchObject([{ start: 20, end: 80 }]);
    expect(updated.legend).toMatchObject([{ selected: { Visits: false } }]);
  }, 20000);
});
