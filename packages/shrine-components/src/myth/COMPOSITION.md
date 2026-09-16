# Record composition

`sh-myth` is one identity and a sequence of authored `sh-limb` fields. A limb
aligns an `sh-slot` label and an `sh-pail` value. No component knows namespace
semantics, fetches records, infers lore, limits field counts, or shortens data.

## Visual pronunciation

| Variant            | Surface                   | Identity and actions                   | Compact field typography | Row block inset |
| ------------------ | ------------------------- | -------------------------------------- | ------------------------ | --------------- |
| `record` (default) | Framed record             | Header                                 | Body role                | 8px             |
| `embedded`         | Unframed full record      | Header                                 | 12px body                | 8px             |
| `preview`          | Unframed authored excerpt | Identity above; metadata/actions below | 11px caption             | 4px             |

These sizes are the current Mash tokens with `data-mash-size="compact"`, not a
separate density API. The parent supplies the surface and placement for embedded
records and previews. Changing variant never changes the projected data.

```html
<sh-myth variant="embedded" data-mash-size="compact" title="Fields">
  <ui-badge slot="meta">2</ui-badge>
  <sh-limb>
    <sh-slot slot="label"><ui-button variant="text">/title</ui-button></sh-slot>
    <sh-pail slot="value" text="Demo card"></sh-pail>
  </sh-limb>
  <sh-limb>
    <sh-slot slot="label" title="/state"></sh-slot>
    <sh-pail slot="value"><a href="/state/ready">/state/ready</a></sh-pail>
  </sh-limb>
</sh-myth>
```

Use the existing rich `title`, `path`, `kind`, `limbs`, and `actions` slots.
`description` accepts an attribute/property or rich slot; it is always authored
supporting prose. `meta` accepts secondary counts or status. Empty optional
slots reserve no header/footer region, including after dynamic removal.
`description`, `summary`, `meta`, and `card-meta` expose the added styling parts.
Default-slot limbs and the legacy limb `slot="slot"` label alias remain valid.

### Record annotation

The optional `annotation` slot holds static supporting context **after identity,
before the fields**, in every variant. Its `annotation` part uses the same muted
11px Mash caption and 4px separation as value annotations, without a badge, extra
card, or live-region role. It is separate from authored `description`, identity
counts in `meta`, and each value's changing `sh-pail` status.

```html
<sh-myth variant="embedded" data-mash-size="compact" title="Fields">
  <span slot="annotation" id="import-context">Values from the imported snapshot.</span>
  <sh-limb>
    <sh-slot slot="label" title="/state"></sh-slot>
    <sh-pail
      slot="value"
      text="ready"
      role="group"
      aria-label="Value of /state"
      aria-describedby="import-context"
    ></sh-pail>
  </sh-limb>
</sh-myth>
```

The component does not aggregate, classify, infer, or rewrite values. The
consumer decides whether shared context applies to its particular displayed
fields; heterogeneous value states still belong beside their own values. Any
`aria-describedby` relationship is the consumer's explicit same-document,
light-DOM reference to its uniquely identified note, not a cross-shadow ID.
Do not mark static context as a live status. An unassigned annotation reserves
no space and never forces an empty title/header; removing or reinserting it
preserves existing limb nodes, controls, values, and focus. Record variant
framing remains unchanged.

## Values and interactions

The recipe is driven by the record's available inline size, not the page width:

- At **28rem (448px) or narrower**, each full-width key sits above its value with
  the existing 4px gap. This applies equally to mobile records, narrow inspectors,
  and inline tree previews on a wide desktop.
- Wider records retain two-column scanning for ordinary short keys: an 8rem
  minimum key measure and a 16rem preferred value measure, both existing Mash
  layout tokens. Values flex into the remaining space.
- Intrinsically wider keys use the space their text needs. If the key and value
  cannot fit together, the value flows onto the next line. An unbroken long key
  therefore wraps across the record width instead of forming a narrow tower.

This is native intrinsic wrapping, not a text-length heuristic or an authored
long-key flag. Resizing never changes or truncates the data. Full records use
mono data and restrained, token-backed separators; descriptions and metadata
remain secondary sans-serif text. Existing 8px full-record / 4px preview row
insets remain consistent in both layouts.

An authored `ui-button variant="text"` in `sh-slot` is a definition action. Its
label wraps; native keyboard activation, focus, loading, and disabled behavior
remain owned by `ui-button`. The recipe provides a 44px coarse-pointer target.
The consumer owns navigation and its accessible name. Links remain native links.

Authored `pre` values preserve whitespace and wrap complete content, including
when nested in a `ui-scroll-area`. Consumers may constrain the scroll viewport's
height, but should not override the field grid, typography, overflow rules, or
replace values with ellipses. Generic record components impose no value limit.

### Value annotation and actions

`sh-pail` accepts optional `status` and `actions` slots below its actual value.
The `annotation`, `status`, and `actions` parts expose the shared wrapping row.
It uses muted caption text and a 4px separation, without adding a card or badge.

```html
<sh-pail>
  <pre>Original displayed representation</pre>
  <span slot="status">Representation shown; exact value not loaded</span>
  <ui-button slot="actions" variant="ghost" size="small">Inspect value</ui-button>
</sh-pail>
```

The consumer supplies all prose and controls. The component does not infer
preview/full/opaque/unknown states, fetch data, or change the value. Status is a
polite atomic live region (`role="status"`); action controls stay outside that
region. Do not add a second live-region role to the projected status text.
Empty slots reserve no annotation row. Updating status or value content retains
the same projected controls and their focus; removing a control remains the
consumer's explicit decision. Named `value` content still takes priority over
the default-slot/text fallback, independently of these optional annotations.

The browser recipe suite exercises light/dark layouts at a 1440px desktop,
390px mobile viewport, and a 280px inspector container. It checks full text,
intrinsic wrapping, keyboard actions, and focus/value identity across resizing.
Representative screenshots are generated in the workspace's ignored
`test-results/shrine-record-layout-*.png` directory.
