import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { expect, test } from "@playwright/test";

const repoRoot = resolve(import.meta.dirname, "../../..");
const bundle = resolve(repoRoot, "apps/catalog/dist/mash.js");
const packageSources = [
  resolve(repoRoot, "packages/components/src"),
  resolve(repoRoot, "packages/shrine-components/src"),
];

function sourceFiles(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (entry.isFile()) files.push(path);
  }

  return files;
}

function registeredTags(): string[] {
  const tags = new Set<string>();

  for (const root of packageSources) {
    for (const file of sourceFiles(root).filter((path) => path.endsWith("register.ts"))) {
      const source = readFileSync(file, "utf8");
      for (const block of source.matchAll(/interface\s+HTMLElementTagNameMap\s*{([\s\S]*?)}/g)) {
        for (const tag of block[1]!.matchAll(/"([^"]+)":/g)) tags.add(tag[1]!);
      }
    }
  }

  return [...tags].sort();
}

function publicValueExports(): string[] {
  const exports = new Set<string>();
  const seen = new Set<string>();

  collectValueExports(resolve(repoRoot, "packages/components/src/index.ts"), exports, seen);
  collectValueExports(resolve(repoRoot, "packages/shrine-components/src/index.ts"), exports, seen);

  return [...exports].sort();
}

function collectValueExports(file: string, exports: Set<string>, seen: Set<string>): void {
  const path = file.replace(/\.js$/, ".ts");
  if (seen.has(path)) return;
  seen.add(path);

  const source = readFileSync(path, "utf8");

  for (const statement of source.matchAll(/export\s+{([\s\S]*?)}\s+from\s+"([^"]+)";/g)) {
    for (const specifier of statement[1]!.split(",")) {
      const name = exportedName(specifier);
      if (name) exports.add(name);
    }
  }

  for (const statement of source.matchAll(/export\s+\*\s+from\s+"([^"]+)";/g)) {
    collectValueExports(
      resolve(dirname(path), statement[1]!.replace(/\.js$/, ".ts")),
      exports,
      seen,
    );
  }
}

function exportedName(specifier: string): string | null {
  const name = specifier.trim();
  if (!name || name.startsWith("type ")) return null;
  return (
    name
      .split(/\s+as\s+/)
      .at(-1)
      ?.trim() || null
  );
}

const expectedTags = registeredTags();
const expectedGlobalExports = publicValueExports();

test.describe("single-file browser distribution", () => {
  test("registers every element and installs its token styles", async ({ page }) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));

    await page.setContent(`
      <!doctype html>
      <html>
        <head></head>
        <body><ui-button>Bundled button</ui-button></body>
      </html>
    `);
    await page.addScriptTag({ path: bundle });
    await page.addScriptTag({ path: bundle });

    const report = await page.evaluate((tags) => {
      return {
        defined: tags.filter((tag) => customElements.get(tag)).sort(),
        globalExports: Object.keys(
          (globalThis as typeof globalThis & { Mash?: object }).Mash ?? {},
        ).sort(),
        styleCount: document.head.querySelectorAll("style[data-mash-tokens]").length,
        hasActionToken: Array.from(
          document.head.querySelectorAll<HTMLStyleElement>("style[data-mash-tokens]"),
        ).some((style) => style.textContent?.includes("--color-action")),
      };
    }, expectedTags);

    expect(failures).toEqual([]);
    expect(report.defined).toEqual(expectedTags);
    expect(report.globalExports).toEqual(expectedGlobalExports);
    expect(report.styleCount).toBe(1);
    expect(report.hasActionToken).toBe(true);
  });
});
