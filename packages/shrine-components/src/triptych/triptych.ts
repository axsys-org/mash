import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";
import type { UIResizablePanel, ResizeDetail } from "@mash/ui/resizable";

import { baseStyles } from "../internal/base-styles.js";

export interface TriptychResizeDetail {
  /** Preferred sidebar width in pixels; zero restores the recipe's width. */
  sidebarWidth: number;
  /** Preferred inspector width in pixels; zero restores the recipe's width. */
  inspectorWidth: number;
}

const scrollParts = (region: string): string =>
  [
    `root:${region}-scroll-root`,
    `viewport:${region}-viewport`,
    `content:${region}-content`,
    ...["block", "inline"].flatMap((axis) => [
      `${axis}-scrollbar:${region}-${axis}-scrollbar`,
      `${axis}-scrollbar:scrollbar`,
      `${axis}-scrollbar:${axis}-scrollbar`,
      `${axis}-track:${region}-${axis}-track`,
      `${axis}-track:${axis}-track`,
      `${axis}-thumb:${region}-${axis}-thumb`,
      `${axis}-thumb:${axis}-thumb`,
    ]),
    `corner:${region}-scroll-corner`,
    "corner:scroll-corner",
  ].join(",");

/**
 * High-level composition window for Shrine.
 *
 * @tag sh-triptych
 * @summary Shows navigation, workspace, and inspector regions for a Shrine location.
 * @slot - Compatibility fallback for the `content` slot.
 * @slot content - The primary workspace content.
 * @slot inspector - The contextual inspector content.
 * @slot inspector-locator - Location context for the inspector.
 * @slot locator - The primary workspace location.
 * @slot sidebar - The navigation/sidebar content.
 * @slot navigate - Actions or navigation fixed beneath the sidebar.
 *
 * @csspart shell - The complete three-region workspace shell.
 * @csspart panels - The resizable primitive's layout-transparent group root.
 * @csspart panel-content - The resizable primitives' layout-transparent panel roots.
 * @csspart sidebar-resizer - Pointer and keyboard separator after the sidebar.
 * @csspart inspector-resizer - Pointer and keyboard separator before the inspector.
 * @csspart resizer-control - The focusable controls of both separators.
 * @csspart resizer-grip - The quiet visual grip of both separators.
 * @csspart sidebar-resizer-control - The sidebar's focusable separator.
 * @csspart inspector-resizer-control - The inspector's focusable separator.
 * @csspart sidebar - The sidebar region.
 * @csspart sidebar-body - The sidebar's scroll owner.
 * @csspart sidebar-scroll-root - The sidebar's bounded scroll-area root.
 * @csspart sidebar-viewport - The sidebar's native scroll viewport.
 * @csspart sidebar-content - The sidebar's content region.
 * @csspart navigate - Content fixed beneath the sidebar viewport.
 * @csspart main - The primary workspace region.
 * @csspart locator - Location content fixed above the main viewport.
 * @csspart main-body - The primary scroll owner.
 * @csspart main-scroll-root - The primary bounded scroll-area root.
 * @csspart main-viewport - The primary native scroll viewport.
 * @csspart main-content - The primary content region.
 * @csspart content - The authored primary-content slot.
 * @csspart inspector - The contextual inspector region.
 * @csspart inspector-locator - Location content fixed above the inspector viewport.
 * @csspart inspector-body - The inspector's scroll owner.
 * @csspart inspector-scroll-root - The inspector's bounded scroll-area root.
 * @csspart inspector-viewport - The inspector's native scroll viewport.
 * @csspart inspector-content - The inspector's content region.
 * @csspart scrollbar - All composed Mash scrollbar controls.
 * @csspart block-scrollbar - All block-axis scrollbar controls.
 * @csspart block-track - All block-axis tracks.
 * @csspart block-thumb - All block-axis thumbs.
 * @csspart inline-scrollbar - All inline-axis scrollbar controls.
 * @csspart inline-track - All inline-axis tracks.
 * @csspart inline-thumb - All inline-axis thumbs.
 * @csspart scroll-corner - All composed scroll-area corners.
 * @csspart sidebar-block-scrollbar - The sidebar's block-axis scrollbar.
 * @csspart sidebar-block-track - The sidebar's block-axis track.
 * @csspart sidebar-block-thumb - The sidebar's block-axis thumb.
 * @csspart sidebar-inline-scrollbar - The sidebar's inline-axis scrollbar.
 * @csspart sidebar-inline-track - The sidebar's inline-axis track.
 * @csspart sidebar-inline-thumb - The sidebar's inline-axis thumb.
 * @csspart sidebar-scroll-corner - The sidebar's scroll-area corner.
 * @csspart main-block-scrollbar - The workspace's block-axis scrollbar.
 * @csspart main-block-track - The workspace's block-axis track.
 * @csspart main-block-thumb - The workspace's block-axis thumb.
 * @csspart main-inline-scrollbar - The workspace's inline-axis scrollbar.
 * @csspart main-inline-track - The workspace's inline-axis track.
 * @csspart main-inline-thumb - The workspace's inline-axis thumb.
 * @csspart main-scroll-corner - The workspace's scroll-area corner.
 * @csspart inspector-block-scrollbar - The inspector's block-axis scrollbar.
 * @csspart inspector-block-track - The inspector's block-axis track.
 * @csspart inspector-block-thumb - The inspector's block-axis thumb.
 * @csspart inspector-inline-scrollbar - The inspector's inline-axis scrollbar.
 * @csspart inspector-inline-track - The inspector's inline-axis track.
 * @csspart inspector-inline-thumb - The inspector's inline-axis thumb.
 * @csspart inspector-scroll-corner - The inspector's scroll-area corner.
 * @cssstate inspector-open - Matches `:state(inspector-open)` while the inspector exists.
 * @cssstate sidebar-open - Matches `:state(sidebar-open)` while navigation is visible.
 * @cssstate resizable - Matches `:state(resizable)` when resizing is enabled at a wide layout.
 * @cssstate resizing - Matches `:state(resizing)` during direct manipulation.
 * @cssprop --sh-triptych-sidebar-width - Preferred navigation width, constrained by the recipe.
 * @cssprop --sh-triptych-inspector-width - Preferred inspector width, constrained by the recipe.
 * @fires {CustomEvent<TriptychResizeDetail>} sh-triptych-resize - Reports persistable preferred widths after a pointer/keyboard resize or reset.
 * @mashnode root workspace
 * @mashnode sidebar navigation root
 * @mashnode sidebar-viewport viewport sidebar
 * @mashnode sidebar-content content sidebar-viewport
 * @mashnode navigate navigation sidebar
 * @mashnode main main root
 * @mashnode locator location main
 * @mashnode main-viewport viewport main
 * @mashnode content content main-viewport
 * @slot main-footer - Optional persistent panel below the main content scroller.
 * @csspart main-footer - The authored lower workspace panel boundary.
 * @mashnode main-footer content main
 * @mashrole slot main-footer content main-footer
 * @mashrole part main-footer content main-footer
 * @mashnode inspector inspector root
 * @mashnode inspector-locator location inspector
 * @mashnode inspector-viewport viewport inspector
 * @mashnode inspector-content content inspector-viewport
 * @mashnode inspector-open open inspector
 * @mashnode sidebar-open open sidebar
 * @mashrole slot default content content
 * @mashrole slot content content content
 * @mashrole slot sidebar navigation sidebar-content
 * @mashrole slot navigate navigation navigate
 * @mashrole slot locator location locator
 * @mashrole slot inspector inspector inspector-content
 * @mashrole slot inspector-locator location inspector-locator
 * @mashrole part shell workspace root
 * @mashrole part sidebar navigation sidebar
 * @mashrole part sidebar-viewport viewport sidebar-viewport
 * @mashrole part sidebar-content content sidebar-content
 * @mashrole part navigate navigation navigate
 * @mashrole part main main main
 * @mashrole part locator location locator
 * @mashrole part main-viewport viewport main-viewport
 * @mashrole part content content content
 * @mashrole part inspector inspector inspector
 * @mashrole part inspector-locator location inspector-locator
 * @mashrole part inspector-viewport viewport inspector-viewport
 * @mashrole part inspector-content content inspector-content
 * @mashrole state inspector-open open inspector-open
 * @mashrole state sidebar-open open sidebar-open
 *
 * Note: there is deliberately no "inspector closed" example. `inspectorOpen`
 * is a boolean attribute that defaults to true, and a boolean attribute is
 * true whenever it is present. The catalogue control closes it by removing
 * the attribute.
 *
 * @example Default
 * <sh-triptych>
 *   <div slot="sidebar" class="demo">sidebar</div>
 *   <div slot="navigate" class="demo demo-quiet">navigate</div>
 *   <ui-path path="/some/dummy/path" slot="locator" class="demo demo-quiet">locator</ui-path>
 *   <div slot="content" class="demo demo-main">main</div>
 *   <div slot="inspector-locator" class="demo demo-quiet">inspector-locator</div>
 *   <div slot="inspector" class="demo">inspector</div>
 * </sh-triptych>
 */
export class ShrineTriptych extends LitElement {
  static override properties = {
    inspectorOpen: {
      type: Boolean,
      reflect: true,
      attribute: "inspector-open",
    },
    sidebarOpen: { type: Boolean, reflect: true, attribute: "sidebar-open" },
    resizable: { type: Boolean, reflect: true },
    sidebarWidth: { type: Number, attribute: "sidebar-width" },
    inspectorWidth: { type: Number, attribute: "inspector-width" },
    sidebarMinWidth: { type: Number, attribute: "sidebar-min-width" },
    sidebarMaxWidth: { type: Number, attribute: "sidebar-max-width" },
    inspectorMinWidth: { type: Number, attribute: "inspector-min-width" },
    inspectorMaxWidth: { type: Number, attribute: "inspector-max-width" },
    mainMinWidth: { type: Number, attribute: "main-min-width" },
    _availableWidth: { state: true },
    _filledSlots: { state: true },
  };

  /** Whether the contextual inspector region is present. */
  declare inspectorOpen: boolean;
  /** Whether navigation is visible. Set the property false to hide it; authored state is retained. */
  declare sidebarOpen: boolean;
  /** Opt into Mash's pointer and keyboard resizing without changing slot ownership. */
  declare resizable: boolean;
  /** Preferred sidebar width in pixels. Zero uses the catalogue recipe. */
  declare sidebarWidth: number;
  /** Preferred inspector width in pixels. Zero uses the catalogue recipe. */
  declare inspectorWidth: number;
  /** Minimum sidebar width in CSS pixels while desktop resizing is available. */
  declare sidebarMinWidth: number;
  /** Maximum sidebar width in CSS pixels, further constrained by available content space. */
  declare sidebarMaxWidth: number;
  /** Minimum inspector width in CSS pixels while desktop resizing is available. */
  declare inspectorMinWidth: number;
  /** Maximum inspector width in CSS pixels, further constrained by available content space. */
  declare inspectorMaxWidth: number;
  /** Space reserved for the primary content when both side panes are open. */
  declare mainMinWidth: number;
  declare private _availableWidth: number;
  declare private _filledSlots: ReadonlySet<string>;

  readonly #internals: ElementInternals;
  #observer: ResizeObserver | undefined;
  #recipeSidebarWidth = 240;
  #recipeInspectorWidth = 320;
  #readRecipe = false;

  constructor() {
    super();
    this.inspectorOpen = true;
    this.sidebarOpen = true;
    this.resizable = false;
    this.sidebarWidth = 0;
    this.inspectorWidth = 0;
    this.sidebarMinWidth = 192;
    this.sidebarMaxWidth = 480;
    this.inspectorMinWidth = 224;
    this.inspectorMaxWidth = 520;
    this.mainMinWidth = 320;
    this._availableWidth = 0;
    this._filledSlots = new Set();
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      if (!this.#readRecipe) {
        this.#recipeSidebarWidth = this.#recipeWidth("--sh-triptych-sidebar-width", 240);
        this.#recipeInspectorWidth = this.#recipeWidth("--sh-triptych-inspector-width", 320);
        this.#readRecipe = true;
      }
      this._availableWidth = Math.round(entry.contentRect.width);
    });
    this.#observer.observe(this);
  }

  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    super.disconnectedCallback();
  }

  get #canResize(): boolean {
    return this.resizable && this._availableWidth > 832;
  }

  #recipeWidth(property: string, fallback: number): number {
    // Let CSS resolve rem, calc and inherited tokens without measuring the
    // stacked mobile pane (which deliberately spans the whole container).
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;block-size:0;";
    probe.style.inlineSize =
      getComputedStyle(this).getPropertyValue(property).trim() || `${fallback}px`;
    this.renderRoot.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width || fallback;
  }

  #widths(): [number, number] {
    const clamp = (value: number, min: number, max: number): number =>
      Math.max(min, Math.min(Number.isFinite(value) ? value : min, max));
    const sidebarMin = Math.max(0, this.sidebarMinWidth);
    const inspectorMin = Math.max(0, this.inspectorMinWidth);
    let sidebar = clamp(
      this.sidebarWidth || this.#recipeSidebarWidth,
      sidebarMin,
      this.sidebarMaxWidth,
    );
    let inspector = clamp(
      this.inspectorWidth || this.#recipeInspectorWidth,
      inspectorMin,
      this.inspectorMaxWidth,
    );
    // The resize controls straddle pane edges without consuming layout width.
    const budget = Math.max(0, this._availableWidth - this.mainMinWidth);
    const total = (this.sidebarOpen ? sidebar : 0) + (this.inspectorOpen ? inspector : 0);
    if (total > budget) {
      const minimum = (this.sidebarOpen ? sidebarMin : 0) + (this.inspectorOpen ? inspectorMin : 0);
      const flexible = Math.max(0, total - minimum);
      const ratio = flexible ? Math.max(0, budget - minimum) / flexible : 0;
      if (this.sidebarOpen) sidebar = sidebarMin + (sidebar - sidebarMin) * ratio;
      if (this.inspectorOpen) inspector = inspectorMin + (inspector - inspectorMin) * ratio;
    }
    return [sidebar, inspector];
  }

  #reportWidths(): void {
    this.dispatchEvent(
      new CustomEvent<TriptychResizeDetail>("sh-triptych-resize", {
        detail: {
          sidebarWidth: this.sidebarWidth,
          inspectorWidth: this.inspectorWidth,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #onResize = (event: Event): void => {
    event.stopPropagation();
    if (!this.#canResize) return;
    const panel = (name: string): UIResizablePanel | null =>
      this.renderRoot.querySelector<UIResizablePanel>(`[part="${name}"]`);
    if (this.sidebarOpen) this.sidebarWidth = panel("sidebar")?.size || 0;
    if (this.inspectorOpen) this.inspectorWidth = panel("inspector")?.size || 0;
    // The primitive transfers pixels between adjacent panels. Content then
    // resumes filling the available space instead of becoming a fixed column.
    const main = panel("main");
    if (main) main.size = 0;
    this.#reportWidths();
  };

  #onResizePhase = (event: CustomEvent<ResizeDetail>): void => {
    if (event.detail.phase === "start") this.#internals.states.add("resizing");
    if (event.detail.phase === "end") this.#internals.states.delete("resizing");
  };

  /** Restore the recipe width; the other pane and authored content are retained. */
  resetPane(pane: "sidebar" | "inspector"): void {
    if (pane === "sidebar") this.sidebarWidth = 0;
    else this.inspectorWidth = 0;
    this.#reportWidths();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (this.#canResize) this.#internals.states.add("resizable");
    else this.#internals.states.delete("resizable");
    if (!this.#canResize || changed.has("sidebarOpen") || changed.has("inspectorOpen")) {
      this.#internals.states.delete("resizing");
    }
    if (changed.has("inspectorOpen")) {
      if (this.inspectorOpen) this.#internals.states.add("inspector-open");
      else this.#internals.states.delete("inspector-open");
    }
    if (changed.has("sidebarOpen")) {
      if (this.sidebarOpen) this.#internals.states.add("sidebar-open");
      else this.#internals.states.delete("sidebar-open");
    }
  }

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const next = new Set(this._filledSlots);
    if (slot.assignedNodes({ flatten: true }).length > 0) next.add(slot.name);
    else next.delete(slot.name);
    this._filledSlots = next;
  };

  protected override render(): TemplateResult {
    const resizing = this.#canResize;
    const [sidebarWidth, inspectorWidth] = this.#widths();
    return html`
      <ui-resizable
        part="shell"
        label="Workspace panels"
        exportparts="root:panels"
        @ui-resizable-change=${this.#onResize}
        @ui-resize=${this.#onResizePhase}
      >
        <ui-resizable-panel
          part="sidebar"
          class="sidebar"
          role="complementary"
          aria-label="Navigation"
          exportparts="root:panel-content"
          .visible=${this.sidebarOpen}
          .size=${resizing ? sidebarWidth : 0}
          .min=${resizing ? this.sidebarMinWidth : 0}
          .max=${resizing ? this.sidebarMaxWidth : Number.POSITIVE_INFINITY}
          ?inert=${!this.sidebarOpen}
        >
          <ui-scroll-area
            part="sidebar-body"
            label="Sidebar"
            mode="scrolling"
            size="medium"
            exportparts=${scrollParts("sidebar")}
          >
            <slot name="sidebar" slot="content" @slotchange=${this.#onSlotChange}></slot>
          </ui-scroll-area>

          <div part="navigate" class="navigate" ?hidden=${!this._filledSlots.has("navigate")}>
            <slot name="navigate" @slotchange=${this.#onSlotChange}></slot>
          </div>
        </ui-resizable-panel>

        ${
          resizing && this.sidebarOpen
            ? html`
                <ui-resizable-handle
                  part="sidebar-resizer"
                  label="Resize sidebar"
                  step="8"
                  title="Drag to resize · Arrow keys adjust · Double-click to reset"
                  exportparts="control:resizer-control,control:sidebar-resizer-control,grip:resizer-grip"
                  @dblclick=${() => this.resetPane("sidebar")}
                ></ui-resizable-handle>
              `
            : null
        }

        <ui-resizable-panel
          part="main"
          class="main"
          role="main"
          exportparts="root:panel-content"
          .min=${resizing ? this.mainMinWidth : 0}
        >
          <div part="locator" class="locator" ?hidden=${!this._filledSlots.has("locator")}>
            <slot name="locator" @slotchange=${this.#onSlotChange}></slot>
          </div>

          <ui-scroll-area
            part="main-body"
            label="Main workspace"
            mode="scrolling"
            size="medium"
            exportparts=${scrollParts("main")}
          >
            <slot name="content" slot="content" part="content"><slot></slot></slot>
          </ui-scroll-area>
          <div part="main-footer" ?hidden=${!this._filledSlots.has("main-footer")}>
            <slot name="main-footer" @slotchange=${this.#onSlotChange}></slot>
          </div>
        </ui-resizable-panel>

        ${
          this.inspectorOpen
            ? html`
                ${
                  resizing
                    ? html`
                        <ui-resizable-handle
                          part="inspector-resizer"
                          label="Resize inspector"
                          primary-panel="next"
                          step="8"
                          title="Drag to resize · Arrow keys adjust · Double-click to reset"
                          exportparts="control:resizer-control,control:inspector-resizer-control,grip:resizer-grip"
                          @dblclick=${() => this.resetPane("inspector")}
                        ></ui-resizable-handle>
                      `
                    : null
                }
                <ui-resizable-panel
                  part="inspector"
                  class="inspector"
                  role="complementary"
                  aria-label="Inspector"
                  exportparts="root:panel-content"
                  .size=${resizing ? inspectorWidth : 0}
                  .min=${resizing ? this.inspectorMinWidth : 0}
                  .max=${resizing ? this.inspectorMaxWidth : Number.POSITIVE_INFINITY}
                >
                  <div
                    part="inspector-locator"
                    class="locator"
                    ?hidden=${!this._filledSlots.has("inspector-locator")}
                  >
                    <slot name="inspector-locator" @slotchange=${this.#onSlotChange}></slot>
                  </div>

                  <ui-scroll-area
                    part="inspector-body"
                    label="Inspector"
                    mode="scrolling"
                    size="medium"
                    exportparts=${scrollParts("inspector")}
                  >
                    <slot name="inspector" slot="content" @slotchange=${this.#onSlotChange}></slot>
                  </ui-scroll-area>
                </ui-resizable-panel>
              `
            : null
        }
      </ui-resizable>
    `;
  }
}
