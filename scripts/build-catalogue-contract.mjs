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

function targetsFor(selector, declarationsByTag) {
  const targets = new Set();
  const partMatches = [...selector.matchAll(/::part\(([^)]+)\)/g)];
  if (partMatches.length > 0) {
    for (const match of partMatches) {
      const prefix = selector.slice(0, match.index);
      let owner;
      let ownerIndex = -1;
      for (const [tagName, declaration] of declarationsByTag) {
        for (const occurrence of prefix.matchAll(new RegExp(escapeRegExp(tagName), "g"))) {
          const index = occurrence.index ?? -1;
          const before = prefix[index - 1];
          const after = prefix[index + tagName.length];
          if ((before && /[\w-]/.test(before)) || (after && /[\w-]/.test(after))) continue;
          if (index > ownerIndex) {
            owner = declaration;
            ownerIndex = index;
          }
        }
      }
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
  } else {
    for (const [tagName, declaration] of declarationsByTag) {
      if (!new RegExp(`(^|[^\\w-])${escapeRegExp(tagName)}(?=$|[^\\w-])`).test(selector)) continue;
      const root = declaration.mash.nodes.find(
        (node) => node.id === "root" || node.role === "root",
      );
      targets.add(root?.address ?? declaration.mash.address);
    }
  }
  return [...targets].sort();
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
      requireLayoutTokens(layout, selector);
      recipeRules.push({
        targets,
        when: { renderer: "web", selector, context: rule.context },
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
