#!/usr/bin/env node
/**
 * Keep authored catalogue compositions on Mash's public contracts.
 *
 * Component structure is already verified against the Custom Elements
 * Manifest by check-component-parts. This check covers the other half of the
 * handoff: examples must compose those slots, parts, icons, commands, and
 * lifecycle primitives instead of rebuilding them with one-off glyphs or CSS.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXAMPLES_PATH = "apps/catalog/src/examples.ts";
const STAGE_PATH = "apps/catalog/src/stage.ts";
const ICONS_PATH = "packages/components/src/icon/carbon-icons.generated.ts";

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function location(file, source, index) {
  return `${file}:${lineAt(source, index)}`;
}

async function main() {
  const examples = await readFile(path.join(ROOT, EXAMPLES_PATH), "utf8");
  const stage = await readFile(path.join(ROOT, STAGE_PATH), "utf8");
  const icons = await readFile(path.join(ROOT, ICONS_PATH), "utf8");
  const problems = [];
  const iconNames = new Set([...icons.matchAll(/^  "([^"]+)": \{$/gm)].map((match) => match[1]));

  for (const match of examples.matchAll(/<ui-input-group\b[^>]*>([\s\S]*?)<\/ui-input-group>/g)) {
    const controls = [...match[1].matchAll(/\bslot="control"/g)].length;
    if (controls !== 1) {
      problems.push(
        `${location(EXAMPLES_PATH, examples, match.index)} input group authors ${controls} control slots; expected exactly one`,
      );
    }
  }

  for (const match of examples.matchAll(/<ui-kbd\b([^>]*)>/g)) {
    const attributes = match[1];
    if (/\bshortcut=/.test(attributes) && !/\bcommand=/.test(attributes)) {
      problems.push(
        `${location(EXAMPLES_PATH, examples, match.index)} shortcut KBD has no semantic command`,
      );
    }
  }

  for (const match of examples.matchAll(/<ui-gesture-binding\b([^>]*)>/g)) {
    const attributes = match[1];
    if (!/\bfor=/.test(attributes) || !/\bcommand=/.test(attributes)) {
      problems.push(
        `${location(EXAMPLES_PATH, examples, match.index)} gesture binding needs both for and command`,
      );
    }
  }

  for (const [file, source] of [
    [EXAMPLES_PATH, examples],
    [STAGE_PATH, stage],
  ]) {
    for (const match of source.matchAll(/<ui-icon\b[^>]*\bname="([^"]+)"[^>]*>/g)) {
      const name = match[1];
      if (name === "product.unknown" || iconNames.has(name)) continue;
      problems.push(
        `${location(file, source, match.index)} references unknown semantic icon ${name}`,
      );
    }

    const superseded = [
      ["example-input-group-divided", "one-off input-group divider class"],
      ["example-tree-glyph", "CSS-drawn tree glyph"],
      ["⠿", "text drag grip"],
      ["⌕", "text search glyph"],
      [">⌄<", "text disclosure glyph"],
    ];
    for (const [needle, label] of superseded) {
      const index = source.indexOf(needle);
      if (index >= 0) problems.push(`${location(file, source, index)} still uses ${label}`);
    }
  }

  const spinnerSection = examples.match(/"ui-spinner": \[([\s\S]*?)\n  \],/);
  if (
    !spinnerSection ||
    !spinnerSection[1].includes("<ui-motion") ||
    !spinnerSection[1].includes("<ui-kbd") ||
    !spinnerSection[1].includes("<ui-gesture-binding")
  ) {
    problems.push(
      `${EXAMPLES_PATH} ui-spinner needs a cross-component Motion, KBD, and Gesture composition`,
    );
  }

  if (problems.length > 0) {
    console.error("catalogue composition conformance failed:\n");
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }

  console.log(
    `catalogue conformance: ok — ${iconNames.size} semantic icons, input groups, commands, gestures, and motion composition verified`,
  );
}

await main();
