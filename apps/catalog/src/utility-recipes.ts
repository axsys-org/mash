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
  "layer-reference": "bg-action-subtle text-action",
  "layer-theme": "bg-positive-subtle text-positive",
  "token-description": "mt-control-gap mb-0 max-w-[80ch] type-label-small text-text-muted",
};

const stageRecipes: UtilityRecipes = {
  "slot-fill": "inline",
  demo: "grid h-full min-h-zero place-items-center rounded-control border border-dashed border-action-border bg-action-wash px-control-inline py-control-block type-code text-text-muted",
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
  "example-icon-library":
    "flex flex-wrap items-center gap-container-gap rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-icon-state-dot":
    "block size-control-gap rounded-full border border-surface bg-positive shadow-[0_0_0_var(--border-hairline)_var(--color-positive)]",
  "example-gesture-command":
    "grid w-[min(100%,var(--layout-dimension-dialog))] cursor-pointer gap-control-gap rounded-container border border-border bg-surface-sunken px-container-inline py-container-block outline-none focus-visible:focus-ring",
  "example-gesture-arena-shell":
    "grid w-[min(100%,var(--layout-dimension-dialog))] place-items-center gap-container-gap overflow-hidden rounded-container border border-border bg-surface-sunken px-container-inline py-container-block",
  "example-gesture-arena":
    "grid min-h-control w-[min(100%,var(--layout-dimension-compact))] cursor-grab grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-control-gap rounded-container border border-border bg-surface px-control-inline py-control-block shadow-[0_2px_8px_var(--color-shadow)] outline-none [touch-action:none] [translate:var(--gesture-x,0)_var(--gesture-y,0)] active:cursor-grabbing focus-visible:focus-ring",
  "example-gesture-status": "flex min-w-0 items-center gap-control-gap type-code text-text-muted",
  "example-gesture-heading": "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-container-gap",
  "example-gesture-shortcuts":
    "grid w-[min(100%,var(--layout-dimension-dialog))] gap-container-gap rounded-container border border-border bg-surface-sunken px-container-inline py-container-block outline-none focus-visible:focus-ring",
  "example-gesture-command-list":
    "grid overflow-hidden rounded-control border border-border bg-surface",
  "example-gesture-selection":
    "grid w-[min(100%,var(--layout-dimension-dialog))] gap-container-gap rounded-container border border-border bg-surface-sunken px-container-inline py-container-block",
  "example-gesture-selection-list":
    "grid overflow-hidden rounded-control border border-border bg-surface",
  "example-gesture-scrubber":
    "grid w-[min(100%,var(--layout-dimension-dialog))] gap-container-gap rounded-container border border-border bg-surface-sunken px-container-inline py-container-block",
  "example-gesture-scrub-track":
    "relative grid min-h-control cursor-ew-resize items-center rounded-control border border-border bg-surface px-control-inline outline-none [touch-action:none] focus-visible:focus-ring",
  "example-gesture-scrub-thumb":
    "pointer-events-none absolute left-[var(--gesture-progress,46%)] top-1/2 size-control-gap -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface bg-action shadow-[0_0_0_var(--border-hairline)_var(--color-action)]",
  "example-gesture-preview":
    "grid w-[min(100%,var(--layout-dimension-dialog))] grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-container-gap rounded-container border border-border bg-surface-sunken px-container-inline py-container-block max-[38rem]:grid-cols-1",
  "example-gesture-preview-list":
    "grid content-start overflow-hidden rounded-control border border-border bg-surface",
  "example-gesture-preview-card": "min-h-[var(--layout-dimension-control-large)]",
  "example-motion-demo":
    "grid w-[min(100%,var(--layout-dimension-dialog))] gap-container-gap rounded-container border border-border bg-surface-sunken px-container-inline py-container-block",
  "example-motion-drop":
    "grid w-[min(100%,var(--layout-dimension-dialog))] gap-control-gap rounded-container border border-border bg-surface-sunken px-container-inline py-container-block",
  "example-motion-wash": "block h-full w-full rounded-container bg-action-wash",
  "example-motion-scene": "w-full [&::part(root)]:w-full",
  "example-shortcut-list":
    "grid w-[min(100%,var(--layout-dimension-dialog))] overflow-hidden rounded-container border border-border bg-surface",
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
  "example-path-showcase":
    "grid w-[min(100%,var(--layout-dimension-content))] gap-container-block rounded-container border border-border bg-surface px-container-inline py-container-block shadow-[0_2px_8px_var(--color-shadow)]",
  "example-path-case": "grid min-w-0 gap-control-block-small",
  "example-path-narrow": "w-[min(100%,22rem)]!",
  "example-material-stage":
    "relative min-h-compact w-[min(100%,var(--layout-dimension-content))] overflow-hidden rounded-container border border-border bg-[url('/assets/material-reference.png')] bg-cover bg-center px-container-inline py-container-block",
  "example-material-grid":
    "relative z-raised grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-container-gap",
  "example-material":
    "min-w-0 rounded-container border border-border px-control-inline py-control-block shadow-[0_8px_24px_var(--color-shadow)]",
  "example-field": "w-[min(100%,var(--layout-dimension-dialog))]",
  "example-editor-workspace": "w-[min(100%,var(--layout-dimension-content))]",
  "example-editor-search": "w-[min(22rem,calc(100vw-var(--space-container-inline)*4))]",
  "example-editor-completion":
    "mt-[calc(var(--space-region)+var(--space-container-block))] w-[min(22rem,calc(100vw-var(--space-container-inline)*4))]",
  "example-editor-status": "flex items-center gap-control-gap",
  "example-pagination":
    "grid gap-container-block rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-pagination-heading": "flex items-center justify-between gap-control-gap",
  "example-linear-workspace":
    "grid h-full min-h-0 w-full grid-cols-[13.5rem_minmax(0,1fr)] overflow-hidden bg-canvas text-text max-[45rem]:grid-cols-1",
  "example-linear-sidebar":
    "grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden border-e border-border bg-surface-sunken max-[45rem]:hidden",
  "example-linear-navigation":
    "grid content-start gap-container-block overflow-y-auto px-control-inline py-container-block",
  "example-linear-identity":
    "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-control-gap",
  "example-linear-identity-copy": "grid min-w-0 gap-[var(--border-hairline)]",
  "example-linear-search": "w-full! min-w-0",
  "example-linear-nav-list": "grid gap-[var(--border-hairline)]",
  "example-linear-nav-section": "grid gap-[var(--border-hairline)]",
  "example-linear-nav-link": "w-full min-w-0 [&::part(control)]:w-full",
  "example-linear-nav-heading":
    "flex items-center justify-between px-control-inline-small type-label-small text-text-muted",
  "example-linear-team-mark":
    "inline-grid size-glyph place-items-center rounded-control bg-neutral text-on-neutral type-code",
  "example-linear-cycle":
    "grid gap-control-gap rounded-control border border-border bg-surface px-control-inline py-control-block",
  "example-linear-cycle-copy": "flex items-center justify-between type-label-small",
  "example-linear-new-issue": "px-control-inline py-container-block",
  "example-linear-shell": "grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden",
  "example-linear-topbar":
    "flex min-w-0 items-center justify-between gap-control-gap border-b border-border bg-surface px-control-inline py-control-block-small",
  "example-linear-breadcrumb": "flex min-w-0 items-center gap-control-gap type-label-small",
  "example-linear-top-actions": "flex items-center gap-control-gap",
  "example-linear-mobile-navigation": "hidden max-[45rem]:block",
  "example-linear-mobile-nav": "grid gap-control-gap",
  "example-linear-command-list": "grid gap-[var(--border-hairline)] pt-control-block",
  "example-linear-content-grid":
    "relative grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_auto] overflow-hidden",
  "example-linear-scroll": "h-full min-h-0",
  "example-linear-main": "grid min-w-0 gap-container-block px-container-inline py-container-block",
  "example-linear-page-heading": "flex flex-wrap items-start justify-between gap-container-gap",
  "example-linear-heading-copy": "grid min-w-0 gap-control-block-small",
  "example-linear-eyebrow": "type-label-small text-text-muted",
  "example-linear-heading-actions": "flex flex-wrap items-center gap-control-gap",
  "example-linear-filters": "flex min-w-0 flex-wrap items-center gap-control-gap",
  "example-linear-filter-search":
    "min-w-[min(100%,var(--layout-dimension-compact))] flex-[1_1_var(--layout-dimension-compact)]",
  "example-linear-result-count": "ms-auto type-label-small text-text-muted",
  "example-linear-list-heading":
    "flex flex-wrap items-center justify-between gap-control-gap type-label-small text-text-muted",
  "example-linear-selection-toolbar":
    "sticky top-0 z-20 flex min-w-0 flex-wrap items-center gap-control-gap rounded-control border border-action bg-surface-raised px-control-inline py-control-block-small shadow-[0_2px_8px_var(--color-shadow)]",
  "example-linear-table": "min-w-0",
  "example-linear-key": "type-code text-text-muted",
  "example-linear-issue": "grid min-w-0 gap-[var(--border-hairline)]",
  "example-linear-priority": "inline-flex items-center gap-control-gap type-label-small",
  "example-linear-assignee": "inline-flex items-center gap-control-gap type-label-small",
  "example-linear-empty":
    "grid min-h-[var(--layout-dimension-compact)] place-items-center content-center gap-control-gap rounded-container border border-dashed border-border bg-surface-sunken px-container-inline py-container-block text-center text-text-muted",
  "example-linear-board":
    "grid min-w-0 grid-cols-[repeat(3,minmax(var(--layout-dimension-compact),1fr))] items-start gap-container-gap overflow-x-auto pb-control-block max-[45rem]:grid-cols-1 max-[45rem]:overflow-visible",
  "example-linear-board-column":
    "grid min-h-[12rem] min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-control-gap rounded-container border border-border bg-surface-sunken px-control-inline py-control-block transition-colors data-[catalog-kanban-active]:border-action data-[catalog-kanban-active]:bg-action-wash",
  "example-linear-card-list": "grid content-start gap-control-gap",
  "example-linear-board-status": "type-label-small text-text-muted",
  "example-linear-board-card": "relative block w-full",
  "example-linear-card-drag-handle":
    "flex cursor-grab touch-none items-center gap-control-gap rounded-t-container border border-b-0 border-border bg-surface-raised px-control-inline py-control-block-small active:cursor-grabbing",
  "example-linear-card-heading": "flex min-w-0 items-center gap-control-gap",
  "example-linear-card-footer": "flex items-center justify-between gap-control-gap",
  "example-linear-status-dot": "inline-block size-glyph rounded-full bg-neutral",
  "example-linear-inspector":
    "z-30 grid min-h-0 w-[calc(var(--layout-dimension-panel)+var(--layout-dimension-compact))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-s border-border bg-surface shadow-[-4px_0_12px_var(--color-shadow)] max-[65rem]:absolute max-[65rem]:inset-y-0 max-[65rem]:end-0 max-[65rem]:w-[min(100%,calc(var(--layout-dimension-panel)+var(--layout-dimension-compact)))]",
  "example-linear-inspector-header":
    "flex items-center justify-between gap-control-gap border-b border-border px-control-inline py-control-block-small",
  "example-linear-inspector-body":
    "grid content-start gap-container-block overflow-y-auto px-container-inline py-container-block",
  "example-linear-inspector-title": "grid gap-control-gap",
  "example-linear-diff-card": "grid gap-control-gap border-action bg-surface-raised",
  "example-linear-diff-heading": "flex items-center gap-control-gap",
  "example-linear-properties": "grid gap-control-gap",
  "example-linear-subissues": "border-y border-border py-control-block",
  "example-linear-subissue-list": "grid gap-control-gap pt-control-block",
  "example-linear-activity": "min-w-0",
  "example-linear-activity-list": "grid gap-container-block p-0",
  "example-linear-relation": "flex items-center gap-control-gap pt-container-block",
  "example-linear-toasts": "z-50",
  "example-table-entity": "flex min-w-0 items-center gap-control-gap",
  "example-table-copy": "grid min-w-0 gap-[var(--border-hairline)]",
  "example-table-meta": "type-label-small text-text-muted",
  "example-table-progress":
    "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-control-gap",
  "example-table-number": "block text-end type-code [font-variant-numeric:tabular-nums]",
  "example-table-states":
    "grid w-[min(100%,var(--layout-dimension-content))] grid-cols-2 gap-container-gap max-[45rem]:grid-cols-1",
  "example-table-message": "flex items-center gap-control-gap text-text-muted",
  "example-table-components": "min-w-0",
  "example-table-chip-list": "flex flex-wrap gap-control-gap",
  "example-workbook": "h-full min-h-0 w-full [&::part(root)]:h-full [&::part(viewport)]:min-h-0",
  "example-workbook-toolbar":
    "grid min-w-0 grid-cols-[auto_auto_minmax(12rem,1fr)] items-center gap-control-gap max-[48rem]:grid-cols-[auto_minmax(10rem,1fr)]",
  "example-workbook-name-box":
    "min-w-[4rem] rounded-control border border-border bg-surface-sunken px-control-inline py-control-block-small text-center type-code",
  "example-workbook-formula": "min-w-0",
  "example-workbook-corner": "block size-glyph border-s border-t border-border-strong",
  "example-workbook-cell-form": "grid min-w-[18rem] gap-control-gap",
  "example-data-table-loading": "flex items-center gap-control-gap type-label-small",
  "example-data-table-footer":
    "flex min-w-0 items-center justify-between gap-control-gap type-label-small text-text-muted",
  "example-data-table-modes":
    "grid h-full min-h-0 w-full grid-cols-3 gap-container-gap px-container-inline py-container-block max-[64rem]:grid-cols-1 max-[64rem]:overflow-y-auto",
  "example-data-explorer":
    "h-full min-h-[28rem] w-full [&::part(root)]:h-full [&::part(root)]:min-h-0",
  "example-data-explorer-tree":
    "grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-surface-sunken",
  "example-data-explorer-table":
    "h-full min-h-0 [&::part(root)]:h-full [&::part(viewport)]:min-h-0",
  "example-tree-glyph":
    "inline-block size-[calc(var(--space-control-gap)+var(--space-control-block-small))] rounded-control border border-current [background:color-mix(in_oklab,currentColor_14%,transparent)]",
  "example-tree-narrow": "w-[min(100%,22rem)]!",
  "example-drag-boundary":
    "relative grid h-full min-h-compact w-full place-items-center overflow-hidden bg-surface-sunken px-container-inline py-container-block",
  "example-drag-titlebar":
    "flex cursor-grab touch-none items-center gap-control-gap active:cursor-grabbing",
  "example-window-stage":
    "relative grid h-full min-h-[24rem] w-full place-items-center overflow-hidden bg-surface-sunken px-container-inline py-container-block",
  "example-drag-window":
    "h-[20rem] min-h-[15rem] w-[min(34rem,calc(100%-var(--space-container-inline)*2))] min-w-[18rem] resize overflow-hidden rounded-container border border-border bg-surface shadow-[0_12px_40px_var(--color-shadow)] [&::part(root)]:grid [&::part(root)]:h-full [&::part(root)]:grid-rows-[auto_minmax(0,1fr)]",
  "example-window-titlebar":
    "flex cursor-grab touch-none items-center gap-control-gap border-b border-border bg-surface-raised px-control-inline py-control-block active:cursor-grabbing",
  "example-window-traffic": "text-critical tracking-[0.18em]",
  "example-window-panes": "h-full min-h-0! [&::part(root)]:h-full",
  "example-resizable-showcase":
    "grid w-[min(100%,var(--layout-dimension-content))] gap-container-gap",
  "example-resizable-case":
    "grid min-w-0 gap-control-block-small rounded-container border border-border bg-surface p-control-block-small",
  "example-resizable-label": "px-control-inline-small type-code text-text-muted",
  "example-resizable-split":
    "h-[6rem] min-h-0! overflow-hidden rounded-control border border-border bg-surface [&::part(root)]:h-full",
  "example-resizable-pane":
    "grid h-full min-h-0 content-start gap-control-gap overflow-auto px-control-inline py-control-block type-label",
  "example-resizable-pane-muted": "bg-surface-sunken",
  "example-resize-handle-rail": "bg-surface-sunken [&::part(control)]:rounded-none!",
  "example-resize-detent-rule":
    "[&::part(frame)]:relative [&::part(prefix)]:absolute [&::part(prefix)]:start-1/2 [&::part(prefix)]:top-1/2 [&::part(prefix)]:z-10 [&::part(prefix)]:-translate-x-1/2 [&::part(prefix)]:-translate-y-1/2",
  "example-resize-detent":
    "block size-[calc(var(--space-control-block-small)*2)] rounded-pill border border-border-strong bg-surface-raised shadow-[0_1px_2px_var(--color-shadow)]",
  "example-resizable-workspace":
    "h-full min-h-0! w-full overflow-hidden bg-surface [&::part(root)]:h-full",
  "example-resizable-nested": "h-full min-h-0! [&::part(root)]:h-full",
  "example-resizable-demo": "grid w-[min(100%,var(--layout-dimension-content))] gap-container-gap",
  "example-resizable-demo-fill":
    "h-full min-h-0 w-full max-w-none grid-rows-[auto_minmax(0,1fr)] px-container-inline py-container-block",
  "example-resizable-complex":
    "h-full min-h-0! overflow-hidden rounded-container border border-border bg-surface [&::part(root)]:h-full",
  "example-resizable-stage":
    "h-[14rem] min-h-0! overflow-hidden rounded-container border border-border bg-surface [&::part(root)]:h-full",
  "example-resizable-actions": "flex flex-wrap items-center gap-control-gap",
  "example-resizable-output": "type-code text-text-muted",
  "example-kanban-board":
    "relative grid h-full min-h-[24rem] w-full grid-rows-[auto_minmax(0,1fr)_auto] gap-container-gap overflow-hidden bg-surface-sunken px-container-inline py-container-block",
  "example-kanban-heading": "flex items-center justify-between gap-control-gap",
  "example-kanban-columns":
    "grid min-h-0 grid-cols-3 gap-container-gap overflow-x-auto pb-control-block max-[46rem]:grid-cols-[repeat(3,minmax(15rem,1fr))]",
  "example-kanban-column":
    "grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-container border border-border bg-surface transition-colors data-[catalog-kanban-active]:border-action data-[catalog-kanban-active]:bg-action-wash",
  "example-kanban-column-heading":
    "flex items-center justify-between gap-control-gap border-b border-border bg-surface-raised px-control-inline py-control-block",
  "example-kanban-list":
    "grid content-start gap-control-gap overflow-y-auto px-control-inline py-control-block",
  "example-kanban-card": "relative block w-full",
  "example-kanban-card-handle":
    "flex cursor-grab touch-none items-center gap-control-gap rounded-t-container border border-b-0 border-border bg-surface-raised px-control-inline py-control-block-small active:cursor-grabbing",
  "example-kanban-card-meta": "flex items-center gap-control-gap text-text-muted type-label-small",
  "example-chip-workspace":
    "grid w-[min(100%,var(--layout-dimension-dialog))] gap-container-block rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-chip-sort":
    "flex min-h-control flex-wrap items-center gap-control-gap rounded-control border border-dashed border-border-strong bg-surface-sunken px-control-inline py-control-block",
  "example-drag-grip":
    "inline-grid cursor-grab touch-none place-items-center text-text-muted active:cursor-grabbing",
  "example-drag-status": "type-label-small text-text-muted",
  "example-tab-workspace":
    "grid h-full min-h-[24rem] w-full grid-cols-[minmax(11rem,0.34fr)_minmax(0,1fr)] overflow-hidden bg-surface max-[38rem]:grid-cols-1",
  "example-tab-sidebar":
    "grid content-start gap-container-block border-e border-border bg-surface-sunken px-container-inline py-container-block max-[38rem]:border-e-0 max-[38rem]:border-b",
  "example-tab-main":
    "grid min-w-0 content-start gap-container-block px-container-inline py-container-block",
  "example-tab-drop": "rounded-control",
  "example-tabbar-drop": "rounded-control",
  "example-drop-indicator":
    "fixed! z-[1000] pointer-events-none [&::part(root)]:h-full [&::part(root)]:w-full [&::part(root)]:bg-action [&::part(root)]:mix-blend-normal! [&::part(root)]:shadow-[0_0_0_var(--border-hairline)_var(--color-surface),0_0_8px_var(--color-action)]",
  "example-drop-indicator-circle":
    "block size-control-gap rounded-full border border-surface bg-action shadow-[0_0_8px_var(--color-action)]",
  "example-drag-tree-workspace":
    "grid w-[min(100%,var(--layout-dimension-dialog))] gap-container-block rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-tree-leaf-workspace":
    "grid w-[min(100%,var(--layout-dimension-dialog))] gap-container-block rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-drag-tree":
    "grid gap-control-block-small overflow-hidden rounded-control bg-surface-sunken",
  "example-drag-handle": "cursor-grab touch-none active:cursor-grabbing",
  "example-toolbar-dock":
    "relative grid min-h-[16.25rem] place-items-center overflow-hidden rounded-container border border-dashed border-border-strong bg-surface-sunken type-code text-text-muted",
  "example-tabs":
    "rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-dialog-copy": "grid gap-control-gap",
  "example-popover-content": "grid min-w-[15rem] gap-control-gap",
  "example-menu-stage":
    "relative min-h-[22rem] w-[min(100%,var(--layout-dimension-content))] rounded-container border border-border bg-surface px-container-inline py-container-block",
  "example-menu-trigger":
    "w-[6.25rem] [&::part(control)]:w-full [&::part(control)]:justify-between [&::part(control)]:border-0! [&::part(control)]:bg-fill-tertiary-opaque! [&::part(control)]:px-control-inline [&::part(control)]:py-0 [&::part(control)]:text-text",
  "example-menu-header":
    "block min-h-[1.0625rem] ps-[calc(var(--space-control-gap)-var(--border-hairline))] pt-[0.1875rem] pb-[0.125rem] type-label-small font-bold text-text-muted",
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
  "example-scroll-no-gutter-grid":
    "grid h-full min-h-0 w-full grid-cols-3 gap-container-gap px-container-inline py-container-block max-[60rem]:grid-cols-1 max-[60rem]:overflow-y-auto",
  "example-scroll-no-gutter": "block h-[16rem] min-h-0",
  "example-scroll-no-gutter-content": "grid gap-control-block-small p-control-inline",
  "example-scroll-size-grid":
    "grid h-full min-h-0 w-full grid-cols-3 gap-container-gap px-container-inline py-container-block max-[60rem]:grid-cols-1 max-[60rem]:overflow-y-auto",
  "example-scroll-size-sample": "block h-[13rem] min-h-0",
  "example-scroll-size-content": "grid gap-control-gap p-control-inline",
  "example-scroll-alpha-card": "w-full",
  "example-scroll-alpha": "block h-[28rem] min-h-0",
  "example-scroll-alpha-list": "grid p-control-inline",
  "example-scroll-alpha-section":
    "grid min-h-[5rem] snap-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-container-gap border-b border-border px-control-inline py-control-block",
  "example-scroll-detent":
    "absolute top-[var(--ui-scroll-detent-position)] left-1/2 m-0 -translate-x-1/2 -translate-y-1/2",
  "example-scroll-letter":
    "pointer-events-auto grid size-[0.875rem] cursor-pointer place-items-center rounded-pill border-0 bg-transparent p-0 type-code text-[0.5rem] leading-none text-text-muted hover:bg-action-wash hover:text-action focus-visible:focus-ring data-[scroll-detent-current]:bg-action data-[scroll-detent-current]:text-on-action",
  "example-scroll-reader": "min-h-0 w-full bg-surface-sunken",
  "example-scroll-reading": "block h-[32.5rem] min-h-0",
  "example-scroll-reading-copy":
    "mx-auto grid w-[min(100%,var(--layout-dimension-content))] gap-region px-region py-container-block",
  "example-scroll-reading-section": "grid min-h-[22rem] snap-start content-center gap-control-gap",
  "example-scroll-reading-detent":
    "pointer-events-none h-px w-[var(--scrollbar-detent-large)] border-0 bg-border-strong p-0 data-[scroll-detent-current]:h-[var(--border-strong)] data-[scroll-detent-current]:w-[calc(var(--scrollbar-detent-large)*2)] data-[scroll-detent-current]:bg-text",
  "example-scroll-reading-detent-major": "w-[calc(var(--scrollbar-detent-large)*1.5)]",
  "example-scroll-preview-anchor":
    "group pointer-events-auto absolute top-[var(--ui-scroll-detent-position)] end-0 z-overlay -translate-y-1/2",
  "example-scroll-reading-current":
    "block h-[var(--border-strong)] w-[calc(var(--scrollbar-detent-large)*2)] cursor-pointer rounded-pill border-0 bg-text p-0 focus-visible:focus-ring",
  "example-scroll-preview-card":
    "pointer-events-none absolute top-1/2 end-[calc(var(--space-control-inline)+var(--scrollbar-hit-area-large))] w-[min(20rem,calc(100vw-var(--space-region)*2))] -translate-y-1/2 opacity-0 shadow-[0_8px_24px_var(--color-shadow)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
  "example-scroll-breadcrumb":
    "grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] bg-canvas",
  "example-scroll-breadcrumb-header":
    "flex min-w-0 items-center justify-between gap-control-gap border-b border-border bg-surface px-container-inline py-control-block",
  "example-scroll-breadcrumb-area": "block min-h-0",
  "example-scroll-snap-pages": "grid",
  "example-scroll-chapter-detent":
    "pointer-events-auto grid size-glyph cursor-pointer place-items-center rounded-pill border border-border bg-surface p-0 type-code text-[0.625rem] text-text-muted shadow-[0_1px_3px_var(--color-shadow)] hover:border-action hover:text-action focus-visible:focus-ring data-[scroll-detent-current]:border-action data-[scroll-detent-current]:bg-action data-[scroll-detent-current]:text-on-action",
  "example-scroll-menu-card": "w-[min(100%,var(--layout-dimension-panel))]",
  "example-scroll-menu": "block h-[10rem]",
  "example-scroll-command-menu": "w-full",
  "example-scroll-menu-detent":
    "pointer-events-auto h-[var(--scrollbar-detent-medium)] w-[var(--scrollbar-track-medium)] cursor-pointer rounded-pill border-0 bg-action p-0 focus-visible:focus-ring",
  "example-scroll-bidirectional":
    "grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] bg-canvas",
  "example-scroll-bidirectional-header":
    "flex min-w-0 items-center justify-between gap-control-gap border-b border-border bg-surface px-container-inline py-control-block",
  "example-scroll-bidirectional-area": "block min-h-0",
  "example-scroll-canvas": "grid min-w-[76rem] gap-control-gap p-container-block",
  "example-scroll-canvas-row": "grid grid-cols-[repeat(8,9rem)] gap-control-gap",
  "example-scroll-canvas-card": "min-h-[7rem]",
  "example-scroll-canvas-block-detent":
    "pointer-events-auto h-[var(--border-strong)] w-[var(--scrollbar-detent-medium)] cursor-pointer rounded-pill border-0 bg-action p-0 focus-visible:focus-ring",
  "example-scroll-inline-detent":
    "pointer-events-auto absolute top-1/2 left-[var(--ui-scroll-detent-position)] h-[var(--scrollbar-detent-medium)] w-[var(--border-strong)] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-pill border-0 bg-action p-0 focus-visible:focus-ring",
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
  [".example-path-case > span", "type-code text-text-muted"],
  [".example-material ui-card", "border-0! bg-transparent! shadow-none!"],
  [".example-editor-status span:last-child", "ms-auto"],
  [".example-icon-library > span", "inline-flex items-center gap-control-gap type-label"],
  [".example-gesture-command > ui-card", "w-full"],
  [".example-gesture-command .example-card-heading > span", "grid min-w-0 gap-control-block-small"],
  [".example-gesture-status output", "min-w-0 truncate"],
  [".example-gesture-heading > span", "grid min-w-0 gap-control-block-small"],
  [".example-gesture-heading output", "type-title text-action"],
  [
    ".example-gesture-command-list ui-button",
    "w-full! border-b border-border last:border-b-0 [&::part(control)]:w-full [&::part(control)]:grid [&::part(control)]:grid-cols-[auto_minmax(0,1fr)_auto] [&::part(control)]:justify-items-start [&::part(control)]:rounded-none!",
  ],
  [".example-gesture-command-list ui-button > span", "truncate"],
  [
    ".example-gesture-selection-list ui-button",
    "w-full! border-b border-border last:border-b-0 [&::part(control)]:w-full [&::part(control)]:grid [&::part(control)]:grid-cols-[auto_minmax(0,1fr)] [&::part(control)]:justify-items-start [&::part(control)]:rounded-none!",
  ],
  [".example-gesture-selection-list ui-button > span", "truncate"],
  [
    ".example-gesture-selection-list ui-button[data-gesture-selected]",
    "[&::part(control)]:bg-action-wash! [&::part(control)]:text-action!",
  ],
  [".example-gesture-scrubber ui-progress", "pointer-events-none w-full!"],
  [
    ".example-gesture-scrubber ui-toolbar",
    "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-control-gap",
  ],
  [".example-gesture-scrubber .example-gesture-status", "justify-center"],
  [
    ".example-gesture-preview-list ui-button",
    "w-full! border-b border-border last:border-b-0 [&::part(control)]:w-full [&::part(control)]:grid [&::part(control)]:grid-cols-[auto_minmax(0,1fr)] [&::part(control)]:justify-items-start [&::part(control)]:rounded-none!",
  ],
  [".example-gesture-preview-list ui-button > span", "truncate"],
  [
    ".example-gesture-preview-list ui-button[data-gesture-preview-active]",
    "[&::part(control)]:bg-action-wash! [&::part(control)]:text-action!",
  ],
  [".example-gesture-preview > .example-gesture-status", "col-span-full"],
  [".example-gesture-arena > div", "grid min-w-0 gap-control-block-small"],
  [".example-gesture-arena > div > span", "truncate type-label-small text-text-muted"],
  [
    ".example-gesture-arena[data-gesture-selected]",
    "border-action bg-action-wash shadow-[0_0_0_var(--border-hairline)_var(--color-action)]",
  ],
  [
    ".example-gesture-arena[data-gesture-preview]",
    "scale-[var(--motion-scale-pressed)] bg-surface-raised",
  ],
  [".example-motion-demo > ui-motion, .example-motion-drop > ui-motion", "w-full"],
  [".example-motion-demo ui-toolbar", "flex flex-wrap gap-control-gap"],
  [".example-motion-demo output", "type-code text-text-muted"],
  [
    ".example-motion-drop ui-separator",
    "self-center [&::part(root)]:bg-action [&::part(root)]:shadow-[0_0_8px_var(--color-action)]",
  ],
  [
    ".example-shortcut-list > span",
    "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-control-gap border-b border-border px-control-inline py-control-block last:border-b-0",
  ],
  [".example-shortcut-list > span > span", "flex items-center gap-control-block-small"],
  [".example-pagination-heading > div", "grid gap-[var(--border-hairline)]"],
  [".example-linear-identity-copy > span", "truncate type-label-small text-text-muted"],
  [".example-linear-nav-link ui-badge", "ms-auto"],
  [".example-linear-cycle > span", "type-label-small text-text-muted"],
  [".example-linear-cycle ui-progress", "w-full! min-w-0"],
  [
    ".example-linear-new-issue > ui-button",
    "w-full! [&::part(control)]:w-full [&::part(control)]:gap-control-gap",
  ],
  [".example-linear-new-issue ui-kbd", "ms-auto"],
  [".example-linear-heading-copy h2, .example-linear-heading-copy p", "m-0"],
  [".example-linear-heading-copy h2", "type-heading"],
  [".example-linear-heading-copy p", "type-label-small text-text-muted"],
  [
    ".example-linear-command-list > ui-button",
    "w-full! [&::part(control)]:w-full [&::part(control)]:grid [&::part(control)]:grid-cols-[auto_minmax(0,1fr)_auto] [&::part(control)]:justify-items-start",
  ],
  [".example-linear-list-heading > div", "flex items-center gap-control-gap"],
  [
    '.example-linear-table :is(ui-table-head, ui-table-cell)[column-index="2"], .example-linear-table :is(ui-table-head, ui-table-cell)[column-index="5"], .example-linear-table :is(ui-table-head, ui-table-cell)[column-index="6"]',
    "max-[45rem]:hidden!",
  ],
  [".example-linear-issue > span", "type-label-small text-text-muted"],
  [".example-linear-priority[data-priority=high]", "text-warning"],
  [".example-linear-priority[data-priority=urgent]", "text-critical"],
  [
    ".example-linear-table ui-table-row, [data-linear-board-card]",
    "[&[aria-selected=true]]:bg-neutral-hover [&[data-linear-highlighted=true]]:outline [&[data-linear-highlighted=true]]:outline-action [&[data-linear-highlighted=true]]:outline-offset-[-1px]",
  ],
  [
    ".example-linear-board-column > header, .example-linear-board-column > header > span",
    "flex items-center justify-between gap-control-gap",
  ],
  [".example-linear-board-column > header", "type-label-small"],
  ["[data-linear-board-card]", "grid gap-control-gap"],
  [
    ".example-linear-board-card ui-card",
    "[&::part(root)]:rounded-t-none! [&::part(root)]:border-t-0!",
  ],
  [".example-linear-card-heading .example-linear-priority", "ms-auto"],
  ['.example-linear-status-dot[data-status="progress"]', "bg-action"],
  ['.example-linear-status-dot[data-status="done"]', "bg-positive"],
  [".example-linear-inspector-title h2, .example-linear-inspector-title p", "m-0"],
  [".example-linear-inspector-title h2", "type-heading"],
  [".example-linear-inspector-title p", "type-body text-text-muted"],
  [".example-linear-diff-card > span", "type-label-small text-text-muted"],
  [".example-linear-diff-heading ui-badge", "ms-auto"],
  [
    ".example-linear-subissues [slot=trigger]",
    "flex w-full items-center justify-between gap-control-gap type-label",
  ],
  [".example-linear-activity ui-tab-panel", "block pt-container-block"],
  [".example-linear-activity-list li", "flex items-start gap-control-gap"],
  [".example-linear-activity-list li > span", "grid gap-[var(--border-hairline)]"],
  [".example-linear-activity-list small", "text-text-muted"],
  [
    ".example-data-explorer-tree > header",
    "flex items-center justify-between gap-control-gap border-b border-border px-control-inline py-control-block",
  ],
  [".example-data-explorer-tree ui-scroll-area", "h-full min-h-0"],
  [".example-data-explorer-tree ui-tree", "block p-control-block"],
  [".example-data-table-modes ui-card", "min-w-0"],
  [".example-data-table-modes ui-data-table", "min-w-0"],
  [".example-workbook-toolbar ui-toolbar", "min-w-max"],
  [".example-workbook ui-table-cell[column-index='1']", "type-code text-text-muted"],
  [".example-workbook ui-popover > ui-button[slot='trigger']", "w-full justify-start"],
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
    "[data-catalog-drag-source]",
    "relative will-change-transform data-[catalog-dragging]:z-raised data-[catalog-dragging]:opacity-80 data-[catalog-dragging]:[&::part(control)]:outline-none!",
  ],
  [
    ".example-window-panes ui-resizable-panel",
    "[&::part(root)]:rounded-none! [&::part(root)]:border-0!",
  ],
  [
    ".example-resizable-split ui-resizable-panel, .example-resizable-workspace ui-resizable-panel, .example-resizable-complex ui-resizable-panel, .example-resizable-stage ui-resizable-panel",
    "[&::part(root)]:rounded-none! [&::part(root)]:border-0! [&::part(root)]:p-0!",
  ],
  [".example-resizable-pane > span", "type-label-small text-text-muted"],
  [".example-drag-tree ui-tree-item", "w-full"],
  [
    ".example-tree-leaf-workspace ui-tree-item[data-catalog-leaf-drop-active]",
    "[&::part(control)]:outline-[var(--border-focus-ring)] [&::part(control)]:outline-action [&::part(control)]:bg-action-muted",
  ],
  [".example-tab-main ui-tab-panel", "block pt-container-block"],
  [
    ".example-toolbar-dock ui-toolbar[data-mash-toolbar-dock]",
    "bg-surface-raised px-control-inline py-control-block shadow-[0_2px_8px_var(--color-shadow)]",
  ],
  [".example-tabs ui-tab-panel", "block pt-container-block"],
  [
    '.example-menu-trigger[data-menu-size="mini"]',
    "[&::part(control)]:h-[1rem] [&::part(control)]:rounded-[0.25rem]",
  ],
  [
    '.example-menu-trigger[data-menu-size="small"]',
    "[&::part(control)]:h-[1.25rem] [&::part(control)]:rounded-[0.3125rem]",
  ],
  [
    '.example-menu-trigger[data-menu-size="regular"]',
    "[&::part(control)]:h-[1.5rem] [&::part(control)]:rounded-control",
  ],
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
  [
    ".example-scroll-no-gutter-content span",
    "rounded-control bg-surface-sunken px-control-inline py-control-block type-label-small",
  ],
  [
    ".example-scroll-size-content span",
    "rounded-control bg-surface-sunken px-control-inline py-control-block-small type-label-small",
  ],
  [".example-scroll-alpha-section > strong", "type-heading text-action"],
  [".example-scroll-alpha-section > span", "type-label-small text-text-muted"],
  [".example-scroll-alpha-section > span:last-child", "text-end"],
  [".example-scroll-reading-section h3, .example-scroll-reading-section p", "m-0"],
  [".example-scroll-reading-section h3", "type-heading"],
  [".example-scroll-reading-section p", "max-w-[70ch] text-text-muted"],
  [
    ".example-scroll-reading-section pre",
    "m-0 overflow-x-auto rounded-container bg-surface px-container-inline py-container-block type-code",
  ],
  [
    ".example-scroll-snap-pages > section",
    "grid min-h-[24rem] snap-start content-center gap-control-gap border-b border-border px-region py-container-block",
  ],
  [".example-scroll-snap-pages h3, .example-scroll-snap-pages p", "m-0"],
  [".example-scroll-snap-pages h3", "type-heading"],
  [".example-scroll-snap-pages p", "max-w-[60ch] text-text-muted"],
  [".example-scroll-bidirectional-header > div", "grid gap-[var(--border-hairline)]"],
  [".example-scroll-bidirectional-header strong", "type-label"],
  [".example-scroll-canvas-card [slot='content']", "type-label-small text-text-muted"],
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
    "border-action-border",
    "bg-action-wash",
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
