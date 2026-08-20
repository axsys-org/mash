# Native catalogue architecture

This runnable catalogue adapts the `gpui-base` showcase from the exact pinned
`longbridge/gpui-component` revision recorded in Mash's generated runtime. Its behavior scaffolding
remains under the adjacent Apache 2.0 license; Mash supplies the semantic-node bindings, portable
recipes, tokens, themes, and conformance gates.

## Component architecture packet

- Surface: mixed native component catalogue.
- Workflow type: native renderer realization.
- Primary packet: slot anatomy.
- Confidence: high; the dependency revision, all 38 families, and all 52 mapped Mash components are
  checked in tests.

The shared boundary is the renderer-neutral Mash node. `gpui-base` continues to own native focus,
keyboard, input, overlay, scrolling, and accessibility behavior. `NativeBinding` scopes a Mash
component to the corresponding GPUI Base family, carries state and environment values, selects a
semantic node, and applies the resolved recipe through GPUI's native `Styled` API. The catalogue
owns only example state, navigation, and composition.

Compound components stay compound: table rows and cells, tab panels, toast stacks, virtual items,
and resizable boundaries have separate Mash nodes even when GPUI realizes them with a wrapper or
an internal mechanic. Product copy, analytics, and workflow policy do not belong in the adapter.

Run the overview or open one family directly:

```bash
pnpm dev:gpui
pnpm dev:gpui -- tree
```

Verification is part of `pnpm check:gpui`. It compiles the complete native catalogue, checks that
its family/component registry exactly matches the pinned runtime, and runs the adapter's semantic,
recipe, payload, and conformance tests.
