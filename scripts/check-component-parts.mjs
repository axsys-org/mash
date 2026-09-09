#!/usr/bin/env node
/**
 * Verify the public styling boundary shared by component definitions and
 * catalogue recipes.
 *
 * A named slot is authored content, so consumers need a stable part with the
 * same semantic name around it. Catalogue CSS may only target registered
 * elements and parts published by their custom-elements manifests.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { catalogueFiles } from "./lib/catalogue-css.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PACKAGES = [
  {
    manifest: "packages/components/custom-elements.json",
    catalogue: "packages/components/src/catalogue/mash.css",
    tailwind: "packages/components/dist/tailwind.css",
  },
  {
    manifest: "packages/shrine-components/custom-elements.json",
    dependencyManifests: ["packages/components/custom-elements.json"],
    catalogue: "packages/shrine-components/src/catalogue/mash.css",
    tailwind: "packages/shrine-components/dist/tailwind.css",
  },
];

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function declarationsIn(manifest) {
  return (manifest.modules ?? [])
    .flatMap((module) => module.declarations ?? [])
    .filter((declaration) => declaration.customElement && declaration.tagName);
}

async function main() {
  const problems = [];
  let componentCount = 0;
  let partCount = 0;
  let namedSlotCount = 0;
  let recipeReferenceCount = 0;

  for (const entry of PACKAGES) {
    const manifestPath = path.join(ROOT, entry.manifest);
    const cataloguePath = path.join(ROOT, entry.catalogue);
    const tailwindPath = path.join(ROOT, entry.tailwind);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const catalogue = (await catalogueFiles(cataloguePath)).map(({ source }) => source).join("\n");
    const tailwind = await readFile(tailwindPath, "utf8");
    const components = new Map();

    for (const declaration of declarationsIn(manifest)) {
      componentCount += 1;
      const parts = (declaration.cssParts ?? []).map((part) => part.name);
      const partNames = new Set(parts);
      partCount += parts.length;
      components.set(declaration.tagName, partNames);

      if (parts.length === 0) {
        problems.push(`${declaration.tagName} exposes no CSS parts`);
      }

      for (const part of partNames) {
        if (parts.filter((candidate) => candidate === part).length > 1) {
          problems.push(`${declaration.tagName} declares CSS part ${part} more than once`);
        }
        if (!tailwind.includes(`@custom-variant part-${part} (&::part(${part}));`)) {
          problems.push(`${declaration.tagName} part ${part} is missing from the Tailwind adapter`);
        }
      }

      for (const slot of declaration.slots ?? []) {
        if (!slot.name) continue;
        namedSlotCount += 1;
        if (!partNames.has(slot.name)) {
          problems.push(
            `${declaration.tagName} named slot ${slot.name} has no same-named styling part`,
          );
        }
        if (!tailwind.includes(`@custom-variant slot-${slot.name} (& > [slot="${slot.name}"]);`)) {
          problems.push(
            `${declaration.tagName} named slot ${slot.name} is missing from the Tailwind adapter`,
          );
        }
      }

      for (const state of declaration.cssStates ?? []) {
        if (!tailwind.includes(`@custom-variant state-${state.name} (&:state(${state.name}));`)) {
          problems.push(
            `${declaration.tagName} custom state ${state.name} is missing from the Tailwind adapter`,
          );
        }
      }
    }

    // A composed package may pronounce public parts from its declared UI
    // dependency. These declarations authorize recipe targets only; the owner
    // package above remains responsible for part, slot, state, and Tailwind
    // conformance so totals and failures are not counted twice.
    for (const dependencyManifest of entry.dependencyManifests ?? []) {
      const dependency = JSON.parse(await readFile(path.join(ROOT, dependencyManifest), "utf8"));
      for (const declaration of declarationsIn(dependency)) {
        components.set(
          declaration.tagName,
          new Set((declaration.cssParts ?? []).map((part) => part.name)),
        );
      }
    }

    for (const match of catalogue.matchAll(/::part\(\s*([a-z0-9-]+)\s*\)/g)) {
      recipeReferenceCount += 1;
      const selectorStart = Math.max(
        catalogue.lastIndexOf("{", match.index),
        catalogue.lastIndexOf("}", match.index),
        catalogue.lastIndexOf(",", match.index),
      );
      const selector = catalogue.slice(selectorStart + 1, match.index);
      const ownerSelector = selector.replace(/:has\((?:[^()]|\([^()]*\))*\)/g, "");
      // Tags inside :has() describe descendants, not the owner of this part.
      const tags = [...ownerSelector.matchAll(/\b(?:ui|sh|shrine)-[a-z0-9-]+\b/g)];
      const tagName = tags.at(-1)?.[0];
      const partName = match[1];

      // Class-only selectors cannot be checked against a component manifest.
      if (!tagName) continue;

      const parts = components.get(tagName);
      const location = `${entry.catalogue}:${lineAt(catalogue, match.index)}`;

      if (!parts) {
        problems.push(`${location} targets unregistered component ${tagName}`);
      } else if (!parts.has(partName)) {
        problems.push(`${location} targets undeclared ${tagName} part ${partName}`);
      }
    }
  }

  if (problems.length > 0) {
    console.error("component styling-part contract failed:\n");
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }

  console.log(
    `component parts: ok — ${componentCount} components, ${partCount} parts, ${namedSlotCount} named slots, ${recipeReferenceCount} recipe references`,
  );
}

await main();
