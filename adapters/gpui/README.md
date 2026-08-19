# Mash × GPUI

The native adapter compiles Mash’s resolved DTCG contract into typed Rust
values. `src/generated_tokens.rs` is generated and committed so an application
does not need Node at runtime; CI makes sure it remains in lockstep with
`packages/tokens/src`.

```bash
cargo run --example foundations
```

The example switches between the generated light and dark themes and shows the
first Mash primitive, `MashButton`. It is a native GPUI window, not a web view.

## Browser / WebAssembly

The same `Foundations` view has a browser entrypoint. It runs inside
`gpui-component::Root`, so GPUI Component owns the web window mechanics
(focus, overlays and root lifecycle) while Mash continues to own the visual
surface and token resolution.

```bash
pnpm build:gpui-web
pnpm preview:gpui-web
```

For local work, use `pnpm dev:gpui-web`, then open
`http://127.0.0.1:4174`. The browser backend currently uses Rust nightly
because GPUI's WebAssembly runtime depends on Wasm atomics. The generated
bindings in `www/src/wasm` are intentionally ignored; `build:gpui-web` always
regenerates them from the checked-in Rust and token sources.

## Contract

`ThemeTokens` contains every token in each mode. `SemanticColors` is the
ergonomic component surface, while `ThemeTokens::token` and
`ThemeTokens::dimension` make the rest of the graph available to later native
primitives. DTCG OKLCH values are converted to display sRGB in the generator;
dimensions preserve their `px`/`rem` unit, and typography, duration, and easing
values remain typed.

The crate lockfile pins the exact GPUI revision currently locked by
`longbridge/gpui-component`. It depends on GPUI directly: Mash owns the visual
roles; `gpui-component` is the browser host that provides interaction and
window mechanics without becoming a second source of visual tokens.

## Development

From the repository root:

```bash
pnpm build
pnpm check:gpui
pnpm check:gpui-web
```

`pnpm build` regenerates `src/generated_tokens.rs`. `pnpm check:gpui` verifies
the committed table is current and compiles the library and foundations example.
`pnpm check:gpui-web` checks the Wasm adapter, generates its bindings, and
builds the browser host.
