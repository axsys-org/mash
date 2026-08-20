#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MASH_LAYOUT_VERSION,
  MASH_LAYOUT_VOCABULARY,
  mashLayoutFromDeclarations,
  mashLayoutValue,
} from "./mash-layout.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const tokenMap = new Map([
  ["--space-test", "space.test"],
  ["--layout-test", "layout.test"],
]);
const tokensFor = (value) =>
  [...value.matchAll(/var\((--[\w-]+)/g)].map((match) => tokenMap.get(match[1])).filter(Boolean);

assert.deepEqual(mashLayoutValue("var(--space-test)", tokensFor), {
  kind: "token",
  token: "space.test",
  value: "var(--space-test)",
  tokens: ["space.test"],
});
assert.equal(mashLayoutValue("max-content", tokensFor).kind, "literal");
assert.equal(mashLayoutValue("minmax(var(--layout-test), 1fr)", tokensFor).kind, "expression");
assert.equal(mashLayoutValue("inherit", tokensFor).kind, "inherited");

const fixture = mashLayoutFromDeclarations(
  {
    display: "flex",
    "flex-direction": "column-reverse",
    "flex-wrap": "wrap-reverse",
    "align-items": "flex-end",
    "justify-content": "center",
    "min-inline-size": "var(--layout-test)",
    height: "inherit",
    position: "absolute",
    "inset-inline-start": "calc(var(--space-test) * 2)",
  },
  tokensFor,
);
assert.equal(fixture.group.orientation, "block");
assert.equal(fixture.group.reverse, true);
assert.equal(fixture.group.wrap, "reverse");
assert.equal(fixture.align, "trailing");
assert.equal(fixture.distribute, "center");
assert.equal(fixture.dimensions.inline.min.kind, "token");
assert.equal(fixture.dimensions.block.ideal.kind, "inherited");
assert.equal(fixture.anchor.mode, "absolute");
assert.equal(fixture.anchor.inlineStart.kind, "expression");

const obsoleteKeys = new Set(["axis", "justify", "placement", "position", "preferred"]);
const valueKinds = new Set(MASH_LAYOUT_VOCABULARY.valueKinds);
let valueCount = 0;

function inspect(value, trail) {
  if (!value || typeof value !== "object") return;
  if (!Array.isArray(value) && "value" in value && "tokens" in value) {
    valueCount += 1;
    assert(valueKinds.has(value.kind), `${trail} has unknown value kind ${value.kind}`);
    assert.equal(typeof value.value, "string", `${trail} has no string value`);
    assert(Array.isArray(value.tokens), `${trail} has no token provenance`);
    if (value.kind === "token") {
      assert.equal(typeof value.token, "string", `${trail} has no direct token`);
      assert(value.tokens.includes(value.token), `${trail} direct token is absent from provenance`);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assert(!obsoleteKeys.has(key), `${trail} still uses obsolete layout key ${key}`);
    inspect(child, `${trail}.${key}`);
  }
}

for (const relative of [
  "packages/components/src/catalogue/mash.json",
  "packages/shrine-components/src/catalogue/mash.json",
]) {
  const catalogue = JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));
  assert.equal(catalogue.layoutContract, MASH_LAYOUT_VERSION, `${relative} layout version`);
  assert.deepEqual(catalogue.layoutVocabulary, MASH_LAYOUT_VOCABULARY, `${relative} vocabulary`);
  catalogue.rules.forEach((rule, index) => inspect(rule.layout, `${relative} rule ${index}`));
}

assert(valueCount > 0, "generated catalogues contain no typed layout values");
console.log(`layout contract ${MASH_LAYOUT_VERSION}: ${valueCount} typed values are current`);
