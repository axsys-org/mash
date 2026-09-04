#!/usr/bin/env node
/**
 * Token graph validation.
 *
 * This runs before every token build and on CI. It reads the DTCG source files
 * directly rather than going through Style Dictionary, because the point is to
 * catch bad input with a precise message *before* a build turns it into a
 * confusing downstream failure — or worse, into plausible-looking CSS.
 *
 * What it enforces:
 *
 *   1. Well-formed DTCG      every token has a resolvable $type and a $value
 *                            whose shape matches that type
 *   2. Resolvable aliases    every {a.b.c} points at a token that exists in the
 *                            same build scope
 *   3. No cycles             the alias graph is acyclic
 *   4. Layering              primitives hold literals; semantic and theme
 *                            tokens alias rather than re-authoring values
 *   5. No duplicate CSS names  no two tokens in one output file compile to the
 *                            same custom property
 *   6. Theme lockstep        every theme defines exactly the same token ids, so
 *                            a token can never exist in one theme only
 *
 * Exits non-zero with a grouped report on any failure.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { SRC_DIR } from "../config/index.mjs";
import { LAYER, cssVarName } from "../config/layers.mjs";

// ---------------------------------------------------------------------------
// DTCG type checking
// ---------------------------------------------------------------------------

const ALIAS_RE = /^\{([^{}]+)\}$/;

const isPlainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isFiniteNumber = (v) => typeof v === "number" && Number.isFinite(v);

const DIMENSION_UNITS = new Set(["px", "rem"]);
const DURATION_UNITS = new Set(["ms", "s"]);

/** value shape checks, keyed by DTCG $type. Each returns null or a message. */
const TYPE_CHECKS = {
  color(value) {
    if (!isPlainObject(value)) {
      return "expected a DTCG colour object, e.g. { colorSpace: 'oklch', components: [l, c, h] }";
    }
    if (typeof value.colorSpace !== "string") return "missing `colorSpace`";
    if (!Array.isArray(value.components) || value.components.length !== 3) {
      return "`components` must be an array of 3 numbers";
    }
    if (!value.components.every((c) => isFiniteNumber(c) || c === "none")) {
      return "`components` must contain finite numbers (or the keyword 'none')";
    }
    if (
      value.alpha !== undefined &&
      !(isFiniteNumber(value.alpha) && value.alpha >= 0 && value.alpha <= 1)
    ) {
      return "`alpha` must be a number between 0 and 1";
    }
    if (value.colorSpace === "oklch") {
      const [l, c] = value.components;
      if (isFiniteNumber(l) && (l < 0 || l > 1)) {
        return `oklch lightness must be between 0 and 1, got ${l}`;
      }
      if (isFiniteNumber(c) && (c < 0 || c > 0.5)) {
        return `oklch chroma looks out of range (0–0.5), got ${c}`;
      }
    }
    return null;
  },

  dimension(value) {
    if (!isPlainObject(value)) {
      return "expected a DTCG dimension object, e.g. { value: 0.75, unit: 'rem' }";
    }
    if (!isFiniteNumber(value.value)) return "`value` must be a number";
    if (!DIMENSION_UNITS.has(value.unit)) {
      return `\`unit\` must be one of ${[...DIMENSION_UNITS].join(", ")}, got ${JSON.stringify(value.unit)}`;
    }
    return null;
  },

  duration(value) {
    if (!isPlainObject(value)) {
      return "expected a DTCG duration object, e.g. { value: 120, unit: 'ms' }";
    }
    if (!isFiniteNumber(value.value)) return "`value` must be a number";
    if (!DURATION_UNITS.has(value.unit)) {
      return `\`unit\` must be one of ${[...DURATION_UNITS].join(", ")}, got ${JSON.stringify(value.unit)}`;
    }
    return null;
  },

  fontFamily(value) {
    const ok =
      typeof value === "string" ||
      (Array.isArray(value) && value.length > 0 && value.every((f) => typeof f === "string"));
    return ok ? null : "expected a string or a non-empty array of strings";
  },

  fontWeight(value) {
    if (typeof value === "string") return null; // DTCG allows keywords such as "bold"
    if (isFiniteNumber(value) && value >= 1 && value <= 1000) return null;
    return "expected a number between 1 and 1000, or a DTCG weight keyword";
  },

  number(value) {
    return isFiniteNumber(value) ? null : "expected a number";
  },

  cubicBezier(value) {
    if (!Array.isArray(value) || value.length !== 4 || !value.every(isFiniteNumber)) {
      return "expected an array of 4 numbers [x1, y1, x2, y2]";
    }
    const [x1, , x2] = value;
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
      return "cubic-bezier x control points must be between 0 and 1";
    }
    return null;
  },
};

const KNOWN_TYPES = new Set(Object.keys(TYPE_CHECKS));

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

async function readJsonFiles(dir) {
  const entries = await readdir(dir);
  const files = entries.filter((f) => f.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (name) => {
      const filePath = path.join(dir, name);
      const raw = await readFile(filePath, "utf8");
      try {
        return { filePath, name: path.basename(name, ".json"), json: JSON.parse(raw) };
      } catch (cause) {
        throw new Error(`${path.relative(SRC_DIR, filePath)} is not valid JSON: ${cause.message}`, {
          cause,
        });
      }
    }),
  );
}

/**
 * Walk a DTCG document into a flat list of tokens, resolving `$type`
 * inheritance from the nearest ancestor group that declares one.
 */
function flattenDocument({ filePath, json }, errors) {
  const tokens = [];
  const relative = path.relative(SRC_DIR, filePath);

  const walk = (node, trail, inheritedType) => {
    const declaredType = typeof node.$type === "string" ? node.$type : inheritedType;

    if ("$value" in node) {
      tokens.push({
        id: trail.join("."),
        path: trail,
        filePath,
        relative,
        $type: declaredType,
        $value: node.$value,
        $description: node.$description,
      });
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$")) continue;
      if (!isPlainObject(child)) {
        errors.push({
          file: relative,
          id: [...trail, key].join("."),
          message: `expected a token or group object, got ${typeof child}`,
        });
        continue;
      }
      if (/[.{}]/.test(key)) {
        errors.push({
          file: relative,
          id: [...trail, key].join("."),
          message: "DTCG forbids '.', '{' and '}' in token or group names",
        });
        continue;
      }
      walk(child, [...trail, key], declaredType);
    }
  };

  walk(json, [], undefined);
  return tokens;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const aliasTarget = (value) =>
  typeof value === "string" ? (ALIAS_RE.exec(value)?.[1] ?? null) : null;

function checkShape(token, errors) {
  const { $type, $value, relative, id } = token;

  if (typeof $value === "string" && !aliasTarget($value)) {
    errors.push({
      file: relative,
      id,
      message: `string value ${JSON.stringify($value)} is neither a DTCG value object nor a well-formed alias like "{group.token}"`,
    });
    return;
  }

  if (!$type) {
    errors.push({
      file: relative,
      id,
      message: "no $type, and no ancestor group declares one",
    });
    return;
  }

  if (!KNOWN_TYPES.has($type)) {
    errors.push({
      file: relative,
      id,
      message: `unknown $type ${JSON.stringify($type)} (known: ${[...KNOWN_TYPES].sort().join(", ")})`,
    });
    return;
  }

  if (aliasTarget($value)) return; // shape is the target's problem

  const problem = TYPE_CHECKS[$type]($value);
  if (problem) {
    errors.push({ file: relative, id, message: `invalid ${$type} value — ${problem}` });
  }
}

/**
 * A "scope" is one Style Dictionary build: the set of tokens that can see each
 * other. Aliases are only valid within a scope, which is why this is checked
 * per scope rather than across the whole repo.
 */
function checkScope(scopeName, tokens, errors) {
  const byId = new Map();

  for (const token of tokens) {
    const existing = byId.get(token.id);
    if (existing) {
      errors.push({
        file: token.relative,
        id: token.id,
        message: `duplicate token id, already defined in ${existing.relative} (scope: ${scopeName})`,
      });
      continue;
    }
    byId.set(token.id, token);
  }

  // --- aliases resolve, and respect the layering rules ---
  for (const token of byId.values()) {
    const target = aliasTarget(token.$value);

    if (token.layer === LAYER.REFERENCE && target) {
      errors.push({
        file: token.relative,
        id: token.id,
        message: `reference primitives must hold literal values, but this aliases {${target}}. Primitives are where literals are authored; move the indirection up to the semantic layer.`,
      });
      continue;
    }

    if (token.layer !== LAYER.REFERENCE && !target) {
      errors.push({
        file: token.relative,
        id: token.id,
        message: `${token.layer} tokens must alias a reference primitive rather than re-authoring a literal value. Move the literal into the reference layer and point this role at it.`,
      });
      continue;
    }

    if (!target) continue;

    const resolved = byId.get(target);
    if (!resolved) {
      const near = [...byId.keys()]
        .filter((id) => id.split(".")[0] === target.split(".")[0])
        .slice(0, 3);
      errors.push({
        file: token.relative,
        id: token.id,
        message:
          `unresolved alias {${target}} — no such token in scope "${scopeName}".` +
          (near.length ? ` Did you mean one of: ${near.join(", ")}?` : ""),
      });
      continue;
    }

    if (resolved.layer !== LAYER.REFERENCE && resolved.layer !== token.layer) {
      errors.push({
        file: token.relative,
        id: token.id,
        message: `${token.layer} token aliases {${target}}, which is a ${resolved.layer} token. Tokens may only alias reference primitives or their own layer.`,
      });
    }
  }

  // --- cycles ---
  const state = new Map(); // id -> 'visiting' | 'done'
  const walk = (id, trail) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      const cycle = [...trail.slice(trail.indexOf(id)), id].join(" -> ");
      const token = byId.get(id);
      errors.push({
        file: token.relative,
        id,
        message: `circular reference: ${cycle}`,
      });
      return;
    }
    state.set(id, "visiting");
    const target = aliasTarget(byId.get(id)?.$value);
    if (target && byId.has(target)) walk(target, [...trail, id]);
    state.set(id, "done");
  };
  for (const id of byId.keys()) walk(id, []);

  // --- duplicate generated CSS custom property names ---
  const byCssName = new Map();
  for (const token of byId.values()) {
    const name = `--${cssVarName(token)}`;
    const existing = byCssName.get(name);
    if (existing) {
      errors.push({
        file: token.relative,
        id: token.id,
        message: `compiles to ${name}, which collides with ${existing.id} (${existing.relative}). Two tokens cannot share a CSS custom property.`,
      });
      continue;
    }
    byCssName.set(name, token);
  }
}

function checkThemeParity(themeTokens, errors) {
  const names = [...themeTokens.keys()];
  if (names.length < 2) return;

  const idsFor = (theme) => new Set(themeTokens.get(theme).map((t) => t.id));
  const [first, ...rest] = names;
  const baseline = idsFor(first);

  for (const theme of rest) {
    const current = idsFor(theme);
    const missing = [...baseline].filter((id) => !current.has(id)).sort();
    const extra = [...current].filter((id) => !baseline.has(id)).sort();

    for (const id of missing) {
      errors.push({
        file: `src/themes/${theme}.json`,
        id,
        message: `defined in the "${first}" theme but missing here. Every theme must define exactly the same colour contract.`,
      });
    }
    for (const id of extra) {
      errors.push({
        file: `src/themes/${first}.json`,
        id,
        message: `defined in the "${theme}" theme but missing here. Every theme must define exactly the same colour contract.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function validateTokens() {
  const errors = [];

  const [referenceFiles, semanticFiles, themeFiles] = await Promise.all([
    readJsonFiles(path.join(SRC_DIR, "reference")),
    readJsonFiles(path.join(SRC_DIR, "semantic")),
    readJsonFiles(path.join(SRC_DIR, "themes")),
  ]);

  const tag = (files, layer) =>
    files.flatMap((file) =>
      flattenDocument(file, errors).map((token) => ({ ...token, layer, source: file.name })),
    );

  const reference = tag(referenceFiles, LAYER.REFERENCE);
  const semantic = tag(semanticFiles, LAYER.SEMANTIC);
  const themed = tag(themeFiles, LAYER.THEME);

  for (const token of [...reference, ...semantic, ...themed]) {
    checkShape(token, errors);
  }

  // Reference tokens must actually live under `<category>.reference.*`, or the
  // naming and filtering rules in config/layers.mjs silently misclassify them.
  for (const token of reference) {
    if (token.path[1] !== LAYER.REFERENCE) {
      errors.push({
        file: token.relative,
        id: token.id,
        message: `reference tokens must be nested as \`<category>.reference.<name>\` so the layer is visible in the token id; got \`${token.id}\``,
      });
    }
  }

  const themeNames = [...new Set(themed.map((t) => t.source))].sort();
  const byTheme = new Map(themeNames.map((n) => [n, themed.filter((t) => t.source === n)]));

  // Each Style Dictionary build is validated as its own scope.
  checkScope("base (reference + semantic)", [...reference, ...semantic], errors);
  for (const [theme, tokens] of byTheme) {
    checkScope(`theme:${theme} (reference + themes/${theme})`, [...reference, ...tokens], errors);
  }

  checkThemeParity(byTheme, errors);

  return {
    errors,
    stats: {
      reference: reference.length,
      semantic: semantic.length,
      themes: themeNames,
      perTheme: themed.length / Math.max(themeNames.length, 1),
    },
  };
}

function report({ errors, stats }) {
  if (errors.length === 0) {
    console.log(
      `tokens: ok — ${stats.reference} reference, ${stats.semantic} semantic, ` +
        `${stats.perTheme} × ${stats.themes.length} theme (${stats.themes.join(", ")})`,
    );
    return true;
  }

  const byFile = new Map();
  for (const error of errors) {
    if (!byFile.has(error.file)) byFile.set(error.file, []);
    byFile.get(error.file).push(error);
  }

  console.error(`\ntoken validation failed — ${errors.length} problem(s)\n`);
  for (const [file, fileErrors] of [...byFile].sort()) {
    console.error(`  ${file}`);
    for (const { id, message } of fileErrors) {
      console.error(`    ${id}\n      ${message}`);
    }
    console.error("");
  }
  return false;
}

const isMain = process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;
if (isMain) {
  const result = await validateTokens();
  if (!report(result)) process.exit(1);
}
