/**
 * Custom Elements Manifest configuration.
 *
 * custom-elements.json is treated as a build artifact on the same footing as
 * the compiled JavaScript, not as documentation output. It is the machine-
 * readable schema for the component layer — the counterpart to tokens.json for
 * the token layer — and downstream consumers (the catalog, editor tooling,
 * React wrappers, generated typings) read it instead of parsing source.
 *
 * That intent drives the one non-default thing here: the analyzer reads
 * TypeScript from `src/`, but every consumer imports compiled JavaScript from
 * `dist/`. Left alone, the manifest would describe modules nobody can import.
 * The `dist-paths` plugin rewrites the module paths so the manifest lines up
 * with the package's `exports` map.
 */

const SRC_TO_DIST = /^src\//;

/** `src/button/button.ts` -> `dist/button/button.js` */
const toDistPath = (path) => path.replace(SRC_TO_DIST, "dist/").replace(/\.ts$/, ".js");

/**
 * Point the manifest at what consumers can actually import.
 *
 * Runs in the package link phase, after the analyzer has finished resolving
 * cross-module references, so rewriting paths here cannot break that
 * resolution.
 */
const distPaths = {
  name: "mash/dist-paths",
  packageLinkPhase({ customElementsManifest }) {
    for (const mod of customElementsManifest.modules ?? []) {
      mod.path = toDistPath(mod.path);

      for (const entry of mod.exports ?? []) {
        if (entry.declaration?.module) {
          entry.declaration.module = toDistPath(entry.declaration.module);
        }
      }

      for (const declaration of mod.declarations ?? []) {
        if (declaration.superclass?.module) {
          declaration.superclass.module = toDistPath(declaration.superclass.module);
        }
      }
    }
  },
};

/**
 * Expand local union type aliases into their literal members.
 *
 * The analyzer records a declared type by name: `variant` comes out as
 * `ButtonVariant`. That name is meaningless outside this package's source, so
 * anything consuming the manifest — the catalog building a variant picker, a
 * wrapper generator writing prop types, an editor offering completions — would
 * have to parse TypeScript to recover the actual values.
 *
 * Rewriting the type to `"primary" | "secondary" | "quiet"` makes the manifest
 * self-contained, and matches what the rest of the CEM ecosystem emits and
 * expects. Only aliases that are entirely string literals are expanded;
 * anything else keeps its declared name.
 */
const unionMembers = new Map();

const expandUnionTypes = {
  name: "mash/expand-union-types",

  // collectPhase sees every module before analysis, so an alias declared in
  // one file is available when a component in another file references it.
  collectPhase({ ts, node }) {
    if (!ts.isTypeAliasDeclaration(node) || !ts.isUnionTypeNode(node.type)) return;

    const literals = node.type.types.filter(
      (member) => ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal),
    );
    if (literals.length === 0 || literals.length !== node.type.types.length) return;

    unionMembers.set(
      node.name.text,
      literals.map((member) => member.literal.text),
    );
  },

  packageLinkPhase({ customElementsManifest }) {
    const expand = (typed) => {
      const members = unionMembers.get(typed?.type?.text);
      if (!members) return;
      typed.type.text = members.map((value) => JSON.stringify(value)).join(" | ");
    };

    for (const mod of customElementsManifest.modules ?? []) {
      for (const declaration of mod.declarations ?? []) {
        for (const attribute of declaration.attributes ?? []) expand(attribute);
        for (const member of declaration.members ?? []) expand(member);
      }
    }
  },
};

/**
 * Drop internal members from the manifest.
 *
 * The system marks internals with a leading underscore in JavaScript, matching
 * the `--_foo` convention in CSS: one marker, both languages. Lit's internal
 * reactive state (`state: true`) has no attribute and is not part of any
 * component's contract, but the analyzer reports it like any other field — so
 * without this the manifest would advertise `_hasHeader` as public API, and the
 * catalog and any generated wrapper would faithfully reproduce it.
 */
const hideInternalMembers = {
  name: "mash/hide-internal-members",
  packageLinkPhase({ customElementsManifest }) {
    const isInternal = (member) => member.name?.startsWith("_");

    for (const mod of customElementsManifest.modules ?? []) {
      for (const declaration of mod.declarations ?? []) {
        if (declaration.members) {
          declaration.members = declaration.members.filter((m) => !isInternal(m));
        }
        if (declaration.attributes) {
          declaration.attributes = declaration.attributes.filter(
            (a) => !isInternal(a) && !a.fieldName?.startsWith("_"),
          );
        }
      }
    }
  },
};

/**
 * Fail the build if a component is missing metadata that downstream tooling
 * depends on.
 *
 * Without this the manifest degrades silently: a forgotten `@tag` produces a
 * manifest that still validates but that the catalog cannot render and a
 * wrapper generator cannot name. Catching it here keeps the manifest
 * trustworthy enough to build on.
 */
const requireElementMetadata = {
  name: "mash/require-element-metadata",
  packageLinkPhase({ customElementsManifest }) {
    const problems = [];

    for (const mod of customElementsManifest.modules ?? []) {
      for (const declaration of mod.declarations ?? []) {
        if (!declaration.customElement) continue;

        const where = `${mod.path} :: ${declaration.name}`;
        if (!declaration.tagName) {
          problems.push(`${where} has no tag name — add a \`@tag ui-foo\` JSDoc tag.`);
        }
        if (!declaration.description && !declaration.summary) {
          problems.push(`${where} has no description — add a JSDoc block to the class.`);
        }
        for (const attribute of declaration.attributes ?? []) {
          if (!attribute.description) {
            problems.push(
              `${where} attribute \`${attribute.name}\` has no description — document the property it reflects.`,
            );
          }
        }
      }
    }

    if (problems.length > 0) {
      console.error("\ncustom-elements.json is missing required metadata:\n");
      for (const problem of problems) console.error(`  ${problem}`);
      console.error("");
      process.exit(1);
    }
  },
};

export default {
  globs: ["src/**/*.ts"],
  exclude: ["src/**/*.test.ts", "src/test-support/**"],
  outdir: ".",
  litelement: true,
  // Order matters: internals are removed before the metadata gate runs, so the
  // gate only ever complains about genuinely public API.
  plugins: [distPaths, expandUnionTypes, hideInternalMembers, requireElementMetadata],
};
