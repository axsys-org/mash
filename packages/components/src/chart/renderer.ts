import { init, use, type EChartsCoreOption } from "echarts/core";
import {
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  CandlestickChart,
  SankeyChart,
  ScatterChart,
  HeatmapChart,
  GraphChart,
  TreemapChart,
} from "echarts/charts";
import {
  RadarComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DatasetComponent,
  AriaComponent,
  DataZoomComponent,
  VisualMapComponent,
  TitleComponent,
  MarkLineComponent,
} from "echarts/components";
import { SVGRenderer, CanvasRenderer } from "echarts/renderers";

use([
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  CandlestickChart,
  SankeyChart,
  ScatterChart,
  HeatmapChart,
  GraphChart,
  TreemapChart,
  RadarComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DatasetComponent,
  AriaComponent,
  DataZoomComponent,
  VisualMapComponent,
  TitleComponent,
  MarkLineComponent,
  SVGRenderer,
  CanvasRenderer,
]);

/** Resolve modern CSS colors to sRGB for both rendering backends. */
function palette(host: HTMLElement): (name: string) => string {
  const probe = document.createElement("span");
  probe.hidden = true;
  host.shadowRoot!.append(probe);
  const ctx = document.createElement("canvas").getContext("2d")!;
  return (name) => {
    probe.style.color = `var(${name})`;
    const color = getComputedStyle(probe).color;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    queueMicrotask(() => probe.remove());
    return `rgba(${r},${g},${b},${a! / 255})`;
  };
}

export function drawChart(
  host: HTMLElement,
  viewport: HTMLElement,
  option: EChartsCoreOption,
  renderer: "svg" | "canvas",
  label: string,
) {
  const color = palette(host);
  const text = color("--color-text");
  const muted = color("--color-text-muted");
  const border = color("--color-border");
  const fontFamily = getComputedStyle(host).fontFamily;
  const labelProbe = document.createElement("span");
  labelProbe.hidden = true;
  labelProbe.style.fontSize = "var(--type-label-small-font-size, 0.75rem)";
  host.shadowRoot!.append(labelProbe);
  const fontSize = Number.parseFloat(getComputedStyle(labelProbe).fontSize);
  labelProbe.remove();
  const axis = {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: muted, fontFamily, fontSize, margin: 12 },
    splitLine: { lineStyle: { color: border, type: "dashed" } },
  };
  const chart = init(
    viewport,
    {
      color: [1, 2, 3, 4, 5].map((index) => color(`--color-chart${index}`)),
      backgroundColor: "transparent",
      textStyle: { color: text, fontFamily, fontSize },
      categoryAxis: { ...axis, splitLine: { show: false } },
      valueAxis: axis,
      timeAxis: axis,
      logAxis: axis,
      legend: {
        textStyle: { color: muted, fontFamily },
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
      },
      line: { symbolSize: 6, lineStyle: { width: 2 } },
      bar: { itemStyle: { borderRadius: [4, 4, 0, 0] } },
      pie: { itemStyle: { borderColor: color("--color-surface"), borderWidth: 2 } },
      candlestick: {
        itemStyle: {
          color: color("--color-positive"),
          color0: color("--color-critical"),
          borderColor: color("--color-positive"),
          borderColor0: color("--color-critical"),
        },
      },
    },
    { renderer },
  );
  try {
    chart.setOption({
      animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      animationDuration: 250,
      grid: { left: 44, right: 20, top: 24, bottom: 36, containLabel: true },
      ...option,
      aria: { enabled: true, label: { description: label } },
      // Canvas/SVG tooltips keep authored text out of HTML parsing.
      tooltip: {
        trigger: "item",
        ...(option.tooltip as object),
        renderMode: "richText",
        backgroundColor: color("--color-surface-inverse"),
        borderWidth: 0,
        textStyle: { color: color("--color-on-surface-inverse"), fontFamily, fontSize },
      },
    });
    return chart;
  } catch (error) {
    chart.dispose();
    throw error;
  }
}
