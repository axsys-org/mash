#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const registryPath = path.join(ROOT, "docs/gpui-base-parity.json");
const manifestPath = path.join(ROOT, "packages/components/custom-elements.json");
const cataloguePath = path.join(ROOT, "packages/components/src/catalogue/mash.json");
const expectedRevision = "b77f352589503a114cdf709507c0738a88e28364";
const expectedSlugs = [
  "accordion",
  "alert-dialog",
  "avatar",
  "button",
  "calendar",
  "checkbox",
  "collapsible",
  "color-picker",
  "combobox",
  "date-picker",
  "dialog",
  "editor",
  "hover-card",
  "input",
  "link",
  "number-input",
  "otp-input",
  "pagination",
  "popover",
  "popup",
  "progress",
  "radio",
  "radio-group",
  "resizable",
  "scrollbar",
  "select",
  "sheet",
  "slider",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toast",
  "toggle",
  "toggle-group",
  "tooltip",
  "tree",
  "virtual-list",
];

const [registry, manifest, catalogue] = await Promise.all(
  [registryPath, manifestPath, cataloguePath].map(async (file) =>
    JSON.parse(await readFile(file, "utf8")),
  ),
);
const declarations = new Map();
const modules = new Map();
for (const module of manifest.modules ?? []) {
  for (const declaration of module.declarations ?? []) {
    if (!declaration.customElement || !declaration.tagName) continue;
    declarations.set(declaration.tagName, declaration);
    modules.set(declaration.tagName, module.path);
  }
}
const errors = [];

if (registry.source?.revision !== expectedRevision) {
  errors.push(`expected pinned GPUI Base revision ${expectedRevision}`);
}

const slugs = registry.primitives?.map((primitive) => primitive.slug) ?? [];
if (new Set(slugs).size !== slugs.length) errors.push("primitive slugs must be unique");
if (JSON.stringify(slugs) !== JSON.stringify(expectedSlugs)) {
  errors.push("registry must contain the pinned 38-primitive catalogue in source order");
}

for (const primitive of registry.primitives ?? []) {
  if (!["missing", "partial", "aligned"].includes(primitive.status)) {
    errors.push(`${primitive.slug}: invalid status ${primitive.status}`);
  }
  if (primitive.status === "missing" && primitive.web.length > 0) {
    errors.push(`${primitive.slug}: missing primitives cannot declare Web realizations`);
  }
  if (primitive.status !== "missing" && primitive.web.length === 0) {
    errors.push(`${primitive.slug}: ${primitive.status} primitives need a Web realization`);
  }

  for (const realization of primitive.web) {
    if (!["component", "alias", "node"].includes(realization.kind)) {
      errors.push(`${primitive.slug}: invalid realization kind ${realization.kind}`);
      continue;
    }
    const declaration = declarations.get(realization.tag);
    if (!declaration) {
      errors.push(`${primitive.slug}: missing custom element ${realization.tag}`);
      continue;
    }
    if (realization.kind === "node") {
      const node = declaration.mash?.nodes?.find((candidate) => candidate.id === realization.node);
      if (!node)
        errors.push(`${primitive.slug}: ${realization.tag} has no ${realization.node} node`);
    }
  }

  if (primitive.status !== "aligned") continue;
  const evidence = primitive.evidence;
  if (!evidence || typeof evidence !== "object") {
    errors.push(`${primitive.slug}: aligned primitives need evidence`);
    continue;
  }
  if (!Array.isArray(evidence.upstream) || evidence.upstream.length === 0) {
    errors.push(`${primitive.slug}: aligned primitives need pinned upstream source paths`);
  }
  if (!Array.isArray(evidence.behaviors) || evidence.behaviors.length === 0) {
    errors.push(`${primitive.slug}: aligned primitives need named behavior coverage`);
  }
  if (!Array.isArray(evidence.tests) || evidence.tests.length === 0) {
    errors.push(`${primitive.slug}: aligned primitives need renderer tests`);
  } else {
    for (const test of evidence.tests) {
      try {
        await readFile(path.join(ROOT, test), "utf8");
      } catch {
        errors.push(`${primitive.slug}: missing evidence test ${test}`);
      }
    }
  }
  if (!Array.isArray(evidence.examples) || evidence.examples.length === 0) {
    errors.push(`${primitive.slug}: aligned primitives need catalogue examples`);
  } else {
    for (const example of evidence.examples) {
      const declaration = declarations.get(example.tag);
      if (!(declaration?.examples ?? []).some((candidate) => candidate.name === example.name)) {
        errors.push(`${primitive.slug}: missing ${example.tag} example ${example.name}`);
      }
    }
  }

  for (const realization of primitive.web) {
    const declaration = declarations.get(realization.tag);
    if (!declaration) continue;
    const addresses =
      realization.kind === "node"
        ? [declaration.mash?.nodes?.find((candidate) => candidate.id === realization.node)?.address]
        : (declaration.mash?.nodes ?? [])
            .filter((node) => node.bindings?.some((binding) => binding.kind === "part"))
            .map((node) => node.address);
    if (!addresses.some((address) => catalogue.nodes?.[address]?.coverage === "direct")) {
      errors.push(`${primitive.slug}: ${realization.tag} lacks direct Mash catalogue proof`);
    }
    if (evidence.headless === "token-free") {
      const modulePath = modules.get(realization.tag);
      if (!modulePath) continue;
      const source = await readFile(path.join(ROOT, "packages/components", modulePath), "utf8");
      if (/var\(--/.test(source)) {
        errors.push(`${primitive.slug}: ${realization.tag} embeds visual token styling`);
      }
    }
  }
}

if (process.argv.includes("--strict")) {
  for (const primitive of registry.primitives ?? []) {
    if (primitive.status !== "aligned") errors.push(`${primitive.slug}: ${primitive.status}`);
  }
}

if (errors.length > 0) {
  console.error(`GPUI Base parity registry: ${errors.length} error(s)`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exitCode = 1;
} else {
  const counts = registry.primitives.reduce((result, primitive) => {
    result[primitive.status] = (result[primitive.status] ?? 0) + 1;
    return result;
  }, {});
  console.log(
    `GPUI Base parity registry: ${registry.primitives.length} pinned primitives — ${counts.aligned ?? 0} aligned, ${counts.partial ?? 0} partial, ${counts.missing ?? 0} missing.`,
  );
}
