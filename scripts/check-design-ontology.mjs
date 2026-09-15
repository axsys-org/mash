#!/usr/bin/env node
/**
 * Keep design-system concepts from collapsing back into ambiguous names.
 *
 * The public API can keep ergonomic names such as `size`, but each component
 * must document which design axis that name belongs to. Token dimensions also
 * stay in known families so new semantic names do not become one-off aliases.
 */

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TEXT_FILE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const IGNORED_FILES = new Set(["pnpm-lock.yaml"]);
const SIZE_AXES = new Set([
  "control-size",
  "glyph-size",
  "identity-size",
  "indicator-size",
  "layout-size",
  "scrollbar-size",
  "type-preset",
]);

async function trackedFiles() {
  const { stdout } = await execFileAsync("git", ["ls-files"], { cwd: ROOT });
  return stdout
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => !IGNORED_FILES.has(file))
    .filter((file) => TEXT_FILE_EXTENSIONS.has(path.extname(file)));
}

async function checkSizeAxes(files, problems) {
  const componentFiles = files.filter(
    (file) =>
      file.startsWith("packages/components/src/") &&
      file.endsWith(".ts") &&
      !file.endsWith(".test.ts") &&
      !file.includes("/internal/"),
  );

  for (const file of componentFiles) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    if (!/\bsize:\s*\{\s*type:/.test(source) && !/\bdeclare\s+size\b/.test(source)) continue;

    const axes = [...source.matchAll(/@mashaxis\s+size\s+([a-z-]+)/g)].map((match) => match[1]);
    if (axes.length === 0) {
      problems.push(`${file} exposes size but does not declare @mashaxis size`);
      continue;
    }
    for (const axis of axes) {
      if (!SIZE_AXES.has(axis)) {
        problems.push(`${file} declares unknown size axis ${axis}`);
      }
    }
  }
}

async function checkDimensionTokenFamilies(problems) {
  const file = "packages/tokens/src/semantic/layout.json";
  const source = await readFile(path.join(ROOT, file), "utf8");
  const layout = JSON.parse(source);
  const dimensions = layout.layout?.dimension ?? {};
  const classifiers = [
    [/^zero$/, "layout-size"],
    [/^glyph$/, "glyph-size"],
    [/^identity(?:Small|Medium|Large)$/, "identity-size"],
    [/^(?:control(?:XSmall|Small|Medium|Large|Touch)?|inputLarge)$/, "control-size"],
    [/^checkbox(?:Mark)?(?:XSmall|Small|Medium|Large)$/, "indicator-size"],
    [/^switch(?:Track(?:Small|Medium)(?:Inline|Block)|Thumb(?:Small|Medium))$/, "indicator-size"],
    [/^(compact|panel|dialog|content|record)$/, "layout-size"],
  ];

  for (const name of Object.keys(dimensions)) {
    const axis = classifiers.find(([pattern]) => pattern.test(name))?.[1];
    if (!axis) problems.push(`${file} layout.dimension.${name} has no approved size axis`);
  }
}

async function main() {
  const problems = [];
  const files = await trackedFiles();

  await checkSizeAxes(files, problems);
  await checkDimensionTokenFamilies(problems);

  if (problems.length > 0) {
    console.error("design ontology check failed:\n");
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }

  console.log(
    `design ontology: ok — ${files.length} tracked text files, ${SIZE_AXES.size} size axes`,
  );
}

await main();
