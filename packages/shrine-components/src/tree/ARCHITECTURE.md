# Inline path lane composition

- `sh-sidebar` owns regions and the bounded navigation scroller.
- `sh-tree` presents the authored hierarchy. Revision variants measure visible
  rows and draw their decorative graph. Its public
  parts are `root`, `tree`, `graph`, `canvas`, `edge`, `node-anchor`,
  `node-hit-target`, `node`, and the optional `capsule` / `capsule-shape` /
  `capsule-label`. Lane, current and selected parts carry graph styling state.
- `topology.ts` projects explicit or implicit connections without DOM or state.
- `ui-tree` alone owns hierarchy semantics, roving focus and selection requests.
- `ui-tree-item` owns disclosure and the label, icon, meta, actions, preview and
  children slots. `ui-path` supplies an address label. Expanded record content
  belongs in `slot="preview"`; inspect buttons belong in `slot="actions"`,
  never in the decorative SVG.
- The consuming application owns namespace reads, navigation, expansion state,
  filtering and inspection. Catalogue examples own only their fixture data.

Recipes remain in `src/catalogue/mash.css`; components do not embed skins.
Graph hit regions forward activation to the authored row. They introduce no
extra focus stops or selection store.

## Namespace presentation

Use `sh-tree variant="namespace"` for ordinary namespace containment. The
slotted, nested `ui-tree` is authoritative; this variant does not measure or
render revision nodes, parent edges, capsules or pointer proxies. It ignores
revision metadata and releases previously measured row offsets if the variant
changes. The Mash recipe draws compact logical-start guide lines around the
real nested child groups, so long preview content cannot overlap graph nodes.

### Shared row composition

The namespace recipe owns the complete row, not just the guides. Use the existing
`icon`, `disclosure`, `label`, `meta`, `actions`, and `preview` slots without a
consumer row skin:

- Basenames lead at the compact 12px body tier. `ui-path size="small"` with an
  authored title is flattened into the row; its canonical path remains intact.
- An authored `meta` summary uses the 11px caption tier and a flexible, clipped
  lane. Complete text remains in the DOM. Neither labels nor summaries are
  rewritten, shortened in data, or inferred by the component.
- Stock `ui-icon size="small"` glyphs occupy 16px lanes. Use the right-facing
  `navigation.disclosure`; the recipe rotates it down when expanded and left
  for a collapsed RTL branch. Text fallbacks already change direction in the
  primitive and are not rotated twice.
- Rows have a 24px fine-pointer minimum and 8px control-radius corners. Coarse pointers reserve a real 44px row
  and a 44px disclosure region. Leaves have no disclosure or expansion ARIA;
  the first authored icon/label starts at the lane edge with no phantom toggle padding.
- Sibling `ui-button icon-only size="small" variant="ghost"` actions remain
  separate from the row button and require `aria-label`. They appear on hover,
  keyboard focus, current location or independent preview-open state, and stay
  visible on touch. Hidden-at-rest actions remain keyboard reachable.
- Current location has a quiet fill with no edge stroke. Selection has a
  distinct neutral fill; neither substitutes for native focus. Forced colors
  use system colors, including a contrasting inset ring on selected rows.

There is no additional hover fill. `actions-display="overlay"` reveals actions
over the row on hover/focus without reserving width; its fade consumes the same
current/selected surface as the control. Both top-level and child rows use a
one-hairline gap. Touch retains separate non-overlapping actions.

The guide bisects the disclosure lane (12px logical margin on fine pointers).
Child indentation derives from the actual disclosure width and control gap,
aligning a child's first lane with its parent's identity; it grows with the
44px touch disclosure. Applications
own depth-spend limits within resizable rails: preserve enough content width for
all native targets and a readable label, rather than shrinking touch targets.

### Ownership boundaries

CSS uses an [`@scope` boundary](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@scope)
rooted at the directly slotted `ui-tree`, ending at preview content and independent
nested `ui-tree`/`sh-tree` instances. Nested namespace trees start their own scope;
an unrelated tree in a record preview retains its own recipe. Scope prevents row
paint leakage, not ordinary CSS inheritance from authored size/theme contexts.

The nearest `ui-tree` also owns behavioral identity: item enumeration, imperative
identity lookup, selection, toggling and roving focus do not cross an independent
tree boundary. Parent/sibling metadata stops at that boundary, and namespace
offset cleanup does not erase offsets owned by a nested revision graph.

A name may contain both record data and descendants. Put the data in the
`ui-tree-item` preview slot, before nested items in the children slot. By default,
one parent-controlled `expanded` state reveals both. Set `previewOpen` to a
boolean to control record details independently: `preview-open="false"` keeps
the preview closed during hierarchy exploration; an empty `preview-open`
attribute opens it even when the children are collapsed. Setting the property
back to `null` (or removing the attribute) restores the compatibility behavior.
An independently previewed leaf does not acquire a false hierarchy disclosure.
The consuming app supplies the labeled preview action and its `aria-expanded`
state in the actions slot, and can construct preview content only on request.
The preview is an accessible
region named by its row, outside the row button; its fields and actions retain
their own keyboard behavior. Preview text does not become the row's label,
identity or typeahead content. A preview-only record is expandable without
inventing a child item. Use `kind="folder"` before lazy reads return so the
disclosure is available even while no preview or child items exist.

Set `activation="split"` on namespace items when expanding should not navigate.
Clicking the disclosure requests expansion only; clicking the label requests
selection only. Left/Right retain native tree expansion behavior, while Enter
and Space select without toggling. The default `activation="combined"` preserves
the existing row-select-and-expand interaction for other consumers.

```html
<sh-tree variant="namespace">
  <ui-tree slot="tree" label="Namespace">
    <ui-tree-item path="/hello" kind="folder" activation="split" expanded>
      <span slot="label">hello</span>
      <sh-myth slot="preview"><!-- Real record slots --></sh-myth>
      <ui-tree-item
        slot="children"
        path="/hello/op"
        kind="folder"
        activation="split"
        title="op"
      ></ui-tree-item>
    </ui-tree-item>
  </ui-tree>
</sh-tree>
```

## Explicit graph projection

When explicitly projecting namespace containment into a revision-style graph,
give every row an explicit `data-shrine-parents`.
Use an empty value on roots and the real parent identity on children. Omission
retains the historical revision-list convention of connecting the next visible
same-lane row; that convention must not fabricate ancestry among siblings.
Filtering removes hidden rows from geometry, and missing endpoints get no edge.
Derived overlays must come from the application's data, never from lane color
or inference based on a row's label.
