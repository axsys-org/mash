#!/usr/bin/env node
/**
 * Scaffold a new component.
 *
 *   pnpm new:component <package> <tag-name> [--class <ClassName>]
 *   pnpm new:component shrine-components shrine-banner
 *
 * Writes the definition, the registration module and a smoke test, then wires
 * the component into the package's barrels and `exports` map.
 *
 * The wiring is the point. Everything it generates you could type in a minute;
 * what actually goes wrong is forgetting one of the four places a component has
 * to be registered — and the `exports` entry in particular fails silently, since
 * nothing in the build checks that a component you shipped is reachable.
 *
 * Never overwrites a file that already has content. Re-running it after a partial
 * hand-written start fills in only what is missing and reports what it skipped.
 */

import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const die = (message) => {
  console.error(`\nnew:component — ${message}\n`);
  process.exit(1);
};

const isFile = (p) =>
  stat(p).then(
    (s) => s.isFile(),
    () => false,
  );

/** Only rewrite files that are absent or empty; a half-written file is still the author's. */
async function hasContent(p) {
  try {
    const s = await stat(p);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}

// --- arguments -------------------------------------------------------------

const args = process.argv.slice(2);
const flagIndex = args.indexOf("--class");
const classOverride = flagIndex === -1 ? null : args[flagIndex + 1];
const [packageArg, tag] = args.filter(
  (_value, i) => flagIndex === -1 || (i !== flagIndex && i !== flagIndex + 1),
);

if (!packageArg || !tag) {
  die("usage: pnpm new:component <package> <tag-name> [--class <ClassName>]");
}

// Custom element names must contain a hyphen. Enforcing it here beats finding
// out from `customElements.define` at runtime.
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(tag)) {
  die(`"${tag}" is not a valid custom element name — lowercase, and it must contain a hyphen.`);
}

// `shrine-confirm` lives in `src/confirm/`, `ui-button` in `src/button/`: the
// tag prefix names the package, so the directory drops it.
const dirName = tag.slice(tag.indexOf("-") + 1);

const pascal = (value) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const className = classOverride ?? pascal(tag);

// --- locate the package ----------------------------------------------------

async function resolvePackage(hint) {
  const packagesDir = path.join(ROOT, "packages");
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const candidates = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(packagesDir, entry.name, "package.json");
    if (!(await isFile(manifestPath))) continue;

    const pkg = JSON.parse(await readFile(manifestPath, "utf8"));
    // Only packages that ship custom elements can receive one.
    if (!pkg.customElements) continue;

    candidates.push({ dir: entry.name, name: pkg.name, manifestPath, pkg });
  }

  const match = candidates.find(
    (c) => c.dir === hint || c.name === hint || c.name.split("/").pop() === hint,
  );

  if (!match) {
    die(
      `no component package matched "${hint}". Available: ` +
        candidates.map((c) => `${c.dir} (${c.name})`).join(", "),
    );
  }
  return match;
}

const target = await resolvePackage(packageArg);
const packageDir = path.join(ROOT, "packages", target.dir);
const componentDir = path.join(packageDir, "src", dirName);

// --- templates -------------------------------------------------------------

const definition = () => `import { LitElement, css, html, type TemplateResult } from "lit";

/**
 * TODO: what this component is for, and when to reach for it.
 *
 * @tag ${tag}
 * @summary TODO: one line describing what it does.
 *
 * @slot - TODO: describe the default slot.
 * @csspart root - The outermost element.
 */
export class ${className} extends LitElement {
  // Reactive properties go here, as a plain object — this system uses no
  // decorators. Declare the matching fields with \`declare\` and assign their
  // defaults in a constructor. Every attribute needs a JSDoc description, or
  // the manifest build fails.
  //
  // static override properties = {
  //   tone: { type: String, reflect: true },
  // };
  //
  // /** TODO: describe this attribute. */
  // declare tone: ${className}Tone;

  static override styles = css\`
    :host {
      display: block;
      box-sizing: border-box;
    }

    :host([hidden]) {
      display: none !important;
    }

    /* Style from the semantic tokens (--color-*, --space-*, --radius-*).
       Never reference --ref-* primitives, and keep anything you compute in a
       private --_* variable rather than exposing it. */
  \`;

  protected override render(): TemplateResult {
    return html\`<div part="root"><slot></slot></div>\`;
  }
}
`;

const registration = () => `import { ${className} } from "./${dirName}.js";

// If this component composes elements from another package, import their
// register modules here too, so that importing this one is sufficient:
//
//   import "@mash/ui/button/register";

if (!customElements.get("${tag}")) {
  customElements.define("${tag}", ${className});
}

declare global {
  interface HTMLElementTagNameMap {
    "${tag}": ${className};
  }
}

export { ${className} };
`;

const test = () => `import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { ${className} } from "./${dirName}.js";
import "./register.js";

describe("${tag}", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("${tag}")).toBe(${className});

    const el = await fixture<${className}>(\`<${tag}>content</${tag}>\`);
    expect(el).toBeInstanceOf(${className});
    expect(el.shadowRoot).not.toBeNull();
  });

  it("projects its default slot", async () => {
    const el = await fixture<${className}>(\`<${tag}>content</${tag}>\`);
    // \`slot:not([name])\` rather than \`slot\` — a component with named slots may
    // well render one of those first.
    const slot = inShadow<HTMLSlotElement>(el, "slot:not([name])");

    expect(
      slot
        .assignedNodes({ flatten: true })
        .map((node) => node.textContent?.trim())
        .join(""),
    ).toBe("content");
  });
});
`;

// --- write -----------------------------------------------------------------

const written = [];
const skipped = [];

await mkdir(componentDir, { recursive: true });

for (const [file, contents] of [
  [path.join(componentDir, `${dirName}.ts`), definition()],
  [path.join(componentDir, "register.ts"), registration()],
  [path.join(componentDir, `${dirName}.test.ts`), test()],
]) {
  if (await hasContent(file)) {
    skipped.push(path.relative(ROOT, file));
    continue;
  }
  await writeFile(file, contents);
  written.push(path.relative(ROOT, file));
}

/** Append a line to a barrel, unless an equivalent line is already there. */
async function appendOnce(file, line, match) {
  const source = await readFile(file, "utf8");
  if (match.test(source)) {
    skipped.push(`${path.relative(ROOT, file)} (already wired)`);
    return;
  }
  await writeFile(file, `${source.replace(/\n+$/, "")}\n${line}\n`);
  written.push(path.relative(ROOT, file));
}

await appendOnce(
  path.join(packageDir, "src", "index.ts"),
  `export { ${className} } from "./${dirName}/${dirName}.js";`,
  new RegExp(`from "\\./${dirName}/${dirName}\\.js"`),
);

await appendOnce(
  path.join(packageDir, "src", "register.ts"),
  `import "./${dirName}/register.js";`,
  new RegExp(`"\\./${dirName}/register\\.js"`),
);

// The exports map: the one piece of wiring nothing else in the build verifies.
const pkg = JSON.parse(await readFile(target.manifestPath, "utf8"));
if (pkg.exports[`./${dirName}`]) {
  skipped.push("package.json exports (already present)");
} else {
  const entries = Object.entries(pkg.exports);
  const rebuilt = {};
  // Insert before the trailing metadata entries so subpaths stay grouped.
  const tailAt = entries.findIndex(([key]) => key.endsWith(".json"));

  entries.forEach(([key, value], i) => {
    if (i === tailAt) {
      rebuilt[`./${dirName}`] = {
        types: `./dist/${dirName}/${dirName}.d.ts`,
        import: `./dist/${dirName}/${dirName}.js`,
      };
      rebuilt[`./${dirName}/register`] = {
        types: `./dist/${dirName}/register.d.ts`,
        import: `./dist/${dirName}/register.js`,
      };
    }
    rebuilt[key] = value;
  });

  pkg.exports = rebuilt;
  await writeFile(target.manifestPath, `${JSON.stringify(pkg, null, 2)}\n`);
  written.push(path.relative(ROOT, target.manifestPath));
}

// --- report ----------------------------------------------------------------

console.log(`\n<${tag}> -> ${target.name}\n`);
for (const file of written) console.log(`  created  ${file}`);
for (const file of skipped) console.log(`  skipped  ${file}`);

console.log(`
Next:
  1. Fill in the TODOs in src/${dirName}/${dirName}.ts — the manifest build
     fails if the class has no description or an attribute has no JSDoc.
  2. pnpm format && pnpm build
  3. pnpm --filter ${target.name} test
`);
