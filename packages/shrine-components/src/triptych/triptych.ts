import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

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
 * @cssstate inspector-open - Matches `:state(inspector-open)` while the inspector exists.
 * @mashnode root workspace
 * @mashnode sidebar navigation root
 * @mashnode sidebar-viewport viewport sidebar
 * @mashnode sidebar-content content sidebar-viewport
 * @mashnode navigate navigation sidebar
 * @mashnode main main root
 * @mashnode locator location main
 * @mashnode main-viewport viewport main
 * @mashnode content content main-viewport
 * @mashnode inspector inspector root
 * @mashnode inspector-locator location inspector
 * @mashnode inspector-viewport viewport inspector
 * @mashnode inspector-content content inspector-viewport
 * @mashnode inspector-open open inspector
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
    inspectorOpen: { type: Boolean, reflect: true, attribute: "inspector-open" },
    _filledSlots: { state: true },
  };

  /** Whether the contextual inspector region is present. */
  declare inspectorOpen: boolean;
  declare private _filledSlots: ReadonlySet<string>;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.inspectorOpen = true;
    this._filledSlots = new Set();
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("inspectorOpen")) return;
    if (this.inspectorOpen) this.#internals.states.add("inspector-open");
    else this.#internals.states.delete("inspector-open");
  }

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const next = new Set(this._filledSlots);
    if (slot.assignedNodes({ flatten: true }).length > 0) next.add(slot.name);
    else next.delete(slot.name);
    this._filledSlots = next;
  };

  protected override render(): TemplateResult {
    return html`
      <div part="shell" class="shell ${this.inspectorOpen ? "" : "inspector-closed"}">
        <aside part="sidebar" class="sidebar">
          <ui-scroll-area
            part="sidebar-body"
            label="Sidebar"
            exportparts="root:sidebar-scroll-root,viewport:sidebar-viewport,content:sidebar-content"
          >
            <slot name="sidebar" slot="content" @slotchange=${this.#onSlotChange}></slot>
          </ui-scroll-area>

          <div part="navigate" class="navigate" ?hidden=${!this._filledSlots.has("navigate")}>
            <slot name="navigate" @slotchange=${this.#onSlotChange}></slot>
          </div>
        </aside>

        <main part="main" class="main">
          <div part="locator" class="locator" ?hidden=${!this._filledSlots.has("locator")}>
            <slot name="locator" @slotchange=${this.#onSlotChange}></slot>
          </div>

          <ui-scroll-area
            part="main-body"
            label="Main workspace"
            exportparts="root:main-scroll-root,viewport:main-viewport,content:main-content"
          >
            <slot name="content" slot="content" part="content"><slot></slot></slot>
          </ui-scroll-area>
        </main>

        ${
          this.inspectorOpen
            ? html`
                <aside part="inspector" class="inspector">
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
                    exportparts="root:inspector-scroll-root,viewport:inspector-viewport,content:inspector-content"
                  >
                    <slot name="inspector" slot="content" @slotchange=${this.#onSlotChange}></slot>
                  </ui-scroll-area>
                </aside>
              `
            : null
        }
      </div>
    `;
  }
}
