import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * The persistent contextual lane shared by Shrine workspaces.
 *
 * Navigation, search, collections and view selection remain authored controls.
 * This composition owns their regions and a single bounded content scroller,
 * not namespace identity, routes, persistence, or a second selection model.
 *
 * @tag sh-sidebar
 * @summary Composes a contextual locator, search, views and tools around one scroll owner.
 * @slot locator - Current context or a sh-locator.
 * @slot search - An authored search control or command launcher.
 * @slot shortcuts - Contextual navigation and actions.
 * @slot collections - Mounted or saved references above the current view.
 * @slot views - Authored view selectors, such as tabs or a segmented control.
 * @slot - The selected view's authored content.
 * @slot footer - Persistent tools and connection information.
 * @csspart root - The complete sidebar region.
 * @csspart locator - The current context region.
 * @csspart search - The search region.
 * @csspart shortcuts - The contextual actions region.
 * @csspart collections - The mounted-reference region.
 * @csspart views - The view-selector region.
 * @csspart body - The bounded content scroll area.
 * @csspart scroll-root - The scroll-area root.
 * @csspart viewport - The native scroll viewport.
 * @csspart content - The scroll content.
 * @csspart scrollbar - Shared styling boundary for both native-backed scrollbar controls.
 * @csspart block-scrollbar - The vertical scroll control.
 * @csspart block-track - The vertical scroll track.
 * @csspart block-thumb - The vertical viewport indicator.
 * @csspart inline-scrollbar - The horizontal scroll control.
 * @csspart inline-track - The horizontal scroll track.
 * @csspart inline-thumb - The horizontal viewport indicator.
 * @csspart scroll-corner - The scrollbar junction.
 * @csspart footer - The persistent tools region.
 * @mashnode root navigation
 * @mashnode locator location root
 * @mashnode search search root
 * @mashnode shortcuts actions root
 * @mashnode body viewport root
 * @mashnode collections collection body
 * @mashnode views navigation root
 * @mashnode content content body
 * @mashnode footer actions root
 * @mashrole slot locator location locator
 * @mashrole slot search search search
 * @mashrole slot shortcuts actions shortcuts
 * @mashrole slot collections collection collections
 * @mashrole slot views navigation views
 * @mashrole slot default content content
 * @mashrole slot footer actions footer
 * @mashrole part root navigation root
 * @mashrole part locator location locator
 * @mashrole part search search search
 * @mashrole part shortcuts actions shortcuts
 * @mashrole part collections collection collections
 * @mashrole part views navigation views
 * @mashrole part body viewport body
 * @mashrole part scroll-root viewport body
 * @mashrole part viewport viewport body
 * @mashrole part content content content
 * @mashrole part footer actions footer
 * @example Contextual navigation
 * <sh-sidebar label="Namespace navigation" style="block-size: 28rem">
 *   <strong slot="locator">Shrine workspace</strong>
 *   <ui-input slot="search" label="Find a path" placeholder="Search namespace"></ui-input>
 *   <ui-button slot="shortcuts" variant="ghost">Namespace root</ui-button>
 *   <ui-tree label="Namespace"><ui-tree-item title="app" value="app"></ui-tree-item><ui-tree-item title="boot" value="boot"></ui-tree-item></ui-tree>
 *   <span slot="footer">Local session</span>
 * </sh-sidebar>
 */
export class ShrineSidebar extends LitElement {
  static override properties = {
    label: { type: String },
    _filledSlots: { state: true },
  };

  /** Accessible label for this sidebar's content region. */
  declare label: string;
  declare private _filledSlots: ReadonlySet<string>;

  constructor() {
    super();
    this.label = "Context navigation";
    this._filledSlots = new Set();
  }

  static override styles = baseStyles;

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const next = new Set(this._filledSlots);
    if (
      slot
        .assignedNodes({ flatten: true })
        .some((node) => node.nodeType === 1 || node.textContent?.trim())
    )
      next.add(slot.name);
    else next.delete(slot.name);
    this._filledSlots = next;
  };

  protected override render(): TemplateResult {
    return html`
      <div part="root">
        <div part="locator" ?hidden=${!this._filledSlots.has("locator")}>
          <slot name="locator" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <div part="search" ?hidden=${!this._filledSlots.has("search")}>
          <slot name="search" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <div part="shortcuts" ?hidden=${!this._filledSlots.has("shortcuts")}>
          <slot name="shortcuts" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <div part="views" ?hidden=${!this._filledSlots.has("views")}>
          <slot name="views" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <ui-scroll-area
          part="body"
          .label=${this.label}
          mode="scrolling"
          size="medium"
          exportparts="root:scroll-root,viewport:viewport,content:content,block-scrollbar:scrollbar,block-scrollbar:block-scrollbar,block-track:block-track,block-thumb:block-thumb,inline-scrollbar:scrollbar,inline-scrollbar:inline-scrollbar,inline-track:inline-track,inline-thumb:inline-thumb,corner:scroll-corner"
        >
          <div slot="content">
            <div part="collections" ?hidden=${!this._filledSlots.has("collections")}>
              <slot name="collections" @slotchange=${this.#onSlotChange}></slot>
            </div>
            <slot></slot>
          </div>
        </ui-scroll-area>
        <div part="footer" ?hidden=${!this._filledSlots.has("footer")}>
          <slot name="footer" @slotchange=${this.#onSlotChange}></slot>
        </div>
      </div>
    `;
  }
}
