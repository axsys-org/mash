# Catalogue and workspace checkpoint

This pass compares the supplied reference documentation and story source against the effective Mash catalogue. The requirement-level evidence is in [controls](controls-pass-2026-09-09.md), [display](display-pass-2026-09-09.md) and [complex surfaces](complex-pass-2026-09-09.md). Their source coverage, interaction evidence and remaining visual/capability gaps are separate. There is no blanket declaration of exact visual parity.

## Catalogue

The effective UI catalogue contains **106 pages and 411 examples**, including child-page compositions. Direct registry entries and rendered pages have different counts. Consolidation removed 44 overwritten/dead definitions while preserving every effective example byte: SHA-256 `2c17bdcc61162f5786441be0c936b87b3f294cba169ac3c8fde50df7c187f511` for the serialized UI page registry, 765,122 bytes. The authoritative resolver remains `examplesFor`; no second manual registration list was introduced.

The pass adds functional control, overlay, editor, table, collection, chart, date/color, display and conversation arrangements. Repairs cover inherited form-disabled state, numeric validation, calendar constraints and upgrade order, color commit/cancel validation, editor diagnostics/focus, virtualized source collections, native table spans, chart bundling and clipping, and popup visibility inside expanded/scaled previews.

The production sweep visits every example in both themes, waits for its owner script, checks actual registered elements, verifies visible content through shadow roots, and checks frame overflow and runtime errors. It is a rendering/behavior check, not a pixel-comparison substitute. The shadow-content regression rejects empty/hidden samples while accepting real controls, hints and painted specimens.

## Preview cost

The initial button preview requests approximately 106 KB of unique decoded JavaScript including its initially mounted frame resources, with two frames mounted. The earlier main document alone requested 1,511,130 bytes; those scopes differ. Route modules, example data, chart engines and application workspaces remain lazy. Same-document navigation and the initial byte/frame budget are asserted against the production artifact. See [preview workflow](../catalogue-preview.md).

## Stories

Five independent local workspaces are now available from `/stories`: Studio, Command Center, Documents, Projects and Commons. They use public Mash controls, semantic colors, scoped application styles and real local state. No dependencies were added. [Stories](../stories.md) records their working flows and capability boundaries.

## Open acceptance work

The detailed ledgers retain requirements that have not been implemented or visually accepted. Notable public capability gaps include command virtualization/custom ranking, general caret-aware input masking/formatting, full replacement of the combobox edit trigger, explicit multi-select tree semantics, and independent plot scale/mark construction. Flow layouts do not claim nonlinear compression with conserved quantities. Additional component-specific material, placement and keyboard comparisons remain in the requirement rows.

The application workspaces are functional local examples, not complete substitutes for their reference products: remote collaboration, operating-system services, a JavaScript module/package resolver, formula/relation engines and production backends are not implemented. These boundaries remain visible rather than being disguised by simulated responses.

Issue-tracker CLI `bd` was unavailable in this environment; these requirement ledgers and this checkpoint record the remaining work.

## Verification record

- Final component suite: **566 tests in 102 files passed**. Notebook model round-trips/history/canvas geometry: **7 tests passed**.
- The full production sweep initially passed 227 of 267 checks. Its 34 false empty-content failures were corrected by a shadow-aware rendered-content probe; all 17 affected pages then passed in both themes, including native meters. The remaining failures exposed real workspace ownership defects, repaired and verified through their production scenarios.
- The subsequent production run passed 93 of 96 checks; the remaining native-meter probe cases passed in a focused 3-test run. The chart-menu failure was traced to late growth in preceding lazy frames moving the pointer target. The owner now compensates for that growth only while the focused frame remains visible; a dedicated regression checks both stable interaction and deliberate scrolling away.
- Final production acceptance: **43 tests passed**, covering chart controls in both themes, preview anchoring, mobile/expanded/zoomed windows, the preview byte budget, local Projects/Command Center flows, and all five Story routes in both themes. Documents, Studio and Commons interaction suites passed against the integrated production artifact.
- Formatting, workspace TypeScript, lint, public exports, CSS parts/slots, catalogue conformance, token consumers, design ontology and foundations checks passed. Example-page loading and interaction results do not turn the open requirement rows into visual-equivalence approvals.
