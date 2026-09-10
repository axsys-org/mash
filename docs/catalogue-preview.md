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

## Shared document prototype

Tabs and Chart support an opt-in comparison at `/components/ui-tabs?preview=shared` and `/components/ui-chart?preview=shared`. The default continues to use individual example frames. Theme, example deep links, expansion, and zoom work in either mode.

The prototype uses one iframe for the component page. Each example gets a shadow root to isolate local IDs and styles, and all roots adopt one stylesheet reconstructed from the loaded public `mash.catalogue` recipe layer. Tokens inherit from the frame's theme boundary. Component definitions, renderer modules, and the JavaScript realm are shared; nearby examples mount on demand and retain their state while scrolling.

Scripted examples opt into a scoped setup body receiving `root` and an `AbortSignal`. The catalogue build compiles that body into a mount function; the reference-code path exposes the same setup with a cleanup function for ordinary application use. Queries stay within the example root, listeners use the signal, and observers disconnect on abort. Removing the preview aborts setup and disconnects the hosts. No application component imports this machinery, and no dependencies were added.

This is document and style isolation, not a security sandbox. An example that depends on document-wide IDs, global styles, or unmanaged listeners needs its setup scoped before moving to the shared document. This prototype does not establish compatibility across every catalogue component or browser engine, and does not change Mash's public component APIs or application-owned state contract.

`shared-preview.spec.ts` covers all nine Tabs and 51 Chart examples in both themes, independent controls with duplicate IDs, cleanup, tab drag/reorder and draft retention, deep links, expansion, zoom, and narrow layouts. The existing Tabs and Chart tests exercise the original iframe path using the same scoped example source.

The implementation checkpoint `658615a` passed GitHub CI: 610 component tests, 20 integration tests, and 348 catalogue tests, plus build, type, lint, format, and token checks. Its Vercel deployment also passed. Local reruns encountered chart startup timeouts; a traced case rendered and redrew correctly but exhausted its overall time budget after slow browser setup. Those local failures were not addressed by relaxing the existing CI assertions.

For a same-build comparison, serve a frozen production build, close other automated browser runs, then run:

```sh
MASH_CATALOG_URL=http://localhost:5176 MASH_PERF_REPORT=/tmp/mash-preview.json pnpm --filter @mash/visual-tests exec node benchmark-previews.mjs
```

The benchmark visits every example in each mode and records frame count, DOM nodes, and retained JavaScript heap after garbage collection. Resource bytes are unique decoded response bodies, not compressed network transfer; JavaScript heap excludes native rendering and total browser memory. Readiness timings are local observations, not latency guarantees.

Same-build measurement on 2026-09-09, Chromium at 1280 × 900, after visiting every example (decimal MB/KB):

| Component          | Example frames → shared | Retained JS heap  | Reduction | Unique decoded JS      |
| ------------------ | ----------------------- | ----------------- | --------- | ---------------------- |
| Tabs, 9 examples   | 9 → 1                   | 13.51 → 4.63 MB   | 65.7%     | 247.11 → 247.71 KB     |
| Chart, 51 examples | 51 → 1                  | 112.38 → 16.15 MB | 85.6%     | 1,052.65 → 1,053.25 KB |

This shows a reduction in retained runtime overhead, with about 600 additional decoded JavaScript bytes in shared mode. Total unique decoded resources decreased slightly in both cases. It does not establish a comparable reduction in download size or promise faster startup. Raw initial/full snapshots and measurement boundaries are recorded in `docs/audit/shared-preview-measurements-2026-09-09.json`.

PR validation runs the complete example sweep in light mode plus targeted dark-theme interaction checks. Use `pnpm test:catalogue:full` for both complete theme sweeps; main/manual CI does this automatically. See `docs/ci.md` for the production/test boundary and retained coverage.
