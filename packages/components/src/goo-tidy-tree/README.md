# Goo tidy tree

`<goo-tidy-tree>` spatializes an already-rendered parent relation. It owns geometry
and a camera only. Goo retains node identity, membership, presentation, actions,
and all application semantics.

```js
import "@mash/ui/goo-tidy-tree";
```

```html
<goo-tidy-tree direction="right" zoom fit style="height: 500px">
  <goo-tree-node subject="/foo"><article>Any HTML</article></goo-tree-node>
  <goo-tree-node subject="/foo/bar" parent="/foo">
    <button>Ordinary interactive UI</button>
  </goo-tree-node>
</goo-tidy-tree>
```

Only direct `goo-tree-node` children participate. They stay in light DOM and are
never moved, cloned, or rebuilt. Siblings follow DOM order. Subjects are nonempty
opaque strings; omit `parent` for the single root. Even an empty `parent` is a
reference, not an omitted parent. Invalid membership logs one warning per distinct
consecutive error, clears stale links, and displays the existing nodes in normal
flow. Fixing the DOM automatically restores the layout.

| Attribute   | Default | Meaning                                                 |
| ----------- | ------- | ------------------------------------------------------- |
| `direction` | `right` | `right`, `left`, `down`, `up`                           |
| `gap`       | `24`    | Nonnegative clear sibling/subtree spacing in CSS pixels |
| `level-gap` | `64`    | Nonnegative clear parent/child spacing in CSS pixels    |
| `zoom`      | absent  | Background drag and wheel/pinch camera gestures         |
| `fit`       | absent  | Fit once after a valid layout with a visible viewport   |

Invalid direction/spacing values fall back to defaults. The host defaults to
400px tall; set its height for your application. Without zoom it scrolls. Nodes
default to max-content width, with no presentation styling. Give nodes a width
or max-width when their HTML should wrap. The component owns their `transform`,
position, and stacking order; apply presentation transforms to inner elements.
Use border/padding inside node boxes rather than external margins for spacing.

- `layout()` schedules a layout, batched with DOM/resize invalidations.
- `fit()` fits the current bounds without enlarging above 100%; returns false
  before valid layout or in a zero-size viewport. Works without `zoom`.
- `center(subject)` centers the current node at the current scale and returns
  false for an unknown subject. Call camera methods after `goo-tree-layout` when
  adding new membership in the same task.

Mutations and later resizes never automatically reset the camera. Removing `zoom`
disables gestures and keeps the existing camera. Gestures starting anywhere inside
a node are left to its content, including wheel events; use the background to zoom.
No roles, focus behavior, selection, collapse, or keyboard navigation are added.

`goo-tree-layout` bubbles after successful layout with
`detail: { nodeCount, width, height }` in scene CSS pixels. Shadow parts are
`viewport`, `scene`, and `edges`. Edges use currentColor with
`--goo-tree-edge-width` (1.5px) and `--goo-tree-edge-opacity` (0.35).

The layout uses `d3-hierarchy` and `d3-flextree`. `d3-selection` only attaches
`d3-zoom`; all DOM rendering uses native APIs. ResizeObserver border boxes are
measured before grouped geometry writes, independently of camera scaling.

Run `pnpm build`, then `pnpm --filter @mash/catalog dev` and open
`/goo-tidy-tree.html` for the standalone interactive demo. Browser regressions:
`pnpm --filter @mash/ui exec vitest run src/goo-tidy-tree/goo-tidy-tree.test.ts`.
