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

import {
  MASH_ROLES,
  mashBinding,
  mashManifestMetadata,
  mashSemanticNode,
} from "./mash-contract.mjs";

const SRC_TO_DIST = /^\/?src\//;

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
    const rewrite = (value) => {
      if (Array.isArray(value)) return value.map(rewrite);
      if (!value || typeof value !== "object") return value;
      for (const [key, child] of Object.entries(value)) {
        value[key] =
          key === "module" && typeof child === "string" ? toDistPath(child) : rewrite(child);
      }
      return value;
    };

    rewrite(customElementsManifest);
    for (const mod of customElementsManifest.modules ?? []) mod.path = toDistPath(mod.path);
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

/**
 * Capture explicit renderer-neutral role mappings from component JSDoc.
 *
 * Most named surfaces map directly (`title` is the Mash `title` role). Use an
 * override when platform syntax differs from meaning, especially an anonymous
 * default slot:
 *
 *   @mashrole slot default label
 */
function createCaptureMashRoles() {
  const validKinds = new Set(["attribute", "slot", "part", "state", "event"]);

  return {
    name: "mash/capture-contract-roles",

    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const declaration = moduleDoc.declarations?.find((d) => d.name === node.name.text);
      if (!declaration) return;

      const mappings = [];
      const mappingKeys = new Set();
      for (const tag of ts.getJSDocTags(node)) {
        if (tag.tagName.text !== "mashrole") continue;
        const raw = Array.isArray(tag.comment)
          ? tag.comment.map((part) => part.text ?? "").join("")
          : String(tag.comment ?? "");
        const [kind, rawName, role, nodeId] = raw.trim().split(/\s+/);
        if (!kind || !rawName || !role || !validKinds.has(kind)) {
          throw new Error(
            `${node.name.text} has invalid @mashrole "${raw}"; expected ` +
              "@mashrole <attribute|slot|part|state|event> <name|default> <role>.",
          );
        }
        if (!MASH_ROLES[role]) {
          throw new Error(`${node.name.text} maps to unknown Mash role \`${role}\`.`);
        }
        const mappingKey = `${kind}:${rawName === "default" ? "" : rawName}`;
        if (mappingKeys.has(mappingKey)) {
          throw new Error(`${node.name.text} maps Mash surface \`${mappingKey}\` more than once.`);
        }
        mappingKeys.add(mappingKey);
        mappings.push({
          kind,
          name: rawName === "default" ? "" : rawName,
          role,
          nodeId: nodeId ?? role,
        });
      }
      if (mappings.length > 0) declaration.__mashRoleMappings = mappings;

      const fallbacks = [];
      const fallbackKeys = new Set();
      for (const tag of ts.getJSDocTags(node)) {
        if (tag.tagName.text !== "mashfallback") continue;
        const raw = Array.isArray(tag.comment)
          ? tag.comment.map((part) => part.text ?? "").join("")
          : String(tag.comment ?? "");
        const literalMatch = raw.trim().match(/^slot\s+(\S+)\s+literal\s+(.+)$/s);
        const bindingsMatch = raw.trim().match(/^slot\s+(\S+)\s+bindings\s+(.+)$/s);
        if (!literalMatch && !bindingsMatch) {
          throw new Error(
            `${node.name.text} has invalid @mashfallback "${raw}"; expected ` +
              "@mashfallback slot <name|default> literal <JSON-value> or " +
              "@mashfallback slot <name|default> bindings <attribute|slot>:<name> [...].",
          );
        }
        const rawName = (literalMatch ?? bindingsMatch)[1];
        const name = rawName === "default" ? "" : rawName;
        const key = `slot:${name}`;
        if (fallbackKeys.has(key)) {
          throw new Error(`${node.name.text} declares fallback for Mash surface \`${key}\` twice.`);
        }
        fallbackKeys.add(key);
        if (literalMatch) {
          let value;
          try {
            value = JSON.parse(literalMatch[2]);
          } catch {
            throw new Error(
              `${node.name.text} has non-JSON @mashfallback value \`${literalMatch[2]}\`.`,
            );
          }
          fallbacks.push({ kind: "slot", name, mode: "literal", value });
          continue;
        }

        const targets = bindingsMatch[2]
          .trim()
          .split(/\s+/)
          .map((target) => {
            const match = target.match(/^(attribute|slot):(.+)$/);
            if (!match) {
              throw new Error(
                `${node.name.text} has invalid @mashfallback binding \`${target}\`; expected ` +
                  "<attribute|slot>:<name|default>.",
              );
            }
            return { kind: match[1], name: match[2] === "default" ? "" : match[2] };
          });
        fallbacks.push({ kind: "slot", name, mode: "bindings", targets });
      }
      if (fallbacks.length > 0) declaration.__mashFallbackMappings = fallbacks;

      const nodes = [];
      const nodeIds = new Set();
      for (const tag of ts.getJSDocTags(node)) {
        if (tag.tagName.text !== "mashnode") continue;
        const raw = Array.isArray(tag.comment)
          ? tag.comment.map((part) => part.text ?? "").join("")
          : String(tag.comment ?? "");
        const [id, role, parent] = raw.trim().split(/\s+/);
        if (!id || !role) {
          throw new Error(
            `${node.name.text} has invalid @mashnode "${raw}"; expected ` +
              "@mashnode <stable-id> <role> [parent-id].",
          );
        }
        if (!MASH_ROLES[role]) {
          throw new Error(`${node.name.text} declares unknown Mash role \`${role}\`.`);
        }
        if (nodeIds.has(id)) {
          throw new Error(`${node.name.text} declares Mash node \`${id}\` more than once.`);
        }
        nodeIds.add(id);
        nodes.push({ id, role, parent });
      }
      if (nodes.length > 0) declaration.__mashNodes = nodes;
    },
  };
}

/** Embed one addressable Mash contract into every generated declaration. */
const embedMashContract = {
  name: "mash/embed-contract",
  packageLinkPhase({ customElementsManifest }) {
    customElementsManifest.mash = mashManifestMetadata();

    const surfaces = [
      ["attribute", "attributes"],
      ["slot", "slots"],
      ["part", "cssParts"],
      ["state", "cssStates"],
      ["event", "events"],
    ];

    for (const mod of customElementsManifest.modules ?? []) {
      for (const declaration of mod.declarations ?? []) {
        if (!declaration.customElement || !declaration.tagName) continue;
        const overrides = new Map(
          (declaration.__mashRoleMappings ?? []).map((mapping) => [
            `${mapping.kind}:${mapping.name}`,
            mapping,
          ]),
        );
        const declaredNodes = declaration.__mashNodes ?? [];
        const fallbackOverrides = new Map(
          (declaration.__mashFallbackMappings ?? []).map((fallback) => [
            `${fallback.kind}:${fallback.name}`,
            fallback,
          ]),
        );
        delete declaration.__mashRoleMappings;
        delete declaration.__mashNodes;
        delete declaration.__mashFallbackMappings;

        const bindings = [];
        const nodeRecords = new Map(
          declaredNodes.map((node) => [node.id, { ...node, bindings: [] }]),
        );
        for (const [kind, property] of surfaces) {
          for (const exposed of declaration[property] ?? []) {
            const override = overrides.get(`${kind}:${exposed.name}`);
            if (override) overrides.delete(`${kind}:${exposed.name}`);
            const role = override?.role;
            const nodeId = override?.nodeId ?? role;
            const inferredRole = mashBinding(
              declaration.tagName,
              kind,
              exposed.name,
              undefined,
              undefined,
              exposed,
            );
            const mapping =
              override &&
              (override.role !== inferredRole.role ||
                override.nodeId !== inferredRole.nodeAddress.split("/").at(-1))
                ? "explicit"
                : "inferred";
            const binding = mashBinding(
              declaration.tagName,
              kind,
              exposed.name,
              role,
              nodeId,
              exposed,
              mapping,
            );
            if (!binding.shared) {
              throw new Error(
                `${declaration.tagName} exposes ${kind} \`${exposed.name || "default"}\` ` +
                  `without a shared Mash role. Add it to MASH_ROLES or map it explicitly.`,
              );
            }
            exposed.mash = binding;
            bindings.push(binding);

            const inferredId = binding.nodeAddress.split("/").at(-1);
            const existing = nodeRecords.get(inferredId);
            if (existing && existing.role !== binding.role) {
              throw new Error(
                `${declaration.tagName} Mash node \`${inferredId}\` mixes roles ` +
                  `\`${existing.role}\` and \`${binding.role}\`.`,
              );
            }
            if (existing) existing.bindings.push(binding);
            else {
              nodeRecords.set(inferredId, {
                id: inferredId,
                role: binding.role,
                parent: undefined,
                bindings: [binding],
              });
            }
          }
        }

        if (overrides.size > 0) {
          throw new Error(
            `${declaration.tagName} has @mashrole mappings for surfaces that do not exist: ` +
              [...overrides.keys()].join(", "),
          );
        }

        const bindingBySurface = new Map(
          bindings.map((binding) => [`${binding.kind}:${binding.name}`, binding]),
        );

        // Omitted authored content resolves predictably. An explicit literal
        // wins, then a same-node input binding, then the anonymous content
        // slot used by named compatibility slots. Everything else is empty.
        // This records the existing component contract without serializing
        // authored instance content into the schema.
        for (const record of nodeRecords.values()) {
          const attributes = record.bindings.filter((binding) => binding.kind === "attribute");
          const slots = record.bindings.filter((binding) => binding.kind === "slot");
          const defaultSlot = slots.find((binding) => binding.name === "");

          for (const binding of slots) {
            const key = `slot:${binding.name}`;
            const override = fallbackOverrides.get(key);
            if (override) {
              if (override.mode === "literal") {
                binding.fallback = { kind: "literal", value: override.value };
              } else {
                const targets = override.targets.map((target) => {
                  const candidate = bindingBySurface.get(`${target.kind}:${target.name}`);
                  if (!candidate) {
                    throw new Error(
                      `${declaration.tagName} fallback for slot \`${binding.name || "default"}\` ` +
                        `targets missing ${target.kind} \`${target.name || "default"}\`.`,
                    );
                  }
                  if (candidate.address === binding.address) {
                    throw new Error(
                      `${declaration.tagName} fallback for slot \`${binding.name || "default"}\` targets itself.`,
                    );
                  }
                  return candidate.address;
                });
                binding.fallback =
                  targets.length === 1
                    ? { kind: "binding", bindingAddress: targets[0] }
                    : { kind: "chain", bindingAddresses: targets };
              }
              fallbackOverrides.delete(key);
              continue;
            }

            const matchingAttribute = attributes.find(
              (attribute) => attribute.name === binding.name,
            );
            const onlyAttribute = attributes.length === 1 ? attributes[0] : undefined;
            const input = matchingAttribute ?? onlyAttribute;
            const targets = [input, binding.name ? defaultSlot : undefined].filter(Boolean);
            if (targets.length === 1) {
              binding.fallback = { kind: "binding", bindingAddress: targets[0].address };
            } else if (targets.length > 1) {
              binding.fallback = {
                kind: "chain",
                bindingAddresses: targets.map((target) => target.address),
              };
            }
          }
        }

        if (fallbackOverrides.size > 0) {
          throw new Error(
            `${declaration.tagName} has @mashfallback mappings for slots that do not exist: ` +
              [...fallbackOverrides.keys()].join(", "),
          );
        }

        // Event payload fields report semantic nodes when their field name is
        // also a stable node id. This preserves the event as a first-class
        // output binding while making its relationship to controlled values
        // machine-readable. A compound event can report several nodes without
        // pretending that one Web event has only one semantic target.
        for (const binding of bindings) {
          if (binding.kind !== "event" || binding.value.detail?.kind !== "record") continue;
          for (const field of Object.keys(binding.value.detail.fields)) {
            const target = nodeRecords.get(field);
            if (!target || target.bindings.every((candidate) => candidate.kind === "event"))
              continue;
            binding.reports.push({
              path: [field],
              nodeAddress: `mash://${declaration.tagName}/node/${field}`,
            });
          }
        }

        // Every component is one rooted semantic SurfaceTree. Components may
        // name a richer root role (`scroller`, for example), so prefer an
        // explicit role=root node, then a stable `root` id. If neither exists,
        // add a semantic-only root rather than forcing Web markup to invent a
        // wrapper solely for the contract.
        let rootRecord = [...nodeRecords.values()].find((record) => record.role === "root");
        rootRecord ??= nodeRecords.get("root");
        if (!rootRecord) {
          rootRecord = { id: "root", role: "root", parent: undefined, bindings: [] };
          nodeRecords.set("root", rootRecord);
        }
        for (const record of nodeRecords.values()) {
          if (record !== rootRecord && !record.parent) record.parent = rootRecord.id;
        }

        for (const node of nodeRecords.values()) {
          if (node.parent && !nodeRecords.has(node.parent)) {
            throw new Error(
              `${declaration.tagName} Mash node \`${node.id}\` has missing parent \`${node.parent}\`.`,
            );
          }
        }

        const nodes = [...nodeRecords.values()].map((node) =>
          mashSemanticNode(declaration.tagName, node.id, node.role, node.parent, node.bindings),
        );
        const addresses = [
          ...nodes.map((node) => node.address),
          ...bindings.map((binding) => binding.address),
        ];
        if (new Set(addresses).size !== addresses.length) {
          throw new Error(`${declaration.tagName} emits duplicate Mash addresses.`);
        }
        declaration.mash = {
          version: customElementsManifest.mash.version,
          address: `mash://${declaration.tagName}`,
          nodes,
          bindings,
        };
      }
    }
  },
};

const isInternal = (member) => member.name?.startsWith("_");

/** Keep internal bases visible during analysis so inheritance resolves, then omit them publicly. */
const hideInternalDeclarations = {
  name: "mash/hide-internal-declarations",
  packageLinkPhase({ customElementsManifest }) {
    for (const mod of customElementsManifest.modules ?? []) {
      if (!/(^|\/)internal\//.test(mod.path)) continue;
      mod.declarations = [];
      mod.exports = [];
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
          const serialized = JSON.stringify(declaration);
          if (/"module":"\/?src\//.test(serialized)) {
            problems.push(`${where} contains a source-only module reference.`);
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

          for (const property of declaration.cssProperties ?? []) {
            problems.push(
              `${where} exposes CSS property \`${property.name}\`. Mash component contracts ` +
                "use semantic tokens plus slots, parts, state, and events; move layout to a catalogue recipe.",
            );
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
    // Internal implementation modules can define reusable Lit base classes,
    // but they are not custom-element contracts and must never become catalog
    // entries or generated wrapper targets.
    exclude: ["src/**/*.test.ts", "src/test-support/**"],
    outdir: ".",
    litelement: true,
    // Order matters: internals are removed before the metadata gate runs, so
    // the gate only ever complains about genuinely public API.
    plugins: [
      distPaths,
      createExpandUnionTypes(),
      createCaptureExamples(),
      createCaptureMashRoles(),
      hideInternalDeclarations,
      hideInternalMembers,
      embedMashContract,
      createRequireElementMetadata(tagPrefix),
    ],
  };
}
