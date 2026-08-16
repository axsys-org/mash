/**
 * Shared Custom Elements Manifest configuration.
 *
 * custom-elements.json is treated as a build artifact on the same footing as
 * the compiled JavaScript, not as documentation output. It is the machine-
 * readable schema for the component layer — the counterpart to tokens.json for
 * the token layer — and downstream consumers (the catalog, editor tooling,
 * React wrappers, generated typings) read it instead of parsing source.
 *
 * This lives at the repo root rather than in one package because every
 * component package must produce a manifest with the *same* shape. A consumer
 * reading two manifests should not have to know which package emitted which:
 * if one expanded union types and the other did not, the schema would stop
 * being a contract and become a per-package dialect.
 *
 * Analyzer config files are build tooling and are never published, so importing
 * across package boundaries here is fine.
 */

const SRC_TO_DIST = /^src\//;

/** `src/button/button.ts` -> `dist/button/button.js` */
const toDistPath = (path) => path.replace(SRC_TO_DIST, "dist/").replace(/\.ts$/, ".js");

/**
 * Point the manifest at what consumers can actually import.
 *
 * The analyzer reads TypeScript from `src/`, but every consumer imports
 * compiled JavaScript from `dist/`. Left alone, the manifest would describe
 * modules nobody can import.
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
function createExpandUnionTypes() {
  // Built fresh per config so two packages analysed in one process cannot
  // leak alias definitions into each other.
  const unionMembers = new Map();

  return {
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
}

/**
 * Capture `@example` blocks from a component's JSDoc.
 *
 * The analyzer drops `@example` entirely — it does not surface an `examples`
 * field and does not fold the tag into `description`, so the markup would be
 * invisible to anything reading the manifest.
 *
 * Examples belong in the manifest rather than in the catalog because they are
 * part of what a component *is*: the canonical way to compose its slots. A
 * catalog, a docs site and an agent should all be able to read the same demo
 * without any of them hardcoding it. This is the same reasoning that put slots
 * and parts there.
 *
 * Format — first line is the example's name, the rest is markup:
 *
 *   @example Default
 *   <ui-button variant="primary">Save</ui-button>
 */
function createCaptureExamples() {
  return {
    name: "mash/capture-examples",

    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node) || !node.name) return;

      const declaration = moduleDoc.declarations?.find((d) => d.name === node.name.text);
      if (!declaration) return;

      const examples = [];

      for (const tag of ts.getJSDocTags(node)) {
        if (tag.tagName.text !== "example") continue;

        // `comment` is a string for simple tags, or an array of parts when the
        // JSDoc contains links or other inline constructs.
        const raw = Array.isArray(tag.comment)
          ? tag.comment.map((part) => part.text ?? "").join("")
          : (tag.comment ?? "");

        const lines = String(raw).replace(/\r/g, "").split("\n");
        // A first line that already looks like markup is the example itself,
        // so the name falls back to a positional one.
        const named = lines[0] !== undefined && !lines[0].trimStart().startsWith("<");
        const name = named ? lines[0].trim() : `Example ${examples.length + 1}`;
        const code = (named ? lines.slice(1) : lines).join("\n").trim();

        if (code) examples.push({ name, code });
      }

      if (examples.length > 0) declaration.examples = examples;
    },
  };
}

const isInternal = (member) => member.name?.startsWith("_");

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
function createRequireElementMetadata(tagPrefix) {
  return {
    name: "mash/require-element-metadata",
    packageLinkPhase({ customElementsManifest }) {
      const problems = [];

      for (const mod of customElementsManifest.modules ?? []) {
        for (const declaration of mod.declarations ?? []) {
          if (!declaration.customElement) continue;

          const where = `${mod.path} :: ${declaration.name}`;
          if (!declaration.tagName) {
            problems.push(`${where} has no tag name — add a \`@tag ${tagPrefix}-foo\` JSDoc tag.`);
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

          // An undescribed event is almost always one the analyzer *inferred*
          // rather than one the component declares. It reads the first argument
          // of `new CustomEvent(...)`, so passing a variable there publishes an
          // event named after the variable. Requiring a description catches
          // that, and catches genuinely undocumented events too.
          for (const event of declaration.events ?? []) {
            if (!event.description) {
              problems.push(
                `${where} event \`${event.name}\` has no description. If the component really ` +
                  `fires it, document it with \`@fires\`; if it does not, the analyzer inferred ` +
                  `it from a non-literal \`new CustomEvent(...)\` argument — use a string literal.`,
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
}

/**
 * The manifest configuration every component package uses.
 *
 * @param {object} options
 * @param {string} options.tagPrefix Tag namespace, used only in error messages.
 */
export function mashManifestConfig({ tagPrefix }) {
  return {
    globs: ["src/**/*.ts"],
    exclude: ["src/**/*.test.ts", "src/test-support/**"],
    outdir: ".",
    litelement: true,
    // Order matters: internals are removed before the metadata gate runs, so
    // the gate only ever complains about genuinely public API.
    plugins: [
      distPaths,
      createExpandUnionTypes(),
      createCaptureExamples(),
      hideInternalMembers,
      createRequireElementMetadata(tagPrefix),
    ],
  };
}
