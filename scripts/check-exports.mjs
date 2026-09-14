#!/usr/bin/env node
/**
 * Package export sanity checks.
 *
 * The `exports` map, the `sideEffects` list and the emitted module graph are
 * three separate declarations that all have to agree, and nothing else in the
 * build verifies that they do. A stale path in `exports` is invisible until a
 * consumer imports it; a missing `.js` extension breaks only in a real browser;
 * a `customElements.define` that slips into a definition module quietly breaks
 * tree-shaking for everyone.
 *
 * Everything here is static analysis — the component modules reference
 * `HTMLElement` at evaluation time and cannot be imported into Node, so the
 * checks read the files rather than loading them.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Discovered rather than listed, so a new package is covered the moment it
 * exists. A hardcoded list is exactly the kind of thing that silently stops
 * being complete.
 */
async function findPackages() {
  const dir = path.join(ROOT, "packages");
  const entries = await readdir(dir, { withFileTypes: true });
  const found = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await exists(path.join(dir, entry.name, "package.json"))) {
      found.push(`packages/${entry.name}`);
    }
  }
  return found.sort();
}

const problems = [];
const fail = (pkg, message) => problems.push(`${pkg}: ${message}`);

const exists = async (file) =>
  stat(file).then(
    (s) => s.isFile(),
    () => false,
  );

/** Every string leaf in an exports map, paired with the subpath that reaches it. */
function* exportTargets(node, subpath = ".") {
  if (typeof node === "string") {
    yield [subpath, node];
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      yield* exportTargets(value, key.startsWith(".") ? key : subpath);
    }
  }
}

async function* walkJs(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkJs(full);
    else if (entry.name.endsWith(".js")) yield full;
  }
}

// ---------------------------------------------------------------------------

async function checkPackage(relativeDir) {
  const dir = path.join(ROOT, relativeDir);
  const manifestPath = path.join(dir, "package.json");
  const pkg = JSON.parse(await readFile(manifestPath, "utf8"));
  const name = pkg.name;

  if (!pkg.exports) {
    fail(name, "has no `exports` map, so its internal file layout is its public API");
    return;
  }

  // --- 1. every declared export resolves to a file that exists -------------
  const targets = [...exportTargets(pkg.exports)];
  for (const [subpath, target] of targets) {
    if (!target.startsWith("./")) {
      fail(name, `export "${subpath}" -> "${target}" is not a relative path`);
      continue;
    }
    if (!(await exists(path.join(dir, target)))) {
      fail(name, `export "${subpath}" -> "${target}" does not exist (run the build first)`);
    }
  }

  // --- 2. types sit beside their implementation ----------------------------
  for (const [subpath, condition] of Object.entries(pkg.exports)) {
    if (typeof condition !== "object" || !condition.import) continue;
    if (!condition.types) {
      fail(name, `export "${subpath}" has an "import" condition but no "types"`);
      continue;
    }
    if (Object.keys(condition)[0] !== "types") {
      fail(name, `export "${subpath}" must list "types" first; resolution picks the first match`);
    }
  }

  // --- 3. `files` covers everything `exports` points at --------------------
  const files = pkg.files ?? [];
  for (const [subpath, target] of targets) {
    const top = target.replace(/^\.\//, "").split("/")[0];
    const covered = files.some((entry) => entry.replace(/^\.\//, "").split("/")[0] === top);
    if (!covered && !target.endsWith("package.json")) {
      fail(
        name,
        `export "${subpath}" -> "${target}" is not covered by "files": ${JSON.stringify(files)}`,
      );
    }
  }

  // --- 4. nothing internal is exported -------------------------------------
  for (const [subpath] of targets) {
    if (/internal|test-support|\.test\./.test(subpath)) {
      fail(name, `export "${subpath}" exposes an internal module`);
    }
  }

  const dist = path.join(dir, "dist");

  // --- 5. relative imports in the emitted graph actually resolve -----------
  // `moduleResolution: nodenext` requires explicit extensions. Omitting one
  // type-checks fine and then 404s in a browser, so it is checked here.
  for await (const file of walkJs(dist)) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/from\s+"(\.[^"]*)"|import\s+"(\.[^"]*)"/g)) {
      const specifier = match[1] ?? match[2];
      if (!specifier) continue;
      if (!specifier.endsWith(".js")) {
        fail(name, `${path.relative(dir, file)} imports "${specifier}" without a .js extension`);
        continue;
      }
      if (!(await exists(path.resolve(path.dirname(file), specifier)))) {
        fail(name, `${path.relative(dir, file)} imports "${specifier}", which does not exist`);
      }
    }
  }

  // --- 6. side effects are exactly the registration modules ---------------
  // Gated on the package declaring a manifest rather than on its directory
  // name: what makes these checks apply is that the package ships custom
  // elements, not what it happens to be called.
  if (pkg.customElements) {
    // A module is side-effectful if it registers an element itself, or if it
    // bare-imports a module that does. The `register.js` barrel is the second
    // kind: it contains no `define` call of its own but importing it still
    // registers the whole system, so it must be flagged.
    const modules = new Map();

    for await (const file of walkJs(dist)) {
      const source = await readFile(file, "utf8");
      const bareImports = [...source.matchAll(/^import\s+"(\.[^"]*)";/gm)].map((m) =>
        path.resolve(path.dirname(file), m[1]),
      );
      modules.set(file, {
        relative: path.relative(dir, file),
        registers: source.includes("customElements.define"),
        bareImports,
      });
    }

    const sideEffectful = new Set(
      [...modules.entries()].filter(([, mod]) => mod.registers).map(([file]) => file),
    );
    for (let changed = true; changed;) {
      changed = false;
      for (const [file, mod] of modules) {
        if (sideEffectful.has(file)) continue;
        if (mod.bareImports.some((target) => sideEffectful.has(target))) {
          sideEffectful.add(file);
          changed = true;
        }
      }
    }

    const definitionModules = [...modules.keys()]
      .filter((file) => !sideEffectful.has(file))
      .map((file) => modules.get(file).relative);
    const registrationModules = [...sideEffectful].map((file) => modules.get(file).relative);

    for (const file of definitionModules) {
      if (file.endsWith("register.js")) {
        fail(name, `${file} is named like a registration module but registers nothing`);
      }
    }
    for (const file of registrationModules) {
      if (!file.endsWith("register.js") && file !== "dist/index.js") {
        fail(
          name,
          `${file} registers a custom element outside a public entry or registration module`,
        );
      }
    }

    // Normal public component imports must produce usable elements without a
    // second registration step. Headless helpers have no sibling registration.
    for (const [subpath, entry] of Object.entries(pkg.exports)) {
      if (!entry || typeof entry !== "object" || !entry.import?.endsWith(".js")) continue;
      const file = path.join(dir, entry.import);
      const sibling = path.join(path.dirname(file), "register.js");
      if ((subpath === "." || sideEffectful.has(sibling)) && !sideEffectful.has(file)) {
        fail(name, `${subpath} requires a separate registration import`);
      }
    }

    const sideEffects = pkg.sideEffects;
    if (!Array.isArray(sideEffects)) {
      fail(name, "`sideEffects` must be an array naming the registration modules");
    } else {
      const matches = (file) =>
        sideEffects.some((pattern) => {
          const regex = new RegExp(
            `^${pattern.replace(/^\.\//, "").replace(/\*\*/g, "@@").replace(/\*/g, "[^/]*").replace(/@@/g, ".*")}$`,
          );
          return regex.test(file);
        });

      for (const file of registrationModules) {
        if (!matches(file)) {
          fail(name, `${file} registers an element but is not covered by "sideEffects"`);
        }
      }
      for (const file of definitionModules) {
        if (matches(file)) {
          fail(name, `${file} is flagged side-effectful but registers nothing`);
        }
      }
    }

    // --- 7. the manifest describes modules that exist --------------------
    const cemPath = path.join(dir, "custom-elements.json");
    if (await exists(cemPath)) {
      const cem = JSON.parse(await readFile(cemPath, "utf8"));
      for (const mod of cem.modules ?? []) {
        if (!(await exists(path.join(dir, mod.path)))) {
          fail(name, `custom-elements.json describes "${mod.path}", which does not exist`);
        }
      }
    } else {
      fail(name, "custom-elements.json is missing (run the build first)");
    }
  }

  return targets.length;
}

// ---------------------------------------------------------------------------

const packages = await findPackages();

let checked = 0;
for (const pkg of packages) {
  checked += (await checkPackage(pkg)) ?? 0;
}

if (problems.length > 0) {
  console.error(`\npackage export checks failed — ${problems.length} problem(s)\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("");
  process.exit(1);
}

console.log(`exports: ok — ${checked} export targets across ${packages.length} packages`);
