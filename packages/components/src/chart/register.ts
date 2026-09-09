import { UIChart } from "./chart.js";
if (!customElements.get("ui-chart")) customElements.define("ui-chart", UIChart);
export * from "./chart.js";
declare global {
  interface HTMLElementTagNameMap {
    "ui-chart": UIChart;
  }
}
