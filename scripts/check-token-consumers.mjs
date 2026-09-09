#!/usr/bin/env node
/**
 * Verify that Web catalogue CSS only consumes defined token variables or
 * custom properties it defines locally.
 *
 * The token build validates references inside generated token CSS. This check
 * closes the other half of the contract: recipes and catalogue scaffolding
 * must not spell a token that the source graph does not publish.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { cssVarName } from "../packages/tokens/config/layers.mjs";
import { catalogueFiles } from "./lib/catalogue-css.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TOKEN_SOURCE_ROOT = path.join(ROOT, "packages/tokens/src");
const TOKEN_SOURCE_DIRS = ["reference", "semantic", "themes"];
const CONSUMER_ROOTS = [
  "packages/components/src/catalogue",
  "packages/shrine-components/src/catalogue",
  "apps/catalog/src",
];
const CATALOG_SYSTEM_ENTRY = "apps/catalog/src/system.css";
const STRUCTURAL_RECIPE_ROLES = new Map([
  ["--color-surface", "--_mash-component-surface"],
  ["--color-surface-raised", "--_mash-component-surface-raised"],
  ["--color-surface-sunken", "--_mash-component-surface-sunken"],
  ["--color-border", "--_mash-component-boundary"],
  ["--color-border-strong", "--_mash-component-boundary-strong"],
  ["--color-shadow", "--_mash-component-shadow"],
]);
// Renderer fragments may communicate scoped runtime state to component recipes
// without publishing that state as a design token. Every entry must retain a
// safe CSS fallback at its use site.
const RUNTIME_VARIABLES = new Set([
  // Published by the generated material/vibrancy utility layer rather than the
  // DTCG token graph. Every catalogue use retains a semantic token fallback.
  "--mash-material-display",
  "--mash-material-background",
  "--mash-material-background-highlight",
  "--mash-material-backdrop",
  "--mash-material-backdrop-saturation",
  "--mash-material-compositor",
  "--mash-material-label-primary",
  "--mash-material-label-secondary",
  "--mash-material-label-disabled",
  "--mash-material-separator",
  "--mash-material-separator-source",
  "--mash-vibrancy-blend-mode",
  "--mash-vibrancy-theme-blend-mode",
  // Measured by ui-menu-item while a fine pointer traverses from a parent item
  // into its nested menu. Each geometry variable has a safe zero/50% fallback.
  "--_mash-safe-top",
  "--_mash-safe-left",
  "--_mash-safe-width",
  "--_mash-safe-height",
  "--_mash-safe-y",
]);

async function filesUnder(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(entryPath, extension)));
    if (entry.isFile() && entry.name.endsWith(extension)) files.push(entryPath);
  }

  return files;
}

function tokenPaths(document) {
  const paths = [];

  const visit = (node, trail) => {
    if (Object.hasOwn(node, "$value")) {
      paths.push(trail);
      return;
    }

    for (const [name, child] of Object.entries(node)) {
      if (name.startsWith("$") || typeof child !== "object" || child === null) continue;
      visit(child, [...trail, name]);
    }
  };

  visit(document, []);
  return paths;
}

async function publishedTokenVariables() {
  const variables = new Set();

  for (const relativeDirectory of TOKEN_SOURCE_DIRS) {
    const directory = path.join(TOKEN_SOURCE_ROOT, relativeDirectory);
    for (const filePath of await filesUnder(directory, ".json")) {
      const document = JSON.parse(await readFile(filePath, "utf8"));
      for (const tokenPath of tokenPaths(document)) {
        variables.add(`--${cssVarName({ path: tokenPath, filePath })}`);
      }
    }
  }

  return variables;
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

async function main() {
  const tokens = await publishedTokenVariables();
  const cssFiles = (
    await Promise.all(CONSUMER_ROOTS.map((root) => filesUnder(path.join(ROOT, root), ".css")))
  ).flat();
  const unresolved = [];
  let references = 0;

  const catalogueStyles = cssFiles
    .map((filePath) => path.relative(ROOT, filePath))
    .filter((filePath) => filePath.startsWith("apps/catalog/src/"));
  for (const filePath of catalogueStyles) {
    if (filePath !== CATALOG_SYSTEM_ENTRY && filePath !== "apps/catalog/src/fixture-stage.css") {
      unresolved.push(
        `${filePath} is application styling; compose semantic utilities in utility-recipes.ts instead`,
      );
    }
  }

  const catalogueEntry = await readFile(path.join(ROOT, CATALOG_SYSTEM_ENTRY), "utf8");
  const authoredBlocks = catalogueEntry.replaceAll(/\/\*[\s\S]*?\*\//g, "").match(/[{}]/g) ?? [];
  if (authoredBlocks.length > 0) {
    unresolved.push(
      `${CATALOG_SYSTEM_ENTRY} must remain an import-only Tailwind entrypoint with no authored rule blocks`,
    );
  }

  // Imported recipe modules share one cascade and may consume each other's
  // private roles. Unimported files retain only their own local declarations.
  const recipeVariables = new Map();
  for (const root of CONSUMER_ROOTS.filter((entry) => entry.startsWith("packages/"))) {
    const files = await catalogueFiles(path.join(ROOT, root, "mash.css"));
    const variables = files.flatMap(({ source }) =>
      [...source.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]),
    );
    for (const { file } of files) recipeVariables.set(file, variables);
  }

  for (const filePath of cssFiles) {
    const source = await readFile(filePath, "utf8");
    const relativePath = path.relative(ROOT, filePath);
    const localVariables = new Set(
      recipeVariables.get(filePath) ??
        [...source.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]),
    );

    if (relativePath.startsWith("packages/") && relativePath.includes("/src/catalogue/")) {
      for (const [legacyVariable, roleVariable] of STRUCTURAL_RECIPE_ROLES) {
        for (const match of source.matchAll(new RegExp(`var\\(${legacyVariable}\\)`, "g"))) {
          const lineStart = source.lastIndexOf("\n", match.index) + 1;
          const lineEnd = source.indexOf("\n", match.index);
          const line = source.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
          if (
            line.includes(`${roleVariable}:`) ||
            (legacyVariable === "--color-surface" &&
              line.includes("--_mash-component-inverse-label:"))
          )
            continue;
          unresolved.push(
            `${relativePath}:${lineAt(source, match.index)} bypasses structural recipe role ${roleVariable}`,
          );
        }
      }
    }

    for (const match of source.matchAll(/var\(\s*(--[\w-]+)/g)) {
      references += 1;
      const variable = match[1];
      if (variable.startsWith("--ref-")) {
        unresolved.push(
          `${relativePath}:${lineAt(source, match.index)} consumes reference primitive ${variable}; component and catalogue CSS must use a semantic role`,
        );
        continue;
      }
      if (tokens.has(variable) || localVariables.has(variable) || RUNTIME_VARIABLES.has(variable))
        continue;
      unresolved.push(`${relativePath}:${lineAt(source, match.index)} references ${variable}`);
    }
  }

  if (unresolved.length > 0) {
    console.error("token consumer CSS contains unresolved custom properties:\n");
    for (const problem of unresolved) console.error(`  ${problem}`);
    process.exit(1);
  }

  console.log(
    `token consumers: ok — ${tokens.size} token variables, ${cssFiles.length} CSS files, ${references} var() references resolved`,
  );
}

await main();
