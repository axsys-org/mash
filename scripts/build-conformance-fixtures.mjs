#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { format } from "prettier";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CHECK = process.argv.includes("--check");
const OUTPUT = path.join(ROOT, "packages/conformance/fixtures/surface-tree.json");
const sources = [
  ["ui", "packages/components/custom-elements.json"],
  ["shrine", "packages/shrine-components/custom-elements.json"],
];

const components = [];
const unique = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    const key = JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
for (const [packageName, relative] of sources) {
  const manifest = JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));
  for (const declaration of (manifest.modules ?? []).flatMap(
    (module) => module.declarations ?? [],
  )) {
    if (!declaration.customElement || !declaration.tagName || !declaration.mash) continue;
    const nodes = declaration.mash.nodes.map(
      ({ id, address, role, family, ownership, parent, bindings = [] }) => ({
        id,
        address,
        role,
        family,
        ownership,
        ...(parent ? { parent } : {}),
        values: unique(bindings.map((binding) => binding.value)),
        defaults: unique(
          bindings.map((binding) => binding.default).filter((value) => value?.kind !== "none"),
        ),
        fallbacks: unique(
          bindings.map((binding) => binding.fallback).filter((value) => value?.kind !== "none"),
        ),
        channels: [...new Set(bindings.map((binding) => binding.direction))].sort(),
        availability: [...new Set(bindings.map((binding) => binding.availability))].sort(),
      }),
    );
    const root = nodes.find((node) => !node.parent);
    const events = declaration.mash.bindings
      .filter((binding) => binding.kind === "event")
      .map(({ nodeAddress, role, intent, relations = [], value }) => ({
        nodeAddress,
        role,
        intent,
        relations,
        value,
      }));
    components.push({
      tag: declaration.tagName,
      package: packageName,
      address: declaration.mash.address,
      root: root?.address,
      nodes,
      events,
    });
  }
}

components.sort((left, right) => left.tag.localeCompare(right.tag));
const fixture = {
  $schema: "https://mash.axsys.dev/schema/conformance-surface-tree-1.0.0.json",
  version: "1.0.0",
  componentContract: "1.0.0",
  components,
};
const next = await format(JSON.stringify(fixture), { parser: "json" });

if (CHECK) {
  const current = await readFile(OUTPUT, "utf8").catch(() => "");
  if (current !== next) {
    throw new Error(
      "Conformance SurfaceTree fixtures are stale. Run pnpm --filter @mash/conformance build:fixtures.",
    );
  }
  console.log(`conformance fixtures: ${components.length} component SurfaceTrees are current`);
} else {
  await writeFile(OUTPUT, next);
  console.log(`conformance fixtures: wrote ${components.length} component SurfaceTrees`);
}
