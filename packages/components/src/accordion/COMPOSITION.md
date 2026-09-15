# Quiet disclosure sections

Use `ui-accordion variant="quiet" size="compact" mode="multiple"` for independent
sections in a dense navigation rail or tool panel. This is the existing accordion
with a quiet recipe, not a second state or navigation model.

`variant` defaults to `default`; existing disclosure surfaces remain unchanged.
`bordered` is independent and can still add an outer frame when explicitly wanted.
Quiet items have transparent surfaces, no dividers and no body padding. Their
native triggers use the shared control minimum (28px with compact size), grow
with wrapped metadata, and reserve at least 44px on coarse pointers.

Compose each `ui-accordion-item` with:

- A stable `value`, `title` and appropriate `heading-level`.
- A stock decorative `ui-icon` in `disclosure` and optionally `prefix`, with
  `size="small"` and an empty `label`.
- Meaningful, non-interactive metadata in `suffix`, such as “2 pages” or
  “40 of 10000 names”. The muted caption wraps within half the header rather than
  forcing the label outside a narrow rail. The complete text remains in the
  button's accessible name; only the visible title ellipsizes.
- Arbitrary persistent body content in the default slot. Links and actions belong
  here, never nested in the header's button through a prefix/title/suffix slot.

The recipe owns header spacing, disclosure rotation, icon lanes, text hierarchy,
hover, inset keyboard focus, disabled treatment and reduced motion. Do not repeat
those rules with application `::part(trigger)` overrides.

## State and events

Set `mode="multiple"` before attaching independently open items. Restore each
item's `.open` from application preferences; body nodes stay mounted while
collapsed, so input state and node identity survive reopening.

User toggles emit `ui-accordion-item-change` with `{open, value}`. The owning
accordion emits `ui-accordion-change` with the direct open item values. Guard
the event target when listening above a nested accordion.

Programmatic `.open` assignments do not emit user-change events. Persist those
decisions explicitly and trigger any application-specific lazy load separately.
The component does not fetch data or manage preferences.

Native Tab navigation reaches headers and controls in expanded bodies. Enter and
Space toggle the focused header. Arrow-key navigation between headers is not
implemented. The trigger exposes `aria-expanded` and `aria-controls`; each body
is a labelled region under its authored heading level.
