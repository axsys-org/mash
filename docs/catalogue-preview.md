# Catalogue preview

Use `pnpm dev:catalog` for component and example work after the initial `pnpm build`. It watches tokens, UI modules, the generated element manifest, and catalogue examples. It does not start the legacy application-package watcher. Examples and their registration requirements are derived automatically; no registration families or per-example setup lists are maintained by authors.

For a production review, run `pnpm build:preview`, then `pnpm preview:catalog`. The preview build omits the secondary browser distribution. After changing only examples or catalogue code, `pnpm --filter @mash/catalog build:site` is sufficient. After a component change, rebuild `@mash/ui` first. Do not replace `apps/catalog/dist` while a production browser test is running: the server could then mix old HTML with new hashed chunks.

## Loading contract

- The generated sidebar index contains route names and lazy loaders. Only the selected component's schema and effective examples reach the browser.
- The example registry, complete manifests and token graph are evaluated during the build, not in the catalogue's main document.
- Each preview loads the components used by its markup and script. Public component imports bring their internal dependencies. Plain fixture URLs still register the complete package for public integration tests.
- One intersection observer mounts nearby examples; opening a component does not initialize every preview. Navigating to another component disposes the old frame documents and observers without reloading the shell.
- Formatting reference code is deferred until Code opens or Copy is used. Theme and live edits survive shell controls.
- The chart renderer and its engine are separate lazy chunks. Explicit engine grouping prevents a bundler helper from creating an accidental eager dependency in ordinary controls.
- The Stories index and each application workspace load separately. Application code and styles are absent from basic component previews; leaving a Story calls its scoped cleanup.
- The active catalogue no longer runs unused CSS-in-JS, framework-example, or WASM transformation plugins.

The source boundary is `apps/catalog/vite.catalog-data.ts`. It uses the existing build tooling and authoritative example resolver; it does not maintain a second catalogue of examples. New tags are derived from the generated public manifest.

## Verification

`tests/visual/specs/catalog-performance.spec.ts` checks the production build, including loaded frame resources: under 300 KB of unique decoded JavaScript for the basic button preview, at most four initially mounted frames, no eager chart/application engine, and same-document component navigation. This is a transfer/work guard, not a hardware-independent latency promise.

Measured on this workstation on 2026-09-09: the former main document requested 1,511,130 decoded JavaScript bytes. After route splitting its main-document portion was 80,881 bytes; the first measurement including the initial preview documents was 100,036 unique bytes. With the Stories navigation integrated, the same combined scope is 106,135 bytes and two mounted frames. These numbers have different scopes, so the combined preview figure is not presented as a like-for-like percentage. Warm local timings fluctuate with the host's browser workload; retain byte and behavior assertions in CI.

Run production checks with one browser worker on this workstation. For visual review, use the component's direct URL and shared expand/zoom controls; each section is directly visible in the consolidated scroller. A passing load/overflow test does not establish visual parity. The requirement-level comparison lives in `docs/audit/*-pass-2026-09-09.md`.

`pnpm test:stories` runs the independent production workspace scenarios. The component sweep groups all examples for a page/theme into one navigation, reducing repeated compilation, frame setup and browser work. Use one frozen build for an acceptance run; rebuild only after it finishes.

Late height changes above a focused, visible frame preserve its screen position. The anchoring regression covers both continued interaction and an intentional scroll away; native scroll anchoring is disabled only for this owner-managed preview viewport.
