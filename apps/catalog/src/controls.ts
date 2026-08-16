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
  | { kind: "enum"; attribute: string; description?: string; options: string[]; fallback: string }
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

function controlFor(attribute: Attribute): Control | null {
  const text = attribute.type?.text?.trim();
  if (!text) return null;

  const fallback = parseDefault(attribute.default);
  const shared = { attribute: attribute.name, description: attribute.description };

  const options = literalUnion(text);
  if (options) {
    return {
      ...shared,
      kind: "enum",
      options,
      fallback: typeof fallback === "string" && options.includes(fallback) ? fallback : options[0]!,
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
    .map(controlFor)
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
