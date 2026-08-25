/**
 * Render Mash's Tailwind v4 adapter from the resolved semantic token graph.
 *
 * Tailwind is a consumer of the token contract, never another token source.
 * Reference variables remain available through the imported token cascade so
 * semantic aliases resolve and provenance stays inspectable. They are excluded
 * from Tailwind's theme and utility namespaces; only semantic roles become
 * utility values. Their names stay semantic and unprefixed so they read like
 * ordinary application styling: `bg-overlay`, `rounded-container`, `stack`.
 */

import { kebab } from "../config/layers.mjs";

const tokenEntries = (graph) => Object.values(graph).sort((a, b) => a.id.localeCompare(b.id));

const suffix = (id, segments = 1) => id.split(".").slice(segments).map(kebab).join("-");

function tailwindThemeName(token) {
  const { id, layer } = token;

  if (layer === "theme" && id.startsWith("color.")) {
    // Opaque/vibrant values are renderer ingredients, not independent styling
    // choices. The adapter exposes resolved roles and curated compositor
    // utilities instead of generating misleading `text-*-vibrant` classes.
    if (id === "color.labelSource" || /(?:Opaque|Vibrant)$/.test(id)) return null;
    return `--color-${suffix(id)}`;
  }

  if (layer !== "semantic") return null;

  if (id.startsWith("space.")) {
    return `--spacing-${suffix(id)}`;
  }

  // Layout dimensions share Tailwind's spacing namespace so one semantic role
  // can drive padding, gap, size and min/max-size utilities.
  if (id.startsWith("layout.dimension.")) {
    return `--spacing-${suffix(id, 2)}`;
  }

  // Component-specific layout roles remain semantic spacing values. Keeping
  // the family name avoids collisions with generic dimensions while allowing
  // utilities such as w-menu-inline-compact and h-menu-row-mini.
  if (id.startsWith("layout.menu.")) {
    return `--spacing-menu-${suffix(id, 2)}`;
  }

  if (id.startsWith("radius.")) {
    return `--radius-${suffix(id)}`;
  }

  if (id.startsWith("easing.")) {
    return `--ease-${suffix(id)}`;
  }

  if (id.startsWith("blur.")) {
    return `--blur-${suffix(id)}`;
  }

  return null;
}

function renderTheme(graph) {
  const declarations = tokenEntries(graph)
    .map((token) => [tailwindThemeName(token), token.cssVar])
    .filter(([name]) => name)
    .map(([name, cssVar]) => `  ${name}: var(${cssVar});`)
    .join("\n");

  // `reference` teaches Tailwind which utilities exist without re-emitting
  // the declarations. That matters for names such as `--color-overlay` and
  // `--radius-container`, which are already the canonical token variables;
  // a normal @theme block would overwrite each with a circular self-alias.
  return `@theme reference inline {\n${declarations}\n}`;
}

function renderTypographyUtilities(graph) {
  const roles = new Map();
  const propertyByTokenPart = {
    fontFamily: "font-family",
    fontSize: "font-size",
    fontWeight: "font-weight",
    lineHeight: "line-height",
  };

  for (const token of tokenEntries(graph)) {
    const match = /^type\.([^.]+)\.(fontFamily|fontSize|fontWeight|lineHeight)$/.exec(token.id);
    if (!match || token.layer !== "semantic") continue;
    const [, role, part] = match;
    const declarations = roles.get(role) ?? [];
    declarations.push([propertyByTokenPart[part], token.cssVar]);
    roles.set(role, declarations);
  }

  return [...roles.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([role, declarations]) => {
      const body = declarations
        .map(([property, cssVar]) => `  ${property}: var(${cssVar});`)
        .join("\n");
      return `@utility type-${kebab(role)} {\n${body}\n}`;
    })
    .join("\n\n");
}

function renderTokenUtilities(graph, pattern, utilityName, property) {
  return tokenEntries(graph)
    .map((token) => [token, pattern.exec(token.id)])
    .filter(([, match]) => match)
    .map(([token, match]) => {
      const name = utilityName(match[1]);
      return `@utility ${name} {\n  ${property}: var(${token.cssVar});\n}`;
    })
    .join("\n\n");
}

function materialRoles(graph) {
  return tokenEntries(graph)
    .filter((token) => token.layer === "theme" && /^color\.backgroundMaterial[A-Z]/.test(token.id))
    .map((token) => token.id.replace(/^color\.backgroundMaterial/, ""))
    .map((role) => `${role[0].toLowerCase()}${role.slice(1)}`)
    .sort((a, b) => {
      const order = ["ultraThin", "thin", "regular", "thick", "ultraThick"];
      return order.indexOf(a) - order.indexOf(b);
    });
}

function renderMaterialUtilities(graph) {
  return materialRoles(graph)
    .map(
      (role) => `@utility material-${kebab(role)} {
  --mash-material-compositor: var(--mash-vibrancy-blend-mode, normal);
  --_mash-component-surface-sunken: var(--mash-material-fill-quaternary);
  --_mash-component-boundary: var(--mash-material-separator);
  --_mash-component-boundary-strong: var(--mash-material-separator-strong);
  --_mash-component-divider: var(--mash-material-separator);
  --color-text: var(--mash-material-label-primary);
  --color-text-muted: var(--mash-material-label-secondary);
  --color-text-disabled: var(--mash-material-label-disabled);
  --color-border: var(--mash-material-separator);
  --color-border-strong: var(--mash-material-separator-strong);
  --color-neutral: var(--mash-material-fill-primary);
  --color-action: var(--mash-material-accent-action);
  color: var(--mash-material-label-primary);
  background-color: var(--color-surface-raised);
  transition:
    background-color var(--duration-surface) var(--easing-surface),
    -webkit-backdrop-filter var(--duration-surface) var(--easing-surface),
    backdrop-filter var(--duration-surface) var(--easing-surface);

  @supports ((-webkit-backdrop-filter: blur(0)) or (backdrop-filter: blur(0))) {
    background-color: var(--mash-material-background, var(--color-background-material-${kebab(role)}));
    -webkit-backdrop-filter: var(--mash-material-backdrop, blur(var(--blur-background-material-${kebab(role)})) saturate(var(--mash-material-backdrop-saturation, var(--effect-material-backdrop-saturation-standard))));
    backdrop-filter: var(--mash-material-backdrop, blur(var(--blur-background-material-${kebab(role)})) saturate(var(--mash-material-backdrop-saturation, var(--effect-material-backdrop-saturation-standard))));
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}`,
    )
    .join("\n\n");
}

function renderVibrancyScope() {
  return `@property --mash-material-backdrop-saturation {
  syntax: "<number>";
  inherits: true;
  initial-value: 1;
}

:root,
[data-theme="light"],
[data-theme="dark"] {
  --mash-label-source: var(--color-label-source);
  --mash-opaque-label-primary: rgb(from var(--mash-label-source, var(--color-text-opaque)) r g b / var(--opacity-label-primary));
  --mash-opaque-label-secondary: rgb(from var(--mash-label-source, var(--color-text-muted-opaque)) r g b / var(--opacity-label-secondary));
  --mash-opaque-label-tertiary: rgb(from var(--mash-label-source, var(--color-text-tertiary-opaque)) r g b / var(--opacity-label-tertiary));
  --mash-opaque-label-quaternary: rgb(from var(--mash-label-source, var(--color-text-quaternary-opaque)) r g b / var(--opacity-label-quaternary));
  --mash-opaque-label-quinary: rgb(from var(--mash-label-source, var(--color-text-quinary-opaque)) r g b / var(--opacity-label-quinary));
  --mash-opaque-label-seximal: rgb(from var(--mash-label-source, var(--color-text-seximal-opaque)) r g b / var(--opacity-label-seximal));
}

:root,
[data-theme="light"] {
  --mash-vibrancy-theme-blend-mode: multiply;
  --mash-material-separator-source: var(--color-separator-strong-vibrant);
}

[data-theme="dark"] {
  --mash-vibrancy-theme-blend-mode: plus-lighter;
  --mash-material-separator-source: var(--color-background-material-highlight);
}

:root,
[data-vibrancy="auto"] {
  --mash-material-backdrop-saturation: var(--effect-material-backdrop-saturation-standard);
  --mash-material-background: initial;
  --mash-material-background-highlight: var(--color-background-material-highlight);
  --mash-material-backdrop: initial;
  --mash-material-label-primary: var(--color-text-vibrant);
  --mash-material-label-secondary: var(--color-text-muted-vibrant);
  --mash-material-label-tertiary: var(--color-text-tertiary-vibrant);
  --mash-material-label-quaternary: var(--color-text-quaternary-vibrant);
  --mash-material-label-quinary: var(--color-text-quinary-vibrant);
  --mash-material-label-seximal: var(--color-text-seximal-opaque);
  --mash-material-label-disabled: var(--color-text-tertiary-vibrant);
  --mash-material-fill-primary: var(--color-fill-primary-vibrant);
  --mash-material-fill-secondary: var(--color-fill-secondary-vibrant);
  --mash-material-fill-tertiary: var(--color-fill-tertiary-vibrant);
  --mash-material-fill-quaternary: var(--color-fill-quaternary-vibrant);
  --mash-material-fill-quinary: var(--color-fill-quinary-vibrant);
  --mash-material-separator: var(--color-separator-vibrant);
  --mash-material-separator-strong: var(--color-separator-strong-vibrant);
  --mash-material-accent-action: var(--color-action-vibrant);
  --mash-vibrancy-blend-mode: var(--mash-vibrancy-theme-blend-mode);
}

[data-vibrancy="vibrant"] {
  --mash-material-backdrop-saturation: var(--effect-material-backdrop-saturation-enhanced);
  --mash-material-background: initial;
  --mash-material-background-highlight: var(--color-background-material-highlight);
  --mash-material-backdrop: initial;
  --mash-material-label-primary: var(--color-text-vibrant);
  --mash-material-label-secondary: var(--color-text-muted-vibrant);
  --mash-material-label-tertiary: var(--color-text-tertiary-vibrant);
  --mash-material-label-quaternary: var(--color-text-quaternary-vibrant);
  --mash-material-label-quinary: var(--color-text-quinary-vibrant);
  --mash-material-label-seximal: var(--color-text-seximal-opaque);
  --mash-material-label-disabled: var(--color-text-tertiary-vibrant);
  --mash-material-fill-primary: var(--color-fill-primary-vibrant);
  --mash-material-fill-secondary: var(--color-fill-secondary-vibrant);
  --mash-material-fill-tertiary: var(--color-fill-tertiary-vibrant);
  --mash-material-fill-quaternary: var(--color-fill-quaternary-vibrant);
  --mash-material-fill-quinary: var(--color-fill-quinary-vibrant);
  --mash-material-separator: var(--color-separator-vibrant);
  --mash-material-separator-strong: var(--color-separator-strong-vibrant);
  --mash-material-accent-action: var(--color-action-vibrant);
  --mash-vibrancy-blend-mode: var(--mash-vibrancy-theme-blend-mode);
}

[data-vibrancy="reduced"] {
  --mash-material-backdrop-saturation: var(--effect-material-backdrop-saturation-reduced);
  --mash-material-background: var(--color-surface-raised);
  --mash-material-background-highlight: transparent;
  --mash-material-backdrop: none;
  --mash-material-label-primary: var(--mash-opaque-label-primary);
  --mash-material-label-secondary: var(--mash-opaque-label-secondary);
  --mash-material-label-tertiary: var(--mash-opaque-label-tertiary);
  --mash-material-label-quaternary: var(--mash-opaque-label-quaternary);
  --mash-material-label-quinary: var(--mash-opaque-label-quinary);
  --mash-material-label-seximal: var(--mash-opaque-label-seximal);
  --mash-material-label-disabled: var(--mash-opaque-label-tertiary, var(--color-text-disabled-opaque));
  --mash-material-fill-primary: var(--color-fill-primary-opaque);
  --mash-material-fill-secondary: var(--color-fill-secondary-opaque);
  --mash-material-fill-tertiary: var(--color-fill-tertiary-opaque);
  --mash-material-fill-quaternary: var(--color-fill-quaternary-opaque);
  --mash-material-fill-quinary: var(--color-fill-quinary-opaque);
  --mash-material-separator: var(--color-separator-opaque);
  --mash-material-separator-strong: var(--color-separator-strong-opaque);
  --mash-material-separator-source: var(--color-separator-strong-opaque);
  --mash-material-accent-action: var(--color-action-opaque);
  --mash-vibrancy-blend-mode: normal;
}

@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  :root:not([data-vibrancy]),
  [data-vibrancy="auto"] {
    --mash-material-backdrop-saturation: var(--effect-material-backdrop-saturation-reduced);
    --mash-material-background: var(--color-surface-raised);
    --mash-material-background-highlight: transparent;
    --mash-material-backdrop: none;
    --mash-material-label-primary: var(--mash-opaque-label-primary);
    --mash-material-label-secondary: var(--mash-opaque-label-secondary);
    --mash-material-label-tertiary: var(--mash-opaque-label-tertiary);
    --mash-material-label-quaternary: var(--mash-opaque-label-quaternary);
    --mash-material-label-quinary: var(--mash-opaque-label-quinary);
    --mash-material-label-seximal: var(--mash-opaque-label-seximal);
    --mash-material-label-disabled: var(--mash-opaque-label-tertiary, var(--color-text-disabled-opaque));
    --mash-material-fill-primary: var(--color-fill-primary-opaque);
    --mash-material-fill-secondary: var(--color-fill-secondary-opaque);
    --mash-material-fill-tertiary: var(--color-fill-tertiary-opaque);
    --mash-material-fill-quaternary: var(--color-fill-quaternary-opaque);
    --mash-material-fill-quinary: var(--color-fill-quinary-opaque);
    --mash-material-separator: var(--color-separator-opaque);
    --mash-material-separator-strong: var(--color-separator-strong-opaque);
    --mash-material-separator-source: var(--color-separator-strong-opaque);
    --mash-material-accent-action: var(--color-action-opaque);
    --mash-vibrancy-blend-mode: normal;
  }
}

@media (forced-colors: active) {
  :root,
  [data-vibrancy] {
    --mash-material-backdrop-saturation: var(--effect-material-backdrop-saturation-reduced);
    --mash-material-background: Canvas;
    --mash-material-background-highlight: transparent;
    --mash-material-backdrop: none;
    --mash-material-label-primary: CanvasText;
    --mash-material-label-secondary: CanvasText;
    --mash-material-label-tertiary: CanvasText;
    --mash-material-label-quaternary: CanvasText;
    --mash-material-label-quinary: CanvasText;
    --mash-material-label-disabled: GrayText;
    --mash-material-fill-primary: Canvas;
    --mash-material-fill-secondary: Canvas;
    --mash-material-fill-tertiary: Canvas;
    --mash-material-fill-quaternary: Canvas;
    --mash-material-fill-quinary: Canvas;
    --mash-material-separator: CanvasText;
    --mash-material-separator-strong: CanvasText;
    --mash-material-separator-source: CanvasText;
    --mash-material-accent-action: LinkText;
    --mash-vibrancy-blend-mode: normal;
  }
}`;
}

function renderVibrancyUtilities() {
  const labels = ["primary", "secondary", "tertiary", "quaternary", "quinary", "seximal"]
    .map(
      (role) => `@utility vibrant-label-${role} {
  color: var(--mash-material-label-${role});
  mix-blend-mode: var(--mash-vibrancy-blend-mode, var(--mash-vibrancy-theme-blend-mode, normal));
}`,
    )
    .join("\n\n");
  const fills = ["primary", "secondary", "tertiary", "quaternary", "quinary"]
    .map(
      (role) => `@utility vibrant-fill-${role} {
  background-color: var(--mash-material-fill-${role});
  mix-blend-mode: var(--mash-vibrancy-blend-mode, var(--mash-vibrancy-theme-blend-mode, normal));
}`,
    )
    .join("\n\n");

  return `${labels}

${fills}

@utility vibrant-separator {
  border-color: var(--mash-material-separator);
  mix-blend-mode: var(--mash-vibrancy-blend-mode, var(--mash-vibrancy-theme-blend-mode, normal));
}

@utility vibrant-accent-action {
  color: var(--mash-material-accent-action);
  mix-blend-mode: var(--mash-vibrancy-blend-mode, var(--mash-vibrancy-theme-blend-mode, normal));
}`;
}

function renderUtilities(graph) {
  const duration = renderTokenUtilities(
    graph,
    /^duration\.([^.]+)$/,
    (name) => `duration-${kebab(name)}`,
    "transition-duration",
  );
  const border = renderTokenUtilities(
    graph,
    /^border\.(material|hairline|strong)$/,
    (name) => `border-${kebab(name)}`,
    "border-width",
  );
  const layer = renderTokenUtilities(
    graph,
    /^layer\.([^.]+)$/,
    (name) => `z-${kebab(name)}`,
    "z-index",
  );
  const typography = renderTypographyUtilities(graph);
  const materials = renderMaterialUtilities(graph);
  const vibrancy = renderVibrancyScope();
  const vibrancyUtilities = renderVibrancyUtilities();

  return `${vibrancy}

@utility stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-stack);
}

@utility inline-group {
  display: flex;
  align-items: center;
  gap: var(--space-inline);
}

@utility cluster {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-inline);
}

@utility surface {
  color: var(--color-text);
  background-color: var(--color-surface);
}

@utility surface-raised {
  color: var(--color-text);
  background-color: var(--color-surface-raised);
}

@utility surface-sunken {
  color: var(--color-text);
  background-color: var(--color-surface-sunken);
}

@utility focus-ring {
  outline: var(--border-focus-ring) solid var(--color-focus-ring);
  outline-offset: var(--border-focus-ring-offset);
}

@utility motion-control {
  transition-duration: var(--duration-control);
  transition-timing-function: var(--easing-control);
}

@utility motion-surface {
  transition-duration: var(--duration-surface);
  transition-timing-function: var(--easing-surface);
}

@utility animate-fade-in {
  animation: semantic-fade-in var(--duration-surface) var(--easing-surface) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}

@utility animate-fade-out {
  animation: semantic-fade-out var(--duration-surface) var(--easing-surface) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}

@keyframes semantic-fade-in {
  from {
    opacity: 0;
  }
}

@keyframes semantic-fade-out {
  to {
    opacity: 0;
  }
}

${materials}

${vibrancyUtilities}

@utility backdrop-blur-progressive {
  display: grid;
  pointer-events: none;

  > span {
    grid-area: 1 / 1;
    pointer-events: none;
    transition: opacity var(--duration-surface) linear;
  }

  > :nth-child(1) {
    -webkit-backdrop-filter: blur(var(--blur-progressive-1));
    backdrop-filter: blur(var(--blur-progressive-1));
    -webkit-mask-image: linear-gradient(to top, transparent, black 8%);
    mask-image: linear-gradient(to top, transparent, black 8%);
  }

  > :nth-child(2) {
    -webkit-backdrop-filter: blur(var(--blur-progressive-2));
    backdrop-filter: blur(var(--blur-progressive-2));
    -webkit-mask-image: linear-gradient(to top, transparent 8%, black 16%);
    mask-image: linear-gradient(to top, transparent 8%, black 16%);
  }

  > :nth-child(3) {
    -webkit-backdrop-filter: blur(var(--blur-progressive-3));
    backdrop-filter: blur(var(--blur-progressive-3));
    -webkit-mask-image: linear-gradient(to top, transparent 16%, black 24%);
    mask-image: linear-gradient(to top, transparent 16%, black 24%);
  }

  > :nth-child(4) {
    -webkit-backdrop-filter: blur(var(--blur-progressive-4));
    backdrop-filter: blur(var(--blur-progressive-4));
    -webkit-mask-image: linear-gradient(to top, transparent 24%, black 36%);
    mask-image: linear-gradient(to top, transparent 24%, black 36%);
  }

  > :nth-child(5) {
    -webkit-backdrop-filter: blur(var(--blur-progressive-5));
    backdrop-filter: blur(var(--blur-progressive-5));
    -webkit-mask-image: linear-gradient(to top, transparent 36%, black 48%);
    mask-image: linear-gradient(to top, transparent 36%, black 48%);
  }

  > :nth-child(6) {
    -webkit-backdrop-filter: blur(var(--blur-progressive-6));
    backdrop-filter: blur(var(--blur-progressive-6));
    -webkit-mask-image: linear-gradient(to top, transparent 48%, black 60%);
    mask-image: linear-gradient(to top, transparent 48%, black 60%);
  }

  &::after {
    content: "";
    grid-area: 1 / 1;
    pointer-events: none;
    background: linear-gradient(to bottom, var(--color-overlay) 60%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    > span {
      transition: none;
    }
  }
}

${duration}

${border}

${typography}${layer ? `\n\n${layer}` : ""}`;
}

export function renderTailwindCss(graph) {
  return `/**
 * Generated by scripts/build.mjs. Do not edit.
 *
 * Tailwind CSS v4 adapter for Mash's semantic tokens. Import this after
 * \`tailwindcss\`; it also imports the complete Mash token cascade.
 *
 * Reference variables remain in the imported cascade but are deliberately
 * absent from Tailwind's theme and utility namespaces. Tailwind utilities are
 * an application styling surface over the same semantic contract components use.
 */

@import "./tokens.css";

${renderTheme(graph)}

${renderUtilities(graph)}
`;
}
