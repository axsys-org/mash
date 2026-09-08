export const edgelessPlaygroundMarkup = `
  <section
    class="catalog-example example-edgeless-playground"
    data-catalog-edgeless-playground
    tabindex="0"
  >
    <div class="example-edgeless-workspace">
      <aside class="example-edgeless-layers" aria-label="Canvas layers">
        <div class="example-editing-panel-heading">
          <span class="example-edgeless-panel-title">
            <ui-icon name="object.layers" label=""></ui-icon>
            <strong>Layers</strong>
          </span>
          <ui-badge size="small" data-edgeless-layer-count>0</ui-badge>
        </div>
        <ui-tree label="Canvas layers" data-edgeless-layer-tree></ui-tree>
        <div class="example-editing-panel-meta">
          <ui-icon name="status.information" label=""></ui-icon>
          <span>DOM blocks over one scene</span>
        </div>
      </aside>

      <main class="example-edgeless-canvas-shell">
        <div
          class="example-edgeless-viewport"
          data-edgeless-viewport
          aria-label="Edgeless block canvas"
        >
          <div class="example-edgeless-scene" data-edgeless-scene>
            <svg
              class="example-edgeless-connectors"
              data-edgeless-connectors
              viewBox="0 0 1440 900"
              aria-hidden="true"
            ></svg>
          </div>
          <div class="example-edgeless-marquee" data-edgeless-marquee hidden></div>
          <div class="example-edgeless-minimap" data-edgeless-minimap aria-hidden="true"></div>
        </div>

        <ui-toolbar class="example-edgeless-tools" label="Canvas tools">
          <ui-toggle-group
            mode="single"
            value="select"
            label="Canvas tool"
            data-edgeless-tool-group
          >
            <ui-toggle value="select" aria-label="Select" title="Select (V)">
              <ui-icon name="action.select" label=""></ui-icon>
            </ui-toggle>
            <ui-toggle value="hand" aria-label="Pan canvas" title="Pan canvas (H)">
              <ui-icon name="action.pan" label=""></ui-icon>
            </ui-toggle>
            <ui-toggle value="frame" aria-label="Create frame" title="Create frame (F)">
              <ui-icon name="action.frame" label=""></ui-icon>
            </ui-toggle>
            <ui-toggle value="text" aria-label="Create text block" title="Text block (T)">
              <ui-icon name="action.text" label=""></ui-icon>
            </ui-toggle>
            <ui-toggle value="connector" aria-label="Connect blocks" title="Connector (L)">
              <ui-icon name="action.connect" label=""></ui-icon>
            </ui-toggle>
          </ui-toggle-group>
          <ui-separator orientation="vertical"></ui-separator>
          <ui-menu
            class="example-edgeless-insert-menu"
            label="Insert block"
            density="compact"
            sizing="fixed"
            placement="bottom"
            align="start"
            offset="8"
            data-edgeless-insert-menu
          >
            <ui-button
              slot="trigger"
              type="button"
              size="xsmall"
              variant="quiet"
              compact
              aria-label="Insert block"
              title="Insert block"
            >
              <ui-icon name="action.add" label=""></ui-icon>
            </ui-button>
            <div class="example-edgeless-menu-header" slot="header">
              <span>Insert block</span>
              <ui-kbd>/</ui-kbd>
            </div>
            <div class="example-edgeless-menu-footer" slot="footer">
              <output data-edgeless-insert-count>0</output>
              <span>available</span>
            </div>
          </ui-menu>
        </ui-toolbar>

        <ui-toolbar class="example-edgeless-selection-bar" label="Selection actions" hidden>
          <ui-button
            type="button"
            size="xsmall"
            variant="quiet"
            compact
            aria-label="Duplicate selection"
            title="Duplicate"
            data-edgeless-action="duplicate"
          >
            <ui-icon name="action.duplicate" label=""></ui-icon>
          </ui-button>
          <ui-button
            type="button"
            size="xsmall"
            variant="quiet"
            compact
            aria-label="Bring selection forward"
            title="Bring forward"
            data-edgeless-action="bring-forward"
          >
            <ui-icon name="action.bring-forward" label=""></ui-icon>
          </ui-button>
          <ui-button
            type="button"
            size="xsmall"
            variant="quiet"
            compact
            aria-label="Add comment"
            title="Add comment"
            data-edgeless-action="focus-comments"
          >
            <ui-icon name="action.edit" label=""></ui-icon>
          </ui-button>
          <ui-separator orientation="vertical"></ui-separator>
          <ui-button
            type="button"
            size="xsmall"
            variant="quiet"
            compact
            tone="critical"
            aria-label="Delete selection"
            title="Delete"
            data-edgeless-action="delete"
          >
            <ui-icon name="action.delete" label=""></ui-icon>
          </ui-button>
        </ui-toolbar>

        <ui-toolbar class="example-edgeless-zoom" label="Canvas zoom">
          <ui-button
            type="button"
            size="xsmall"
            variant="quiet"
            compact
            aria-label="Zoom out"
            title="Zoom out"
            data-edgeless-action="zoom-out"
          >
            <ui-icon name="action.remove" label=""></ui-icon>
          </ui-button>
          <output data-edgeless-zoom>100%</output>
          <ui-button
            type="button"
            size="xsmall"
            variant="quiet"
            compact
            aria-label="Zoom in"
            title="Zoom in"
            data-edgeless-action="zoom-in"
          >
            <ui-icon name="action.add" label=""></ui-icon>
          </ui-button>
          <ui-button
            type="button"
            size="xsmall"
            variant="quiet"
            compact
            aria-label="Fit canvas content"
            title="Fit content (0)"
            data-edgeless-action="fit"
          >
            <ui-icon name="action.fit" label=""></ui-icon>
          </ui-button>
        </ui-toolbar>
      </main>

      <aside class="example-edgeless-inspector" aria-label="Canvas inspector">
        <ui-tabs
          class="example-edgeless-inspector-tabs"
          value="controls"
          label="Selection accessories"
          data-edgeless-inspector-tabs
        >
          <ui-tab slot="tab" value="controls">Controls</ui-tab>
          <ui-tab slot="tab" value="comments">
            Comments
            <ui-badge size="small" data-edgeless-comment-count>2</ui-badge>
          </ui-tab>

          <ui-tab-panel slot="panel" value="controls">
            <div class="example-edgeless-inspector-heading">
              <div>
                <strong data-edgeless-selection-title>Nothing selected</strong>
                <span data-edgeless-selection-kind>Canvas</span>
              </div>
              <ui-badge size="small" data-edgeless-selection-count>0</ui-badge>
            </div>
            <div class="example-edgeless-control-grid">
              <ui-field label="X">
                <ui-input
                  slot="control"
                  size="small"
                  inputmode="numeric"
                  data-edgeless-field="x"
                ></ui-input>
              </ui-field>
              <ui-field label="Y">
                <ui-input
                  slot="control"
                  size="small"
                  inputmode="numeric"
                  data-edgeless-field="y"
                ></ui-input>
              </ui-field>
              <ui-field label="Width">
                <ui-input
                  slot="control"
                  size="small"
                  inputmode="numeric"
                  data-edgeless-field="w"
                ></ui-input>
              </ui-field>
              <ui-field label="Height">
                <ui-input
                  slot="control"
                  size="small"
                  inputmode="numeric"
                  data-edgeless-field="h"
                ></ui-input>
              </ui-field>
            </div>
            <ui-separator></ui-separator>
            <div class="example-edgeless-inspector-actions">
              <ui-button
                type="button"
                size="small"
                variant="secondary"
                data-edgeless-action="duplicate"
              >Duplicate</ui-button>
              <ui-button
                type="button"
                size="small"
                variant="secondary"
                data-edgeless-action="fit-selection"
              >Fit selection</ui-button>
            </div>
            <div class="example-edgeless-selection-meta">
              <span>Projection</span>
              <strong>Web component</strong>
              <span>Geometry</span>
              <strong>Shared scene bound</strong>
            </div>
          </ui-tab-panel>

          <ui-tab-panel slot="panel" value="comments">
            <div class="example-edgeless-comment-thread" data-edgeless-comment-thread>
              <ui-bubble variant="secondary">Keep the frame readable when this becomes a presentation.</ui-bubble>
              <ui-bubble>The connector should survive switching back to document flow.</ui-bubble>
            </div>
            <ui-field label="New comment">
              <ui-textarea
                slot="control"
                rows="3"
                placeholder="Comment on the selection"
                data-edgeless-comment-input
              ></ui-textarea>
            </ui-field>
            <ui-button
              type="button"
              size="small"
              variant="primary"
              data-edgeless-action="add-comment"
            >Add comment</ui-button>
          </ui-tab-panel>
        </ui-tabs>
      </aside>
    </div>

    <footer class="example-edgeless-footer">
      <output data-edgeless-status>Select, move, resize, or connect a block.</output>
      <span><span data-edgeless-node-count>0</span> blocks</span>
      <span data-edgeless-coordinate>0, 0</span>
    </footer>
  </section>
`;
