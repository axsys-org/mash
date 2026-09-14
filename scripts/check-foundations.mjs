#!/usr/bin/env node
/** Keep reviewed semantic aliases and the generated token graph in agreement. */
import { readFile } from "node:fs/promises";

const read = async (relative) =>
  JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));
const [contract, graph] = await Promise.all([
  read("../docs/reference/foundations.json"),
  read("../packages/tokens/dist/tokens.json"),
]);
const errors = [];
let checked = 0;
for (const [theme, aliases] of Object.entries(contract.aliases)) {
  for (const [id, target] of Object.entries(aliases)) {
    checked += 1;
    const actual = graph.tokens[id]?.aliasOf?.[theme];
    if (actual !== target)
      errors.push(`${theme} ${id}: expected ${target}, found ${actual ?? "missing"}`);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Mash foundations: ${checked} reviewed aliases match the generated graph.`);
}
