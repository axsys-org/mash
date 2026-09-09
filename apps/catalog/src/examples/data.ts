import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const desktop = [186, 205, 237, 173, 209, 214];
const mobile = [80, 120, 100, 130, 90, 140];
const axes = {
  xAxis: { type: "category", data: months },
  yAxis: { type: "value" },
  tooltip: { trigger: "axis" },
};
const escape = (value: unknown) =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
function dataTable(option: object): string {
  const config = option as {
    xAxis?: { data?: string[] };
    yAxis?: { data?: string[] };
    series?: Array<{
      name?: string;
      data?: unknown[];
      links?: Array<{ source: string; target: string; value: number }>;
    }>;
  };
  const labels = config.xAxis?.data ?? config.yAxis?.data;
  const rows = (config.series ?? []).flatMap((series) =>
    series.links
      ? series.links.map((link) => [link.source, link.target, link.value])
      : (series.data ?? []).map((point, index) => {
          const datum = point as { name?: string; value?: unknown };
          return [
            series.name ?? "Series",
            datum?.name ?? labels?.[index] ?? String(index + 1),
            JSON.stringify(datum?.value ?? point),
          ];
        }),
  );
  return `<details slot="fallback"><summary>View data</summary><table class="mash-data-table"><caption>Illustrative sample values</caption><thead><tr><th>Series</th><th>Label</th><th>Value</th></tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${escape(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></details>`;
}
const chart = (name: string, option: object, renderer = "svg"): CatalogExample =>
  sample(
    name,
    `<ui-chart label="${name} — monthly activity" renderer="${renderer}">
  <script type="application/json">${JSON.stringify(option, null, 2)}</script>
  ${dataTable(option)}
</ui-chart>`,
  );

export const dataExamples: Record<string, CatalogExample[]> = {
  "ui-chart": [
    chart("Line", {
      ...axes,
      legend: { bottom: 0 },
      grid: { bottom: 64 },
      series: [
        { name: "Desktop", type: "line", data: desktop },
        { name: "Mobile", type: "line", data: mobile },
      ],
    }),
    chart("Area", {
      ...axes,
      series: [
        {
          name: "Desktop",
          type: "line",
          data: desktop,
          areaStyle: { opacity: 0.18 },
          smooth: true,
        },
      ],
    }),
    chart("Stacked area", {
      ...axes,
      series: [
        {
          name: "Desktop",
          type: "line",
          stack: "total",
          data: desktop,
          areaStyle: { opacity: 0.2 },
        },
        { name: "Mobile", type: "line", stack: "total", data: mobile, areaStyle: { opacity: 0.2 } },
      ],
    }),
    chart("Bars", {
      ...axes,
      series: [
        { name: "Desktop", type: "bar", data: desktop, barMaxWidth: 28 },
        { name: "Mobile", type: "bar", data: mobile, barMaxWidth: 28 },
      ],
    }),
    chart("Horizontal bars", {
      xAxis: { type: "value" },
      yAxis: { type: "category", data: months },
      series: [
        { type: "bar", data: desktop, barMaxWidth: 28, itemStyle: { borderRadius: [0, 4, 4, 0] } },
      ],
    }),
    chart("Positive and negative", {
      ...axes,
      series: [{ type: "bar", data: [18, -5, 23, -12, 9, 21], barMaxWidth: 32 }],
    }),
    ...["Pie", "Donut"].map((name) =>
      chart(name, {
        legend: { bottom: 0 },
        series: [
          {
            type: "pie",
            radius: name === "Pie" ? "70%" : ["48%", "70%"],
            label: { show: false },
            data: [
              { name: "Desktop", value: 275 },
              { name: "Mobile", value: 200 },
              { name: "Tablet", value: 87 },
            ],
          },
        ],
      }),
    ),
    chart("Radar", {
      legend: { bottom: 0 },
      radar: {
        indicator: ["Speed", "Quality", "Reach", "Support", "Value"].map((name) => ({
          name,
          max: 100,
        })),
      },
      series: [
        {
          type: "radar",
          data: [
            { name: "Current", value: [80, 90, 65, 82, 75] },
            { name: "Previous", value: [65, 75, 70, 60, 85] },
          ],
          areaStyle: { opacity: 0.08 },
        },
      ],
    }),
    chart("Candlestick", {
      ...axes,
      series: [
        {
          type: "candlestick",
          data: [
            [20, 24, 18, 28],
            [24, 21, 19, 27],
            [21, 27, 20, 29],
            [27, 30, 24, 32],
            [30, 26, 25, 33],
            [26, 31, 24, 34],
          ],
        },
      ],
    }),
    chart("Flow", {
      series: [
        {
          type: "sankey",
          left: 24,
          right: 100,
          nodeWidth: 16,
          nodeGap: 24,
          emphasis: { focus: "adjacency" },
          lineStyle: { color: "source", opacity: 0.18, curveness: 0.5 },
          data: [
            { name: "Visits" },
            { name: "Search" },
            { name: "Direct" },
            { name: "Subscribed" },
          ],
          links: [
            { source: "Visits", target: "Search", value: 80 },
            { source: "Visits", target: "Direct", value: 40 },
            { source: "Search", target: "Subscribed", value: 30 },
            { source: "Direct", target: "Subscribed", value: 20 },
          ],
        },
      ],
    }),
    chart(
      "Scatter · canvas",
      {
        xAxis: { type: "value", name: "Time" },
        yAxis: { type: "value", name: "Response" },
        series: [
          {
            type: "scatter",
            symbolSize: 5,
            data: Array.from({ length: 180 }, (_, i) => [
              i,
              Math.round(20 + i / 3 + Math.sin(i * 2.4) * 15),
            ]),
          },
        ],
      },
      "canvas",
    ),
  ],
};
