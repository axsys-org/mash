import {
  catalogueContractFor,
  componentForNode,
  recipeRulesFor,
  tokens,
  type MashRecipeRule,
  type TokenEntry,
} from "./schema.js";

export const RECIPE_PATCH_SCHEMA = "https://mash.axsys.dev/schema/recipe-patch-1.0.0.json" as const;

type RecipeCondition = MashRecipeRule["when"]["conditions"][number];
export type PortableRecipeCondition = Exclude<RecipeCondition, { kind: "renderer" }>;
export type RecipeValueKind = "token" | "literal" | "expression" | "inherited";

export interface RecipePatchValue {
  kind: RecipeValueKind;
  value?: string;
  token?: string;
  tokens?: string[];
}

export interface RecipeOverride {
  nodeAddress: string;
  trait: string;
  conditions: PortableRecipeCondition[];
  occurrence: number;
  value: RecipePatchValue;
}

export interface MashRecipePatch {
  $schema: typeof RECIPE_PATCH_SCHEMA;
  version: "1.0.0";
  componentContract: string;
  layoutContract: string;
  presentationContract: string;
  overrides: RecipeOverride[];
}

const inheritedValues = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);

export function portableConditions(rule: MashRecipeRule): PortableRecipeCondition[] {
  return rule.when.conditions.filter(
    (condition): condition is PortableRecipeCondition => condition.kind !== "renderer",
  );
}

function conditionsKey(conditions: PortableRecipeCondition[]): string {
  return JSON.stringify(conditions);
}

export function overrideKey(override: Omit<RecipeOverride, "value">): string {
  return [
    override.nodeAddress,
    override.trait,
    conditionsKey(override.conditions),
    override.occurrence,
  ].join("\u001f");
}

export function overrideForRule(
  nodeAddress: string,
  trait: string,
  rules: MashRecipeRule[],
  ruleIndex: number,
  value: RecipePatchValue,
): RecipeOverride {
  const rule = rules[ruleIndex];
  if (!rule) throw new Error(`Unknown recipe rule ${ruleIndex} for ${nodeAddress}.`);
  const conditions = portableConditions(rule);
  const occurrence = rules
    .slice(0, ruleIndex)
    .filter(
      (candidate) =>
        trait in candidate.presentation &&
        conditionsKey(portableConditions(candidate)) === conditionsKey(conditions),
    ).length;
  return { nodeAddress, trait, conditions, occurrence, value };
}

export function upsertOverride(
  overrides: RecipeOverride[],
  next: RecipeOverride,
): RecipeOverride[] {
  const key = overrideKey(next);
  return [...overrides.filter((candidate) => overrideKey(candidate) !== key), next];
}

export function removeOverride(
  overrides: RecipeOverride[],
  target: Omit<RecipeOverride, "value">,
): RecipeOverride[] {
  const key = overrideKey(target);
  return overrides.filter((candidate) => overrideKey(candidate) !== key);
}

export function findOverride(
  overrides: RecipeOverride[],
  target: Omit<RecipeOverride, "value">,
): RecipeOverride | undefined {
  const key = overrideKey(target);
  return overrides.find((candidate) => overrideKey(candidate) === key);
}

function inferredTokenTypes(trait: string): string[] {
  if (/color|fill|ink|stroke|accent|caret/i.test(trait)) return ["color"];
  if (/family/i.test(trait)) return ["fontFamily"];
  if (/weight/i.test(trait)) return ["fontWeight"];
  if (/lineHeight|opacity|grow|shrink/i.test(trait)) return ["number"];
  if (/duration/i.test(trait)) return ["duration"];
  if (/easing/i.test(trait)) return ["cubicBezier"];
  if (/size|width|radius|offset|tracking|gap|padding|margin|inset|basis/i.test(trait)) {
    return ["dimension"];
  }
  return [];
}

export function compatibleTokenTypes(trait: string, recipeTokens: string[]): string[] {
  const current = [
    ...new Set(
      recipeTokens.map((token) => tokens[token]?.type).filter((type): type is string => !!type),
    ),
  ];
  return current.length > 0 ? current : inferredTokenTypes(trait);
}

export function compatibleTokens(trait: string, recipeTokens: string[]): TokenEntry[] {
  const types = new Set(compatibleTokenTypes(trait, recipeTokens));
  if (types.size === 0) return [];
  return Object.values(tokens)
    .filter((token) => token.layer !== "reference" && types.has(token.type))
    .sort((a, b) => a.id.localeCompare(b.id));
}

const layoutIntents: Record<string, string[]> = {
  display: ["group.kind"],
  "flex-direction": ["group.orientation", "group.reverse"],
  "flex-wrap": ["group.wrap"],
  "align-items": ["align"],
  "justify-content": ["distribute"],
  "align-self": ["self.align"],
  "justify-self": ["self.distribute"],
  gap: ["gap.block", "gap.inline"],
  "row-gap": ["gap.block"],
  "column-gap": ["gap.inline"],
  "min-inline-size": ["dimensions.inline.min"],
  "min-width": ["dimensions.inline.min"],
  "inline-size": ["dimensions.inline.ideal"],
  width: ["dimensions.inline.ideal"],
  "max-inline-size": ["dimensions.inline.max"],
  "max-width": ["dimensions.inline.max"],
  "min-block-size": ["dimensions.block.min"],
  "min-height": ["dimensions.block.min"],
  "block-size": ["dimensions.block.ideal"],
  height: ["dimensions.block.ideal"],
  "max-block-size": ["dimensions.block.max"],
  "max-height": ["dimensions.block.max"],
  padding: ["inset.blockStart", "inset.blockEnd", "inset.inlineStart", "inset.inlineEnd"],
  "padding-block": ["inset.blockStart", "inset.blockEnd"],
  "padding-inline": ["inset.inlineStart", "inset.inlineEnd"],
  margin: ["margin.blockStart", "margin.blockEnd", "margin.inlineStart", "margin.inlineEnd"],
  position: ["anchor.mode"],
  inset: ["anchor.blockStart", "anchor.blockEnd", "anchor.inlineStart", "anchor.inlineEnd"],
  "z-index": ["anchor.layer"],
  overflow: ["overflow.block", "overflow.inline"],
  "overflow-x": ["overflow.inline"],
  "overflow-y": ["overflow.block"],
};

export function layoutIntentForProperty(property: string): string[] {
  if (layoutIntents[property]) return layoutIntents[property];
  for (const edge of ["block-start", "block-end", "inline-start", "inline-end"]) {
    const semantic = edge.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    if (property === `padding-${edge}`) return [`inset.${semantic}`];
    if (property === `margin-${edge}`) return [`margin.${semantic}`];
    if (property === `inset-${edge}`) return [`anchor.${semantic}`];
  }
  return [];
}

const layoutChoices: Record<string, string[]> = {
  display: ["none", "contents", "flow", "grid", "overlay"],
  "flex-direction": ["inline", "inline-reverse", "block", "block-reverse"],
  "flex-wrap": ["none", "forward", "reverse"],
  "align-items": ["leading", "center", "trailing", "stretch", "baseline"],
  "align-self": ["leading", "center", "trailing", "stretch", "baseline"],
  "justify-content": ["leading", "center", "trailing", "between", "around", "evenly", "stretch"],
  "justify-self": ["leading", "center", "trailing", "stretch"],
  "flex-flow": ["inline", "block"],
  overflow: ["visible", "clip", "hidden", "auto", "scroll"],
  "overflow-x": ["visible", "clip", "hidden", "auto", "scroll"],
  "overflow-y": ["visible", "clip", "hidden", "auto", "scroll"],
  position: ["flow", "relative", "absolute", "fixed", "sticky"],
};

export function layoutChoicesForProperty(property: string): string[] {
  return layoutChoices[property] ?? [];
}

function semanticLayoutValue(property: string, value: string): string {
  if (property === "display") {
    return { flow: "flex", overlay: "grid" }[value] ?? value;
  }
  if (property === "flex-direction") {
    return (
      {
        inline: "row",
        "inline-reverse": "row-reverse",
        block: "column",
        "block-reverse": "column-reverse",
      }[value] ?? value
    );
  }
  if (property === "flex-wrap") {
    return { none: "nowrap", forward: "wrap", reverse: "wrap-reverse" }[value] ?? value;
  }
  if (/^(?:align|justify)-(?:items|self|content)$/.test(property)) {
    return (
      {
        leading: "flex-start",
        trailing: "flex-end",
        between: "space-between",
        around: "space-around",
        evenly: "space-evenly",
      }[value] ?? value
    );
  }
  if (property === "position" && value === "flow") return "static";
  return value;
}

export function tokenReferences(value: string): string[] {
  return [...new Set([...value.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]!))];
}

export function portableValueToCss(
  value: RecipePatchValue,
  sourceProperty?: string,
): string | null {
  if (value.kind === "token") {
    const token = value.token ? tokens[value.token] : undefined;
    return token ? `var(${token.cssVar})` : null;
  }
  if (value.kind === "inherited")
    return value.value && inheritedValues.has(value.value) ? value.value : null;
  if (value.value === undefined) return null;
  const portable = value.value.replace(/\{([^{}]+)\}/g, (_, token: string) => {
    const entry = tokens[token];
    return entry ? `var(${entry.cssVar})` : `{${token}}`;
  });
  return sourceProperty ? semanticLayoutValue(sourceProperty, portable) : portable;
}

export function validateRecipeValue(
  value: RecipePatchValue,
  trait: string,
  sourceProperty: string,
  recipeTokens: string[],
  supports?: (property: string, value: string) => boolean,
): string | null {
  const compatible = new Set(compatibleTokenTypes(trait, recipeTokens));
  if (value.kind === "token") {
    const token = value.token ? tokens[value.token] : undefined;
    if (!token) return "Choose a published token.";
    if (compatible.size > 0 && !compatible.has(token.type)) {
      return `${trait} accepts ${[...compatible].join(" or ")} tokens; ${token.id} is ${token.type}.`;
    }
  } else if (value.kind === "inherited") {
    if (!value.value || !inheritedValues.has(value.value)) {
      return "Inherited values must be inherit, initial, unset, revert, or revert-layer.";
    }
  } else {
    if (!value.value?.trim()) return "Enter a value.";
    if (value.value.includes("var(--")) {
      return "Use renderer-neutral {token.id} references instead of CSS custom properties.";
    }
    const referenced = tokenReferences(value.value);
    const unknown = referenced.find((token) => !tokens[token]);
    if (unknown) return `Unknown token reference {${unknown}}.`;
    const incompatible = referenced.find(
      (token) => compatible.size > 0 && !compatible.has(tokens[token]!.type),
    );
    if (incompatible) {
      return `${trait} accepts ${[...compatible].join(" or ")} tokens; ${incompatible} is ${tokens[incompatible]!.type}.`;
    }
    if (value.kind === "literal" && referenced.length > 0) {
      return "Token references make this an expression, not a literal.";
    }
  }

  const css = portableValueToCss(value, sourceProperty);
  if (!css) return "The value cannot be realized.";
  if (supports && !supports(sourceProperty, css)) {
    return `${css} is not valid for ${sourceProperty}.`;
  }
  return null;
}

function matchingRule(override: RecipeOverride): MashRecipeRule | undefined {
  const owner = componentForNode(override.nodeAddress);
  if (!owner) return undefined;
  const key = conditionsKey(override.conditions);
  return recipeRulesFor(owner.packageName, override.nodeAddress)
    .filter(
      (rule) =>
        override.trait in rule.presentation && conditionsKey(portableConditions(rule)) === key,
    )
    .at(override.occurrence);
}

export function playgroundStyle(overrides: RecipeOverride[]): string {
  return overrides
    .map((override) => {
      const rule = matchingRule(override);
      const presentation = rule?.presentation[override.trait];
      const css = presentation
        ? portableValueToCss(override.value, presentation.sourceProperty)
        : null;
      if (!rule || !presentation || !css) return "";
      let realized = `${rule.when.web.selector}{${presentation.sourceProperty}:${css}!important;}`;
      for (let index = rule.when.web.context.length - 1; index >= 0; index -= 1) {
        const context = rule.when.web.context[index]!;
        realized = `${context}{${realized}}`;
      }
      return realized;
    })
    .filter(Boolean)
    .join("\n");
}

export function recipePatch(overrides: RecipeOverride[]): MashRecipePatch {
  const firstOwner = overrides[0] ? componentForNode(overrides[0].nodeAddress) : undefined;
  const versions = catalogueContractFor(firstOwner?.packageName ?? "@mash/ui") ?? {
    componentContract: "1.0.0",
    layoutContract: "2.0.0",
    presentationContract: "1.0.0",
  };
  return {
    $schema: RECIPE_PATCH_SCHEMA,
    version: "1.0.0",
    ...versions,
    overrides,
  };
}

function structurallyValidValue(value: unknown): value is RecipePatchValue {
  if (!value || typeof value !== "object") return false;
  const candidate = value as RecipePatchValue;
  if (!["token", "literal", "expression", "inherited"].includes(candidate.kind)) return false;
  if (candidate.kind === "token") return typeof candidate.token === "string";
  if (typeof candidate.value !== "string") return false;
  return candidate.kind !== "expression" || Array.isArray(candidate.tokens);
}

export function parseRecipeOverrides(raw: string | null): RecipeOverride[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((candidate): candidate is RecipeOverride => {
      if (!candidate || typeof candidate !== "object") return false;
      const override = candidate as RecipeOverride;
      if (
        typeof override.nodeAddress !== "string" ||
        typeof override.trait !== "string" ||
        !Array.isArray(override.conditions) ||
        !Number.isInteger(override.occurrence) ||
        override.occurrence < 0 ||
        !structurallyValidValue(override.value)
      ) {
        return false;
      }
      const rule = matchingRule(override);
      const presentation = rule?.presentation[override.trait];
      if (
        override.value.kind === "expression" &&
        JSON.stringify([...(override.value.tokens ?? [])].sort()) !==
          JSON.stringify(tokenReferences(override.value.value ?? "").sort())
      ) {
        return false;
      }
      return Boolean(
        presentation &&
        !validateRecipeValue(
          override.value,
          override.trait,
          presentation.sourceProperty,
          presentation.tokens,
          globalThis.CSS?.supports
            ? (property, value) => globalThis.CSS.supports(property, value)
            : undefined,
        ),
      );
    });
  } catch {
    return [];
  }
}
