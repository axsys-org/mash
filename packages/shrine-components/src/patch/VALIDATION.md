# Goo patch validation — 2026-10-05

## Automated results

- Patch + component-policy browser command: **138 passed**, 9 engine/file runs.
  This is 44 patch cases and 2 package-policy cases in each of Chromium, Firefox
  and WebKit. The vertical slice was tested before gesture implementation.
- Standalone native interaction / real Goo adapter and SSR integration check:
  passed in Chromium **151.0.7922.34**, Firefox **153.0**, WebKit **26.5**.
  Includes real pointer capture/drag and Enter/Space activation, identical
  ordinary/graphical action payloads, and native input identity/value/caret/focus
  across the shared patcher and composition policy.
- Real Goo/Grove application gate: passed against a running disposable Eden
  namespace in Chromium **151.0.7922.34**, Firefox **153.0** and WebKit **26.5**.
  Each engine submitted five real bound actions: movement, connection creation,
  reconnection, disconnection and movement from an ordinary Goo input/action.
  Reloads verified persistence. Native and graphical controls used the same
  receiver/control binding with distinct invocation IDs. The server rejected
  individually altered lifetimes, receivers and control bindings; its invocation
  journal supplied operation status and explicit projection coverage. There were
  no mocked `/goo/render` or `/goo/act` responses in this gate.
- Reaver Explorer Node suite: **63 passed**, including GooActions and multiple
  selection-owner ordering, guard, membership and retention checks.
- Shrine TypeScript build, Shrine/catalogue type checks, custom-elements manifest,
  export checks, CSS-part checks and design-ontology checks passed.
- Scoped lint has no errors; the initial implementation has non-blocking
  shadowed-local-name warnings. No dependency was added.

A full existing Shrine run across all three engines reported **580 passed,
46 failed, 4 skipped**. Failures were in existing tree, namespace recipe, sidebar,
path-row and record styling tests. An exact targeted comparison against unchanged
Shrine sources from HEAD in `/tmp/mash-patch-baseline`, using the same installed
workspace dependencies, reproduced **every failing assertion** from the current
comparison. That targeted rerun had 47 failures; the baseline had 61, including
additional baseline-only record cases. This is not a green full repository suite.
No unrelated styling changes were made to hide those failures.

The locked Wisp runtime was used for the native Foil suites through
`extras/x/check --mount patch-demo`: **597 checks passed** (135 web, 457 Explorer,
4 application-domain checks and 1 mount-contract check), plus 6 profile checks.
Grove authoring/lowering, inert-script escaping, actual namespace
invocation coverage/status, the example's domain admission and existing Explorer
regressions are exercised there. The real-server browser gate lives at Reaver's
`extras/mounts/explorer/scripts/check-patch-browser.mjs`; the older standalone
adapter check still uses transport stubs and is separate evidence.

## Acceptance coverage

| IDs                                    | Evidence                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G01, G03, G07, G08, C01, C03, R01, R02 | `patch.test.ts`: supplied topology/geometry, measurement guards, validation, semantic hit identity, anchored zoom, pre-mutation freshness/base checks.                                                                                                                                                                                     |
| G02, N01                               | `scripts/check-goo-patch.mjs`: actual GooActions/GooPanes staging; body treatment, node height, port anchor and route terminal install together; composing defers the whole frame; existing input identity, working value, caret and focus remain.                                                                                         |
| G03–G08, C02                           | `reconcile.test.ts`: forbidden descendant geometry reads during pick/drag/reconcile, repeated subjects, zero/negative extent, parallel routes/self-loop deformation, semantic parts and scaled mapping.                                                                                                                                    |
| I01–I11                                | `reconcile.test.ts`: thresholds, group/grid movement, rebasing with original evidence, stationary-pointer auto-pan, exactly one completion, cancellation, click/drag equivalence, compatibility unknown/stale/forbidden, atomic reconnect rejection, empty drop and bound picker acceptance/cancellation.                                  |
| S01–S03                                | `reconcile.test.ts`: node-only intersection selection, silent reflection, and selection retained across unrealization.                                                                                                                                                                                                                     |
| R01–R11                                | Both patch test files, plus Reaver `goo-actions.test.cjs`: stale/base/duplicate admission, lifetime replacement, late retirement replies, both coverage orderings, latest-state rejection, unknown then success, outcome retention, and failed installation.                                                                               |
| N02, N03                               | `reconcile.test.ts`: input, slider, text/scroll/menu ownership, nested surfaces, relocation/suspend/resume, one active receipt subscription and no duplicated gesture handler.                                                                                                                                                             |
| A01, A02                               | Native controls exercise movement, connect, reconnect, disconnect and two-corner selection. Standalone browser checks use real Enter/Space and mouse events.                                                                                                                                                                               |
| A03                                    | **Manual pass not performed.** See checklist below.                                                                                                                                                                                                                                                                                        |
| P01, P02                               | Deterministic counters enforce incident-only node/connection drawing and camera-only pan. Spatial preview caches update only moved nodes and their incident routes.                                                                                                                                                                        |
| P03                                    | Deterministic 500 ms delayed receipt test leaves camera and unrelated movement usable.                                                                                                                                                                                                                                                     |
| X01                                    | Captured handles and immutable retry arguments are tested. The real Grove board's server action rejects a retired node lifetime with otherwise current arguments; the shared Goo runtime rejects independently changed receiver and control binding. This validates the example's policies, not every future application's domain handler. |

Touch/pinch transitions are tested with synthetic pointer events. No physical
touch-device qualification is claimed. Composition events are synthetic; real
IME candidate-window/composition behavior has not been tested manually.

## Performance and memory

`benchmark-results.json` records actual measurements on an Apple M5 Pro, arm64,
Darwin 25.3.0, 48 GiB RAM, headless engines. Install timings cover validation,
indexing, shell/SVG creation and geometry realization after fixture HTML exists.
They do not include server work, network latency or initial fixture markup creation.

Each size has two connections per node. Pointer-handler times are synchronous
handler samples; frame times are the gesture rendering callback's CPU duration,
not input-to-display latency. Timer precision differs by engine; zero means below
that engine's timer resolution. No universal supported-node count is asserted.

The JSON includes both 100/200 and 1,000/2,000 populations, median/p95/max handler
and frame times, DOM counts including shadow roots, and constant-work assertions.
Chromium additionally records CDP heap/DOM/listener metrics before and after
retirement plus forced GC. This is a bounded retention observation, not a claim
of a long-running cross-browser leak audit. Firefox/WebKit heap metrics were not
collected.

Latest recorded install / gesture-frame p95 measurements:

| Engine                 | 100 nodes / 200 connections | 1,000 nodes / 2,000 connections | Frame p95 at 1,000 | DOM count at 1,000 |
| ---------------------- | --------------------------: | ------------------------------: | -----------------: | -----------------: |
| chromium 151.0.7922.34 |                     11.0 ms |                        106.5 ms |             0.3 ms |             33,025 |
| firefox 153.0          |                     92.0 ms |                        686.0 ms |             4.0 ms |             33,025 |
| webkit 26.5            |                    116.0 ms |                       1387.0 ms |             3.0 ms |             33,025 |

Install time varies substantially across runs; these are observations, not pass/fail thresholds. The larger fixture remains fully realized and carries thousands of native controls. The implementation removes repeated whole-DOM scans during admission and limits movement painting/index updates to affected geometry; it does not claim that large initial installs are instantaneous.

## Manual accessibility and IME status

Not performed; do not report A03 or real IME as passing. The review checklist is:

- Keyboard and screen reader: verify region/port/endpoint names, expected Tab order,
  ordinary connection-table access, selected versus focused state, and polite
  discrete outcome announcements without movement chatter.
- Single pointer: connect by two clicks, move by controls, reconnect using endpoint
  controls, disconnect via the offered control, and select using two corners.
- Forced colors / reduced motion: verify visible focus, dashed pending and
  forbidden states, selection outlines and wire contrast. There is no motion
  animation in V1; no reduced-motion-dependent transition needs to settle.
- Real IME: compose through unrelated and relevant frame delivery; check candidate
  windows, commit/cancel, caret and working input; verify retirement/departure
  policy does not silently discard the draft.
