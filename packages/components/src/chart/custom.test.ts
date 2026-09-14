import { describe, expect, it, vi } from "vitest";
import type { EChartsOption } from "echarts";
import { fixture, inShadow } from "../test-support/fixture.js";
import type { UIChart } from "./chart.js";
import "./register.js";

describe("custom chart marks", () => {
  it("renders custom rectangles and retains accessible data when switching to canvas", async () => {
    const chart = await fixture<UIChart>(
      `<ui-chart label="Duration" style="width:480px"><table slot="fallback"><caption>Source durations</caption><tr><td>Build</td><td>11 hours</td></tr></table></ui-chart>`,
    );
    const renderItem = vi.fn(() => ({
      type: "rect" as const,
      shape: { x: 40, y: 60, width: 180, height: 40 },
      style: { fill: "#2A6A9A" },
    }));
    chart.option = {
      series: [
        {
          type: "custom",
          coordinateSystem: "none",
          data: [{ name: "Build", value: 11 }],
          renderItem,
        },
      ],
    } satisfies EChartsOption;
    const viewport = inShadow<HTMLElement>(chart, '[part="canvas"]');
    await vi.waitFor(
      () => expect(viewport.querySelector('svg path[fill="#2A6A9A"]')).not.toBeNull(),
      { timeout: 15000 },
    );
    expect(renderItem).toHaveBeenCalled();
    const calls = renderItem.mock.calls.length;
    chart.renderer = "canvas";
    await vi.waitFor(() => expect(viewport.querySelector("canvas")).not.toBeNull(), {
      timeout: 15000,
    });
    expect(renderItem.mock.calls.length).toBeGreaterThan(calls);
    expect(chart.querySelector("table")!.textContent).toContain("11 hours");
    expect(inShadow<HTMLElement>(chart, '[part="error"]').hidden).toBe(true);
  }, 20000);

  it("provides viewport dimensions to variable-radius sector marks", async () => {
    const chart = await fixture<UIChart>(
      `<ui-chart label="Arc values" style="width:480px"></ui-chart>`,
    );
    chart.option = {
      series: [
        {
          type: "custom",
          coordinateSystem: "none",
          data: [
            { name: "One", value: 2 },
            { name: "Two", value: 3 },
          ],
          renderItem: (params, api) => ({
            type: "sector",
            shape: {
              cx: api.getWidth() / 2,
              cy: api.getHeight() / 2,
              r: 80 + params.dataIndex * 20,
              r0: 40,
              startAngle: params.dataIndex * Math.PI,
              endAngle: (params.dataIndex + 1) * Math.PI,
            },
            style: { fill: params.dataIndex ? "#3B8F6B" : "#2A6A9A" },
          }),
        },
      ],
    };
    const viewport = inShadow<HTMLElement>(chart, '[part="canvas"]');
    await vi.waitFor(
      () =>
        expect(
          viewport.querySelectorAll('svg path[fill="#2A6A9A"],svg path[fill="#3B8F6B"]'),
        ).toHaveLength(2),
      { timeout: 15000 },
    );
    const shapes = [
      ...viewport.querySelectorAll('svg path[fill="#2A6A9A"],svg path[fill="#3B8F6B"]'),
    ].map((path) => path.getAttribute("d"));
    expect(shapes[0]).not.toBe(shapes[1]);
    expect(inShadow<HTMLElement>(chart, '[part="error"]').hidden).toBe(true);
  }, 20000);
});
