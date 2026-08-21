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

function renderUtilities(graph) {
  const duration = renderTokenUtilities(
    graph,
    /^duration\.([^.]+)$/,
    (name) => `duration-${kebab(name)}`,
    "transition-duration",
  );
  const border = renderTokenUtilities(
    graph,
    /^border\.(hairline|strong)$/,
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

  return `@utility stack {
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
