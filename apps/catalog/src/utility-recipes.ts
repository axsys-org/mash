/**
 * Semantic Tailwind recipes for the catalogue application and its examples.
 *
 * These are intentionally application-local class compositions, not a second
 * stylesheet and not component recipes. Mash tokens remain the value source;
 * Tailwind supplies layout and lightweight presentation; component catalogues
 * continue to own the shared `::part()` layer.
 */

type UtilityRecipes = Readonly<Record<string, string>>;

const catalogRecipes: UtilityRecipes = {
  masthead:
    "sticky top-0 grid h-[3.5rem] grid-cols-[auto_minmax(10rem,28rem)_auto] items-center gap-container-gap border-b border-border bg-surface px-container-gap [z-index:var(--layer-overlay)] max-[45rem]:grid-cols-[auto_minmax(0,1fr)] [background:var(--color-canvas)]! [box-shadow:none]! [&_.component-jump]:[max-inline-size:28rem]!",
  "masthead-brand": "flex min-w-0 items-baseline gap-control-gap text-text no-underline",
  "masthead-title": "m-0 type-heading [font-weight:700]! [letter-spacing:-0.04em]!",
  "masthead-subtitle": "m-0 type-label-small text-text-muted max-[40rem]:hidden [display:none]!",
  "build-info":
    "m-0 flex shrink-0 items-center gap-control-gap type-code text-text-muted max-[45rem]:hidden",
  "build-ref": "",
  "build-sha":
    "rounded-control border border-border px-control-inline-small py-control-block-small text-inherit no-underline hover:border-action hover:text-action",
  "component-jump": "block w-full min-w-0",
  "picker-menu": "block min-w-0",
  "picker-trigger":
    "w-full min-w-0 [&::part(control)]:w-full [&::part(control)]:justify-between [&::part(control)]:gap-control-gap [&::part(control)]:border-border! [&::part(control)]:bg-canvas! [&::part(control)]:text-text!",
  "picker-value": "min-w-0 truncate text-start",
  "picker-chevron": "shrink-0 text-text-muted",
  "inspector-picker": "w-full [max-inline-size:22rem]!",
  layout:
    "grid min-h-[calc(100dvh_-_3.5rem)] grid-cols-[var(--layout-dimension-panel)_minmax(0,1fr)] items-start max-[72rem]:grid-cols-1 [grid-template-columns:15rem_minmax(0,_1fr)]! max-[72rem]:[grid-template-columns:minmax(0,_1fr)]!",
  sidebar:
    "sticky top-[3.5rem] grid h-[calc(100dvh_-_3.5rem)] min-w-0 grid-rows-[auto_minmax(0,1fr)] border-e border-border bg-canvas px-container-gap py-container-block max-[72rem]:hidden [border:0]! [padding-inline:var(--space-container-gap)]!",
  "sidebar-top":
    "grid gap-control-gap bg-canvas pb-container-block [padding-block-end:var(--space-control-gap)]!",
  "sidebar-scroll": "min-h-0 overflow-y-auto",
  "sidebar-heading": "m-0 type-label text-text [font-weight:600]!",
  "sidebar-search":
    "w-full rounded-control border border-border bg-surface px-control-inline py-control-block-small type-label-small text-text outline-none focus-visible:focus-ring",
  "sidebar-result": "type-label-small text-text-muted [display:none]!",
  "component-family":
    "mt-container-gap border-t border-border pt-container-gap [&:first-of-type]:mt-0 [&:first-of-type]:border-t-0 [&:first-of-type]:pt-0",
  "family-row": "flex min-w-0 items-center justify-between gap-control-gap",
  "family-title": "m-0 type-label-small text-text",
  "family-count":
    "rounded-pill border border-border bg-surface px-control-inline-small py-control-block-small type-label-small text-text-muted",
  "family-description": "mt-control-block-small mb-0 type-label-small text-text-muted",
  "sidebar-list": "m-0 mt-control-gap grid list-none gap-[var(--border-hairline)] p-0 [gap:0]!",
  "nav-item":
    "block w-full cursor-pointer rounded-control border border-transparent bg-transparent px-control-inline py-control-block-small text-start type-label-small text-text-muted hover:bg-surface-sunken hover:text-text focus-visible:focus-ring [padding-block:var(--space-control-gap)]! [font-size:var(--type-label-font-size)]!",
  "is-selected": "border-transparent! bg-selection! text-on-selection! hover:bg-selection-hover!",
  "is-active":
    "border-action bg-action text-on-action hover:border-action hover:bg-action hover:text-on-action",
  content:
    "min-w-0 px-region py-container-gap [padding:2.5rem_3rem_5rem]! [max-inline-size:82rem]! [inline-size:100%]! [margin-inline:auto]! max-[72rem]:[padding-inline:var(--space-container-gap)]! max-[40rem]:[padding-block-start:1.5rem]!",
  "component-intro":
    "mb-container-gap max-w-[80ch] [max-inline-size:none]! [margin-block-end:1.5rem]!",
  "component-heading":
    "flex min-w-0 flex-wrap items-baseline gap-control-gap max-[40rem]:[&_.copy-link]:[display:none]!",
  "component-title":
    "m-0 type-heading [font-size:2rem]! [line-height:1.2]! [letter-spacing:-0.035em]! [font-weight:650]! max-[40rem]:[font-size:1.65rem]!",
  "package-badge":
    "rounded-pill border border-border px-control-inline-small py-control-block-small type-code text-text-muted [border:0]! [border-radius:var(--radius-control)]! [background:var(--color-surface-sunken)]!",
  "copy-link":
    "ms-auto cursor-pointer rounded-pill border border-border bg-transparent px-control-inline py-control-block-small type-label-small text-text-muted hover:border-action hover:text-action [border-radius:var(--radius-control)]!",
  summary:
    "mt-control-gap mb-0 type-label-large [max-inline-size:65ch]! [color:var(--color-text-muted)]! [font-size:1rem]!",
  description:
    "mt-control-gap mb-0 max-w-[70ch] whitespace-pre-line type-label-small text-text-muted",
  note: "type-label-small text-text-muted",
  workbench:
    "grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] items-start gap-container-gap max-[86rem]:grid-cols-1 [display:flex]! [flex-direction:column]! [gap:0]! [overflow:hidden]! [border:var(--border-hairline)_solid_var(--color-border)]! [border-radius:var(--radius-container)]!",
  inspector:
    "min-w-0 [order:-1]! [inline-size:100%]! [border-block-end:var(--border-hairline)_solid_var(--color-border)]!",
  panel: "rounded-container border border-border bg-surface px-container-inline py-container-block",
  "inspector-panel":
    "sticky top-[calc(3.5rem_+_var(--space-container-gap))] max-h-[calc(100dvh_-_3.5rem_-_(var(--space-container-gap)*2))] overflow-y-auto max-[86rem]:static max-[86rem]:max-h-none [position:static]! [max-block-size:none]! [border:0]! [border-radius:0]! [padding:var(--space-control-gap)_var(--space-container-inline)]! [background:var(--color-canvas)]! [&_>_.panel-heading]:[display:none]! [&_.controls]:[display:flex]! [&_.controls]:[align-items:center]! [&_.controls]:[flex-wrap:wrap]! [&_.controls]:[gap:var(--space-container-gap)]! [&_.control]:[display:flex]! [&_.control]:[align-items:center]! [&_.control]:[gap:var(--space-control-gap)]! [&_.control:first-child]:[flex:1]! [&_.control:first-child]:[min-inline-size:12rem]! [&_.control-label]:[text-transform:capitalize]! max-[40rem]:[&_.controls]:[gap:var(--space-control-gap)]! max-[40rem]:[&_.control]:[flex-wrap:wrap]!",
  "panel-heading": "mt-0 mb-inline type-label text-text",
  controls: "grid gap-container-gap",
  control: "grid gap-control-gap",
  "control-label": "type-label-small text-text-muted",
  "control-hint": "max-w-[70ch] type-label-small text-text-muted",
  segmented:
    "inline-flex min-w-0 flex-wrap gap-control-gap rounded-control bg-surface-sunken p-[var(--border-hairline)]",
  segment:
    "min-h-[var(--layout-dimension-control-xsmall)] cursor-pointer rounded-control border border-transparent bg-transparent px-control-inline py-control-block-small type-label-small text-text-muted hover:bg-surface hover:text-text focus-visible:focus-ring",
  toggle: "inline-flex cursor-pointer items-center gap-control-gap type-label-small",
  "slot-toggles": "flex flex-wrap gap-inline",
  "text-input":
    "w-full min-w-0 rounded-control border border-border bg-canvas px-control-inline py-control-block-small type-label-small text-text focus-visible:focus-ring",
  "reference-sections":
    "mt-container-gap grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-container-gap max-[80rem]:grid-cols-1 [display:flex]! [flex-direction:column]! [gap:3rem]! [margin-block-start:2.5rem]! [&_>_.panel]:[padding:0]! [&_>_.panel]:[border:0]! [&_>_.panel]:[background:transparent]! [&_>_.panel]:[border-radius:0]! [&_.panel-heading]:[font-size:1.25rem]! [&_.panel-heading]:[font-weight:600]! [&_.panel-heading]:[letter-spacing:-0.02em]!",
  "usage-panel":
    "min-w-0 [position:relative]! [&_>_.copy-link]:[position:absolute]! [&_>_.copy-link]:[inset-block-start:0]! [&_>_.copy-link]:[inset-inline-end:0]!",
  "api-panel": "col-span-full min-w-0",
  "tokens-panel":
    "min-w-0 [&_.token-list]:[grid-template-columns:repeat(auto-fit,_minmax(min(100%,_22rem),_1fr))]!",
  "catalog-sections": "contents",
  "stage-shell":
    "h-[32.5rem] min-h-[18rem] resize-y overflow-hidden rounded-container border border-border bg-surface [box-shadow:0_var(--space-control-block-small)_var(--space-region)_var(--color-shadow)] max-[45rem]:h-[24rem] [inline-size:100%]! [block-size:32rem]! [min-block-size:20rem]! [border:0]! [border-radius:0]! [box-shadow:none]! [background:var(--color-canvas)]! max-[40rem]:[block-size:30rem]!",
  "stage-frame": "block h-full w-full border-0",
  code: "mt-0 mb-control-gap block max-h-[22rem] max-w-full min-w-0 overflow-auto rounded-control bg-surface-sunken px-container-gap py-inline type-code [padding:1.25rem]! [border:var(--border-hairline)_solid_var(--color-border)]! [border-radius:var(--radius-control)]! [background:var(--color-surface-sunken)]! [line-height:1.65]! [font-size:var(--type-code-font-size)]!",
  "api-block": "mt-container-gap",
  "api-heading":
    "mt-0 mb-control-gap type-label-small [font-size:var(--type-label-font-size)]! [font-weight:600]!",
  "api-empty-note": "m-0",
  "api-table":
    "block w-full overflow-x-auto border-collapse [display:table]! max-[40rem]:[display:block]!",
  "api-cell":
    "border-b border-border py-control-gap pe-control-inline text-start align-top type-label-small [padding-block:var(--space-container-block)]!",
  "api-th":
    "type-label-small uppercase tracking-[0.07em] text-text-muted [text-transform:none]! [letter-spacing:normal]!",
  type: "text-action",
  "api-list":
    "m-0 grid grid-cols-[minmax(var(--layout-dimension-compact),auto)_1fr] gap-y-control-gap gap-x-container-gap",
  "api-term": "type-code",
  "api-description": "m-0 type-label-small",
  "api-variant": "ms-control-gap inline-block text-text-muted type-code [display:none]!",
  "token-list": "m-0 grid min-w-0 list-none gap-inline p-0",
  provenance:
    "min-w-0 max-w-full overflow-hidden rounded-control border border-border px-container-gap py-inline [padding:var(--space-container-block)]!",
  "provenance-head": "flex min-w-0 flex-wrap items-center gap-control-gap",
  "token-var": "min-w-0 break-all font-semibold",
  "token-value": "min-w-0 break-all type-code text-text-muted",
  swatch: "size-glyph rounded-control border border-border",
  "provenance-chain":
    "mt-control-gap mb-0 flex min-w-0 list-none flex-wrap items-center gap-control-gap p-0",
  "provenance-step": "inline-flex min-w-0 items-center gap-control-gap type-label-small",
  "provenance-arrow": "me-control-block-small text-text-muted",
  layer:
    "rounded-pill bg-surface-sunken px-control-inline-small py-control-block-small type-label-small uppercase tracking-[0.06em] text-text-muted",
  "layer-reference": "bg-action-subtle text-action",
  "layer-theme": "bg-positive-subtle text-positive",
  "token-description": "mt-control-gap mb-0 max-w-[80ch] type-label-small text-text-muted",
  "page-links":
    " [display:flex]! [flex-wrap:wrap]! [gap:1.5rem]! [padding-block-end:1.5rem]! [font-size:var(--type-label-small-font-size)]! [&_a]:[color:var(--color-text-muted)]! [&_a]:[text-decoration:none]! [&_a:hover]:[color:var(--color-text)]!",
  "api-block-empty": " [display:none]!",
};

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function expand(value: string, recipes: UtilityRecipes): string {
  const aliases = words(value);
  const utilities = aliases.flatMap((alias) => words(recipes[alias] ?? ""));
  return [...new Set([...aliases, ...utilities])].join(" ");
}

/** Expand catalogue-chrome aliases as nodes are created. */
export function catalogClassName(value: string): string {
  const aliases = words(value);
  const expanded = words(expand(value, catalogRecipes));
  if (!aliases.includes("is-active")) return expanded.join(" ");

  // Utility source order, not class-attribute order, decides equal-specificity
  // conflicts. Remove the inactive declaration instead of trying to out-order
  // it with an important modifier.
  const inactive = new Set(["bg-transparent", "border-border", "text-inherit"]);
  return expanded.filter((name) => !inactive.has(name)).join(" ");
}
