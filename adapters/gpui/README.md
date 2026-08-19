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

## Contract

`ThemeTokens` contains every token in each mode. `SemanticColors` is the
ergonomic component surface, while `ThemeTokens::token` and
`ThemeTokens::dimension` make the rest of the graph available to later native
primitives. DTCG OKLCH values are converted to display sRGB in the generator;
dimensions preserve their `px`/`rem` unit, and typography, duration, and easing
values remain typed.

The crate pins the exact GPUI revision currently locked by
`longbridge/gpui-component` and uses the same Rust toolchain. It depends on
GPUI directly: Mash owns the visual roles; an application may compose
`gpui-component` interaction and layout utilities above it when needed.

## Development

From the repository root:

```bash
pnpm build
pnpm check:gpui
```

`pnpm build` regenerates `src/generated_tokens.rs`. `pnpm check:gpui` verifies
the committed table is current and compiles the library and foundations example.
