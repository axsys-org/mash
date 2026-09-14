import { LitElement, html, css, type PropertyValues, type TemplateResult } from "lit";
import { baseStyles } from "../internal/base-styles.js";
import type { EChartsOption } from "echarts";
import type { ECharts } from "echarts/core";

/**
 * Responsive data visualization with semantic colors and lazy SVG or canvas rendering.
 *
 * Set `option` from JavaScript or provide a JSON script in the default slot.
 * Include a concise label and a data table in the fallback slot for precise values.
 *
 * @tag ui-chart
 * @summary Plots data with theme-aware axes, legends, and tooltips.
 * @slot - A script with type="application/json" containing chart options.
 * @slot fallback - An accessible data table or equivalent text description.
 * @cssprop --color-chart1 - Categorical series color 1.
 * @cssprop --color-chart2 - Categorical series color 2.
 * @cssprop --color-chart3 - Categorical series color 3.
 * @cssprop --color-chart4 - Categorical series color 4.
 * @cssprop --color-chart5 - Categorical series color 5.
 * @cssprop --color-text - Chart text color.
 * @cssprop --color-text-muted - Axis and legend label color.
 * @cssprop --color-border - Grid line color.
 * @cssprop --color-surface - Surface separating pie slices.
 * @cssprop --color-surface-inverse - Tooltip background.
 * @cssprop --color-on-surface-inverse - Tooltip text.
 * @cssprop --type-label-small-font-size - Axis and label type size.
 * @csspart root - The chart and fallback boundary.
 * @csspart canvas - The renderer viewport.
 * @csspart fallback - The authored data alternative.
 * @csspart error - A readable configuration error.
 * @fires {CustomEvent} ui-chart-ready - The renderer has drawn the current data.
 * @fires {CustomEvent<{ message: string }>} ui-chart-error - Options could not be rendered.
 * @fires {CustomEvent<{ seriesName: string; name: string; value: unknown }>} ui-chart-select - A plotted item was activated.
 * @mashnode root chart
 * @mashnode canvas plot root
 * @mashnode fallback fallback root
 * @mashnode error error root
 * @example Trend
 * <ui-chart label="Weekly visits"><script type="application/json">{"xAxis":{"type":"category","data":["Mon","Tue","Wed"]},"yAxis":{"type":"value"},"series":[{"type":"line","data":[12,19,16]}]}</script></ui-chart>
 */
export class UIChart extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
    renderer: { type: String, reflect: true },
    option: { attribute: false },
    _error: { state: true },
  };
  /** Accessible chart title; include units and the data period. */
  declare label: string;
  /** SVG for ordinary charts; canvas for larger datasets. */
  declare renderer: "svg" | "canvas";
  /** ECharts options. Takes precedence over the slotted JSON configuration. */
  declare option: EChartsOption | undefined;
  protected _error = "";
  #chart?: ECharts;
  #revision = 0;
  #resize = new ResizeObserver(() => {
    if (this.#chart) this.#chart.resize();
    else void this.refresh();
  });
  #theme = new MutationObserver(() => void this.refresh());
  #content = new MutationObserver(() => void this.#redraw(false));
  #scheme = matchMedia("(prefers-color-scheme: dark)");
  #onScheme = () => void this.refresh();

  constructor() {
    super();
    this.label = "Chart";
    this.renderer = "svg";
  }
  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      [part="canvas"] {
        inline-size: 100%;
        block-size: 20rem;
      }
      [part="error"][hidden] {
        display: none;
      }
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();
    this.#resize.observe(this);
    const themeAttributes = { attributes: true, attributeFilter: ["data-theme", "style", "class"] };
    this.#theme.observe(this, themeAttributes);
    for (let node = this.parentElement; node; node = node.parentElement) {
      this.#theme.observe(node, themeAttributes);
    }
    this.#content.observe(this, { childList: true, subtree: true, characterData: true });
    this.#scheme.addEventListener("change", this.#onScheme);
    void this.updateComplete.then(() => this.refresh());
  }
  override disconnectedCallback(): void {
    ++this.#revision;
    this.#resize.disconnect();
    this.#theme.disconnect();
    this.#content.disconnect();
    this.#scheme.removeEventListener("change", this.#onScheme);
    this.#chart?.dispose();
    this.#chart = undefined;
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("option") || changed.has("renderer") || changed.has("label"))
      void this.#redraw(!changed.has("option"));
  }
  /** Redraw after updating tokens in a stylesheet or changing chart options in place. */
  async refresh(): Promise<void> {
    await this.#redraw(true);
  }
  async #redraw(preserveInteraction: boolean): Promise<void> {
    const viewport = this.renderRoot.querySelector<HTMLElement>('[part="canvas"]');
    if (!this.isConnected || !viewport || !viewport.clientWidth) return;
    const revision = ++this.#revision;
    try {
      const option =
        this.option ??
        JSON.parse(this.querySelector('script[type="application/json"]')?.textContent || "{}");
      const { drawChart } = await import("./renderer.js");
      if (revision !== this.#revision || !this.isConnected) return;
      const previous = preserveInteraction ? this.#chart?.getOption() : undefined;
      this.#chart?.dispose();
      this.#chart = undefined;
      this.#chart = drawChart(this, viewport, option, this.renderer, this.label);
      if (previous) {
        const state: Record<string, unknown> = {};
        if (Array.isArray(previous.dataZoom))
          state.dataZoom = previous.dataZoom.map(
            ({ start, end }: { start: number; end: number }) => ({ start, end }),
          );
        if (Array.isArray(previous.legend))
          state.legend = previous.legend.map(
            ({ selected }: { selected: Record<string, boolean> }) => ({ selected }),
          );
        this.#chart.setOption(state);
      }
      this.#chart.on("click", (data: unknown) => {
        const point = data as { seriesName: string; name: string; value: unknown };
        this.dispatchEvent(
          new CustomEvent("ui-chart-select", {
            bubbles: true,
            composed: true,
            detail: { seriesName: point.seriesName, name: point.name, value: point.value },
          }),
        );
      });
      this._error = "";
      this.dispatchEvent(new CustomEvent("ui-chart-ready", { bubbles: true, composed: true }));
    } catch (error) {
      if (revision !== this.#revision) return;
      this.#chart?.dispose();
      this.#chart = undefined;
      this._error = error instanceof Error ? error.message : String(error);
      this.dispatchEvent(
        new CustomEvent("ui-chart-error", {
          bubbles: true,
          composed: true,
          detail: { message: this._error },
        }),
      );
    }
  }
  protected override render(): TemplateResult {
    return html`<figure part="root">
      <div part="canvas" role="img" aria-label=${this.label}></div>
      <p part="error" role="status" ?hidden=${!this._error}>${this._error}</p>
      <div part="fallback"><slot name="fallback"></slot></div>
      <slot hidden></slot>
    </figure>`;
  }
}
