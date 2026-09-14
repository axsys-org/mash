# Chart rendering

Mash uses a lazy Apache ECharts renderer behind `ui-chart`. The component owns
lifecycle, theme resolution, resize handling, accessible labeling, and the
slotted data alternative. Applications own their data and chart options.

The ordinary component import defines the element. The renderer loads when a
connected chart has a visible viewport. SVG is the default; `renderer="canvas"`
is available for denser plots. No chart engine is requested by pages without a
chart. Categorical colors come from `color.chart1` through `color.chart5`.
Tooltips use the inverse surface/text pair. Axes and legends use ordinary text,
muted text, and border roles. Explicit chart options can refine those defaults.

## Options reviewed

| Project                                                                    | Fit                                                                                                                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [Apache ECharts](https://echarts.apache.org/handbook/en/basics/import/)    | Broad chart coverage with modular imports; selected for the standard renderer.                                                |
| [Chart.js](https://www.chartjs.org/docs/latest/general/accessibility.html) | Canvas charts with author-supplied accessibility; viable for simpler chart sets.                                              |
| [uPlot](https://github.com/leeoniya/uPlot)                                 | Compact canvas time-series renderer, with a deliberately narrower feature set.                                                |
| [Observable Plot](https://observablehq.github.io/plot/getting-started)     | Useful grammar of SVG marks for exploratory/statistical plots; a possible separate adapter if that authoring model is needed. |
| [Web Awesome Chart](https://webawesome.com/docs/components/chart)          | Demonstrates a themed web-component wrapper around Chart.js; its chart component is part of the paid Pro offering.            |

The chosen renderer is [Apache-2.0 licensed](https://github.com/apache/echarts/blob/master/LICENSE).
A dependency patch adds explicit `.js` extensions to its declaration-module
imports so its types resolve in Mash's NodeNext build. It changes no runtime
code. Remove the patch once an upstream release resolves those imports.

## Authoring

Use an accessible label that states the subject, period, and units. Supply a
readable table or equivalent detailed text through `slot="fallback"` when exact
values matter. A visual tooltip alone is not an accessible data alternative.
ECharts' [accessibility support](https://apache.github.io/echarts-handbook/en/best-practices/aria/)
is enabled, and the component also accepts authored fallback content.

Choose SVG for ordinary charts and canvas when dataset size warrants it; the
[renderer guide](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/)
describes the tradeoffs. Aggregate or sample dense data in the application.
Keep totals, labels, and tooltips consistent with that transformation.

The example set includes lines, areas, stacked areas, grouped and horizontal
bars, negative values, pie and donut charts, radar, candlesticks, Sankey flows,
and a canvas scatter plot. These are demonstrations of the option interface,
not new component names or registration groups.

## Other web-component references

[Spectrum Web Components](https://opensource.adobe.com/spectrum-web-components/)
provides an open component system with explicit keyboard and accessibility
contracts for [tabs](https://opensource.adobe.com/spectrum-web-components/components/tabs/)
and [menus](https://opensource.adobe.com/spectrum-web-components/components/menu/).
Mash retains its own native controls, parts, and semantic tokens rather than
adding a second visual system to the bundle.

[Google Chart](https://github.com/GoogleWebComponents/google-chart) is an existing
custom-element wrapper, but its Google Charts loading model is a less direct fit
for a locally bundled, theme-controlled component library.

The ESM renderer is lazy. The optional single-file IIFE necessarily includes the
renderer and is approximately 1.28 MB minified (375 KB gzip); use component ESM
imports when transfer size matters.
