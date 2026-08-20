#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { format } from "prettier";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CHECK = process.argv.includes("--check");
const OUTPUT = path.join(ROOT, "adapters/gpui/contracts/mash-runtime.json");
const read = async (relative) => JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));

const [components, behaviors, tokens, parity, presentationSupport, uiCatalogue, shrineCatalogue] =
  await Promise.all([
    read("packages/conformance/fixtures/surface-tree.json"),
    read("packages/conformance/fixtures/behaviors.json"),
    read("packages/tokens/dist/tokens.json"),
    read("docs/gpui-base-parity.json"),
    read("adapters/gpui/presentation-support.json"),
    read("packages/components/src/catalogue/mash.json"),
    read("packages/shrine-components/src/catalogue/mash.json"),
  ]);

const portableCatalogue = (name, catalogue) => ({
  name,
  version: catalogue.version,
  layoutContract: catalogue.layoutContract,
  presentationContract: catalogue.presentationContract,
  nodes: catalogue.nodes,
  rules: catalogue.rules
    .filter(({ when }) => !when.conditions.some((condition) => condition.kind === "renderer"))
    .map(({ targets, when, parameters, presentation, layout }) => ({
      targets,
      conditions: when.conditions,
      ...(parameters ? { parameters } : {}),
      presentation,
      ...(layout ? { layout } : {}),
    })),
});

const runtime = {
  $schema: "https://mash.axsys.dev/schema/gpui-adapter-runtime-1.0.0.json",
  version: "1.0.0",
  componentContract: components.componentContract,
  gpuiBase: {
    repository: parity.source.repository,
    revision: parity.source.revision,
    primitives: parity.primitives.map(({ slug, web, evidence }) => ({
      slug,
      components: web.map(({ tag }) => tag),
      behaviors: evidence.behaviors,
    })),
  },
  components: components.components,
  behaviors: behaviors.fixtures,
  tokens,
  presentationSupport,
  catalogues: [portableCatalogue("ui", uiCatalogue), portableCatalogue("shrine", shrineCatalogue)],
};

const componentByTag = new Map(runtime.components.map((component) => [component.tag, component]));
const nodeAddresses = new Set(
  runtime.components.flatMap((component) => component.nodes.map((node) => node.address)),
);
const catalogueTraits = new Set(
  runtime.catalogues.flatMap((catalogue) =>
    catalogue.rules.flatMap((rule) => Object.keys(rule.presentation)),
  ),
);
const styledTraits = new Set(runtime.presentationSupport.styled);
const specializedTraits = new Set(Object.values(runtime.presentationSupport.specialized).flat());
for (const trait of catalogueTraits) {
  if (!styledTraits.has(trait) && !specializedTraits.has(trait)) {
    throw new Error(`GPUI adapter has no realization owner for presentation trait ${trait}.`);
  }
}
for (const trait of [...styledTraits, ...specializedTraits]) {
  if (!catalogueTraits.has(trait)) {
    throw new Error(`GPUI presentation support contains unused trait ${trait}.`);
  }
}
for (const trait of styledTraits) {
  if (specializedTraits.has(trait)) {
    throw new Error(`GPUI presentation trait ${trait} has two realization owners.`);
  }
}
for (const primitive of runtime.gpuiBase.primitives) {
  for (const component of primitive.components) {
    if (!componentByTag.has(component)) {
      throw new Error(`GPUI Base ${primitive.slug} maps unknown Mash component ${component}.`);
    }
  }
}
for (const catalogue of runtime.catalogues) {
  for (const rule of catalogue.rules) {
    for (const target of rule.targets) {
      if (!nodeAddresses.has(target))
        throw new Error(`GPUI recipe targets unknown node ${target}.`);
    }
    for (const condition of rule.conditions) {
      if (condition.kind === "node" && !nodeAddresses.has(condition.nodeAddress)) {
        throw new Error(`GPUI recipe condition targets unknown node ${condition.nodeAddress}.`);
      }
    }
    for (const parameter of Object.keys(rule.parameters ?? {})) {
      if (!parameter.startsWith("--_")) {
        throw new Error(`GPUI recipe exposes non-private CSS parameter ${parameter}.`);
      }
    }
  }
}
for (const fixture of runtime.behaviors) {
  const component = componentByTag.get(fixture.component);
  if (!component) throw new Error(`Behavior ${fixture.id} targets unknown ${fixture.component}.`);
  for (const expected of fixture.expects) {
    if (!component.events.some((event) => event.nodeAddress.endsWith(`/node/${expected.event}`))) {
      throw new Error(`Behavior ${fixture.id} expects unknown event node ${expected.event}.`);
    }
  }
}
if (runtime.catalogues.some((catalogue) => JSON.stringify(catalogue).includes('"web"'))) {
  throw new Error("The GPUI runtime contract must not embed Web selectors or declarations.");
}
const next = await format(JSON.stringify(runtime), { parser: "json" });

if (CHECK) {
  const current = await readFile(OUTPUT, "utf8").catch(() => "");
  if (current !== next) {
    throw new Error("GPUI adapter contract is stale. Run pnpm build:gpui-contracts.");
  }
  console.log(
    `gpui adapter: ${runtime.components.length} components, ${runtime.gpuiBase.primitives.length} gpui-base primitives, and ${runtime.behaviors.length} behaviors are current`,
  );
} else {
  await writeFile(OUTPUT, next);
  console.log(
    `gpui adapter: wrote ${runtime.components.length} components and ${runtime.catalogues.reduce((sum, catalogue) => sum + catalogue.rules.length, 0)} recipe rules`,
  );
}
