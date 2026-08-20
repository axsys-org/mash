import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url);
const sourceRoots = [
  "apps/catalog/src",
  "packages/components/src/catalogue",
  "packages/shrine-components/src/catalogue",
];

function filesBelow(directory, files = []) {
  for (const name of readdirSync(new URL(directory, root))) {
    const path = join(directory, name);
    const stats = statSync(new URL(path, root));
    if (stats.isDirectory()) filesBelow(path, files);
    else if (path.endsWith(".css")) files.push(path);
  }
  return files;
}

const tokenDocument = JSON.parse(
  readFileSync(new URL("packages/tokens/dist/tokens.json", root), "utf8"),
);
const tokenVariables = new Set(
  Object.values(tokenDocument.tokens ?? tokenDocument)
    .map((token) => token?.cssVar)
    .filter(Boolean),
);
const localVariables = new Set();
const references = new Map();

for (const file of sourceRoots.flatMap((directory) => filesBelow(directory))) {
  const css = readFileSync(new URL(file, root), "utf8");
  for (const match of css.matchAll(/(--[\w-]+)\s*:/g)) localVariables.add(match[1]);
  for (const match of css.matchAll(/var\((--[\w-]+)/g)) {
    const line = css.slice(0, match.index).split("\n").length;
    const locations = references.get(match[1]) ?? [];
    locations.push(`${relative(".", file)}:${line}`);
    references.set(match[1], locations);
  }
}

const unresolved = [...references]
  .filter(([name]) => !tokenVariables.has(name) && !localVariables.has(name))
  .sort(([left], [right]) => left.localeCompare(right));

if (unresolved.length > 0) {
  console.error(
    "Catalogue CSS references variables that are neither generated tokens nor local internals:",
  );
  for (const [name, locations] of unresolved) {
    console.error(`- ${name}: ${locations.join(", ")}`);
  }
  process.exit(1);
}

console.log(
  `Catalogue CSS token closure valid: ${references.size} variables resolve to generated tokens or local internals.`,
);
