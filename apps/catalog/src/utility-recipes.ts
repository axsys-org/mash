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
    "flex flex-wrap items-start justify-between gap-container-gap border-b border-border px-region py-container-block",
  "masthead-title": "m-0 type-heading tracking-[0.02em]",
  "masthead-subtitle": "mt-control-block-small mb-0 type-label-small text-text-muted",
  "build-info":
    "mt-control-block-small mb-0 flex items-center gap-control-gap type-code text-text-muted",
  "build-sha":
    "rounded-control border border-border px-control-inline-small py-control-block-small text-inherit no-underline hover:border-action hover:text-action",
  layout:
    "grid grid-cols-[var(--layout-dimension-panel)_minmax(0,1fr)] items-start max-[45rem]:grid-cols-1",
  sidebar:
    "sticky top-0 max-h-dvh overflow-y-auto border-e border-border px-container-gap py-container-block max-[45rem]:static max-[45rem]:max-h-none max-[45rem]:overflow-visible max-[45rem]:border-e-0 max-[45rem]:border-b",
  "sidebar-heading": "mt-0 mb-inline type-label-small uppercase tracking-[0.09em] text-text-muted",
  "component-family": "mt-region [&:first-of-type]:mt-0",
  "family-title": "m-0 type-label text-text",
  "family-description": "mt-control-block-small mb-control-gap type-label-small text-text-muted",
  "sidebar-list": "m-0 list-none p-0",
  "nav-item":
    "block w-full cursor-pointer rounded-control border-0 bg-transparent px-control-inline py-control-block-small text-start type-code text-inherit hover:bg-surface-sunken",
  "is-active":
    "border-action bg-action text-on-action hover:border-action hover:bg-action hover:text-on-action",
  content: "min-w-0 px-region pt-region pb-[calc(var(--space-region)*4)]",
  "component-heading": "flex flex-wrap items-baseline gap-inline",
  "component-title": "m-0 type-heading",
  "package-badge":
    "rounded-pill border border-border px-control-inline-small py-control-block-small type-code text-text-muted",
  "copy-link":
    "ms-auto cursor-pointer rounded-pill border border-border bg-transparent px-control-inline py-control-block-small type-label-small text-text-muted hover:border-action hover:text-action",
  summary: "mt-control-gap mb-0 type-label-large",
  description:
    "mt-control-gap mb-0 max-w-[70ch] whitespace-pre-line type-label-small text-text-muted",
  note: "type-label-small text-text-muted",
  panel: "mt-region rounded-container border border-border p-container-gap",
  "panel-heading": "mt-0 mb-inline type-label-small uppercase tracking-[0.09em] text-text-muted",
  controls: "grid gap-container-gap",
  control: "grid gap-control-gap",
  "control-label": "type-code text-text-muted",
  "control-hint": "max-w-[70ch] type-label-small text-text-muted",
  segmented: "flex flex-wrap gap-control-gap",
  segment:
    "cursor-pointer rounded-control border border-border bg-transparent px-control-inline py-control-block-small type-label-small text-inherit hover:border-action",
  toggle: "inline-flex cursor-pointer items-center gap-control-gap type-label-small",
  "slot-toggles": "flex flex-wrap gap-inline",
  "text-input":
    "max-w-[var(--layout-dimension-panel)] rounded-control border border-border bg-canvas px-control-inline py-control-block-small type-label-small text-inherit focus-visible:focus-ring",
  "catalog-sections": "contents",
  "stage-shell":
    "mt-region h-[32.5rem] min-h-[11.25rem] resize-y overflow-hidden rounded-container border border-border",
  "stage-frame": "block h-full w-full border-0",
  code: "mt-0 mb-control-gap overflow-x-auto rounded-control bg-surface-sunken px-container-gap py-inline type-code",
  "api-block": "mt-container-gap",
  "api-heading": "mt-0 mb-control-gap type-label-small",
  "api-empty-note": "m-0",
  "api-table": "block w-full overflow-x-auto border-collapse",
  "api-cell":
    "border-b border-border py-control-gap pe-control-inline text-start align-top type-label-small",
  "api-th": "type-label-small uppercase tracking-[0.07em] text-text-muted",
  type: "text-action",
  "api-list":
    "m-0 grid grid-cols-[minmax(var(--layout-dimension-compact),auto)_1fr] gap-y-control-gap gap-x-container-gap",
  "api-term": "type-code",
  "api-description": "m-0 type-label-small",
  "token-list": "m-0 grid list-none gap-inline p-0",
  provenance: "rounded-control border border-border px-container-gap py-inline",
  "provenance-head": "flex flex-wrap items-center gap-control-gap",
  "token-var": "font-semibold",
  "token-value": "type-code text-text-muted",
  swatch: "size-glyph rounded-control border border-border",
  "provenance-chain":
    "mt-control-gap mb-0 flex list-none flex-wrap items-center gap-control-gap p-0",
  "provenance-step": "inline-flex items-center gap-control-gap type-label-small",
  "provenance-arrow": "me-control-block-small text-text-muted",
  layer:
    "rounded-pill bg-surface-sunken px-control-inline-small py-control-block-small type-label-small uppercase tracking-[0.06em] text-text-muted",
  "layer-reference":
    "bg-[color-mix(in_srgb,var(--color-action)_14%,var(--color-canvas))] text-action",
  "layer-theme":
    "bg-[color-mix(in_srgb,var(--color-positive)_14%,var(--color-canvas))] text-positive",
  "token-description": "mt-control-gap mb-0 max-w-[80ch] type-label-small text-text-muted",
};

const stageRecipes: UtilityRecipes = {
  "slot-fill": "inline",
  demo: "grid h-full min-h-zero place-items-center rounded-control border border-dashed px-control-inline py-control-block type-code text-text-muted [background:color-mix(in_oklab,var(--color-action)_8%,var(--color-surface))] [border-color:color-mix(in_oklab,var(--color-action)_35%,var(--color-border-strong))]",
  "demo-quiet": "border-solid border-border bg-surface-sunken",
  "demo-main": "border-solid border-border bg-surface text-text",
  "button-showcase":
    "flex w-[min(100%,var(--layout-dimension-content))] flex-col items-stretch justify-center gap-control-gap overflow-auto border border-border bg-surface text-text type-body [padding-block:clamp(var(--space-control-block),4vw,calc(var(--space-group-block)*2))] [padding-inline:clamp(var(--space-control-inline),6vw,calc(var(--space-region)*2))]",
  "button-showcase-heading":
    "flex items-baseline justify-between gap-control-gap text-text max-[35rem]:flex-col max-[35rem]:items-start",
  "button-showcase-grid":
    "grid grid-cols-[minmax(calc(var(--layout-dimension-glyph)*4),0.55fr)_repeat(3,minmax(0,1fr))] items-center gap-y-control-gap gap-x-group-inline max-[35rem]:grid-cols-[minmax(calc(var(--layout-dimension-glyph)*3.5),0.5fr)_repeat(3,minmax(0,1fr))] max-[35rem]:gap-group-related",
  "button-showcase-label": "type-code lowercase text-text-muted",
  "button-showcase-row": "flex flex-wrap items-center gap-control-gap",
  "button-showcase-rule": "my-group-related h-[var(--border-hairline)] bg-border",
  "button-showcase-compact": "gap-region",
  "catalog-example": "block w-[min(100%,var(--layout-dimension-content))] text-text",
  "catalog-example-card": "w-[min(100%,var(--layout-dimension-content))]",
  "example-stack":
    "flex flex-col items-start gap-control-gap rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-form":
    "flex flex-col items-start gap-control-gap rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-eyebrow": "m-0 type-label text-text-muted",
  "example-support": "m-0 text-text-muted",
  "example-card-heading":
    "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-control-gap max-[35rem]:grid-cols-[auto_minmax(0,1fr)]",
  "example-actions": "flex flex-wrap items-center gap-control-gap",
  "example-toolbar": "flex flex-wrap items-center gap-control-gap",
  "example-navigation":
    "flex flex-wrap items-center gap-control-gap rounded-container border border-border bg-surface px-control-inline py-control-block",
  "example-link-showcase":
    "grid w-[min(100%,var(--layout-dimension-content))] gap-container-block rounded-container border border-border bg-surface px-container-inline py-container-block shadow-[0_2px_8px_var(--color-shadow)]",
  "example-link-heading": "grid gap-control-block-small",
  "example-link-matrix": "grid overflow-hidden rounded-control border border-border",
  "example-link-row":
    "grid min-h-control min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-group-inline border-b border-border px-control-inline py-control-block max-[28rem]:grid-cols-1 max-[28rem]:gap-control-block-small",
  "example-link-prose": "min-w-0",
  "example-link-content-grid":
    "grid grid-cols-[repeat(2,minmax(0,1fr))] items-center gap-container-gap max-[35rem]:grid-cols-1",
  "example-link-navigation":
    "grid w-[min(100%,calc(var(--layout-dimension-panel)_+_var(--space-region)))]! gap-control-block-small rounded-container border border-border bg-surface px-control-inline py-control-block shadow-[0_2px_8px_var(--color-shadow)]",
  "example-link-navigation-heading":
    "mb-control-block-small grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-control-gap border-b border-border px-control-inline-small pb-control-block type-label-large",
  "example-link-icon": "inline-grid size-glyph place-items-center rounded-control text-text-muted",
  "example-link-nav-item": "w-full [&::part(control)]:w-full",
  "example-link-card": "w-[min(100%,var(--layout-dimension-dialog))]",
  "example-link-card-copy": "grid gap-control-gap",
  "example-field": "w-[min(100%,var(--layout-dimension-dialog))]",
  "example-editor-workspace": "w-[min(100%,var(--layout-dimension-content))]",
  "example-editor-search": "w-[min(22rem,calc(100vw-var(--space-container-inline)*4))]",
  "example-editor-completion":
    "mt-[calc(var(--space-region)+var(--space-container-block))] w-[min(22rem,calc(100vw-var(--space-container-inline)*4))]",
  "example-editor-status": "flex items-center gap-control-gap",
  "example-pagination":
    "grid gap-container-block rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-pagination-heading": "flex items-center justify-between gap-control-gap",
  "example-table-entity": "flex min-w-0 items-center gap-control-gap",
  "example-table-copy": "grid min-w-0 gap-[var(--border-hairline)]",
  "example-table-meta": "type-label-small text-text-muted",
  "example-table-progress":
    "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-control-gap",
  "example-table-number": "block text-end type-code [font-variant-numeric:tabular-nums]",
  "example-table-states":
    "grid w-[min(100%,var(--layout-dimension-content))] grid-cols-2 gap-container-gap max-[45rem]:grid-cols-1",
  "example-table-message": "flex items-center gap-control-gap text-text-muted",
  "example-tree-glyph":
    "inline-block size-[calc(var(--space-control-gap)+var(--space-control-block-small))] rounded-control border border-current [background:color-mix(in_oklab,currentColor_14%,transparent)]",
  "example-toolbar-dock":
    "relative grid min-h-[16.25rem] place-items-center overflow-hidden rounded-container border border-dashed border-border-strong bg-surface-sunken type-code text-text-muted",
  "example-tabs":
    "rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-dialog-copy": "grid gap-control-gap",
  "example-popover-content": "grid min-w-[15rem] gap-control-gap",
  "example-context-target": "w-[min(100%,var(--layout-dimension-dialog))]",
  "example-message-thread":
    "flex flex-col gap-control-gap rounded-container border border-border bg-surface-sunken px-container-inline py-container-block",
  "example-message-bubble": "w-[min(82%,var(--layout-dimension-content))] self-start",
  "example-flex-row": "flex flex-wrap items-start justify-between gap-container-gap",
  "example-tooltip-grid":
    "flex min-h-compact flex-wrap items-end justify-center gap-container-gap px-container-inline py-container-block",
  "example-slider-matrix":
    "flex flex-wrap items-start gap-container-gap rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-toast-list": "flex flex-col flex-wrap items-stretch gap-container-gap",
  "example-media-card": "m-0 grid gap-control-gap [&::part(root)]:aspect-[16/9]",
  "example-metric-grid":
    "m-0 grid grid-cols-[repeat(auto-fit,minmax(var(--layout-dimension-compact),1fr))] gap-control-gap",
  "example-avatar-group": "flex items-center ps-control-inline-small",
  "example-slider-ticks": "block pb-container-block",
  "example-slider-tick-row": "flex w-full justify-between",
  "example-scroll-jump":
    "relative pb-[calc(var(--space-container-block)+var(--space-container-inline))]",
  "example-scroll-actions": "absolute end-control-inline bottom-control-block flex gap-control-gap",
  "example-sidebar-navigation": "grid gap-control-gap px-container-inline py-container-block",
  "example-activity": "block h-[11.875rem]",
  "example-message-bubble-me": "self-end",
};

const stageSelectorRecipes: ReadonlyArray<readonly [string, string]> = [
  [
    ".demo.button-showcase-row, .demo.button-showcase-heading",
    "h-auto border-0 bg-transparent p-0",
  ],
  [".button-showcase-heading strong", "type-label"],
  [".button-showcase-heading span", "type-body text-end text-text-muted max-[35rem]:text-start"],
  [".button-showcase-grid ui-button", "justify-self-start"],
  [".example-stack > *, .example-form > *", "max-w-full"],
  [".example-form ui-fieldset, .example-stack ui-fieldset", "w-full"],
  [".example-card-heading > div", "grid min-w-0 gap-control-block-small"],
  [
    ".example-card-heading strong, .example-dialog-copy h2, .example-popover-content strong",
    "type-label",
  ],
  [".example-card-heading span", "truncate type-label-small text-text-muted"],
  [".example-card-heading ui-badge", "max-[35rem]:col-start-2 max-[35rem]:justify-self-start"],
  [".example-link-heading h2, .example-link-heading p", "m-0"],
  [".example-link-heading h2", "type-label-large"],
  [".example-link-heading p", "type-label-small text-text-muted"],
  [".example-link-row > span:first-child", "type-code text-text-muted"],
  [".example-link-row:last-child", "border-b-0"],
  [".example-link-prose, .example-link-card-copy p", "m-0"],
  [".example-link-content-grid ui-link", "justify-self-start"],
  [".example-link-nav-item ui-badge", "ms-auto"],
  [".example-editor-status span:last-child", "ms-auto"],
  [".example-pagination-heading > div", "grid gap-[var(--border-hairline)]"],
  [".example-table-progress ui-progress", "w-full! min-w-0"],
  [
    ".example-pagination-heading span, .example-pagination-heading output",
    "type-label-small text-text-muted",
  ],
  [
    '.example-tree-glyph[data-kind="workspace"]',
    "rounded-[var(--border-hairline)] text-action [box-shadow:inset_0_0_0_var(--border-hairline)_var(--color-surface)]",
  ],
  ['.example-tree-glyph[data-kind="file"]', "rounded-[var(--border-hairline)] text-text-muted"],
  [
    ".example-toolbar-dock ui-toolbar[data-mash-toolbar-dock]",
    "bg-surface-raised px-control-inline py-control-block shadow-[0_2px_8px_var(--color-shadow)]",
  ],
  [".example-tabs ui-tab-panel", "block pt-container-block"],
  [".example-support, .example-dialog-copy p, .example-popover-content p", "m-0 text-text-muted"],
  [".example-dialog-copy h2", "m-0"],
  [".example-context-target ui-card", "cursor-context-menu"],
  [".example-context-target p, .example-activity ol", "m-0"],
  ['.example-message-bubble[data-from="me"]', "self-end"],
  [
    ".example-message-bubble p, .example-media-card figcaption, .example-metric-grid dd, .example-metric-grid dt",
    "m-0",
  ],
  [".example-flex-row > *", "flex-[1_1_var(--layout-dimension-compact)]"],
  [".example-media-card ui-image", "[&::part(root)]:aspect-[16/9]"],
  [".example-media-card figcaption", "type-label-small text-text-muted"],
  [
    ".example-metric-grid > div",
    "grid gap-control-block-small rounded-container border border-border bg-surface px-container-inline py-container-block",
  ],
  [".example-metric-grid dt", "type-label-small text-text-muted"],
  [".example-metric-grid dd", "type-heading text-text"],
  [".example-avatar-group ui-avatar", "ms-[calc(var(--space-control-inline-small)*-1)]"],
  [
    ".example-avatar-group ui-avatar",
    "[&::part(root)]:shadow-[0_0_0_var(--border-hairline)_var(--color-surface)]",
  ],
  [".example-slider-matrix ui-field", "flex-[1_1_var(--layout-dimension-panel)]"],
  [".example-sidebar-navigation ui-collapsible", "grid gap-control-gap"],
  [".example-activity ol", "grid gap-group-inline ps-[calc(var(--space-group-inline)*2)]"],
  [".example-navigation a, ui-preview-card a", "text-action no-underline hover:underline"],
];

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function expand(value: string, recipes: UtilityRecipes): string {
  const aliases = words(value);
  const utilities = aliases.flatMap((alias) => words(recipes[alias] ?? ""));
  return [...new Set([...aliases, ...utilities])].join(" ");
}

function expandStage(value: string): string[] {
  const aliases = words(value);
  const expanded = words(expand(value, stageRecipes));
  if (!aliases.includes("demo-quiet") && !aliases.includes("demo-main")) return expanded;

  const basePresentation = new Set([
    "border-dashed",
    "[background:color-mix(in_oklab,var(--color-action)_8%,var(--color-surface))]",
    "[border-color:color-mix(in_oklab,var(--color-action)_35%,var(--color-border-strong))]",
    ...(aliases.includes("demo-main") ? ["text-text-muted"] : []),
  ]);
  return expanded.filter((name) => !basePresentation.has(name));
}

function addUtilities(element: Element, utilities: string): void {
  const names = words(utilities).filter((name) => !element.classList.contains(name));
  if (names.length > 0) element.classList.add(...names);
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

/** Expand a single synthesized preview slot. */
export function stageClassName(value: string): string {
  return expandStage(value).join(" ");
}

/** Apply application-local utility recipes after an authored example is parsed. */
export function applyStageUtilityRecipes(root: Element): void {
  const elements = [root, ...root.querySelectorAll("[class]")];
  for (const element of elements) {
    const aliases = [...element.classList];
    addUtilities(element, expandStage(aliases.join(" ")).join(" "));
  }

  for (const [selector, utilities] of stageSelectorRecipes) {
    for (const element of root.querySelectorAll(selector)) addUtilities(element, utilities);
  }

  for (const element of root.querySelectorAll('.example-message-bubble[data-from="me"]')) {
    element.classList.remove("self-start");
  }
}

const bodyLayoutRecipes = {
  center:
    "flex items-center justify-center px-container-inline py-[calc(var(--space-container-block)+var(--space-region))]",
  start: "flex items-start justify-start px-container-inline py-container-block",
  anchor:
    "flex items-start justify-center px-container-inline pt-[calc(var(--space-region)*3)] pb-[calc(var(--space-region)*2)]",
  fill: "p-0",
} as const;

const bodyBase = "m-0 h-full bg-canvas text-text type-body";
const allBodyLayoutUtilities = new Set(
  Object.values(bodyLayoutRecipes).flatMap((recipe) => words(recipe)),
);

/** Keep preview positioning in class state rather than a data-selector stylesheet. */
export function applyStageLayout(doc: Document, layout: keyof typeof bodyLayoutRecipes): void {
  doc.documentElement.classList.toggle("overflow-hidden", layout === "fill");
  doc.body.className = bodyBase;
  doc.body.classList.remove(...allBodyLayoutUtilities);
  addUtilities(doc.body, bodyLayoutRecipes[layout]);
}
