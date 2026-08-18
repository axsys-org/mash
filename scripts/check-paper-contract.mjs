#!/usr/bin/env node
/**
 * Check Mash's generated token graph against the last reviewed Paper contract.
 *
 * Paper is intentionally reviewed through a supervised bridge: the agent reads
 * the current Paper token set, updates paper-contract.json and the DTCG source
 * in one PR, and this check prevents either side from drifting silently after
 * that review. It compares alias targets, never resolved literals, so the
 * provenance graph stays the thing under test.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const contractPath = path.join(ROOT, "packages/tokens/src/paper-contract.json");
const graphPath = path.join(ROOT, "packages/tokens/dist/tokens.json");

const [contract, graph] = await Promise.all(
  [contractPath, graphPath].map(async (file) => JSON.parse(await readFile(file, "utf8"))),
);

const byCssVar = new Map(Object.values(graph.tokens).map((token) => [token.cssVar, token]));
const errors = [];
let checked = 0;

for (const [theme, mappings] of Object.entries(contract.mappings ?? {})) {
  for (const [paperVar, expectedTarget] of Object.entries(mappings)) {
    // Paper's dark-prefixed names map to Mash's shared semantic name under the
    // dark theme. Light names already use the shared semantic name directly.
    const mashVar = paperVar.startsWith("--color-dark-")
      ? `--color-${paperVar.slice("--color-dark-".length)}`
      : paperVar;
    const token = byCssVar.get(mashVar);
    checked += 1;

    if (!token) {
      errors.push(`${theme} ${paperVar}: Mash does not define ${mashVar}`);
      continue;
    }

    const actualTarget = token.aliasOf?.[theme];
    if (actualTarget !== expectedTarget) {
      errors.push(
        `${theme} ${paperVar}: expected ${expectedTarget}, found ${actualTarget ?? "no alias"}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(
    `paper contract: ${errors.length} mismatch(es) against ${contract.source.contentHash}`,
  );
  for (const error of errors) console.error(`  - ${error}`);
  console.error("Refresh the Paper snapshot and Mash DTCG sources together in a reviewed change.");
  process.exitCode = 1;
} else {
  console.log(
    `paper contract: ${checked} aliases match Paper ${contract.source.contentHash} (${contract.source.scope})`,
  );
}
