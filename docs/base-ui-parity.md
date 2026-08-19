# Base UI parity

Mash uses Base UI as a behaviour and accessibility reference, not as a React
runtime dependency. Every port has one renderer-neutral contract and can have
multiple visual catalogues.

## The contract

Each Mash primitive owns only:

- semantic HTML, keyboard behaviour, focus behaviour, ARIA, and form rules;
- reflected public state and bubbling composed events;
- slots and stable CSS parts.

It does not own product colours, spacing, type, elevation, or motion. Those
belong to a separately imported catalogue. The initial Mash catalogue is
`@mash/ui/catalogue/mash.css` and activates under
`[data-mash-catalogue="mash"]`.

```html
<main data-mash-catalogue="mash">
  <ui-toggle pressed>Bold</ui-toggle>
  <ui-checkbox name="updates">Release notes</ui-checkbox>
  <ui-switch name="notifications" checked>Notifications</ui-switch>
</main>
```

The same contract is the source for future React, GPUI, Swift, or other
platform renderers. A renderer may implement the native mechanics differently;
it must preserve the state, event, anatomy, and accessibility contract.

## Current parity

Every Base UI family has a published Mash Web Component contract. The family
roots are registered by `@mash/ui/register`; definition and registration
modules remain separately tree-shakeable.

| Base UI family                                                | Mash contract                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Accordion                                                     | `ui-accordion`, `ui-accordion-item` with single/multiple policy and disclosure events  |
| Alert Dialog, Dialog, Drawer                                  | `ui-alert-dialog`, `ui-dialog`, `ui-drawer` on the shared modal focus engine           |
| Autocomplete, Combobox, Select                                | `ui-autocomplete`, `ui-combobox`, `ui-select`, `ui-option` with form/listbox contracts |
| Avatar, Button, Input, Progress, Separator                    | Existing Mash primitives                                                               |
| Checkbox, Checkbox Group, Radio, Switch, Toggle, Toggle Group | Form-aware independent and grouped selection contracts                                 |
| Collapsible, Tabs                                             | Explicit trigger/content and tab/panel slot anatomy                                    |
| Context Menu, Menu, Menubar, Navigation Menu                  | `ui-menu-item` command contract plus composite navigation semantics                    |
| Field, Fieldset, Form, Number Field, OTP Field, Meter         | Native label, validity, form, numeric, passcode, and measurement semantics             |
| Popover, Preview Card, Tooltip                                | Shared non-modal overlay mechanics with the appropriate focus policy                   |
| Scroll Area, Slider, Toolbar                                  | Native viewport, range, and composite-control interaction contracts                    |
| Toast                                                         | Individual live-region announcement with cancellable lifecycle state                   |

### Shared overlay engine

`ui-dialog`, `ui-alert-dialog`, `ui-drawer`, `ui-popover`, `ui-menu`,
`ui-context-menu`, `ui-tooltip`, and `ui-preview-card` build on one internal
web interaction layer for trigger delegation, Escape, outside dismissal,
focus entry, modal focus containment, and focus return. Concrete elements own
their public event names and ARIA roles; the internal engine is deliberately
not exported as a product API.

The Mash catalogue supplies visual treatment through exposed parts. It does
not modify selection, form, overlay, or event meaning—so a React façade or
native renderer can implement the same contracts without carrying the web
recipe forward.

## Promotion rule

Add a new Mash primitive when an interaction contract recurs across products or
platform renderers. Keep domain records, workflow copy, analytics, and routing
in product wrappers. A catalogue may add a visual language; it may not alter
the component's meaning or event contract.
