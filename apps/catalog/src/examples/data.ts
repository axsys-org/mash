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

const choice = (id: string, label: string, values: [string, string][], value = values[0]![0]) =>
  `<ui-select id="${id}" label="${label}" value="${value}">${values.map(([key, text]) => `<ui-option value="${key}">${text}</ui-option>`).join("")}</ui-select>`;

/** The same public option and event contract drives every interactive plot. */
const interactiveChart = (
  name: string,
  controls: string,
  script: string,
  description: string,
): CatalogExample => ({
  ...sample(
    name,
    `<div class="mash-row mash-wrap" id="chart-controls">${controls}</div>
<ui-chart id="plot" label="${name}"><details slot="fallback"><summary>View data</summary><table class="mash-data-table"><caption id="data-caption">Sample values</caption><thead id="data-head"></thead><tbody id="data-rows"></tbody></table></details></ui-chart>
<output id="chart-status" aria-live="polite">Choose a plotted value to inspect it.</output>`,
    description,
  ),
  script: `const plot = document.querySelector("#plot");
const controls = document.querySelector("#chart-controls");
const status = document.querySelector("#chart-status");
const months = ${JSON.stringify(months)};
const desktop = ${JSON.stringify(desktop)};
const mobile = ${JSON.stringify(mobile)};
const axes = { xAxis: { type: "category", data: months }, yAxis: { type: "value" }, tooltip: { trigger: "axis" } };
function showData(headers, rows, caption) {
  const row = (values, tag) => {
    const tr = document.createElement("tr");
    for (const value of values) {
      const cell = document.createElement(tag);
      cell.textContent = String(value);
      tr.append(cell);
    }
    return tr;
  };
  document.querySelector("#data-head").replaceChildren(row(headers, "th"));
  document.querySelector("#data-rows").replaceChildren(...rows.map(values => row(values, "td")));
  document.querySelector("#data-caption").textContent = caption;
}
plot.addEventListener("ui-chart-select", event => {
  const { seriesName, name, value } = event.detail;
  status.textContent = [seriesName, name, Array.isArray(value) ? value.join(", ") : value].filter(value => value !== "" && value !== undefined).join(" · ");
});
${script}`,
});

const chartExplorations: CatalogExample[] = [
  interactiveChart(
    "Curves and axes",
    choice("curve", "Curve", [
      ["linear", "Linear"],
      ["smooth", "Smooth"],
      ["step", "Step after"],
    ]) +
      choice("ticks", "Category labels", [
        ["all", "Every month"],
        ["alternate", "Every other month"],
      ]) +
      `<ui-checkbox id="dots" checked>Data points</ui-checkbox><ui-checkbox id="grid" checked>Grid lines</ui-checkbox><ui-checkbox id="legend" checked>Legend</ui-checkbox>`,
    `function render() {
  const curve = document.querySelector("#curve").value;
  const dots = document.querySelector("#dots").checked;
  plot.option = {
    ...axes,
    legend: { show: document.querySelector("#legend").checked, bottom: 0 },
    grid: { bottom: 64, containLabel: true },
    xAxis: { ...axes.xAxis, axisLabel: { interval: document.querySelector("#ticks").value === "all" ? 0 : 1 } },
    yAxis: { ...axes.yAxis, splitLine: { show: document.querySelector("#grid").checked } },
    series: [["Desktop", desktop], ["Mobile", mobile]].map(([name, data]) => ({ name, data, type: "line", smooth: curve === "smooth", step: curve === "step" ? "end" : false, showSymbol: dots }))
  };
}
controls.addEventListener("ui-checkbox-change", render);
controls.addEventListener("ui-select-change", render);
showData(["Month", "Desktop", "Mobile"], months.map((month, index) => [month, desktop[index], mobile[index]]), "Monthly visits by device");
render();`,
    "Compare linear, smooth, and stepped paths. Toggle points, grid lines, and category labels; click a legend item to hide its series.",
  ),
  interactiveChart(
    "Bar arrangements",
    choice("direction", "Growth direction", [
      ["up", "Up"],
      ["down", "Down"],
      ["right", "Right"],
      ["left", "Left"],
    ]) +
      choice("arrangement", "Arrangement", [
        ["grouped", "Grouped"],
        ["stacked", "Stacked"],
      ]) +
      `<ui-checkbox id="values" checked>Value labels</ui-checkbox>`,
    `function render() {
  const direction = document.querySelector("#direction").value;
  const horizontal = direction === "left" || direction === "right";
  const inverse = direction === "left" || direction === "down";
  const stacked = document.querySelector("#arrangement").value === "stacked";
  const category = { type: "category", data: months, inverse: horizontal };
  const value = { type: "value", inverse };
  const positions = { up: "top", down: "bottom", left: "left", right: "right" };
  plot.option = {
    xAxis: horizontal ? value : category,
    yAxis: horizontal ? category : value,
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    grid: { left: 52, right: 44, top: 36, bottom: 64, containLabel: true },
    series: [["Desktop", desktop], ["Mobile", mobile]].map(([name, data]) => ({ name, data, type: "bar", stack: stacked ? "devices" : undefined, barMaxWidth: 28, itemStyle: { borderRadius: 0 }, label: { show: document.querySelector("#values").checked, position: stacked ? "inside" : positions[direction], fontSize: 11 } }))
  };
}
controls.addEventListener("ui-checkbox-change", render);
controls.addEventListener("ui-select-change", render);
showData(["Month", "Desktop", "Mobile"], months.map((month, index) => [month, desktop[index], mobile[index]]), "Monthly visits by device");
render();`,
    "Change growth direction without changing the values. Grouped bars compare devices; stacked bars show their combined total.",
  ),
  interactiveChart(
    "Fills and corners",
    choice("fill", "Bar fill", [
      ["gradient", "Gradient"],
      ["solid", "Solid"],
    ]) +
      choice("corners", "Corners", [
        ["4", "Soft"],
        ["0", "Square"],
        ["12", "Rounded"],
      ]) +
      choice("width", "Bar width", [
        ["28", "Regular"],
        ["12", "Thin"],
        ["48", "Wide"],
      ]),
    `// Resolve the semantic role to an sRGB color for both rendering backends.
function seriesColor(alpha) {
  const probe = document.createElement("span");
  probe.style.color = "var(--color-chart1)";
  probe.hidden = true;
  plot.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  const context = document.createElement("canvas").getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return "rgba(" + [r, g, b, alpha].join(",") + ")";
}
function render() {
  const radius = Number(document.querySelector("#corners").value);
  const fill = document.querySelector("#fill").value === "gradient" ? {
    type: "linear", x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [{ offset: 0, color: seriesColor(1) }, { offset: 1, color: seriesColor(0.3) }]
  } : seriesColor(1);
  plot.option = { ...axes, series: [{ name: "Visits", type: "bar", data: desktop, barMaxWidth: Number(document.querySelector("#width").value), itemStyle: { color: fill, borderRadius: [radius, radius, 0, 0] } }] };
}
controls.addEventListener("ui-checkbox-change", render);
controls.addEventListener("ui-select-change", render);
new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
showData(["Month", "Visits"], months.map((month, index) => [month, desktop[index]]), "Monthly visits");
render();`,
    "A gradient follows each bar's height. The fill comes from the chart color token and updates with the theme; the baseline corners stay square.",
  ),
  interactiveChart(
    "Flow alignment",
    choice("alignment", "Node alignment", [
      ["justify", "Justify"],
      ["left", "Left"],
      ["right", "Right"],
    ]) +
      choice("flow-labels", "Labels", [
        ["names", "Names"],
        ["values", "Names and throughput"],
      ]) +
      `<ui-checkbox id="ribbons" checked>Gradient ribbons</ui-checkbox>`,
    `const links = [
  { source: "Visitors", target: "Search", value: 80 },
  { source: "Visitors", target: "Direct", value: 40 },
  { source: "Visitors", target: "Exited", value: 10 },
  { source: "Search", target: "Subscribed", value: 30 },
  { source: "Search", target: "Browsing", value: 50 },
  { source: "Direct", target: "Subscribed", value: 20 }
];
const nodes = ["Visitors", "Search", "Direct", "Subscribed", "Browsing", "Exited"].map(name => ({ name }));
function render() {
  plot.option = { series: [{ type: "sankey", data: nodes, links, left: 16, right: 128, top: 24, bottom: 24,
    nodeAlign: document.querySelector("#alignment").value, nodeWidth: 12, nodeGap: 28,
    emphasis: { focus: "adjacency" },
    lineStyle: { color: document.querySelector("#ribbons").checked ? "gradient" : "source", opacity: 0.22, curveness: 0.5 },
    label: { formatter: params => {
      if (document.querySelector("#flow-labels").value === "names") return params.name;
      const incoming = links.filter(link => link.target === params.name).reduce((sum, link) => sum + link.value, 0);
      const outgoing = links.filter(link => link.source === params.name).reduce((sum, link) => sum + link.value, 0);
      return params.name + "\\n" + Math.max(incoming, outgoing) + " visits";
    } }
  }] };
}
controls.addEventListener("ui-checkbox-change", render);
controls.addEventListener("ui-select-change", render);
showData(["From", "To", "Visits"], links.map(link => [link.source, link.target, link.value]), "Visit flows; labels show the greater of incoming or outgoing volume");
render();`,
    "Hover a node to follow its connections. Change terminal-node alignment and display throughput while retaining the original flow values.",
  ),
  interactiveChart(
    "Live data",
    `<ui-button id="append" size="small">Add day</ui-button><ui-button id="empty" size="small">Clear data</ui-button><ui-button id="reset" size="small" variant="ghost">Reset</ui-button>` +
      choice("renderer", "Renderer", [
        ["svg", "SVG"],
        ["canvas", "Canvas"],
      ]),
    `const initial = [28, 36, 31, 45, 39, 52, 48];
let values = [...initial];
function render(message) {
  const days = values.map((_, index) => "Day " + (index + 1));
  plot.renderer = document.querySelector("#renderer").value;
  plot.label = "Daily completed tasks, " + values.length + " days";
  plot.option = {
    xAxis: { type: "category", data: days, boundaryGap: false },
    yAxis: { type: "value", min: 0 },
    tooltip: { trigger: "axis" },
    grid: { bottom: 72, containLabel: true },
    dataZoom: [{ type: "inside", start: 0, end: 100 }, { type: "slider", height: 16, bottom: 12, showDetail: false }],
    series: [{ name: "Completed tasks", type: "line", data: values, smooth: true, areaStyle: { opacity: 0.12 }, showSymbol: true }]
  };
  showData(["Day", "Completed tasks"], days.map((day, index) => [day, values[index]]), values.length ? "Completed tasks per day" : "No data. Add a day or reset to restore the sample.");
  status.textContent = message || values.length + " days · Drag the range handles to zoom. Choose a point to inspect it.";
}
document.querySelector("#append").addEventListener("click", () => { values.push(Math.round(32 + values.length * 2 + Math.sin(values.length * 1.7) * 12)); render("Added day " + values.length + " · " + values.at(-1) + " completed tasks"); });
document.querySelector("#empty").addEventListener("click", () => { values = []; render("No data · Add a day or reset the sample."); });
document.querySelector("#reset").addEventListener("click", () => { values = [...initial]; render("Reset · 7 days restored."); });
document.querySelector("#renderer").addEventListener("ui-select-change", () => render());
render();`,
    "Append data, inspect a point, zoom the time range, and switch SVG/canvas. The accessible data table always follows the current values; Reset restores seven days.",
  ),
];

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
    ...chartExplorations,
  ],
};
