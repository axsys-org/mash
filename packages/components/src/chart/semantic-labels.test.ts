import { expect, it, vi } from "vitest";
import { getInstanceByDom } from "echarts/core";
import { fixture, inShadow } from "../test-support/fixture.js";
import type { UIChart } from "./chart.js";
import "./register.js";

it("keeps radar grids quiet and financial text unoutlined using semantic colors", async () => {
  const host = await fixture<UIChart>(
    '<ui-chart style="width:480px;--color-text:#e5e5e5;--color-text-muted:#aaaaaa;--color-border:#303030;--color-chart1:#609cff"></ui-chart>',
  );
  host.option = {
    animation: false,
    radar: {
      indicator: [
        { name: "A", max: 100 },
        { name: "B", max: 100 },
        { name: "C", max: 100 },
      ],
    },
    series: [{ type: "radar", data: [{ value: [80, 60, 70] }] }],
  };
  const viewport = inShadow<HTMLElement>(host, '[part="canvas"]');
  await vi.waitFor(
    () =>
      expect(getInstanceByDom(viewport)?.getOption().radar).toMatchObject([
        {
          splitArea: { show: false },
          splitLine: { lineStyle: { color: "rgba(48,48,48,1)" } },
          axisLine: { lineStyle: { color: "rgba(48,48,48,1)" } },
        },
      ]),
    { timeout: 15000 },
  );
  expect(viewport.querySelector('svg path[stroke="rgb(48,48,48)"]')).not.toBeNull();
  host.option = {
    animation: false,
    series: [
      {
        type: "sankey",
        data: [{ name: "Revenue" }, { name: "Profit" }],
        links: [{ source: "Revenue", target: "Profit", value: 25 }],
        label: { formatter: "{amount|$25m}", rich: { amount: { fontWeight: 600 } } },
      },
    ],
  };
  await vi.waitFor(() =>
    expect(getInstanceByDom(viewport)?.getOption().series).toMatchObject([
      { type: "sankey", label: { color: "rgba(229,229,229,1)", textBorderWidth: 0 } },
    ]),
  );
  const amounts = [...viewport.querySelectorAll("svg text")].filter(
    (text) => text.textContent === "$25m",
  );
  expect(amounts).toHaveLength(2);
  expect(
    amounts.every((text) => !text.hasAttribute("stroke") || text.getAttribute("stroke") === "none"),
  ).toBe(true);
});
