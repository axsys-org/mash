/**
 * The URL *is* the catalog's state.
 *
 * The point is a review workflow: a designer configures a component in a
 * preview deployment, copies the address bar, and pastes it into a PR comment.
 * Whoever opens that link sees exactly what they saw.
 *
 *   /components/ui-button?variant=quiet&size=small&theme=dark&vibrancy=vibrant
 *   /components/ui-tree-item?expanded=true&selected=true&theme=dark
 *
 * This is deliberately not a state framework. It is two pure functions over
 * `URL` and `State`, plus the twenty lines in main.ts that call them. Rules:
 *
 * - only values that differ from the component's own defaults are written, so
 *   the common case stays short and the link is readable in a comment;
 * - anything unrecognised — unknown component, unknown attribute, an enum
 *   value that is not one of the documented options — falls back to the
 *   default rather than throwing. Links outlive the code they were copied
 *   from, and a stale link should degrade, not break.
 */

import { initialState, vibrancyModes, type State, type VibrancyMode } from "./app.js";
import { controlsFor } from "./controls.js";
import { controlsPreviewAllowed, examplesFor } from "./examples.js";
import { components, themes, type ComponentSchema } from "./schema.js";

/** Route prefix. `/components/ui-button`. */
const ROUTE = "/components/";

/**
 * Query key for the example picker. `?example=controls` selects the
 * controls-driven preview over the component's first `@example`.
 */
const CONTROLS = "controls";
const EXAMPLE_STATE_PREFIX = "state-";

/** Reserved keys, so a component attribute called `theme` cannot collide. */
const RESERVED = new Set(["theme", "vibrancy", "example", "slots"]);

function slotParam(name: string): string {
  return `slot-${name || "default"}`;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** The component a path names, or null when the path names none. */
export function componentFromPath(pathname: string): ComponentSchema | null {
  if (!pathname.startsWith(ROUTE)) return null;
  const tagName = decodeURIComponent(pathname.slice(ROUTE.length).replace(/\/+$/, ""));
  return components.find((entry) => entry.tagName === tagName) ?? null;
}

function parseBoolean(raw: string): boolean {
  return raw === "" || raw === "true" || raw === "1";
}

/**
 * Rebuild the full application state from a URL.
 *
 * Starts from the component's documented defaults and applies only the
 * parameters that are valid, which is what makes truncated or hand-edited
 * links behave sensibly.
 */
export function stateFromUrl(url: URL, fallback: ComponentSchema): State {
  const component = componentFromPath(url.pathname) ?? fallback;
  const state = initialState(component);
  const params = url.searchParams;
  let hasPreviewOverride = false;

  const theme = params.get("theme");
  if (theme && themes.includes(theme)) state.theme = theme;

  const vibrancy = params.get("vibrancy");
  if (vibrancy && vibrancyModes.some((mode) => mode === vibrancy)) {
    state.vibrancy = vibrancy as VibrancyMode;
  }

  const example = params.get("example");
  if (example === CONTROLS && controlsPreviewAllowed(component)) {
    state.example = null;
  } else if (example && examplesFor(component).some((entry) => entry.name === example)) {
    state.example = example;
  }

  for (const [key, value] of params) {
    if (!key.startsWith(EXAMPLE_STATE_PREFIX) || value.length > 4096) continue;
    const name = key.slice(EXAMPLE_STATE_PREFIX.length);
    if (/^[a-z][a-z0-9-]{0,31}$/.test(name)) state.exampleState[name] = value;
  }

  // `label` and the comma-separated `slots` list are the catalog's pre-slot
  // URL format. Read them for old review links, then always write the explicit
  // per-slot format below.
  const legacyLabel = params.get("label");
  if (legacyLabel !== null && component.slots.some((slot) => !slot.name)) {
    state.slots[""] = legacyLabel;
    hasPreviewOverride = true;
  }

  const slotNames = new Set(component.slots.map((slot) => slot.name).filter(Boolean));
  for (const name of (params.get("slots") ?? "").split(",")) {
    if (slotNames.has(name)) {
      state.slots[name] = name;
      hasPreviewOverride = true;
    }
  }

  for (const slot of component.slots) {
    const content = params.get(slotParam(slot.name));
    if (content !== null) {
      state.slots[slot.name] = content;
      hasPreviewOverride = true;
    }
  }

  for (const control of controlsFor(component)) {
    if (RESERVED.has(control.attribute)) continue;
    const raw = params.get(control.attribute);
    if (raw === null) continue;
    hasPreviewOverride = true;

    if (control.kind === "enum") {
      if (control.options.includes(raw)) state.attrs[control.attribute] = raw;
    } else if (control.kind === "boolean") {
      state.attrs[control.attribute] = parseBoolean(raw);
    } else {
      state.attrs[control.attribute] = raw;
    }
  }

  if (example === null && hasPreviewOverride && controlsPreviewAllowed(component)) {
    state.example = null;
  }

  return state;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/** The canonical URL for a state: route plus the parameters that differ from default. */
export function urlForState(state: State): string {
  const component = components.find((entry) => entry.tagName === state.tagName);
  if (!component) return "/";

  const defaults = initialState(component);
  const params = new URLSearchParams();

  if (state.theme !== defaults.theme) params.set("theme", state.theme);
  if (state.vibrancy !== defaults.vibrancy) params.set("vibrancy", state.vibrancy);

  if (state.example !== defaults.example) {
    params.set("example", state.example ?? CONTROLS);
  }

  for (const [name, value] of Object.entries(state.exampleState)) {
    if (value && /^[a-z][a-z0-9-]{0,31}$/.test(name)) {
      params.set(`${EXAMPLE_STATE_PREFIX}${name}`, value);
    }
  }

  for (const slot of component.slots) {
    const value = state.slots[slot.name] ?? "";
    const fallback = defaults.slots[slot.name] ?? "";
    if (value !== fallback) params.set(slotParam(slot.name), value);
  }

  for (const control of controlsFor(component)) {
    if (RESERVED.has(control.attribute)) continue;
    const value = state.attrs[control.attribute];
    if (value === undefined || value === control.fallback) continue;
    params.set(control.attribute, String(value));
  }

  const query = params.toString();
  return `${ROUTE}${component.tagName}${query ? `?${query}` : ""}`;
}
