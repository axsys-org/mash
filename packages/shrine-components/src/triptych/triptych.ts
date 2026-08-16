import { LitElement, css, html, type TemplateResult } from "lit";

/**
 * High level composition window for Shrine
 *
 * @tag sh-triptych
 * @summary Shows the navigation chrome for a location in the Shrine namespace
 * @slot - The main window
 * @slot inspector - The right sidebar
 * @slot inspector-locator - Header strip above the inspector content
 * @slot locator - The browser location
 * @slot sidebar - The left sidebar
 * @slot navigate - Bottom drawer of left sidebar
 *
 * @example Default
 * <sh-triptych>
 *   <div slot="sidebar" class="demo">sidebar</div>
 *   <div slot="navigate" class="demo demo-quiet">navigate</div>
 *   <ui-path path="/some/dummy/path" slot="locator" class="demo demo-quiet">locator</ui-path>
 *   <div class="demo demo-main">main</div>
 *   <div slot="inspector-locator" class="demo demo-quiet">inspector-locator</div>
 *   <div slot="inspector" class="demo">inspector</div>
 * </sh-triptych>
 *
 * Note: there is deliberately no "inspector closed" example. `inspectorOpen`
 * is a boolean attribute that defaults to true, and a boolean attribute is
 * true whenever it is present — `inspectoropen="false"` still reads as true.
 * Static markup therefore cannot close the inspector; only the property can.
 * See the catalog's toggle, which works because it removes the attribute.
 */
export class ShrineTriptych extends LitElement {
  static override properties = {
    inspectorOpen: { type: Boolean },
  };

  /** is inspector pane open? */
  declare inspectorOpen: boolean;

  constructor() {
    super();
    this.inspectorOpen = true;
  }

  static override styles = css`
    :host {
      display: block;
      height: 100dvh;
    }

    .shell {
      height: 100%;
      display: grid;
      grid-template-columns:
        240px
        minmax(0, 1fr)
        320px;

      overflow: hidden;
    }

    .shell.inspector-closed {
      grid-template-columns:
        240px
        minmax(0, 1fr);
    }

    .sidebar {
      display: grid;
      grid-template-rows:
        minmax(0, 1fr)
        auto;
    }

    .main,
    .inspector {
      display: grid;
      grid-template-rows:
        auto
        minmax(0, 1fr);

      min-width: 0;
    }

    .sidebar-main,
    .main-content,
    .inspector-content {
      overflow: auto;
      min-height: 0;
    }

    .locator {
      min-height: 32px;
    }

    .navigate {
      min-height: 40px;
    }
  `;

  protected override render(): TemplateResult {
    return html`
      <div class="shell ${this.inspectorOpen ? "" : "inspector-closed"}">
        <aside class="sidebar">
          <div class="sidebar-main">
            <slot name="sidebar"></slot>
          </div>

          <div class="navigate">
            <slot name="navigate"></slot>
          </div>
        </aside>

        <main class="main">
          <div class="locator">
            <slot name="locator"></slot>
          </div>

          <div class="main-content">
            <slot></slot>
          </div>
        </main>

        ${
          this.inspectorOpen
            ? html`
                <aside class="inspector">
                  <div class="locator">
                    <slot name="inspector-locator"></slot>
                  </div>

                  <div class="inspector-content">
                    <slot name="inspector"></slot>
                  </div>
                </aside>
              `
            : null
        }
      </div>
    `;
  }
}
