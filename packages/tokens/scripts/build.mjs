#!/usr/bin/env node
/**
 * Token build.
 *
 * Order matters and is enforced here rather than in package scripts:
 *
 *   1. validate      bad input fails now, with a precise message
 *   2. CSS           reference.css, semantic.css, theme-*.css
 *   3. tokens.css    a barrel that imports the four in the right order
 *   4. tokens.json   the resolved token graph, with provenance
 *   5. tokens.js/.d.ts  typed CSS variable names for tooling and the catalog
 *
 * Steps 4 and 5 are what make the design language machine-readable. tokens.json
 * records, for every token, what it is called in CSS, what it aliases, the full
 * chain down to the primitive, and what that primitive resolves to in each
 * theme. That is enough to answer "where does this button's background come
 * from?" without parsing CSS or reading documentation prose.
 *
 * Nothing here writes a timestamp. The output is a pure function of the input,
 * so rebuilding without changing tokens produces a zero-line diff.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import StyleDictionary from "style-dictionary";

import { DIST_DIR, SRC_DIR, baseConfig, themeConfig } from "../config/index.mjs";
import { LAYER, cssVarName, layerOf } from "../config/layers.mjs";
import { registerTransforms } from "../config/transforms.mjs";
import { registerFormats } from "../config/formats.mjs";
import { validateTokens } from "./validate.mjs";

registerTransforms(StyleDictionary);
registerFormats(StyleDictionary);

const THEMES = ["light", "dark"];

/** Style Dictionary returns either `{ allTokens }` or a bare array across minor versions. */
const allTokensOf = (result) => (Array.isArray(result) ? result : (result?.allTokens ?? []));

async function buildDictionary(config) {
  const sd = new StyleDictionary(config);
  await sd.buildAllPlatforms();
  return allTokensOf(await sd.getPlatformTokens("css"));
}

// ---------------------------------------------------------------------------
// Token graph
// ---------------------------------------------------------------------------

const ALIAS_RE = /^\{([^{}]+)\}$/;
const aliasTarget = (value) =>
  typeof value === "string" ? (ALIAS_RE.exec(value)?.[1] ?? null) : null;

/**
 * Follow a token's alias chain down to the primitive that holds the literal.
 * `color.action -> color.reference.blue.600` becomes
 * `["color.action", "color.reference.blue.600"]`.
 */
function resolveChain(token, byId) {
  const chain = [token.id];
  let current = token;
  const seen = new Set(chain);

  for (;;) {
    const target = aliasTarget(current.originalValue);
    if (!target || seen.has(target)) break;
    // Record the hop before resolving it: a target we cannot follow any
    // further is still a real, and useful, link in the provenance chain.
    chain.push(target);
    seen.add(target);
    const next = byId.get(target);
    if (!next) break;
    current = next;
  }
  return chain;
}

/** Normalise a Style Dictionary token into the shape the graph records. */
function describe(token) {
  return {
    id: token.path.join("."),
    path: token.path,
    layer: layerOf(token),
    type: token.$type,
    cssVar: `--${cssVarName(token)}`,
    description: token.$description,
    originalValue: token.original?.$value ?? token.original?.value,
    value: token.$value ?? token.value,
    source: path.relative(SRC_DIR, token.filePath),
  };
}

function buildGraph({ base, themes }) {
  const graph = {};
  const baseById = new Map(base.map((t) => [t.id, t]));

  for (const token of base) {
    const chain = resolveChain(token, baseById);
    graph[token.id] = {
      id: token.id,
      layer: token.layer,
      type: token.type,
      cssVar: token.cssVar,
      ...(token.description ? { description: token.description } : {}),
      ...(chain.length > 1 ? { aliasOf: chain[1], chain } : {}),
      value: token.value,
      source: token.source,
    };
  }

  // Theme tokens exist once per theme with different values, so they are folded
  // into a single entry carrying a value *per theme*.
  const [firstTheme] = Object.keys(themes);
  for (const token of themes[firstTheme].themed) {
    const entry = {
      id: token.id,
      layer: LAYER.THEME,
      type: token.type,
      cssVar: token.cssVar,
      ...(token.description ? { description: token.description } : {}),
      aliasOf: {},
      chain: {},
      values: {},
      source: token.source,
    };

    for (const [theme, { all }] of Object.entries(themes)) {
      // Resolve against the theme's *whole* dictionary, primitives included —
      // otherwise the chain stops at the first reference token.
      const byId = new Map(all.map((t) => [t.id, t]));
      const themeToken = byId.get(token.id);
      if (!themeToken) continue;
      const chain = resolveChain(themeToken, byId);
      entry.values[theme] = themeToken.value;
      entry.chain[theme] = chain;
      if (chain.length > 1) entry.aliasOf[theme] = chain[1];
    }

    graph[token.id] = entry;
  }

  return graph;
}

// ---------------------------------------------------------------------------
// Generated JS / TS surface
// ---------------------------------------------------------------------------

const quote = (s) => JSON.stringify(s);
const unionOf = (values) => (values.length ? values.map(quote).join("\n  | ") : "never");

function renderTokensJs(graph, themes) {
  const varsIn = (layer) =>
    Object.values(graph)
      .filter((t) => t.layer === layer)
      .map((t) => t.cssVar);

  const idMap = Object.values(graph)
    .map((t) => `  ${quote(t.id)}: ${quote(t.cssVar)},`)
    .join("\n");

  const list = (name, values) =>
    `export const ${name} = Object.freeze([\n${values.map((v) => `  ${quote(v)},`).join("\n")}\n]);`;

  return `// Generated by scripts/build.mjs. Do not edit.
//
// The CSS custom property names this design system exposes, as data. Importing
// this module gives tooling (the catalog, editor plugins, Figma bridges) the
// vocabulary of the design language without parsing CSS.
//
// The values themselves deliberately live in CSS, not here — they are
// theme-dependent and belong to the cascade. For the resolved graph including
// provenance, read tokens.json.

${list("themes", themes)}

${list("referenceVars", varsIn(LAYER.REFERENCE))}

${list("semanticVars", varsIn(LAYER.SEMANTIC))}

${list("themeVars", varsIn(LAYER.THEME))}

/** Every token id in the graph, mapped to the CSS custom property it compiles to. */
export const cssVarByTokenId = Object.freeze({
${idMap}
});
`;
}

function renderTokensDts(graph, themes) {
  const varsIn = (layer) =>
    Object.values(graph)
      .filter((t) => t.layer === layer)
      .map((t) => t.cssVar);

  return `// Generated by scripts/build.mjs. Do not edit.

/** A theme shipped by this package. */
export type ThemeName =
  | ${unionOf(themes)};

/** A reference primitive's custom property. Not part of the public API — prefer SemanticVar / ThemeVar. */
export type ReferenceVar =
  | ${unionOf(varsIn(LAYER.REFERENCE))};

/** A theme-independent semantic custom property: spacing, shape, type, motion. */
export type SemanticVar =
  | ${unionOf(varsIn(LAYER.SEMANTIC))};

/** A theme-dependent semantic colour custom property. */
export type ThemeVar =
  | ${unionOf(varsIn(LAYER.THEME))};

/** Any custom property this package emits. */
export type TokenVar = ReferenceVar | SemanticVar | ThemeVar;

/** Any token id in the graph, e.g. \`color.action\`. */
export type TokenId =
  | ${unionOf(Object.keys(graph))};

export declare const themes: readonly ThemeName[];
export declare const referenceVars: readonly ReferenceVar[];
export declare const semanticVars: readonly SemanticVar[];
export declare const themeVars: readonly ThemeVar[];
export declare const cssVarByTokenId: Readonly<Record<TokenId, TokenVar>>;
`;
}

function renderBarrelCss(themes) {
  const imports = ["reference.css", "semantic.css", ...themes.map((t) => `theme-${t}.css`)]
    .map((file) => `@import url("./${file}");`)
    .join("\n");

  return `/**
 * Generated by scripts/build.mjs. Do not edit.
 *
 * Every stylesheet in the package, in dependency order: primitives first,
 * because everything above them resolves through var() into this file.
 *
 * Importing this pulls in *all* themes. To ship only one, import
 * reference.css, semantic.css and the single theme-*.css you need.
 */

${imports}
`;
}

// ---------------------------------------------------------------------------
// Generated-CSS integrity
// ---------------------------------------------------------------------------

/**
 * Verify the emitted stylesheets against each other.
 *
 * The semantic and theme files resolve through `var()` into reference.css, so
 * the files are only correct as a set. This checks the thing that actually
 * matters at runtime — that every custom property referenced by the generated
 * CSS is defined by the generated CSS — and that no property is defined twice
 * within one file.
 */
async function checkGeneratedCss(files) {
  const { readFile } = await import("node:fs/promises");
  const defined = new Set();
  const referenced = new Map();
  const problems = [];

  for (const file of files) {
    const css = await readFile(path.join(DIST_DIR, file), "utf8");
    const seenHere = new Map();

    for (const [, name, selectorScope] of css.matchAll(/^\s*(--[\w-]+):/gm)) {
      void selectorScope;
      defined.add(name);
      seenHere.set(name, (seenHere.get(name) ?? 0) + 1);
    }

    // A theme file legitimately declares each property twice: once in its
    // explicit selector and once in the prefers-color-scheme block.
    const allowedRepeats = file.startsWith("theme-") ? 2 : 1;
    for (const [name, count] of seenHere) {
      if (count > allowedRepeats) {
        problems.push(`${file}: ${name} is declared ${count} times in one file`);
      }
    }

    for (const [, name] of css.matchAll(/var\((--[\w-]+)/g)) {
      if (!referenced.has(name)) referenced.set(name, file);
    }
  }

  for (const [name, file] of referenced) {
    if (!defined.has(name)) {
      problems.push(
        `${file}: var(${name}) is referenced but never defined by any generated stylesheet`,
      );
    }
  }

  if (problems.length > 0) {
    console.error("\ntoken build produced inconsistent CSS:\n");
    for (const problem of problems) console.error(`  ${problem}`);
    console.error("");
    process.exit(1);
  }

  return { defined: defined.size, referenced: referenced.size };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const validation = await validateTokens();
  if (validation.errors.length > 0) {
    console.error("\ntoken build aborted: the token graph is invalid.");
    console.error("Run `pnpm --filter @mash/tokens validate` for the full report.\n");
    for (const { file, id, message } of validation.errors.slice(0, 10)) {
      console.error(`  ${file} :: ${id}\n    ${message}`);
    }
    process.exit(1);
  }

  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });

  const base = (await buildDictionary(baseConfig())).map(describe);

  const themes = {};
  for (const theme of THEMES) {
    const all = (await buildDictionary(themeConfig(theme))).map(describe);
    themes[theme] = { all, themed: all.filter((t) => t.layer === LAYER.THEME) };
  }

  const graph = buildGraph({ base, themes });

  await Promise.all([
    writeFile(path.join(DIST_DIR, "tokens.css"), renderBarrelCss(THEMES)),
    writeFile(
      path.join(DIST_DIR, "tokens.json"),
      `${JSON.stringify({ themes: THEMES, tokens: graph }, null, 2)}\n`,
    ),
    writeFile(path.join(DIST_DIR, "tokens.js"), renderTokensJs(graph, THEMES)),
    writeFile(path.join(DIST_DIR, "tokens.d.ts"), renderTokensDts(graph, THEMES)),
  ]);

  const css = await checkGeneratedCss([
    "reference.css",
    "semantic.css",
    ...THEMES.map((t) => `theme-${t}.css`),
  ]);

  const counts = Object.values(graph).reduce((acc, t) => {
    acc[t.layer] = (acc[t.layer] ?? 0) + 1;
    return acc;
  }, {});

  console.log(
    `tokens: built ${Object.keys(graph).length} tokens ` +
      `(${counts.reference} reference, ${counts.semantic} semantic, ${counts.theme} themed × ${THEMES.length})`,
  );
  console.log(
    `tokens: ${css.defined} custom properties defined, ${css.referenced} var() references all resolved`,
  );
}

await main();
