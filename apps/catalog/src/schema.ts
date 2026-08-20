/**
 * The catalog's view of the design system, loaded from generated schemas.
 *
 * Nothing about a component is described here. Everything the catalog knows —
 * which components exist, what they accept, what they slot, what they part out,
 * what a token resolves to and where it came from — is read from
 * custom-elements.json and tokens.json at import time.
 *
 * That is the point of the architecture: adding a component or a token makes it
 * appear in the catalog with no catalog changes at all.
 */

// Import attributes are required for JSON under `module: nodenext`, and are
// what the platform itself specifies — Vite honours them too.
import rawUiManifest from "@mash/ui/custom-elements.json" with { type: "json" };
import rawUiRecipe from "@mash/ui/catalogue/mash.json" with { type: "json" };
import rawShrineManifest from "@mash/shrine/custom-elements.json" with { type: "json" };
import rawShrineRecipe from "@mash/shrine/catalogue/mash.json" with { type: "json" };
import rawTokens from "@mash/tokens/tokens.json" with { type: "json" };

// --- Custom Elements Manifest ---------------------------------------------

export interface TypeInfo {
  text: string;
}

export interface Attribute {
  name: string;
  type?: TypeInfo;
  default?: string;
  description?: string;
  fieldName?: string;
  mash?: MashBinding;
}

export interface Described {
  name: string;
  description?: string;
  mash?: MashBinding;
}

export type MashNodeKind = "attribute" | "slot" | "part" | "state" | "event";

/** One renderer-neutral, addressable surface in a Mash component contract. */
export interface MashValueSchema {
  kind: string;
  choices?: string[];
  items?: MashValueSchema;
  detail?: MashValueSchema;
  fields?: Record<string, MashValueSchema>;
  name?: string;
}

export type MashDefaultSpec = { kind: "none" } | { kind: "value"; value: unknown };

export type MashFallbackSpec =
  | { kind: "none" | "empty" }
  | { kind: "literal"; value: unknown }
  | { kind: "binding"; bindingAddress: string }
  | { kind: "chain"; bindingAddresses: string[] };

export interface MashEventRelation {
  kind: "requests" | "reports";
  path: string[];
  nodeAddress: string;
}

/** One renderer binding onto a semantic Mash node. */
export interface MashBinding {
  address: string;
  nodeAddress: string;
  renderer: "web";
  kind: MashNodeKind;
  name: string;
  role: string;
  family: string;
  shared: boolean;
  mapping: "inferred" | "explicit";
  availability: "optional" | "required" | "provided";
  direction: "input" | "content" | "realization" | "state" | "output";
  value: MashValueSchema;
  default: MashDefaultSpec;
  fallback: MashFallbackSpec;
  intent?: "request" | "report";
  relations?: MashEventRelation[];
}

/** One renderer-neutral semantic node, possibly realized by several Web bindings. */
export interface MashNode {
  id: string;
  address: string;
  role: string;
  family: string;
  shared: boolean;
  ownership: "authored" | "controlled" | "reported" | "realized";
  parent?: string;
  bindings: MashBinding[];
}

export interface MashComponentContract {
  version: string;
  address: string;
  nodes: MashNode[];
  bindings: MashBinding[];
}

export interface MashLayoutValue {
  kind: "token" | "literal" | "expression" | "inherited";
  value: string;
  tokens: string[];
  token?: string;
}

/** @deprecated Use MashLayoutValue. */
export type MashLayoutMeasure = MashLayoutValue;

export interface MashLayoutRecipe {
  group?: {
    kind: "none" | "contents" | "flow" | "grid" | "overlay";
    orientation?: "block" | "inline" | "depth";
    reverse?: boolean;
    wrap?: "none" | "forward" | "reverse";
  };
  align?: "leading" | "center" | "trailing" | "stretch" | "baseline";
  distribute?: "leading" | "center" | "trailing" | "between" | "around" | "evenly" | "stretch";
  gap?: { inline?: MashLayoutValue; block?: MashLayoutValue };
  dimensions?: {
    inline?: { min?: MashLayoutValue; ideal?: MashLayoutValue; max?: MashLayoutValue };
    block?: { min?: MashLayoutValue; ideal?: MashLayoutValue; max?: MashLayoutValue };
  };
  inset?: {
    blockStart?: MashLayoutValue;
    blockEnd?: MashLayoutValue;
    inlineStart?: MashLayoutValue;
    inlineEnd?: MashLayoutValue;
  };
  margin?: {
    blockStart?: MashLayoutValue;
    blockEnd?: MashLayoutValue;
    inlineStart?: MashLayoutValue;
    inlineEnd?: MashLayoutValue;
  };
  anchor?: {
    mode?: "flow" | "relative" | "absolute" | "fixed" | "sticky";
    blockStart?: MashLayoutValue;
    blockEnd?: MashLayoutValue;
    inlineStart?: MashLayoutValue;
    inlineEnd?: MashLayoutValue;
    layer?: MashLayoutValue;
  };
  self?: {
    align?: "leading" | "center" | "trailing" | "stretch" | "baseline";
    distribute?: "leading" | "center" | "trailing" | "between" | "around" | "evenly" | "stretch";
    grow?: MashLayoutValue;
    shrink?: MashLayoutValue;
    basis?: MashLayoutValue;
    gridRow?: MashLayoutValue;
    gridColumn?: MashLayoutValue;
  };
  grid?: {
    columns?: MashLayoutValue;
    rows?: MashLayoutValue;
    autoFlow?: MashLayoutValue;
  };
  aspectRatio?: MashLayoutValue;
  overflow?: {
    inline?: "visible" | "clip" | "hidden" | "auto" | "scroll";
    block?: "visible" | "clip" | "hidden" | "auto" | "scroll";
  };
}

export interface MashRecipeRule {
  targets: string[];
  when: {
    conditions: Array<
      | {
          kind: "node";
          nodeAddress: string;
          operator: "truthy" | "falsy" | "equals" | "starts-with" | "ends-with" | "contains";
          value?: string;
        }
      | { kind: "interaction"; state: string; active: boolean }
      | { kind: "environment"; feature: string; value: string }
      | { kind: "context"; name: string; operator: string; value?: string }
      | { kind: "renderer"; renderer: "web"; selector: string }
    >;
    web: { selector: string; context: string[] };
  };
  parameters?: Record<string, { value: string; tokens: string[] }>;
  presentation: Record<
    string,
    {
      sourceProperty: string;
      kind: "token" | "literal" | "expression";
      value: string;
      tokens: string[];
      token?: string;
    }
  >;
  declarations: Record<string, { value: string; tokens: string[] }>;
  layout?: MashLayoutRecipe;
}

export interface MashCatalogueNode {
  tokens: string[];
  coverage: "direct" | "contract-only";
  layout: "constrained" | "unconstrained";
}

interface MashCatalogueRecipe {
  componentContract: string;
  layoutContract: string;
  presentationContract: string;
  nodes: Record<string, MashCatalogueNode>;
  rules: MashRecipeRule[];
}

export interface MashCatalogueContractVersions {
  componentContract: string;
  layoutContract: string;
  presentationContract: string;
}

export interface CssProperty extends Described {
  default?: string;
}

export interface EventInfo extends Described {
  type?: TypeInfo;
}

/**
 * A canonical demo, captured from the component's `@example` JSDoc.
 *
 * Examples live in the manifest rather than in the catalog because they are
 * part of what a component is — the intended way to compose its slots. Keeping
 * them here means the catalog renders them without knowing anything about any
 * particular component, and a docs site or an agent reads the same markup.
 */
export interface Example {
  name: string;
  code: string;
}

export interface ComponentSchema {
  tagName: string;
  className: string;
  summary?: string;
  description?: string;
  attributes: Attribute[];
  slots: Described[];
  cssParts: Described[];
  cssProperties: CssProperty[];
  cssStates: Described[];
  events: EventInfo[];
  mash?: MashComponentContract;
  examples: Example[];
  /** Module that defines the class, e.g. `dist/button/button.js`. */
  modulePath: string;
  /** Module that registers the tag, e.g. `dist/button/register.js`. */
  registerPath?: string;
  /** The npm package the component ships in, e.g. `@mash/ui`. */
  packageName: string;
}

interface ManifestExport {
  kind: string;
  name: string;
  declaration?: { name?: string; module?: string };
}

interface ManifestDeclaration {
  kind: string;
  name: string;
  tagName?: string;
  customElement?: boolean;
  summary?: string;
  description?: string;
  attributes?: Attribute[];
  slots?: Described[];
  cssParts?: Described[];
  cssProperties?: CssProperty[];
  cssStates?: Described[];
  events?: EventInfo[];
  mash?: MashComponentContract;
  examples?: Example[];
}

interface ManifestModule {
  path: string;
  declarations?: ManifestDeclaration[];
  exports?: ManifestExport[];
}

interface Manifest {
  modules: ManifestModule[];
}

/**
 * Every component package in the workspace, each with the manifest it emits.
 *
 * The catalog reads them as one list. Because all packages emit manifests
 * through the same shared analyzer config, the schemas are interchangeable in
 * shape — the only thing the catalog needs to keep track of is which package a
 * component came from, so it can show the right import.
 */
const sources: ReadonlyArray<{ packageName: string; manifest: Manifest }> = [
  { packageName: "@mash/ui", manifest: rawUiManifest as unknown as Manifest },
  { packageName: "@mash/shrine", manifest: rawShrineManifest as unknown as Manifest },
];

const recipes = new Map<string, MashCatalogueRecipe>([
  ["@mash/ui", rawUiRecipe as unknown as MashCatalogueRecipe],
  ["@mash/shrine", rawShrineRecipe as unknown as MashCatalogueRecipe],
]);

/** Portable layout recipes that target one semantic SurfaceTree node. */
export function layoutRulesFor(packageName: string, nodeAddress: string): MashRecipeRule[] {
  return (recipes.get(packageName)?.rules ?? []).filter(
    (rule) => rule.layout && rule.targets.includes(nodeAddress),
  );
}

/** Every visual recipe rule that realizes one semantic SurfaceTree node. */
export function recipeRulesFor(packageName: string, nodeAddress: string): MashRecipeRule[] {
  return (recipes.get(packageName)?.rules ?? []).filter((rule) =>
    rule.targets.includes(nodeAddress),
  );
}

export function catalogueContractFor(
  packageName: string,
): MashCatalogueContractVersions | undefined {
  const recipe = recipes.get(packageName);
  if (!recipe) return undefined;
  return {
    componentContract: recipe.componentContract,
    layoutContract: recipe.layoutContract,
    presentationContract: recipe.presentationContract,
  };
}

/** The component contract that owns a globally stable semantic node address. */
export function componentForNode(nodeAddress: string): ComponentSchema | undefined {
  return components.find((component) =>
    component.mash?.nodes.some((node) => node.address === nodeAddress),
  );
}

/** How the active catalogue accounts for one semantic SurfaceTree node. */
export function catalogueNodeFor(
  packageName: string,
  nodeAddress: string,
): MashCatalogueNode | undefined {
  return recipes.get(packageName)?.nodes[nodeAddress];
}

/**
 * Which module registers each tag.
 *
 * The manifest records a `custom-element-definition` export in whichever module
 * calls `customElements.define`. Because this system keeps definition and
 * registration in separate files, that export lands in `register.js` — so the
 * split the package makes is visible in the schema, and the catalog can show
 * the exact import a consumer needs rather than guessing at a convention.
 */
const registrationModules = new Map<string, string>();
for (const { manifest } of sources) {
  for (const mod of manifest.modules) {
    for (const entry of mod.exports ?? []) {
      if (entry.kind === "custom-element-definition") {
        registrationModules.set(entry.name, mod.path);
      }
    }
  }
}

export const components: ComponentSchema[] = sources
  .flatMap(({ packageName, manifest }) =>
    manifest.modules.flatMap((mod) =>
      (mod.declarations ?? [])
        .filter((declaration) => declaration.customElement && declaration.tagName)
        .map((declaration) => ({
          packageName,
          tagName: declaration.tagName!,
          className: declaration.name,
          summary: declaration.summary,
          description: declaration.description,
          attributes: declaration.attributes ?? [],
          slots: declaration.slots ?? [],
          cssParts: declaration.cssParts ?? [],
          cssProperties: declaration.cssProperties ?? [],
          cssStates: declaration.cssStates ?? [],
          events: declaration.events ?? [],
          mash: declaration.mash,
          examples: declaration.examples ?? [],
          modulePath: mod.path,
          registerPath: registrationModules.get(declaration.tagName!),
        })),
    ),
  )
  .sort((a, b) => a.tagName.localeCompare(b.tagName));

// --- Token graph -----------------------------------------------------------

export type TokenLayer = "reference" | "semantic" | "theme";

export interface TokenEntry {
  id: string;
  layer: TokenLayer;
  type: string;
  cssVar: string;
  description?: string;
  source: string;
  /**
   * Present on reference and semantic tokens.
   *
   * Not always a string: DTCG `number` tokens such as `lineHeight.normal` and
   * `fontWeight` tokens keep their numeric type through the build, which is
   * the honest representation. Use {@link valueOf} rather than reading this
   * directly.
   */
  value?: string | number;
  /** Present on theme tokens, keyed by theme name. Same caveat as {@link value}. */
  values?: Record<string, string | number>;
  aliasOf?: string | Record<string, string>;
  chain?: string[] | Record<string, string[]>;
}

interface TokenGraph {
  themes: string[];
  tokens: Record<string, TokenEntry>;
}

const graph = rawTokens as unknown as TokenGraph;

export const themes: string[] = graph.themes;
export const tokens: Record<string, TokenEntry> = graph.tokens;

export const tokenByCssVar = new Map<string, TokenEntry>(
  Object.values(tokens).map((token) => [token.cssVar, token]),
);

/** The value a token resolves to in a given theme, always as displayable text. */
export function valueOf(token: TokenEntry, theme: string): string {
  const raw = token.values?.[theme] ?? token.value;
  return raw === undefined ? "" : String(raw);
}

export interface ProvenanceStep {
  id: string;
  layer: TokenLayer;
  value: string;
}

/**
 * Walk a token back to the primitive that holds its literal value.
 *
 * This is what turns "the button's background" into
 * `color.action -> color.reference.blue.500 -> oklch(0.6711 0.1572 251.18)`.
 */
export function provenance(token: TokenEntry, theme: string): ProvenanceStep[] {
  const chain = Array.isArray(token.chain) ? token.chain : (token.chain?.[theme] ?? [token.id]);

  return chain.map((id) => {
    const step = tokens[id];
    return {
      id,
      layer: step?.layer ?? token.layer,
      value: step ? valueOf(step, theme) : "",
    };
  });
}
