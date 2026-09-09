# Mash component rebuild

The rebuild branch is `codex/component-rebuild`. Existing working changes were
checkpointed at `7430e3b` before the rebuild. Behavior worth keeping stays in the
component layer: form association, keyboard navigation, filtering, selection,
overlay positioning, presence, and animation.

## Foundation and composition contract

The token graph remains authoritative. Reference values feed themed color roles
and semantic typography, spacing, shape, and dimensions. Component definitions
expose parts, slots, state, and behavior; the public recipe supplies appearance.
There are no component-local palette literals.

The base palette is opaque and neutral in both themes. The primary action uses
the strongest neutral contrast; semantic status colors remain separate. Material
and vibrancy machinery is retained for deliberate opt-in use. Menus now default to the same opaque popup surface; translucency requires an explicit material utility.

Controls share 6px corners, 12/14/16px text roles, and these dimensions:

| Size        | Button height | Input/select height |
| ----------- | ------------: | ------------------: |
| Extra small |          20px |                   — |
| Small       |          24px |                24px |
| Medium      |          32px |                32px |
| Large       |          32px |                44px |

`data-mash-size` sets the size context for a composition. Buttons, inputs, selects,
and comboboxes default to `size="inherit"`; explicit component sizes override the
context. Toggles follow their context. The default context is medium. Size remains
independent of meaning and emphasis.

```html
<div data-mash-catalogue="mash">
  <ui-toolbar label="Document tools" data-mash-size="small">
    <ui-button>New</ui-button>
    <ui-input label="Find in document" placeholder="Find"></ui-input>
    <ui-button variant="primary">Save</ui-button>
  </ui-toolbar>
</div>
```

```js
import "@mash/ui";
import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
```

Public layout classes are `mash-row`, `mash-stack`, `mash-grid`, `mash-wrap`,
`mash-fill`, and `mash-panel`. Parents own spacing; controls own their frame.
They use the same semantic roles as the part recipes and need no catalog runtime
or utility compiler. The public CSS entry imports separate foundation, control, layout, form, overlay, navigation, display, conversation, and environment recipes. Environment overrides run last.

## Examples must stand alone

All 112 component pages now use focused, portable examples: 84 directly authored pages and 28 child components demonstrated inside their owning composition. The catalogue contains 156 named examples. Each carries its recipe opt-in
and public layout. Usage shows normal package imports. `@mash/ui` defines the complete
base set; `@mash/shrine` also defines its base dependencies. Optional component imports
such as `@mash/ui/button` automatically define their elements as well. There is no
consumer registration list or family setup. The catalog navigation is flat and searchable.

Portable frames use those same package entrypoints, tokens, and public recipes.
They supply preview placement, without application listeners or hidden layout classes.
Theme and example deep links restore the preview.

The old toolbar application demos have been removed from its component examples.
Their implementation modules and the checkpoint preserve the useful application
work. The old application stage is excluded from the production build, and its
recipe map is isolated from catalog styling; reintegrating them requires a separate application showcase, with its full
dependencies and behavior shown. They are not base component teaching material.

The stage fullscreen change stays deferred until the component and example set
has completed visual review.

## Interaction and inverse roles

`surfaceHover` and `surfacePressed` are transient states on unfilled surfaces.
`neutral`, `neutralHover`, and `neutralPressed` are the filled neutral sequence.
`selection`, `selectionHover`, and `onSelection` describe persistent selection.
Options, toggles, trees, and data tables retain selection while hovered.

`surfaceInverse` pairs with `onSurfaceInverse` and `onSurfaceInverseMuted`.
Tooltips and slider values use this pair. Changing an ordinary surface cannot
silently change inverse text. Composed regions use an explicit nested `data-theme`
so all their controls, borders, surfaces, and state colors resolve together.

Status fills have matching hover, pressed, and foreground roles, including info.
The separate status `*Text` roles serve ordinary surfaces and tinted controls.
Every filled state and the strongest button tint is checked for 4.5:1 text contrast
in both themes. Wide-gamut material settings preserve semantic selection and action
colors; a material no longer overwrites the action or neutral role of its children.

## Migration notes

- The default button is now a bordered neutral control. Use `variant="primary"`
  for a filled primary action.
- The default size property on buttons, inputs, selects, and comboboxes is now
  `inherit`. Explicit sizes retain their meaning.
- Body and regular label text are now 14px. Menu corners are 6px and menu row
  corners are 4px. Applications should review layouts that assumed the old sizes.
- `check:foundations` replaces the former external-design synchronization check.
  Historical snapshots are retained under `docs/reference`.
- Existing deep links to removed component examples fall back to the new first
  example. Application modules are retained but are no longer toolbar demos.

## Expanded components and examples

The base set adds charts, messages, attachments, timeline markers, alerts, ratings,
conversation scrolling, command lists and items, and steppers and steps. Tabs now
cover five treatments, four sizes, vertical layout, overflow, adjacent controls,
and owner-managed closing. Keyboard hints format platform shortcuts. Menu items
support native destinations alongside commands, checkboxes, radio groups, and
submenus. Menus default to 26px rows; compact density remains explicit.

Data-table examples separate filtering and selection, sorting, cell selection,
editing, density, and loading/empty states. Calendar examples cover ranges,
month/year selection, and restrictions. Accordion examples cover a joined border,
four sizes, multiple open items, and independent nested disclosures. Chart examples
cover twelve arrangements with readable data alternatives and a lazy renderer;
see [chart-rendering.md](chart-rendering.md) for engine research and bundle costs.

Every example shows its own markup and any required JavaScript. Usage imports,
API attributes/properties/events/slots/parts, considerations, and token references
come from the public component contract. The catalogue frame adds preview placement.
It supplies no hidden application controller or private component styling.

## Review and remaining work

This rebuild does not certify complete feature or pixel parity. The source-derived
[capability checklist](reference/components.json) records 71 documentation topics
and their executable Mash examples. The structural census remains available in
[audit/inventory.md](audit/inventory.md). A topic mapping is coverage evidence,
not a claim that every reference feature has been implemented.

`bd` is unavailable in this workspace. This ledger records open work:

| Work                            | Status and required result                                                                                                                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MASH-R2: reference acceptance   | Opaque surfaces, shared dimensions, hover/pressed/selection/inverse states, menu density, and joined accordion treatment implemented. Complete direct comparison of every example and relevant interaction state in both themes.                                                                                 |
| MASH-R3: capability gaps        | Conversation scrolling preserves the reading anchor and follows appends, but does not virtualize message history. Docking and persisted workspace layouts need a full implementation; split panels alone do not provide docking. Rich editor provider behavior needs a separate contract and integration review. |
| MASH-R4: API and example depth  | All 112 pages are portable. Check every feature listed in the 71-topic checklist against actual behavior, expand missing variants, and replace remaining illustrative actions with useful executable outcomes where they teach a component contract.                                                             |
| MASH-R5: chart state            | Twelve chart arrangements and SVG/canvas renderers are available. Theme and renderer changes preserve zoom and legend selection. Audit remaining interaction state for each supported chart type.                                                                                                                |
| MASH-R6: visual baselines       | The blocking catalogue gate checks all named examples in both themes, composition geometry, dependency display, and focused interactions. Canonical screenshot baselines remain platform-specific and local. Establish reviewed Linux baselines before making the screenshot job blocking.                       |
| MASH-R7: later application work | Preserve the isolated application source for the requested playground and story samples. Reintroduce it only after the component review, with its dependencies and behavior exposed. Stage fullscreen remains deferred until parity acceptance.                                                                  |

The relevant gates are `pnpm run build:catalog`, `pnpm run check`,
`pnpm run test:browser`, `pnpm run test:integration`, and
`pnpm run test:catalogue`. The last gate tests the production build rather than
the development server. Its focused behavior tests replace suites coupled to the
retired application stage. Geometry and render tests supplement visual review;
they do not certify pixel parity.

## Validation snapshot

On 2026-09-08, the production build and all static checks passed with 112
components, 666 public parts, 241 named slots, and 618 generated token variables.
The browser suites passed 412 base-component tests, 43 Shrine tests, and seven
token tests. Integration passed 21 tests. The full catalogue sweep passed 653
checks; the subsequent empty-slot alignment refinement passed all eight accordion
example/theme checks. Six local canonical screenshots were refreshed; selected component and catalogue
screenshots were manually reviewed. These are local references, not accepted cross-platform baselines.
