# Goo patch surface

Four autonomous elements realize the supplied server scene: `goo-patch`,
`goo-patch-node`, `goo-patch-port`, and `goo-patch-connection`. Import
`@mash/shrine/patch` (also registered by the normal Shrine entry). This is a
presentation implementation integrated with Explorer’s Goo/Grove patch lowering.
Reaver’s `extras/mounts/patch-demo` contains a real Grove pane and namespace action
handler. See its README for authoring and the explicit development build command;
the pinned production Mash package still needs a release update. No fixture
authority is used by the production adapter.

The implementation follows the contract supplied in Reaver's
`goo-patch-codex/goo-patch-contract-v1.ts`. `contract.ts` preserves that boundary;
`fixtures/example-scene.ts` is the provided resolved geometry. Nodes, ports,
labels, and settled routes are never measured or automatically laid out by this
client. The only geometry reads are the root viewport's dimensions and mapping.

## Repository mapping

Paths in this table are relative to their named checkout.

| Contract responsibility                          | Actual repository integration                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-prepared Goo bodies                       | Reaver `extras/mounts/goo/prepared.foil`, `html.foil`, and Explorer `goo_bridge.foil` (`prepare`, `prepared_fields`) remain the preparation/HTML producers. `backend/emitter.ts` serializes a supplied resolved scene and trusted Goo fragments, escaping inert JSON and identity attributes. It does not generate layout.                    |
| Custom elements                                  | Mash `packages/shrine-components/src/patch/register.ts` follows the existing idempotent registration, package exports, CEM topology, CSS parts and block policy conventions.                                                                                                                                                                  |
| Protected receiver, `on/action/myth` and binding | Reaver `extras/mounts/explorer/goo-actions.js`: extracted `captureActivation` / `activateCaptured` are used by **both existing ordinary controls and the new adapter**. Target, subject, view, control, expected/displayed/publication evidence, input values and invocation identity are captured once. Retries retain the same body and ID. |
| Server admission                                 | Existing Reaver `src/foil/goo_runtime.foil`: `control`, `bound_control`, `prepared`, `dispatch`, capture validation and invocation deduplication remain authoritative. A component event cannot authorize a receiver or action.                                                                                                               |
| Occurrence and encounter                         | `GooPanes` work objects and `GooSession` retain their existing life/incarnation/encounter/generation distinctions. `attachGooPatch` checks work liveness and encounter continuity; the emitted header uses `surface = work.id` and `encounter = String(work.encounter.id)`.                                                                   |
| Selection                                        | `GooSession.intent`, `deliver`, `read`, and `capture` remain the owner APIs. The adapter requires an explicit occurrence-to-selection translator; it does not invent selectors or automatically replace the scalar owner with a graph selection store.                                                                                        |
| Input preservation                               | `GooActions.prepareMount` stages the existing mount policy without touching live inputs. `prepareGooDOM` retains compatible occurrence shells, preserves inputs separately within each occurrence, commits HTML and geometry synchronously, and rebinds embedded controls using the caller's real `GooPanes.actionContext`.                   |
| Composition / departure / retirement             | `GooPanes.registerPatchSurface` associates a surface with existing work. Common composition-end flushes a deferred whole frame; work release retires it; session resources suspend/resume it. Existing departure guards still decide whether working input may leave. No second input buffer exists.                                          |
| Receipts                                         | `GooActions.subscribeOutcomes`, `outcome`, and `recordOutcome` retain shared outcomes outside the component. Unknown results stay unknown; definitive rejection is terminal; a transport retry does not create a new action. `GooSession.releaseCapture` releases completed or abandoned capture evidence.                                    |
| Styling                                          | Geometry is private; ordinary Goo content retains its profile styling. Decorations inherit `currentColor`, use outlines/dashes and system colors, and expose CSS parts. Constructed stylesheets are used when available, with a host nonce fallback; there are no executable scene strings or new script CSP requirements.                    |

`sourceRev`, `layoutRev`, and `rendererEpoch` are opaque evidence, never ordered.
The projection's `viewSeq` is an ordered admission number within the encounter.
Neither a source hash nor the existing evaluation generation is silently treated
as proof that an arbitrary DOM delta has the correct predecessor.

## Admission and host wiring

`hydrate(adapter?)` is an explicit post-parse hydration boundary. Construction and
connection callbacks do not parse server children. Later use `admit(frame)`:

1. The shared runtime processes receipts independently of rendering.
2. The surface checks lifetime, ordering and the exact delta base.
3. It validates the complete scene and the staged owned DOM, excluding nested surfaces.
4. The common patcher commits HTML and geometry in one synchronous batch.
5. It reconciles active lifetimes, selection decoration and explicit operation coverage.

`ProjectionFrame.prepare` returns `{ proposed, commit }`. `proposed` must be a
matching detached `<goo-patch>` or the live root for geometry-only updates.
`commit` is synchronous. `prepareGooDOM` is the concrete bridge to the shared Goo
patcher; its `actionContext(key, kind, presentation)` callback must return the
canonical context of that occurrence's content. Never substitute the patch root
as every descendant's receiver.

Wire a work with `attachGooPatch(surface, GooActions, panes, work, offers, owner)`.
Each `OfferedPatchBinding` contains the actual existing control/context/container,
its server-declared argument slot, and argument kind. `owner` supplies canonical
selection translation, read/presentation queries, repair and operation-status
reconciliation. The adapter submits JSON gesture arguments only through that
declared myth input slot on the captured ordinary Goo operation. It has no fetch,
WebSocket, persistence or authorization fallback.

The component's public camera/picking/projecting/selection API is the supplied
`PatchSurfaceAPI`. Additional host commands are `admit`, `flushDeferred`,
`suspend`, `resume`, `retire`, and `dismissPending`. Ordinary bound local controls
can use `gestures.moveBy`, `reconnect`, `disconnect`, `arm` and
`acceptChoice(queryId, choiceRef)`. A picker cancellation makes no mutation.
Only an unknown operation's visual feedback may be dismissed; its conflict lock
and shared outcome remain outstanding.

The server's connection-table treatment can use the same offered operation and
argument slot as the graphical treatment. Native `[data-patch-move]` controls
carry `data-dx`/`data-dy` inside the node occurrence; table reconnect/disconnect
controls use `data-patch-connection`, `data-patch-reconnect` (endpoint key), and
`data-patch-disconnect`, optionally `data-endpoint`. Keys are looked up in maps,
never interpolated into selectors. These attributes do not confer authority.

## Interaction and geometry

- Selection requests carry occurrence targets and replace/add/toggle intent;
  reflecting accepted selection is silent. Box selection intersects node bounds
  only. Filtering leaves canonical selection with its owner.
- Movement captures original evidence and origins, applies one group translation,
  snaps against a supplied grid/nearby stationary geometry, shows guides, and
  retains absolute preview origins across incoming layouts. Only affected nodes
  and incident connections are repainted and reindexed.
- Wires support fan-out, junctions, polylines, cubics, parallel connections,
  self-loops and explicit semantic parts. Partial movement deforms only route
  terminals/adjacent control points. Moving all endpoints together translates
  the whole route and its labels.
- Click-click and drag connection use the same binding. Compatibility is advisory,
  has an explicit unknown state, and is discarded after cancellation or a changed
  basis. Reconnect is one atomic replacement, with the accepted connection kept
  visible until authoritative coverage.
- Desktop background drag selects; touch background drag navigates; middle or
  Space-background drag pans; two owned background pointers pinch. Capture starts
  after the threshold, preserving native clicks. Escape, cancellation, capture
  loss and retirement end unsent drafts. Embedded editors/widgets and nested
  surfaces have first refusal.
- Navigation buttons provide pan/zoom/fit. Node move buttons, endpoint controls,
  click-click connect and a two-corner Select tool provide no-drag alternatives.
  Wheel is normalized; Alt-wheel zooms at its anchor; browser Ctrl/Command-wheel
  and native scrolling are preserved.
- Axis-aligned ancestor transforms, including nested cameras, are inverted using
  the viewport mapping. Rotation/skew/perspective are outside V1 and do not produce
  guessed input coordinates. Zero-size viewports defer initial fit.
- Route endpoint agreement uses `1e-7` world CSS pixels. Cubics use convex-hull
  subdivision at `0.5 / scaleBucket` world error, with scale rounded upward to a
  power of two. Excessive curve complexity fails closed rather than allocating
  unbounded subdivision data. Scene limits are 16 MiB serialized data, 20,000
  records per keyed array, 200,000 total route commands and finite magnitudes
  bounded by `1e9`. Local pending feedback is bounded at 64 entries.

Prepared node bodies must keep ports in the non-scrolling node attachment frame.
Do not put a port underneath a scrolling/independently transformed content chain;
that would require upstream transform metadata. Put ordinary body scrolling
inside an explicitly native content area. Private frames must not be restyled to
add padding, margins or intrinsic reflow to resolved rectangles.

A receipt is not geometry. Accepted previews remain until an installed frame
explicitly covers their operation IDs. Covering HTML can precede the receipt.
Rejection restores the latest installed geometry, not the captured old scene.
An exception after DOM mutation fails closed and requests a complete repair; no
rollback guarantee is claimed. A compatible full repair may reinstall the same
sequence after such a failure.

## Fixtures and reproducible checks

The catalogue entry is `apps/catalog/goo-patch.html`, served as `/goo-patch.html`.
It is visibly labelled **simulated authority**. It exposes sequence, delta base,
coverage IDs, explicit receipt delivery, and a 500 ms delayed receipt button.
`?nodes=100` and `?nodes=1000` load the larger deterministic resolved fixtures.
`window.patchFixture.harness` permits arbitrary projection/receipt ordering,
duplicates, rejection and unknown outcomes. It never represents production
admission. The ordinary connection table exposes every fixture connection.

From Mash:

```sh
pnpm --filter @mash/shrine build
BROWSERS=chromium,firefox,webkit pnpm --filter @mash/shrine exec vitest run src/patch src/block/component-policy.test.ts
node scripts/check-goo-patch.mjs /path/to/reaver /tmp/goo-patch-results
pnpm --filter @mash/catalog check:types
pnpm run check:exports
pnpm run check:parts
```

From either checkout, run Reaver's existing Node tests:

```sh
node --test /path/to/reaver/extras/mounts/explorer/tests/*.test.cjs
```

The standalone browser check imports the built components and **actual**
`goo-actions.js`, `goo-session.js`, and `goo-panes.js` from the specified checkout.
It tests trusted browser pointer and keyboard events, retained native input/caret/
focus through the common patcher, whole-frame composition deferral, matching
ordinary/graphical activation payloads, visible labels, and benchmarks. Its action
HTTP response is explicitly stubbed: it proves client transport equivalence,
not namespace admission or domain correctness.

See [VALIDATION.md](VALIDATION.md) for actual results, coverage and manual limits,
and [benchmark-results.json](benchmark-results.json) for the recorded device,
versions, timings, DOM counts and memory observations.

## Goo/Grove integration and release boundary

Reaver now supplies Grove `patch`, occurrence and operation declarations,
server-prepared ordinary Goo bodies, `GooPanes` mounting, shared multi-selection,
namespace invocation status and explicit coverage from the committed journal.
The real `extras/mounts/patch-demo` application validates and persists move,
connect, reconnect and disconnect operations through `/goo/act`. Its server
handler computes settled routes; it is separate from the simulated fixture.

The Explorer host uses `attachGooPatch` and `prepareGooDOM`. Complete frame
ordering maps the namespace’s ordered event count to the presentation sequence;
opaque hashes are not compared. Work/encounter identities come from the existing
pane lifetime. Accepted graphical operations refresh through the same saved
callback as native controls.

Reaver consumes the published Mash commit through its immutable Nix input.
The explicit `GOO_PATCH_MASH_ROOT` option remains available for local development
and never claims pinned production provenance.

Remaining application boundaries:

- Each application supplies resolved geometry and validates its offered semantic
  operations. The example’s one-directed-connection policy is not a general graph
  domain implementation. It does not offer creation, compatibility or contextual
  picker presentations; those require application-specific bound query handling.
- The namespace invocation journal has its existing 1024-entry development bound.
  A missing operation status remains unknown.
- Manual screen-reader, forced-colors, physical touch and hardware IME qualification
  remain unperformed; see VALIDATION.md for the renderer checks.
