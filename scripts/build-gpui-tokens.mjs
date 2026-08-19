#!/usr/bin/env node
/**
 * Compile Mash's resolved DTCG graph into the small, typed Rust table used by
 * the GPUI adapter. The input is tokens.json rather than the source files so
 * aliases and theme selection stay exactly aligned with the CSS target.
 *
 * The generated module is checked in intentionally: native consumers can use
 * this crate directly, while CI can regenerate it and reject a stale table.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = path.join(ROOT, "packages/tokens/dist/tokens.json");
const OUTPUT = path.join(ROOT, "adapters/gpui/src/generated_tokens.rs");

const number = (value) => {
  if (!Number.isFinite(value)) throw new Error(`Expected a finite number, got ${value}.`);
  const rendered = Number(value.toFixed(6)).toString();
  return rendered.includes(".") ? rendered : `${rendered}.0`;
};

const quote = (value) => JSON.stringify(value);
const clamp = (value) => Math.min(1, Math.max(0, value));

/** Convert a DTCG colour into display sRGB. */
function toSrgb(color) {
  const components = color.components;
  if (!Array.isArray(components) || components.length !== 3) {
    throw new Error(`Expected three colour components, got ${JSON.stringify(color)}.`);
  }

  if (color.colorSpace === "srgb") return components.map((component) => clamp(component));
  if (color.colorSpace !== "oklch") {
    throw new Error(`GPUI adapter does not yet support ${color.colorSpace} colours.`);
  }

  const [lightness, chroma, hue] = components;
  const hueRadians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);

  // OKLCH -> OKLab -> linear sRGB. Coefficients are from CSS Color 4.
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416361 * l - 3.3077115393 * m + 0.2309699032 * s,
    -1.2684379733 * l + 2.6097573493 * m - 0.341319376 * s,
    -0.0041960761 * l - 0.7034186179 * m + 1.7076146941 * s,
  ];
  return linear.map((component) => {
    const encoded =
      component <= 0.0031308 ? 12.92 * component : 1.055 * component ** (1 / 2.4) - 0.055;
    return clamp(encoded);
  });
}

function renderColor(value) {
  const [red, green, blue] = toSrgb(value);
  return `MashColor::new(${number(red)}, ${number(green)}, ${number(blue)}, ${number(value.alpha ?? 1)})`;
}

function renderDimension(value) {
  if (!value || typeof value !== "object") throw new Error(`Expected a dimension, got ${value}.`);
  const units = { px: "DimensionUnit::Px", rem: "DimensionUnit::Rem" };
  if (!(value.unit in units))
    throw new Error(`GPUI adapter does not yet support ${value.unit} dimensions.`);
  return `Dimension::new(${number(value.value)}, ${units[value.unit]})`;
}

function renderDuration(value) {
  if (!value || typeof value !== "object") throw new Error(`Expected a duration, got ${value}.`);
  const units = { ms: "DurationUnit::Milliseconds", s: "DurationUnit::Seconds" };
  if (!(value.unit in units))
    throw new Error(`GPUI adapter does not yet support ${value.unit} durations.`);
  return `Duration::new(${number(value.value)}, ${units[value.unit]})`;
}

function renderTokenValue(type, value) {
  switch (type) {
    case "color":
      return `TokenValue::Color(${renderColor(value)})`;
    case "dimension":
      return `TokenValue::Dimension(${renderDimension(value)})`;
    case "number":
      return `TokenValue::Number(${number(value)})`;
    case "fontFamily":
      return `TokenValue::FontFamily(&[${value.map(quote).join(", ")}])`;
    case "fontWeight":
      return `TokenValue::FontWeight(${number(value)})`;
    case "duration":
      return `TokenValue::Duration(${renderDuration(value)})`;
    case "cubicBezier":
      return `TokenValue::CubicBezier([${value.map(number).join(", ")}])`;
    default:
      throw new Error(`GPUI adapter does not yet support ${type} tokens.`);
  }
}

const snakeCase = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase();

function literalFor(entry, theme) {
  const literal = entry.literalValues?.[theme] ?? entry.literal;
  if (literal === undefined) throw new Error(`Token ${entry.id} has no resolved DTCG literal.`);
  return literal;
}

function renderThemeTokens(tokens, theme) {
  return Object.values(tokens)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(
      (entry) =>
        `    Token::new(${quote(entry.id)}, ${renderTokenValue(entry.type, literalFor(entry, theme))}),`,
    )
    .join("\n");
}

function renderSemanticColors(tokens, theme) {
  return Object.values(tokens)
    .filter((entry) => entry.id.startsWith("color.") && !entry.id.startsWith("color.reference."))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(
      (entry) =>
        `    ${snakeCase(entry.id.slice("color.".length))}: ${renderColor(literalFor(entry, theme))},`,
    )
    .join("\n");
}

function render(graph) {
  const { themes, tokens } = graph;
  if (!Array.isArray(themes) || themes.length === 0) throw new Error("Token graph has no themes.");
  const themeModules = themes.map((theme) => {
    const constant = theme.toUpperCase();
    return `pub const ${constant}: ThemeTokens = ThemeTokens::new(
  ${quote(theme)},
  &[
${renderThemeTokens(tokens, theme)}
  ],
  SemanticColors {
${renderSemanticColors(tokens, theme)}
  },
);`;
  });

  return `// Generated by scripts/build-gpui-tokens.mjs. Do not edit.
//
// Source: packages/tokens/dist/tokens.json. Regenerate with
// \`pnpm build:gpui-tokens\` after changing Mash tokens.

${themeModules.join("\n\n")}
`;
}

async function main() {
  let graph;
  try {
    graph = JSON.parse(await readFile(INPUT, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Missing packages/tokens/dist/tokens.json. Run `pnpm tokens` first.", {
        cause: error,
      });
    }
    throw error;
  }
  const generated = render(graph);
  if (process.argv.includes("--check")) {
    let current;
    try {
      current = await readFile(OUTPUT, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error("Missing adapters/gpui/src/generated_tokens.rs. Run `pnpm build`.", {
          cause: error,
        });
      }
      throw error;
    }
    if (current !== generated) {
      throw new Error("GPUI tokens are stale. Run `pnpm build` and commit the generated table.");
    }
    console.log(
      `gpui tokens: ${Object.keys(graph.tokens).length} tokens × ${graph.themes.length} themes are current`,
    );
    return;
  }
  await writeFile(OUTPUT, generated);
  console.log(
    `gpui tokens: built ${Object.keys(graph.tokens).length} tokens × ${graph.themes.length} themes`,
  );
}

await main();
