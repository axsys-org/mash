# Goo tree

`goo-tree` is a thin event adapter around Web Awesome 3.14's tree. Web Awesome
owns indentation, disclosure chrome, focus, keyboard traversal, ARIA, and
immediate selection interaction. Goo owns subjects, DOM membership, presentation,
durable state, materialization, and actions.

```js
import "@mash/ui/goo-tree";
// Optional if the application already provides Web Awesome theme tokens:
import "@mash/ui/goo-tree/theme.css";
```

```html
<goo-tree selection="single">
  <wa-tree aria-label="Source files">
    <wa-tree-item subject="/src" branch expanded>
      <span>src</span>
      <wa-tree-item subject="/src/main.js">
        <span><strong>main.js</strong> <button>Inspect</button></span>
      </wa-tree-item>
      <wa-tree-item subject="/src/lib" branch lazy>lib</wa-tree-item>
    </wa-tree-item>
  </wa-tree>
</goo-tree>
```

## One hierarchy

There is deliberately no `goo-tree-item`. WA's traversal and selection query
literal `wa-tree-item` descendants and use their parent elements. Per-item shadow
wrappers would require a mirrored hierarchy or replacement traversal. Instead,
Goo renders one direct `wa-tree` child with nested `wa-tree-item` elements. The
adapter never moves, clones, serializes, or renders these nodes. Item presentation
uses WA's **default slot**, not `slot="content"`. WA itself assigns nested items
to its `children` slot. Do not nest another tree inside this tree's labels.

`subject` is a required, nonempty opaque string, unique within the tree. Missing
or duplicate subjects produce a diagnostic without destroying the DOM. There is
no `parent` attribute: element nesting is the relation.

`branch` on a WA item retains a disclosure affordance even with no materialized
children. `lazy` independently means materialization is needed. An empty `branch`
without `lazy` expands normally and does not request loading. Materialized children
automatically make an item a branch even without a hint.

## State and events

The wrapper's `selection` is `single` by default, or `multiple` / `none`. Multiple
uses WA's native checkbox semantics, including parent/descendant propagation;
events contain the complete resulting selection in DOM order. None disables row
selection while retaining disclosure and keyboard focus traversal.

All Goo events bubble and are composed. Their details contain strings/booleans
only, never WA instances:

| Event                | Detail                  |
| -------------------- | ----------------------- |
| `goo-tree-toggle`    | `{ subject, expanded }` |
| `goo-tree-select`    | `{ subjects }`          |
| `goo-tree-lazy-load` | `{ subject }`           |

WA updates `selected` and `expanded` immediately and reflects them into this same
DOM. There is no adapter copy of desired selection or expanded membership. Goo
should persist the emitted state when it matters, then render authoritative
`selected` / `expanded` attributes (or assign WA's corresponding properties).
To reject an interaction, write the desired value back to the **live** element;
virtual-DOM renderers should use live property reconciliation rather than skip
a write because their previous virtual value was unchanged. Focus is ephemeral
and never emitted as selection.

Disclosure events also describe programmatic changes; state consumers should be
idempotent. Re-rendering the same value does not produce another event. Initial
markup is not a disclosure action. The adapter preserves initial nested expansion
across WA initialization; initially expanded lazy items request materialization.
Multiple-selection normalization follows WA's own behavior.

For a lazy item, an expansion emits a toggle request and `goo-tree-lazy-load`.
The caller materializes children and removes `lazy` when finished. An empty result
also completes by removing `lazy`; keep `branch` for an empty folder or remove it
for a leaf. No fetch, continuation, server route, or retry policy is built in.
To retry, collapse the item, set `lazy`, and expand it again.

The small compatibility bridge for `branch` and empty lazy results uses WA's
typed `isLeaf`, `loading`, `handleExpandedChange`, and `handleExpandAnimation` members. The dependency is
pinned and browser tests cover these details; recheck them on WA upgrades.

## HTML and actions

Buttons, links, inputs, selects, summaries, editable content, and focusable controls
keep their own default behavior and target listeners. Their click/keydown events
stop at WA's outer slot before reaching its row handlers. Put native control
listeners on the content; custom bubbling action events such as `mash-command`
remain untouched. Mark a custom non-focusable action surface with
`data-goo-tree-interactive` to opt into the same isolation. Context menus are not
intercepted.

The repository has generic Mash commands/gestures, but no Goo subject-selector
action protocol to target. Consumers can translate the three Goo events into
their existing action machinery without the adapter knowing where actions go.

Style ordinary content directly and use WA's documented parts/tokens for its
chrome. `goo-tree::part(root)` is only a neutral wrapper. Set the accessible label
on the caller-owned `wa-tree`.

The standalone demo is `/goo-tree.html` in the catalog (`pnpm build`, then
`pnpm --filter @mash/catalog dev`). It demonstrates arbitrary presentation,
selection reconciliation, dynamic membership, and caller-owned lazy completion.
