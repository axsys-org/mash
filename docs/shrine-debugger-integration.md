# Grove debugger integration

This component work supports a paired Shrine PR: **Add a namespace-native
debugger declared in Grove and rendered through Weft/Mash.** The Shrine PR must
pin the resulting Mash commit; a dirty development bundle is not a release pin.

## Ownership

Mash exposes reusable public anatomy, properties, slots and events. Grove
declares their composition; Weft emits the HTML fragments. Namespace reads,
path/case policy, request queues, saved/recent preferences and operation
verdicts belong to the consuming application, not these components.

The integration relies on the existing semantic icon registry, namespace
tree/path-row patterns, overlay actions and overflow masks, content-sized menus,
neutral compact tooltips, medium scrolling/fading scroll areas, and resizable
triptych panes. Recipes stay in the catalogue and use semantic tokens. It does
not install a parallel icon set or require debugger-specific component forks.

## Focused gate

Use the package manager declared in package.json and install from the lockfile:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @mash/catalog build:iife
pnpm check:types
pnpm --filter @mash/ui test src/menu src/context-menu src/tooltip src/scroll-area src/tree src/tree-item
pnpm --filter @mash/shrine test src/tree src/path-row src/triptych
```

Shrine's compiler-to-browser gate additionally verifies the real emitted Grove
HTML with this source-built IIFE: unchanged authored nodes, exact bounded case
windows, path menus/hover previews, dark mode and narrow layouts. That is an
integration check, not a substitute for the broader Mash CI suite.

Review this PR separately from namespace transport/kernel changes. Preserve
unrelated worktree changes, especially the already-staged .prettierrc.json
deletion; do not blanket-stage the checkout. Generated artifacts and local test
screenshots are not the component source contract.
