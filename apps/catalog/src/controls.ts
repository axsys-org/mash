/**
 * Derive interactive controls from a component's manifest entry.
 *
 * The catalog never declares that `ui-button` has a `variant` with three
 * options. It reads the attribute's type out of custom-elements.json and picks
 * a control shape from it:
 *
 *   "a" | "b" | "c"  ->  a segmented picker
 *   boolean          ->  a toggle
 *   string           ->  a text field
 *
 * Adding a `tone` to a component, or a fourth variant, changes the catalog with
 * no work here — which is exactly why the union types are expanded into the
 * manifest at build time rather than left as bare type names.
 */

import type { Attribute, ComponentSchema } from "./schema.js";

export type Control =
  | {
      kind: "enum";
      attribute: string;
      description?: string;
      options: string[];
      aliases?: Record<string, string>;
      fallback: string;
    }
  | { kind: "boolean"; attribute: string; description?: string; fallback: boolean }
  | { kind: "text"; attribute: string; description?: string; fallback: string };

const STRING_LITERAL = /^"([^"]*)"$/;

/** `"a" | "b"` -> `["a", "b"]`, or null when the type is not a literal union. */
function literalUnion(text: string): string[] | null {
  const parts = text.split("|").map((part) => part.trim());
  if (parts.length < 2) return null;

  const values = parts.map((part) => STRING_LITERAL.exec(part)?.[1]);
  return values.every((value) => value !== undefined) ? (values as string[]) : null;
}

/** Manifest defaults arrive as source text: `"medium"`, `false`, `""`. */
function parseDefault(raw: string | undefined): string | boolean | undefined {
  if (raw === undefined) return undefined;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return STRING_LITERAL.exec(raw)?.[1] ?? raw;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizedSizeOptions(
  options: string[],
  preferredMiddle: "base" | "medium",
): {
  options: string[];
  aliases: Record<string, string>;
} {
  const available = new Set(options);
  const seenGroups = new Set<string>();
  const aliases: Record<string, string> = {};
  const canonical: string[] = [];
  const groups = [
    { key: "xsmall", preferred: "xsmall", values: ["xs", "xsmall"] },
    { key: "small", preferred: "small", values: ["sm", "small"] },
    { key: "middle", preferred: preferredMiddle, values: ["base", "md", "medium"] },
    { key: "large", preferred: "large", values: ["lg", "large"] },
    { key: "xl", preferred: "xl", values: ["xl"] },
    { key: "2xl", preferred: "2xl", values: ["2xl"] },
  ];
  const valueGroups = new Map<string, (typeof groups)[number]>();

  for (const group of groups) {
    for (const value of group.values) valueGroups.set(value, group);

    const canonicalValue = available.has(group.preferred)
      ? group.preferred
      : group.values.find((value) => available.has(value));
    if (!canonicalValue) continue;

    for (const value of group.values) {
      if (available.has(value) && value !== canonicalValue) aliases[value] = canonicalValue;
    }
  }

  for (const option of options) {
    const group = valueGroups.get(option);
    if (!group) {
      canonical.push(option);
      continue;
    }
    if (seenGroups.has(group.key)) continue;
    seenGroups.add(group.key);
    canonical.push(aliases[option] ?? option);
  }

  return { options: unique(canonical), aliases };
}

function normalizedEnumOptions(
  component: ComponentSchema,
  attribute: Attribute,
  options: string[],
): { options: string[]; aliases?: Record<string, string> } {
  if (attribute.name !== "size") return { options: unique(options) };

  const normalized = normalizedSizeOptions(
    options,
    component.tagName === "ui-label" ? "base" : "medium",
  );
  const hasAliases = Object.keys(normalized.aliases).length > 0;
  return hasAliases ? normalized : { options: normalized.options };
}

export function enumControlValue(
  control: Extract<Control, { kind: "enum" }>,
  raw: string,
): string | null {
  return canonicalEnumValue(control.options, control.aliases, raw);
}

function canonicalEnumValue(
  options: string[],
  aliases: Record<string, string> | undefined,
  raw: string,
): string | null {
  const value = aliases?.[raw] ?? raw;
  return options.includes(value) ? value : null;
}

function controlFor(component: ComponentSchema, attribute: Attribute): Control | null {
  const text = attribute.type?.text?.trim();
  if (!text) return null;

  const fallback = parseDefault(attribute.default);
  const shared = { attribute: attribute.name, description: attribute.description };

  const options = literalUnion(text);
  if (options) {
    const normalized = normalizedEnumOptions(component, attribute, options);
    const fallbackValue =
      typeof fallback === "string"
        ? canonicalEnumValue(normalized.options, normalized.aliases, fallback)
        : null;
    return {
      ...shared,
      kind: "enum",
      ...normalized,
      fallback: fallbackValue ?? normalized.options[0]!,
    };
  }

  if (text === "boolean") {
    return { ...shared, kind: "boolean", fallback: fallback === true };
  }

  if (text === "string") {
    return { ...shared, kind: "text", fallback: typeof fallback === "string" ? fallback : "" };
  }

  // An attribute whose type the catalog cannot render a control for is skipped
  // rather than guessed at. It still shows up in the API table below.
  return null;
}

export function controlsFor(component: ComponentSchema): Control[] {
  return component.attributes
    .map((attribute) => controlFor(component, attribute))
    .filter((control): control is Control => control !== null);
}

/** The initial attribute state for a component: every control at its documented default. */
export function defaultState(component: ComponentSchema): Record<string, string | boolean> {
  const state: Record<string, string | boolean> = {};
  for (const control of controlsFor(component)) {
    state[control.attribute] = control.fallback;
  }
  return state;
}
