export const blocksuitePlaygroundMarkup = `
  <section
    class="catalog-example example-blocksuite-playground"
    data-catalog-blocksuite-playground
    data-blocksuite-state="loading"
  >
    <header class="example-blocksuite-header">
      <div class="example-blocksuite-identity">
        <span class="example-blocksuite-mark" aria-hidden="true">B</span>
        <span>
          <strong>BlockSuite in Mash</strong>
          <small>Real document engine · native editor widgets</small>
        </span>
      </div>

      <ui-toolbar class="example-blocksuite-mash-toolbar" label="Editor shell controls">
        <ui-toggle-group
          mode="single"
          value="page"
          label="Editor mode"
          data-blocksuite-mode-group
        >
          <ui-toggle value="page" aria-label="Page editor" title="Page editor">
            <ui-icon name="object.document" label=""></ui-icon>
            <span>Page</span>
          </ui-toggle>
          <ui-toggle value="edgeless" aria-label="Edgeless editor" title="Edgeless editor">
            <ui-icon name="object.layers" label=""></ui-icon>
            <span>Edgeless</span>
          </ui-toggle>
        </ui-toggle-group>
        <ui-separator orientation="vertical"></ui-separator>
        <ui-button
          type="button"
          size="small"
          variant="quiet"
          compact
          data-blocksuite-action="undo"
          aria-label="Undo"
          title="Undo"
        >
          <ui-icon name="navigation.back" label=""></ui-icon>
        </ui-button>
        <ui-button
          type="button"
          size="small"
          variant="quiet"
          compact
          data-blocksuite-action="redo"
          aria-label="Redo"
          title="Redo"
        >
          <ui-icon name="action.refresh" label=""></ui-icon>
        </ui-button>
      </ui-toolbar>

      <ui-badge class="example-blocksuite-license" size="small" tone="neutral">MIT · 0.22.4</ui-badge>
    </header>

    <main class="example-blocksuite-editor-shell" data-blocksuite-editor-shell>
      <div class="example-blocksuite-loading" data-blocksuite-loading role="status">
        <ui-spinner label="Loading BlockSuite"></ui-spinner>
        <span>Booting the real BlockSuite editor…</span>
      </div>
    </main>

    <footer class="example-blocksuite-footer">
      <output data-blocksuite-status>Loading BlockSuite runtime…</output>
      <span>Use the editor’s own slash menu, selection toolbar, canvas tools, and zoom controls.</span>
    </footer>
  </section>
`;
