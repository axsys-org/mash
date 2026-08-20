#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  MASH_LAYOUT_VERSION,
  MASH_LAYOUT_VOCABULARY,
  mashLayoutFromDeclarations,
} from "./mash-layout.mjs";
import {
  MASH_PRESENTATION_VERSION,
  MASH_PRESENTATION_VOCABULARY,
  mashPresentationFromDeclarations,
} from "./mash-presentation.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CHECK = process.argv.includes("--check");
const RECIPE_SCHEMA = "https://mash.axsys.dev/schema/catalogue-recipe-1.0.0.json";

const packages = [
  {
    manifest: "packages/components/custom-elements.json",
    css: "packages/components/src/catalogue/mash.css",
    output: "packages/components/src/catalogue/mash.json",
  },
  {
    manifest: "packages/shrine-components/custom-elements.json",
    css: "packages/shrine-components/src/catalogue/mash.css",
    output: "packages/shrine-components/src/catalogue/mash.json",
  },
];

const tokenGraph = JSON.parse(
  await readFile(path.join(ROOT, "packages/tokens/dist/tokens.json"), "utf8"),
);
const tokenByVariable = new Map(
  Object.values(tokenGraph.tokens).map((token) => [token.cssVar, token.id]),
);
const tokenIds = new Set(Object.keys(tokenGraph.tokens));

function declarations(source) {
  const found = {};
  for (const match of source.matchAll(/(^|;)\s*([\w-]+)\s*:\s*([^;{}]+)(?=;|$)/g)) {
    found[match[2]] = match[3].trim();
  }
  return found;
}

function splitSelectors(source) {
  const selectors = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth -= 1;
    else if (char === "," && depth === 0) {
      selectors.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(source.slice(start).trim());
  return selectors.filter(Boolean);
}

function cssRules(source, context = []) {
  const found = [];
  let cursor = 0;
  while (cursor < source.length) {
    const open = source.indexOf("{", cursor);
    if (open === -1) break;
    const prelude = source.slice(cursor, open).trim();
    let depth = 1;
    let close = open + 1;
    while (close < source.length && depth > 0) {
      if (source[close] === "{") depth += 1;
      else if (source[close] === "}") depth -= 1;
      close += 1;
    }
    const body = source.slice(open + 1, close - 1);
    if (/^@(layer|media|supports|container)\b/.test(prelude)) {
      found.push(...cssRules(body, [...context, prelude]));
    } else if (!prelude.startsWith("@")) {
      found.push({ selectors: splitSelectors(prelude), declarations: declarations(body), context });
    }
    cursor = close;
  }
  return found;
}

function componentDeclarations(manifest) {
  return (manifest.modules ?? [])
    .flatMap((module) => module.declarations ?? [])
    .filter((declaration) => declaration.customElement && declaration.tagName && declaration.mash);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ownerFor(source, declarationsByTag) {
  let owner;
  let ownerIndex = -1;
  for (const [tagName, declaration] of declarationsByTag) {
    for (const occurrence of source.matchAll(new RegExp(escapeRegExp(tagName), "g"))) {
      const index = occurrence.index ?? -1;
      const before = source[index - 1];
      const after = source[index + tagName.length];
      if ((before && /[\w-]/.test(before)) || (after && /[\w-]/.test(after))) continue;
      if (index > ownerIndex) {
        owner = declaration;
        ownerIndex = index;
      }
    }
  }
  return owner;
}

function rootAddress(declaration) {
  const root = declaration?.mash.nodes.find((node) => node.id === "root" || node.role === "root");
  return root?.address ?? declaration?.mash.address;
}

function targetsFor(selector, declarationsByTag) {
  const targets = new Set();
  const partMatches = [...selector.matchAll(/::part\(([^)]+)\)/g)];
  if (partMatches.length > 0) {
    for (const match of partMatches) {
      const owner = ownerFor(selector.slice(0, match.index), declarationsByTag);
      if (!owner) continue;
      const binding = owner.mash.bindings.find(
        (candidate) => candidate.kind === "part" && candidate.name === match[1],
      );
      if (!binding) {
        throw new Error(
          `${owner.tagName} recipe targets undocumented part ${match[1]} in ${selector}`,
        );
      }
      targets.add(binding.nodeAddress);
    }
    return [...targets].sort();
  }

  const owner = ownerFor(selector, declarationsByTag);
  if (!owner) return [];
  const slotMatch = selector.match(/\[slot=["']([^"']+)["']\]/);
  if (slotMatch) {
    const slotOwner = ownerFor(selector.slice(0, slotMatch.index), declarationsByTag) ?? owner;
    const binding = slotOwner.mash.bindings.find(
      (candidate) => candidate.kind === "slot" && candidate.name === slotMatch[1],
    );
    if (!binding) {
      throw new Error(
        `${slotOwner.tagName} recipe targets undocumented slot ${slotMatch[1]} in ${selector}`,
      );
    }
    targets.add(binding.nodeAddress);
  } else {
    targets.add(rootAddress(owner));
  }
  return [...targets].sort();
}

function conditionsFor(selector, context, declarationsByTag) {
  const owner = ownerFor(selector.split("::part(")[0], declarationsByTag);
  const conditions = [];
  const append = (condition) => {
    if (!conditions.some((candidate) => JSON.stringify(candidate) === JSON.stringify(condition))) {
      conditions.push(condition);
    }
  };
  const nodeFor = (name) =>
    owner?.mash.nodes.find((node) => node.id === name || node.role === name)?.address;

  for (const match of selector.matchAll(/\[([a-z][\w-]*)(?:([\^$*]?=)["']([^"']*)["'])?\]/g)) {
    const [, name, rawOperator, value] = match;
    if (name === "data-mash-catalogue" || name === "slot") continue;
    const negative = selector.includes(`:not(${match[0]})`);
    if (name === "data-mash-toolbar-dock") {
      append({
        kind: "context",
        name: "dock",
        operator: negative ? "absent" : rawOperator ? "equals" : "present",
        ...(value !== undefined ? { value } : {}),
      });
      continue;
    }
    const semanticName = name.startsWith("aria-") ? name.slice(5) : name;
    const nodeAddress = nodeFor(semanticName);
    if (!nodeAddress) {
      append({ kind: "renderer", renderer: "web", selector: match[0] });
      continue;
    }
    const operators = { "^=": "starts-with", "$=": "ends-with", "*=": "contains" };
    append({
      kind: "node",
      nodeAddress,
      operator: negative ? "falsy" : rawOperator ? (operators[rawOperator] ?? "equals") : "truthy",
      ...(value !== undefined ? { value } : {}),
    });
  }

  for (const match of selector.matchAll(/:state\(([a-z][\w-]*)\)/g)) {
    const nodeAddress = nodeFor(match[1]);
    if (!nodeAddress) {
      append({ kind: "renderer", renderer: "web", selector: match[0] });
      continue;
    }
    append({
      kind: "node",
      nodeAddress,
      operator: selector.includes(`:not(${match[0]})`) ? "falsy" : "truthy",
    });
  }

  for (const match of selector.matchAll(
    /:(focus-visible|focus-within|hover|active|disabled|checked)\b/g,
  )) {
    const name = match[1];
    if (name === "disabled" || name === "checked") {
      const nodeAddress = nodeFor(name);
      if (nodeAddress) {
        append({
          kind: "node",
          nodeAddress,
          operator: selector.includes(`:not(:${name})`) ? "falsy" : "truthy",
        });
        continue;
      }
    }
    append({
      kind: "interaction",
      state: name,
      active: !selector.includes(`:not(:${name})`),
    });
  }

  for (const match of selector.matchAll(/:dir\((rtl|ltr)\)/g)) {
    append({ kind: "environment", feature: "direction", value: match[1] });
  }

  if (selector.includes("::-webkit-scrollbar")) {
    append({ kind: "renderer", renderer: "web", selector: "::-webkit-scrollbar" });
  }

  for (const query of context) {
    const reducedMotion = query.match(/prefers-reduced-motion:\s*(reduce|no-preference)/);
    if (reducedMotion) {
      append({ kind: "environment", feature: "reduced-motion", value: reducedMotion[1] });
      continue;
    }
    const forcedColors = query.match(/forced-colors:\s*(active|none)/);
    if (forcedColors) {
      append({ kind: "environment", feature: "forced-colors", value: forcedColors[1] });
      continue;
    }
    const maxInline = query.match(/max-width:\s*([^)]+)/);
    if (maxInline) {
      append({ kind: "environment", feature: "viewport-inline-max", value: maxInline[1].trim() });
    }
  }

  return conditions;
}

function variableReferences(value) {
  return [...value.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1]);
}

function requireLayoutTokens(layout, selector, trail = "layout") {
  if (!layout || typeof layout !== "object") return;
  if ("value" in layout && "tokens" in layout) {
    const fixedMeasure =
      layout.value === "0" || /(^|[^\w.-])\d*\.?\d+(?:px|rem|em)(?=$|[^\w-])/.test(layout.value);
    if (fixedMeasure && layout.tokens.length === 0) {
      throw new Error(`${selector} has untokenized ${trail} measure ${layout.value}`);
    }
    return;
  }
  for (const [key, child] of Object.entries(layout)) {
    requireLayoutTokens(child, selector, `${trail}.${key}`);
  }
}

for (const packageConfig of packages) {
  const manifest = JSON.parse(await readFile(path.join(ROOT, packageConfig.manifest), "utf8"));
  const source = (await readFile(path.join(ROOT, packageConfig.css), "utf8")).replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const parsedRules = cssRules(source);
  const declarationList = componentDeclarations(manifest);
  const declarationsByTag = new Map(
    declarationList.map((declaration) => [declaration.tagName, declaration]),
  );

  const internalVariables = new Map();
  for (const rule of parsedRules) {
    for (const [property, value] of Object.entries(rule.declarations)) {
      if (!property.startsWith("--_")) continue;
      const current = internalVariables.get(property) ?? new Set();
      for (const variable of variableReferences(value)) current.add(variable);
      internalVariables.set(property, current);
    }
  }

  const tokensFor = (value, seen = new Set()) => {
    const tokens = new Set();
    for (const variable of variableReferences(value)) {
      const token = tokenByVariable.get(variable);
      if (token) tokens.add(token);
      if (!seen.has(variable) && internalVariables.has(variable)) {
        const nextSeen = new Set(seen).add(variable);
        for (const nested of internalVariables.get(variable)) {
          for (const nestedToken of tokensFor(`var(${nested})`, nextSeen)) tokens.add(nestedToken);
        }
      }
    }
    return [...tokens].sort();
  };

  const recipeRules = [];
  const nodeTokens = new Map(
    declarationList.flatMap((declaration) =>
      declaration.mash.nodes.map((node) => [node.address, new Set()]),
    ),
  );
  const nodeRuleCounts = new Map([...nodeTokens.keys()].map((address) => [address, 0]));
  const nodeLayoutCounts = new Map([...nodeTokens.keys()].map((address) => [address, 0]));
  for (const rule of parsedRules) {
    if (Object.keys(rule.declarations).length === 0) continue;
    for (const selector of rule.selectors) {
      const targets = targetsFor(selector, declarationsByTag);
      if (targets.length === 0) continue;
      const realized = Object.fromEntries(
        Object.entries(rule.declarations).map(([property, value]) => [
          property,
          { value, tokens: tokensFor(value) },
        ]),
      );
      const layout = mashLayoutFromDeclarations(rule.declarations, tokensFor);
      const presentation = mashPresentationFromDeclarations(rule.declarations, tokensFor);
      const parameters = Object.fromEntries(
        Object.entries(realized).filter(([property]) => property.startsWith("--_")),
      );
      requireLayoutTokens(layout, selector);
      recipeRules.push({
        targets,
        when: {
          conditions: conditionsFor(selector, rule.context, declarationsByTag),
          web: { selector, context: rule.context },
        },
        ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
        presentation,
        declarations: realized,
        ...(layout ? { layout } : {}),
      });
      for (const target of targets) {
        const tokens = nodeTokens.get(target) ?? new Set();
        for (const declaration of Object.values(realized)) {
          for (const token of declaration.tokens) tokens.add(token);
        }
        nodeTokens.set(target, tokens);
        nodeRuleCounts.set(target, (nodeRuleCounts.get(target) ?? 0) + 1);
        if (layout) nodeLayoutCounts.set(target, (nodeLayoutCounts.get(target) ?? 0) + 1);
      }
    }
  }

  const output = {
    $schema: RECIPE_SCHEMA,
    version: "1.0.0",
    name: "mash",
    componentContract: manifest.mash.version,
    layoutContract: MASH_LAYOUT_VERSION,
    layoutVocabulary: MASH_LAYOUT_VOCABULARY,
    presentationContract: MASH_PRESENTATION_VERSION,
    presentationVocabulary: MASH_PRESENTATION_VOCABULARY,
    source: `./${path.basename(packageConfig.css)}`,
    nodes: Object.fromEntries(
      [...nodeTokens]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([address, tokens]) => [
          address,
          {
            tokens: [...tokens].sort(),
            coverage: nodeRuleCounts.get(address) ? "direct" : "contract-only",
            layout: nodeLayoutCounts.get(address) ? "constrained" : "unconstrained",
          },
        ]),
    ),
    rules: recipeRules,
  };

  const nodeAddresses = new Set(
    declarationList.flatMap((declaration) => declaration.mash.nodes.map((node) => node.address)),
  );
  for (const rule of output.rules) {
    for (const target of rule.targets) {
      if (!nodeAddresses.has(target))
        throw new Error(`Catalogue rule targets unknown node ${target}.`);
    }
    for (const condition of rule.when.conditions) {
      if (condition.kind === "node" && !nodeAddresses.has(condition.nodeAddress)) {
        throw new Error(`Catalogue condition targets unknown node ${condition.nodeAddress}.`);
      }
    }
    const publicDeclarations = Object.keys(rule.declarations).filter(
      (property) => !property.startsWith("--_"),
    );
    const parameterDeclarations = Object.keys(rule.declarations).filter((property) =>
      property.startsWith("--_"),
    );
    if (
      parameterDeclarations.length !== Object.keys(rule.parameters ?? {}).length ||
      parameterDeclarations.some((property) => !(property in (rule.parameters ?? {})))
    ) {
      throw new Error(
        `Catalogue rule ${rule.when.web.selector} has incomplete portable parameters.`,
      );
    }
    if (Object.keys(rule.presentation).length !== publicDeclarations.length) {
      throw new Error(
        `Catalogue rule ${rule.when.web.selector} has incomplete presentation traits.`,
      );
    }
    for (const [trait, presentation] of Object.entries(rule.presentation)) {
      if (!MASH_PRESENTATION_VOCABULARY.aspects.includes(trait.split(".")[0])) {
        throw new Error(`Catalogue rule emits unknown presentation trait ${trait}.`);
      }
      if (!(presentation.sourceProperty in rule.declarations)) {
        throw new Error(`Catalogue trait ${trait} has no Web source declaration.`);
      }
      for (const token of presentation.tokens) {
        if (!tokenIds.has(token))
          throw new Error(`Catalogue trait ${trait} uses unknown token ${token}.`);
      }
    }
  }
  const rendered = `${JSON.stringify(output, null, 2)}\n`;
  const outputPath = path.join(ROOT, packageConfig.output);
  if (CHECK) {
    const current = await readFile(outputPath, "utf8").catch(() => "");
    if (current !== rendered) {
      console.error(
        `${packageConfig.output} is stale; run node scripts/build-catalogue-contract.mjs`,
      );
      process.exitCode = 1;
    }
  } else {
    await writeFile(outputPath, rendered);
    console.log(`Wrote ${packageConfig.output} (${recipeRules.length} rules).`);
  }
}
