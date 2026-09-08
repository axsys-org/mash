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
and vibrancy machinery is retained for deliberate opt-in use. Its remaining
implicit uses in legacy overlays are part of the next cut.

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
import "@mash/ui/button/register";
import "@mash/ui/input/register";
import "@mash/ui/toolbar/register";
import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
```

Public layout classes are `mash-row`, `mash-stack`, `mash-grid`, `mash-wrap`,
`mash-fill`, and `mash-panel`. Parents own spacing; controls own their frame.
They use the same semantic roles as the part recipes and need no catalog runtime
or utility compiler. `controls.css` and `layout.css` are implementation modules
imported by the existing public recipe entrypoint.

## Examples must stand alone

The rebuilt button, input, input group, toggle, toggle group, toolbar, select,
and combobox pages use focused examples. Each example carries its root recipe
opt-in and public layout. Usage lists every authored component registration.

These examples run in a fresh frame with only those registrations, tokens, and
the public recipe. The frame owns preview placement only. It cannot supply
application listeners, hidden utility classes, global registration, or editor
runtime dependencies. Theme and example deep links still restore the preview.

The old toolbar application demos have been removed from its component examples.
Their implementation modules and the checkpoint preserve the useful application
work; reintegrating them requires a separate application showcase, with its full
dependencies and behavior shown. They are not base component teaching material.

The stage fullscreen change stays deferred until the component and example set
has completed visual review.

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

## Review and remaining work

The eight control pages are the first rebuilt family, not a declaration of
finished library-wide visual parity. The structural census remains available in
[audit/inventory.md](audit/inventory.md). Every remaining element must go through
the same recipe, dependency, interaction, and light/dark review.

`bd` was unavailable in this workspace. This ledger records the remaining work:

| Work                              | Required result                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MASH-R2: overlays and materials   | One coherent popup surface across menu, context menu, tooltip, popover, preview card, dialog, drawer, and selection popups; explicit material opt-in; retain positioning and presence.                  |
| MASH-R3: forms and indicators     | Rebuild field, fieldset, form, textarea, number/OTP fields, checkbox/radio groups, switch, slider, calendar/date/color picker, autocomplete, and upload around shared geometry and visible states.      |
| MASH-R4: navigation and data      | Rebuild accordion, collapsible, tabs, navigation menu, pagination, paths, tree, table/data table, scroll area, virtual list, draggable, and resizable; retain filtering and interaction behavior.       |
| MASH-R5: display and feedback     | Rebuild text/media/status, progress/meter, skeleton/shimmer/spinner, toast, and motion examples around focused states and shared surfaces.                                                              |
| MASH-R6: semantic and API cleanup | Review remaining Apple-specific geometry/material aliases, status mappings, empty slot lanes, redundant public attributes, and missing component families against the complete census.                  |
| MASH-R7: catalog and applications | Remove remaining monolithic examples and runtime helpers as each family migrates. Give retained applications their own dependency-complete showcase. Review Shrine compositions after the base library. |
| MASH-R8: visual acceptance        | Compare every required example in both themes and relevant states, then establish blocking visual baselines and implement the stage fullscreen affordance.                                              |

The relevant gates are `pnpm run build:catalog`, `pnpm run check`,
`pnpm run test:browser`, `pnpm run test:integration`, and
`pnpm run test:catalogue`. The last gate tests the built catalog's portable frames,
displayed dependencies, theme restoration, control alignment, and keyboard behavior.
Geometry tests supplement visual review; they do not certify pixel parity.
