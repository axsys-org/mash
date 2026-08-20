#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { MASH_CONTRACT_SCHEMA, MASH_CONTRACT_VERSION, contractRole } from "./mash-contract.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const manifestPaths = [
  "packages/components/custom-elements.json",
  "packages/shrine-components/custom-elements.json",
];
const problems = [];

function fail(location, message) {
  problems.push(`${location}: ${message}`);
}

function componentDeclarations(manifest) {
  return (manifest.modules ?? [])
    .flatMap((module) => module.declarations ?? [])
    .filter((declaration) => declaration.customElement && declaration.tagName);
}

function valueMatches(schema, value) {
  if (!schema?.kind) return false;
  if (schema.kind === "string") return typeof value === "string";
  if (schema.kind === "number") return typeof value === "number" && Number.isFinite(value);
  if (schema.kind === "boolean") return typeof value === "boolean";
  if (schema.kind === "enum") return schema.choices?.includes(value) ?? false;
  if (schema.kind === "array") {
    return Array.isArray(value) && value.every((item) => valueMatches(schema.items, item));
  }
  if (schema.kind === "record") {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  return schema.kind === "reference";
}

function valueAtPath(schema, segments) {
  let current = schema;
  for (const segment of segments) {
    if (current?.kind !== "record") return undefined;
    current = current.fields?.[segment];
  }
  return current;
}

for (const sourceRoot of ["packages/components/src", "packages/shrine-components/src"]) {
  const absoluteRoot = path.join(ROOT, sourceRoot);
  const entries = await readdir(absoluteRoot, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) continue;
    const directory = entry.parentPath ?? entry.path;
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(ROOT, absolutePath);
    if (/\/(?:catalogue|test-support)\//.test(`/${relativePath}`)) continue;
    const source = await readFile(absolutePath, "utf8");
    if (/var\(--(?:color|space|type|radius|border|duration|easing|layout)-/.test(source)) {
      fail(relativePath, "component source references catalogue design tokens");
    }
    for (const match of source.matchAll(/css`([\s\S]*?)`/g)) {
      if (
        /(?:^|[;{]\s*)(?:accent-color|animation|background(?:-color)?|border(?:-[\w-]+)?|box-shadow|color|fill|filter|font(?:-[\w-]+)?|margin(?:-[\w-]+)?|opacity|outline(?:-[\w-]+)?|padding(?:-[\w-]+)?|stroke|text-shadow|transition)\s*:/m.test(
          match[1],
        )
      ) {
        fail(relativePath, "component shadow CSS contains visual catalogue policy");
      }
    }
  }
}

for (const relativePath of manifestPaths) {
  const manifest = JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
  if (manifest.mash?.schema !== MASH_CONTRACT_SCHEMA) {
    fail(relativePath, `expected Mash schema ${MASH_CONTRACT_SCHEMA}`);
  }
  if (manifest.mash?.version !== MASH_CONTRACT_VERSION) {
    fail(relativePath, `expected Mash contract ${MASH_CONTRACT_VERSION}`);
  }
  if (/"module":"\/?src\//.test(JSON.stringify(manifest))) {
    fail(relativePath, "contains a source-only module reference");
  }

  for (const declaration of componentDeclarations(manifest)) {
    const location = `${relativePath} :: ${declaration.tagName}`;
    const contract = declaration.mash;
    if (!contract) {
      fail(location, "has no renderer-neutral Mash contract");
      continue;
    }

    const nodes = new Map(contract.nodes.map((node) => [node.address, node]));
    const bindings = new Map(contract.bindings.map((binding) => [binding.address, binding]));
    const roots = contract.nodes.filter((node) => !node.parent);
    if (roots.length !== 1) {
      fail(location, `SurfaceTree must have exactly one root, found ${roots.length}`);
    }
    const addresses = [
      ...contract.nodes.map((node) => node.address),
      ...contract.bindings.map((binding) => binding.address),
    ];
    if (new Set(addresses).size !== addresses.length) fail(location, "has duplicate addresses");

    for (const node of contract.nodes) {
      if (!node.shared) fail(location, `node ${node.id} has no shared Mash role`);
      if (node.parent && !nodes.has(node.parent)) {
        fail(location, `node ${node.id} points to missing parent ${node.parent}`);
      }
      for (const binding of node.bindings) {
        if (binding.nodeAddress !== node.address) {
          fail(location, `binding ${binding.address} points outside node ${node.id}`);
        }
      }
      if (
        node.bindings.some((binding) => binding.kind === "slot") &&
        !node.bindings.some((binding) => binding.kind === "part")
      ) {
        fail(location, `authored slot node ${node.id} has no styleable realization part`);
      }
      if (
        node.family === "state" &&
        node.bindings.some((binding) => binding.kind === "attribute") &&
        !node.bindings.some((binding) => binding.kind === "state")
      ) {
        fail(location, `controlled state node ${node.id} has no state binding`);
      }
    }

    for (const binding of contract.bindings) {
      if (!binding.shared) fail(location, `binding ${binding.address} has no shared Mash role`);
      if (!nodes.has(binding.nodeAddress)) {
        fail(location, `binding ${binding.address} points to missing node ${binding.nodeAddress}`);
      }
      if (!binding.value?.kind || binding.value.kind === "unknown") {
        fail(location, `binding ${binding.address} has no renderer-neutral value schema`);
      }
      if (/PointerEvent|MouseEvent|FormData/.test(JSON.stringify(binding.value))) {
        fail(location, `binding ${binding.address} leaks a Web-only value type`);
      }

      const inferredRole = contractRole(binding.name, binding.kind);
      const inferredNodeId = inferredRole;
      const actualNodeId = binding.nodeAddress.split("/").at(-1);
      const materiallyExplicit = binding.role !== inferredRole || actualNodeId !== inferredNodeId;
      if (binding.mapping === "inferred" && materiallyExplicit) {
        fail(
          location,
          `binding ${binding.address} claims inferred mapping but changes its role or node`,
        );
      }
      if (binding.mapping === "explicit" && !materiallyExplicit) {
        fail(location, `binding ${binding.address} has a redundant explicit mapping`);
      }

      const authored = binding.kind === "attribute" || binding.kind === "slot";
      const expectedAvailability = authored
        ? binding.availability === "required" || binding.availability === "optional"
        : binding.availability === "provided";
      if (!expectedAvailability) {
        fail(
          location,
          `binding ${binding.address} has invalid availability ${binding.availability}`,
        );
      }

      if (binding.kind === "attribute") {
        if (binding.fallback?.kind !== "none") {
          fail(location, `attribute binding ${binding.address} must not declare content fallback`);
        }
        if (
          binding.default?.kind === "value" &&
          !valueMatches(binding.value, binding.default.value)
        ) {
          fail(location, `binding ${binding.address} has a default outside its value schema`);
        }
      } else if (binding.default?.kind !== "none") {
        fail(location, `non-attribute binding ${binding.address} must not declare a default value`);
      }

      if (binding.kind === "slot") {
        if (!binding.fallback || binding.fallback.kind === "none") {
          fail(location, `slot binding ${binding.address} has no explicit fallback behavior`);
        }
        if (binding.fallback?.kind === "binding") {
          const target = bindings.get(binding.fallback.bindingAddress);
          if (!target) {
            fail(location, `binding ${binding.address} falls back to a missing binding`);
          } else if (target.nodeAddress !== binding.nodeAddress) {
            fail(location, `binding ${binding.address} falls back outside its semantic node`);
          } else if (target.kind !== "attribute" && target.kind !== "slot") {
            fail(location, `binding ${binding.address} falls back to a non-authored surface`);
          }
        }
        if (binding.fallback?.kind === "chain") {
          const fallbackAddresses = binding.fallback.bindingAddresses ?? [];
          if (
            fallbackAddresses.length < 2 ||
            new Set(fallbackAddresses).size !== fallbackAddresses.length
          ) {
            fail(location, `binding ${binding.address} has an invalid fallback chain`);
          }
          for (const address of fallbackAddresses) {
            const target = bindings.get(address);
            if (!target) {
              fail(location, `binding ${binding.address} falls back to missing binding ${address}`);
            } else if (target.address === binding.address) {
              fail(location, `binding ${binding.address} fallback chain targets itself`);
            } else if (target.kind !== "attribute" && target.kind !== "slot") {
              fail(location, `binding ${binding.address} falls back to a non-authored surface`);
            }
          }
        }
      } else if (binding.fallback?.kind !== "none") {
        fail(location, `non-slot binding ${binding.address} must not declare content fallback`);
      }

      if (binding.kind === "event") {
        if (!Array.isArray(binding.reports)) {
          fail(location, `event binding ${binding.address} has no reports index`);
        } else {
          const seenReports = new Set();
          for (const report of binding.reports) {
            const key = `${report.path?.join(".")}::${report.nodeAddress}`;
            if (seenReports.has(key)) {
              fail(location, `event binding ${binding.address} repeats report ${key}`);
            }
            seenReports.add(key);
            if (!Array.isArray(report.path) || report.path.length === 0) {
              fail(location, `event binding ${binding.address} has an empty report path`);
              continue;
            }
            if (!valueAtPath(binding.value.detail, report.path)) {
              fail(
                location,
                `event binding ${binding.address} reports missing payload path ${report.path.join(".")}`,
              );
            }
            const target = nodes.get(report.nodeAddress);
            if (!target) {
              fail(
                location,
                `event binding ${binding.address} reports missing node ${report.nodeAddress}`,
              );
            } else if (target.bindings.every((candidate) => candidate.kind === "event")) {
              fail(
                location,
                `event binding ${binding.address} reports event-only node ${target.id}`,
              );
            }
          }

          if (binding.value.detail?.kind === "record") {
            for (const field of Object.keys(binding.value.detail.fields)) {
              const target = contract.nodes.find(
                (node) =>
                  node.id === field &&
                  node.bindings.some((candidate) => candidate.kind !== "event"),
              );
              if (
                target &&
                !binding.reports.some(
                  (report) => report.path.length === 1 && report.path[0] === field,
                )
              ) {
                fail(
                  location,
                  `event binding ${binding.address} omits inferred report ${field} -> ${target.id}`,
                );
              }
            }
          }
        }
      } else if (binding.reports !== undefined) {
        fail(location, `non-event binding ${binding.address} declares event reports`);
      }
    }

    const exposedSurfaces = [
      ["attribute", declaration.attributes ?? []],
      ["slot", declaration.slots ?? []],
      ["part", declaration.cssParts ?? []],
      ["state", declaration.cssStates ?? []],
      ["event", declaration.events ?? []],
    ];
    const exposedAddresses = new Set();
    for (const [kind, surfaces] of exposedSurfaces) {
      for (const surface of surfaces) {
        if (!surface.mash) {
          fail(location, `${kind} ${surface.name || "default"} has no Mash binding`);
          continue;
        }
        const indexed = bindings.get(surface.mash.address);
        if (!indexed) {
          fail(location, `${kind} ${surface.name || "default"} is absent from the binding index`);
          continue;
        }
        if (JSON.stringify(indexed) !== JSON.stringify(surface.mash)) {
          fail(location, `${kind} ${surface.name || "default"} disagrees with its indexed binding`);
        }
        exposedAddresses.add(surface.mash.address);
      }
    }
    for (const binding of contract.bindings) {
      if (!exposedAddresses.has(binding.address)) {
        fail(location, `binding ${binding.address} has no public Web surface`);
      }
    }
  }
}

const requiredTopology = {
  "ui-card": {
    title: ["slot:title", "part:title"],
    content: ["slot:default", "slot:content", "part:content"],
  },
  "ui-scroll-area": {
    root: ["part:root"],
    viewport: ["part:viewport"],
    content: ["slot:default", "slot:content", "part:content"],
  },
  "shrine-confirm": {
    confirm: ["part:confirm", "event:shrine-confirm"],
    "confirm-label": ["slot:confirm", "part:confirm-label"],
    pending: ["attribute:pending", "state:pending"],
  },
  "sh-triptych": {
    "sidebar-viewport": ["part:sidebar-viewport"],
    "main-content": ["slot:default", "slot:content", "part:main-content"],
    "inspector-open": ["attribute:inspector-open", "state:inspector-open"],
  },
  "sh-myth": {
    title: ["attribute:title", "slot:title", "part:title"],
    path: ["attribute:path", "slot:path", "part:path"],
    kind: ["attribute:kind", "slot:kind", "part:kind"],
    limbs: ["slot:default", "slot:limbs", "part:limbs"],
  },
};

const allDeclarations = [];
for (const relativePath of manifestPaths) {
  const manifest = JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
  allDeclarations.push(...componentDeclarations(manifest));
}

for (const [tagName, expectedNodes] of Object.entries(requiredTopology)) {
  const declaration = allDeclarations.find((candidate) => candidate.tagName === tagName);
  if (!declaration) {
    fail(tagName, "sentinel component is missing");
    continue;
  }
  const nodes = new Map(declaration.mash.nodes.map((node) => [node.id, node]));
  for (const [id, expectedBindings] of Object.entries(expectedNodes)) {
    const node = nodes.get(id);
    if (!node) {
      fail(tagName, `sentinel node ${id} is missing`);
      continue;
    }
    const actual = new Set(
      node.bindings.map((binding) => `${binding.kind}:${binding.name || "default"}`),
    );
    for (const binding of expectedBindings) {
      if (!actual.has(binding)) fail(tagName, `node ${id} is missing ${binding}`);
    }
  }
}

if (problems.length > 0) {
  console.error("\nMash contract validation failed:\n");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("");
  process.exit(1);
}

console.log(
  `Mash contract valid: ${allDeclarations.length} components, ${MASH_CONTRACT_VERSION}, ` +
    "semantic topology and renderer-neutral bindings verified.",
);
