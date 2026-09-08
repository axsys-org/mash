#!/usr/bin/env node
/** Structural census, not a visual/behavioral certification. Run after pnpm build. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { format, resolveConfig } from "prettier";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const lines = (text) => (text ? text.trimEnd().split("\n").length : 0);
const unique = (values) => [...new Set(values)].sort();
// Reuse the manifest analyzer's parser: the root TS 7 package is a native CLI.
const componentRequire = createRequire(
  new URL("../packages/components/package.json", import.meta.url),
);
const analyzerRequire = createRequire(
  componentRequire.resolve("@custom-elements-manifest/analyzer"),
);
const ts = analyzerRequire("typescript");
const ast = (file) => ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
function variable(source, name) {
  let result;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name)
      result = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!result) throw new Error(`Missing ${name} in ${source.fileName}`);
  return result;
}
const location = (source, node) => ({
  file: source.fileName,
  line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
});
const valueOfProperty = (node, name) =>
  node.properties.find((p) => p.name?.text === name)?.initializer;
const stringValue = (node) =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;

const tracked = git("ls-files").split("\n");
const files = unique([...tracked, ...git("ls-files", "--others", "--exclude-standard").split("\n")])
  .filter(Boolean)
  .filter(
    (f) =>
      !f.startsWith("docs/audit/") &&
      f !== "docs/gpui-parity-audit.md" &&
      f !== "scripts/inventory-design-system.mjs",
  )
  .map((file) => {
    const source = read(file);
    const category = /\.(test|spec)\.|\/test\//.test(file)
      ? "verification"
      : file.includes("generated")
        ? "generated-source"
        : file.startsWith("packages/tokens/src/")
          ? "token-source"
          : file.includes("/catalogue/")
            ? "visual-recipe"
            : /\/src\/.*\/register\.ts$/.test(file)
              ? "registration"
              : file.startsWith("apps/catalog/src/")
                ? "catalog"
                : file.startsWith("docs/")
                  ? "documentation"
                  : file.includes("/src/")
                    ? "component-or-runtime"
                    : "build-and-tooling";
    return {
      file,
      tracked: tracked.includes(file),
      category,
      bytes: statSync(path.join(root, file)).size,
      lines: /\.(ts|js|mjs|json|css|md|html)$/.test(file) ? lines(source) : null,
    };
  });
const sourceFiles = files.filter(
  (f) => /\.(ts|js|mjs|css)$/.test(f.file) && !/\.test\.|\.spec\.|\/test\//.test(f.file),
);
const sourceTexts = sourceFiles.map((f) => ({ file: f.file, text: read(f.file) }));

const examplesSource = ast("apps/catalog/src/examples.ts");
const curated = variable(examplesSource, "curated");
const redirects = variable(examplesSource, "familyCompositions");
const familyRedirects = Object.fromEntries(
  redirects.properties.map((p) => [
    p.name.text,
    {
      parent: stringValue(valueOfProperty(p.initializer, "parent")),
      example: stringValue(valueOfProperty(p.initializer, "example")),
      ...location(examplesSource, p),
    },
  ]),
);
const curatedExamples = curated.properties.flatMap((property) =>
  property.initializer.elements.map((call) => {
    if (!ts.isCallExpression(call) || call.expression.getText(examplesSource) !== "example")
      throw new Error("Unrecognized example declaration");
    const [nameNode, code, options] = call.arguments;
    const name = stringValue(nameNode);
    if (!name) throw new Error("Computed example name needs an explicit inventory rule");
    const markup = stringValue(code) ?? code.getText(examplesSource);
    const source = code.getText(examplesSource);
    const application = /studio|playground|workspace|workbench|console/i.test(name);
    return {
      tag: property.name.text,
      name,
      ...location(examplesSource, call),
      sourceLines: lines(call.getText(examplesSource)),
      codeKind:
        stringValue(code) !== undefined
          ? "literal"
          : ts.isTemplateExpression(code)
            ? "interpolated-template"
            : "expression",
      codeExpression: ts.isIdentifier(code) ? source : undefined,
      compositionOnly: options
        ? valueOfProperty(options, "compositionOnly")?.kind === ts.SyntaxKind.TrueKeyword
        : false,
      stageLayout: options && stringValue(valueOfProperty(options, "stageLayout")),
      tagsMentioned: unique(
        [...markup.matchAll(/<(ui-[\w-]+|sh-[\w-]+|shrine-[\w-]+)/g)].map((m) => m[1]),
      ),
      classesMentioned: unique(
        [...markup.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)),
      ),
      proposedAction: application
        ? "move-to-application-stories"
        : "reduce-and-verify-focused-fixture",
    };
  }),
);
const recipesSource = ast("apps/catalog/src/utility-recipes.ts");
const utilityRecipes = [];
function visitRecipes(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.initializer &&
    ts.isObjectLiteralExpression(node.initializer)
  ) {
    for (const property of node.initializer.properties) {
      const value = stringValue(property.initializer);
      if (value === undefined) continue;
      utilityRecipes.push({
        group: node.name.getText(recipesSource),
        name: property.name.text ?? property.name.getText(recipesSource),
        value,
        ...location(recipesSource, property),
      });
    }
  }
  ts.forEachChild(node, visitRecipes);
}
visitRecipes(recipesSource);

const components = [];
const packageExports = {};
for (const pkg of ["components", "shrine-components"]) {
  const manifest = json(`packages/${pkg}/custom-elements.json`);
  packageExports[pkg] = json(`packages/${pkg}/package.json`).exports;
  const recipeFile = `packages/${pkg}/src/catalogue/mash.css`;
  const recipeLines = read(recipeFile).split("\n");
  for (const module of manifest.modules) {
    for (const d of module.declarations ?? []) {
      if (!d.customElement || !d.tagName) continue;
      const file = `packages/${pkg}/${module.path.replace(/^dist\//, "src/").replace(/\.js$/, ".ts")}`;
      const tagPattern = new RegExp(`\\b${d.tagName}(?![\\w-])`);
      const tests = files
        .filter((f) => /\.(test|spec)\.ts$/.test(f.file) && tagPattern.test(read(f.file)))
        .map((f) => f.file);
      const direct = curatedExamples.filter((e) => e.tag === d.tagName);
      components.push({
        tag: d.tagName,
        package: pkg,
        className: d.name,
        file,
        sourceLines: lines(read(file)),
        summary: d.summary,
        attributes: d.attributes ?? [],
        slots: d.slots ?? [],
        parts: d.cssParts ?? [],
        cssProperties: d.cssProperties ?? [],
        states: d.cssStates ?? [],
        events: d.events ?? [],
        semanticContract: d.mash,
        manifestExamples: (d.examples ?? []).map((e) => {
          const index = read(file).indexOf(`@example ${e.name}`);
          return {
            name: e.name,
            codeLines: lines(e.code),
            line: index < 0 ? null : read(file).slice(0, index).split("\n").length,
          };
        }),
        curatedExampleNames: direct.map((e) => e.name),
        effectiveExampleOwner: direct.length
          ? "curated"
          : familyRedirects[d.tagName]
            ? "family-redirect"
            : "manifest",
        familyRedirect: familyRedirects[d.tagName],
        recipeFile,
        recipeSelectorLines: recipeLines.flatMap((l, i) =>
          new RegExp(`\\b${d.tagName}(?![\\w-])`).test(l) ? [i + 1] : [],
        ),
        testsMentioningTag: tests,
        proposedAction:
          pkg === "shrine-components"
            ? "keep-separate-from-base-parity"
            : familyRedirects[d.tagName]
              ? "retain-anatomy-review-with-parent"
              : "retain-contract-rebuild-reference-fixtures-and-recipe",
        visualParity: "unverified",
      });
    }
  }
}
components.sort((a, b) => a.tag.localeCompare(b.tag));
const graph = json("packages/tokens/dist/tokens.json");
const tokens = Object.values(graph.tokens).map((token) => ({
  ...token,
  consumerFiles: sourceTexts
    .filter(
      (s) => new RegExp(`${token.cssVar}(?![\\w-])`).test(s.text) && !s.file.includes("/tokens/"),
    )
    .map((s) => s.file),
  referencedByTokens: Object.values(graph.tokens)
    .filter((other) => {
      const aliases =
        typeof other.aliasOf === "string" ? [other.aliasOf] : Object.values(other.aliasOf ?? {});
      return aliases.includes(token.id);
    })
    .map((other) => other.id),
}));
const sum = (key) => components.reduce((total, c) => total + c[key].length, 0);
const report = {
  scope:
    "Working-tree structural census; includes pre-existing uncommitted source. Not a visual parity certification.",
  limitations: [
    "Test mentions and recipe selector lines are lexical evidence, not coverage proofs.",
    "Interpolated/expression examples are not evaluated; tags/classes are lower bounds. Read markup at the recorded source location.",
    "Token consumers are literal CSS-variable mentions; generated Tailwind utility consumption is indirect and not counted.",
    "No-use tokens are review candidates, never automatic deletion authorization.",
    "Example action classification is a triage heuristic; named application cuts are reviewed in the audit.",
  ],
  counts: {
    components: components.length,
    baseElements: components.filter((c) => c.package === "components").length,
    shrineElements: components.filter((c) => c.package !== "components").length,
    attributes: sum("attributes"),
    slots: sum("slots"),
    parts: sum("parts"),
    states: sum("states"),
    events: sum("events"),
    manifestExamples: sum("manifestExamples"),
    curatedExamples: curatedExamples.length,
    curatedOwners: curated.properties.length,
    familyRedirects: Object.keys(familyRedirects).length,
    tokens: tokens.length,
    utilityRecipes: utilityRecipes.length,
    scopedFiles: files.length,
  },
  components,
  curatedExamples,
  familyRedirects,
  utilityRecipes,
  tokens,
  packageExports,
  files,
};
const destination = path.join(root, "docs/audit");
mkdirSync(destination, { recursive: true });
writeFileSync(
  path.join(destination, "inventory.json"),
  await format(JSON.stringify(report, null, 2), {
    ...(await resolveConfig(path.join(destination, "inventory.json"))),
    parser: "json",
  }),
);
const escape = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const md = [
  "# Mash structural inventory",
  "",
  "Generated by `node scripts/inventory-design-system.mjs` after `pnpm build`. Read [the audit](../gpui-parity-audit.md) for decisions and limitations. This is a working-tree census, not a visual approval.",
  "",
  "## Components",
  "",
  "All public elements, including supporting anatomy. Test counts mean files mentioning the tag; zero does not prove absent inherited coverage. Recipe counts mean selector lines, not styled states.",
  "",
  "| Element | Source lines | Parts / slots | Manifest / curated examples | Example owner | Recipe lines / test files |",
  "| --- | ---: | ---: | ---: | --- | ---: |",
];
for (const c of components)
  md.push(
    `| [${c.tag}](../../${c.file}) | ${c.sourceLines} | ${c.parts.length} / ${c.slots.length} | ${c.manifestExamples.length} / ${c.curatedExampleNames.length} | ${c.effectiveExampleOwner}${c.familyRedirect ? `: ${c.familyRedirect.parent}` : ""} | ${c.recipeSelectorLines.length} / ${c.testsMentioningTag.length} |`,
  );
md.push(
  "",
  "## Manifest examples",
  "",
  "All source-authored examples, including examples hidden by curated replacements. Line numbers identify the source JSDoc; an inherited example can have no local line.",
  "",
  "| Component | Example | Source line | Markup lines |",
  "| --- | --- | ---: | ---: |",
);
for (const c of components)
  for (const e of c.manifestExamples)
    md.push(`| ${c.tag} | ${escape(e.name)} | ${e.line ?? "inherited"} | ${e.codeLines} |`);
md.push(
  "",
  "## Curated examples",
  "",
  "Source length includes configuration and description, and excludes imported/generated markup expansion. Dependency mentions and proposed actions are in `inventory.json`; source markup stays at the recorded location.",
  "",
  "| Component | Example | Source line / length | Code kind | Initial disposition |",
  "| --- | --- | ---: | --- | --- |",
);
for (const e of curatedExamples)
  md.push(
    `| ${e.tag} | ${escape(e.name)} | ${e.line} / ${e.sourceLines} | ${e.codeKind} | ${e.proposedAction} |`,
  );
md.push(
  "",
  "## Token source families",
  "",
  "Every individual token, alias chain, resolved theme value, and literal consumer file is retained in `inventory.json`.",
  "",
  "| Source | Layer | Tokens |",
  "| --- | --- | ---: |",
);
for (const source of unique(tokens.map((t) => t.source))) {
  const group = tokens.filter((t) => t.source === source);
  md.push(`| ${source} | ${unique(group.map((t) => t.layer)).join(", ")} | ${group.length} |`);
}
md.push(
  "",
  "## Files",
  "",
  "All scoped tracked and non-ignored untracked source files, excluding these generated audit artifacts. Binary and non-source files have no line count.",
  "",
  "| File | Category | Lines |",
  "| --- | --- | ---: |",
);
for (const f of files)
  md.push(
    `| [${f.file}](../../${f.file}) | ${f.category}${f.tracked ? "" : " (untracked at census)"} | ${f.lines ?? "—"} |`,
  );
writeFileSync(
  path.join(destination, "inventory.md"),
  await format(md.join("\n"), {
    ...(await resolveConfig(path.join(destination, "inventory.md"))),
    parser: "markdown",
  }),
);
console.log(JSON.stringify(report.counts, null, 2));
