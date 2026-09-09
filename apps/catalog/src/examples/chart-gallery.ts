import type { CatalogExample } from "../examples.js";

type ChartFactory = (name: string, option: object, renderer?: string) => CatalogExample;

/** Direct views complement the interactive chart controls: variants stay visible. */
export function chartGallery(
  chart: ChartFactory,
  months: string[],
  desktop: number[],
  mobile: number[],
): CatalogExample[] {
  const axes = {
    xAxis: { type: "category", data: months },
    yAxis: { type: "value" },
    tooltip: { trigger: "axis" },
  };
  const legend = { legend: { bottom: 0 }, grid: { bottom: 64, containLabel: true } };
  const gradient = (direction: string, index = 1) => {
    const vectors: Record<string, number[]> = {
      bottom: [0, 1, 0, 0],
      top: [0, 0, 0, 1],
      left: [0, 0, 1, 0],
      right: [1, 0, 0, 0],
      diagonal: [0, 1, 1, 0],
    };
    const [x, y, x2, y2] = vectors[direction]!;
    return {
      type: "linear",
      x,
      y,
      x2,
      y2,
      colorStops: [
        { offset: 0, color: "@chart" + index },
        { offset: 1, color: "@chart" + index + "/0.16" },
      ],
    };
  };
  // Semantic colors are resolved at the same boundary for SVG and canvas. No
  // CSS color expression is handed to a renderer that cannot parse it.
  const themed = (name: string, option: object, description: string): CatalogExample => {
    const example = chart(name, option);
    return {
      ...example,
      code: example.code.replace(/<script type="application\/json">[\s\S]*?<\/script>/, ""),
      description,
      script: `const plot = document.querySelector("ui-chart");
const source = ${JSON.stringify(option)};
function draw() {
  const probe = document.createElement("span"); probe.hidden = true; document.body.append(probe);
  const context = document.createElement("canvas").getContext("2d");
  function resolve(value) {
    if (Array.isArray(value)) return value.map(resolve);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,resolve(item)]));
    if (typeof value !== "string" || !value.startsWith("@")) return value;
    const [token, alpha = "1"] = value.slice(1).split("/");
    probe.style.color = getComputedStyle(plot).getPropertyValue("--color-" + token);
    context.clearRect(0,0,1,1); context.fillStyle = getComputedStyle(probe).color; context.fillRect(0,0,1,1);
    const [r,g,b] = context.getImageData(0,0,1,1).data; return "rgba(" + [r,g,b,alpha].join(",") + ")";
  }
  plot.option = resolve(source); probe.remove();
}
draw();
const observer = new MutationObserver(draw);
observer.observe(document.documentElement, {attributes:true, attributeFilter:["data-theme","class","style"]});
addEventListener("pagehide", () => observer.disconnect(), {once:true});`,
    };
  };
  const pieData = months.map((name, index) => ({ name, value: desktop[index] }));
  const indicators = ["Speed", "Quality", "Reach", "Support", "Value"].map((name) => ({
    name,
    max: 100,
  }));
  const candles = [
    [20, 24, 18, 28],
    [24, 21, 19, 27],
    [21, 27, 20, 29],
    [27, 30, 24, 32],
    [30, 26, 25, 33],
    [26, 31, 24, 34],
  ];
  const bars = (direction: string, extra: object = {}) => {
    const horizontal = direction === "left" || direction === "right";
    return {
      xAxis: horizontal ? { type: "value", inverse: direction === "left" } : axes.xAxis,
      yAxis: horizontal
        ? { type: "category", data: months, inverse: true }
        : { type: "value", inverse: direction === "down" },
      series: [
        {
          name: "Desktop",
          type: "bar",
          data: desktop,
          barMaxWidth: 32,
          label: {
            show: true,
            position: (
              { up: "top", down: "bottom", left: "left", right: "right" } as Record<string, string>
            )[direction],
          },
          ...extra,
        },
      ],
    };
  };

  return [
    ...[
      ["Line · smooth", { smooth: true, showSymbol: false }],
      ["Line · linear", { smooth: false, showSymbol: false }],
      ["Line · step after", { step: "end", showSymbol: false }],
      ["Line · dots", { smooth: true, showSymbol: true, symbolSize: 7 }],
    ].map(([name, style]) =>
      chart(String(name), {
        ...axes,
        ...legend,
        series: [
          { name: "Desktop", type: "line", data: desktop, ...(style as object) },
          { name: "Mobile", type: "line", data: mobile, ...(style as object) },
        ],
      }),
    ),
    chart("Area · linear", {
      ...axes,
      series: [
        {
          name: "Desktop",
          type: "line",
          data: desktop,
          smooth: false,
          showSymbol: false,
          areaStyle: { opacity: 0.18 },
        },
      ],
    }),
    chart("Area · step after", {
      ...axes,
      series: [
        {
          name: "Desktop",
          type: "line",
          data: desktop,
          step: "end",
          showSymbol: false,
          areaStyle: { opacity: 0.18 },
        },
      ],
    }),
    themed(
      "Area · gradient",
      {
        ...axes,
        series: [
          {
            name: "Desktop",
            type: "line",
            data: desktop,
            smooth: true,
            showSymbol: false,
            areaStyle: { color: gradient("top") },
          },
        ],
      },
      "A semantic fill fades toward the baseline while the source values stay unchanged.",
    ),
    chart("Bars · single", bars("up", { label: { show: false } })),
    chart("Bars · mixed colors", bars("up", { colorBy: "data" })),
    chart("Bars · stacked", {
      ...axes,
      ...legend,
      series: [
        {
          name: "Desktop",
          type: "bar",
          data: desktop,
          stack: "devices",
          barMaxWidth: 40,
          label: { show: true, position: "inside" },
        },
        {
          name: "Mobile",
          type: "bar",
          data: mobile,
          stack: "devices",
          label: { show: true, position: "inside" },
        },
      ],
    }),
    chart("Bars · rounded", bars("up", { itemStyle: { borderRadius: 8 } })),
    ...(["up", "down", "right", "left"] as const).map((direction) =>
      chart(
        "Bars · " +
          {
            up: "bottom aligned",
            down: "top aligned",
            right: "left aligned",
            left: "right aligned",
          }[direction],
        bars(direction),
      ),
    ),
    ...(["bottom", "top", "left", "right", "diagonal"] as const).map((direction) =>
      themed(
        "Bars · " + direction + " gradient",
        bars(
          direction === "left"
            ? "right"
            : direction === "right"
              ? "left"
              : direction === "top"
                ? "down"
                : "up",
          { itemStyle: { color: gradient(direction) } },
        ),
        "The gradient follows each bar's bounds; its direction stays independent of the value scale.",
      ),
    ),
    themed(
      "Bars · per-bar gradients",
      bars("up", {
        data: desktop.map((value, index) => ({
          value,
          itemStyle: { color: gradient("bottom", (index % 5) + 1) },
        })),
      }),
      "Each datum uses one semantic series color, with a fade local to its own bar.",
    ),
    chart("Pie · padding", {
      legend: { bottom: 0 },
      series: [
        { type: "pie", radius: ["45%", "70%"], padAngle: 3, label: { show: false }, data: pieData },
      ],
    }),
    chart("Pie · labels", {
      series: [
        {
          type: "pie",
          radius: ["38%", "58%"],
          label: { show: true, formatter: "{b}\n{c}", distanceToLabelLine: 4 },
          labelLine: { length: 12, length2: 8 },
          data: pieData,
        },
      ],
    }),
    chart("Radar · single", {
      radar: { indicator: indicators },
      series: [
        {
          type: "radar",
          data: [{ name: "Current", value: [80, 90, 65, 82, 75] }],
          areaStyle: { opacity: 0.12 },
          symbol: "none",
        },
      ],
    }),
    themed(
      "Radar · dots and labels",
      {
        radar: {
          indicator: indicators.map((item, index) => ({
            ...item,
            name:
              "{dimension|" + item.name + "}\n{grade|" + ["A", "A+", "B", "A", "B+"][index] + "}",
          })),
          axisName: {
            color: "@text-muted",
            fontSize: 11,
            rich: {
              dimension: { color: "@text-muted", lineHeight: 20 },
              grade: {
                color: "@chart1",
                backgroundColor: "@surface-hover",
                padding: [2, 6],
                borderRadius: 8,
                lineHeight: 20,
              },
            },
          },
        },
        series: [
          {
            type: "radar",
            symbol: "circle",
            symbolSize: 7,
            data: [{ name: "Current", value: [80, 90, 65, 82, 75] }],
            areaStyle: { opacity: 0.06 },
          },
        ],
      },
      "Dimension labels can combine a short name with a grade; dots expose the underlying measurements.",
    ),
    chart("Radar · lines only", {
      ...legend,
      radar: { indicator: indicators, splitArea: { show: false } },
      series: [
        {
          type: "radar",
          symbol: "none",
          lineStyle: { width: 2 },
          data: [
            { name: "Current", value: [80, 90, 65, 82, 75] },
            { name: "Previous", value: [65, 75, 70, 60, 85] },
          ],
        },
      ],
    }),
    ...[
      ["narrow", 8],
      ["wide", 36],
    ].map(([name, width]) =>
      chart("Candlestick · " + name, {
        ...axes,
        series: [{ name: "Price", type: "candlestick", barWidth: width, data: candles }],
      }),
    ),
    chart("Candlestick · tick spacing", {
      ...axes,
      xAxis: { ...axes.xAxis, axisLabel: { interval: 1, margin: 16 } },
      series: [{ name: "Price", type: "candlestick", barMaxWidth: 28, data: candles }],
    }),
    ...[1, 2].map((period) => {
      const values =
        period === 1 ? [120, 72, 48, 18, 10, 20, 5, 15] : [132, 76, 56, 20, 11, 25, 6, 19];
      const names = [
        "Revenue",
        "Cost of sales",
        "Gross profit",
        "Operations",
        "Research",
        "Profit",
        "Tax",
        "Net income",
      ];
      return themed(
        "Financial flow · period " + period,
        {
          series: [
            {
              type: "sankey",
              nodeAlign: "center",
              left: 12,
              right: 140,
              top: 24,
              bottom: 24,
              nodeWidth: 14,
              nodeGap: 24,
              lineStyle: { color: "gradient", opacity: 0.2 },
              emphasis: { focus: "adjacency" },
              data: names.map((name, index) => ({
                name,
                value: values[index],
                itemStyle: {
                  color:
                    index === 1 || index === 3 || index === 4 || index === 6
                      ? "@chart2"
                      : "@chart1",
                },
                label:
                  period === 1
                    ? { formatter: name + "\n$" + values[index] + "m" }
                    : {
                        formatter:
                          "{amount|$" +
                          values[index] +
                          "m}\n{change|+" +
                          (
                            (values[index]! / [120, 72, 48, 18, 10, 20, 5, 15][index]! - 1) *
                            100
                          ).toFixed(1) +
                          "%}\n{name|" +
                          name +
                          "}",
                        rich: {
                          amount: {
                            color: "@text",
                            fontWeight: 600,
                            lineHeight: 17,
                            textBorderWidth: 0,
                          },
                          change: {
                            color: [1, 3, 4, 6].includes(index) ? "@critical" : "@positive",
                            lineHeight: 17,
                          },
                          name: { color: "@text-muted", lineHeight: 17 },
                        },
                      },
              })),
              links: [
                { source: names[0], target: names[1], value: values[1] },
                { source: names[0], target: names[2], value: values[2] },
                { source: names[2], target: names[3], value: values[3] },
                { source: names[2], target: names[4], value: values[4] },
                { source: names[2], target: names[5], value: values[5] },
                { source: names[5], target: names[6], value: values[6] },
                { source: names[5], target: names[7], value: values[7] },
              ],
            },
          ],
        },
        "A balanced illustrative income statement with original-value labels and centered nodes. Widths remain proportional to money.",
      );
    }),
    chart("Time axis", {
      xAxis: { type: "time", axisLabel: { formatter: "{MMM} {d}" } },
      yAxis: { type: "value", min: 0, max: 300, interval: 75 },
      tooltip: { trigger: "axis" },
      series: [
        {
          name: "Desktop",
          type: "line",
          showSymbol: true,
          data: desktop.map((value, index) => [Date.UTC(2026, 8, index * 3 + 1), value]),
        },
      ],
    }),
  ];
}
