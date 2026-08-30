/**
 * Catalog entry point.
 *
 * Note what is imported: the real workspace packages, exactly as an application
 * would consume them. There is no parallel copy of the components here, and no
 * build step that treats the catalog specially — if an import in this file
 * breaks, a consumer's would too.
 */

import "./system.css";
import "@mash/ui/catalogue/mash.css";
import "@mash/shrine/catalogue/mash.css";
import "@mash/ui/register";
import "@mash/shrine/register";

import { initialState, render, type AppCallbacks, type State } from "./app.js";
import { components } from "./schema.js";
import { stateFromUrl, urlForState } from "./url-state.js";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("#app not found");

// The catalog demonstrates the default Mash recipe explicitly. Components
// remain behaviour-only without this opt-in, so another product can load a
// different catalogue without changing the component module.
document.documentElement.dataset.mashCatalogue = "mash";

const first = components[0];
if (!first) throw new Error("custom-elements.json contains no custom elements");

let state: State = stateFromUrl(new URL(globalThis.location.href), first);

// Canonicalise the entry URL, so "/" and a link carrying stale parameters both
// become the address that actually describes what is on screen.
history.replaceState(null, "", urlForState(state));

const callbacks: AppCallbacks = {
  select(tagName) {
    const component = components.find((entry) => entry.tagName === tagName);
    if (!component) return;
    // Each component gets a fresh state seeded from its own documented
    // defaults, rather than inheriting attributes that may not apply.
    state = {
      ...initialState(component),
      theme: state.theme,
      vibrancy: state.vibrancy,
    };
    update("push");
  },

  update(patch) {
    state = { ...state, ...patch };
    update();
  },

  setAttr(attribute, value) {
    state = { ...state, attrs: { ...state.attrs, [attribute]: value } };
    update();
  },
};

/**
 * Render, and keep the address bar in step.
 *
 * Choosing a different component is a navigation and gets a history entry;
 * nudging a control is not, and replaces the current one. Otherwise a designer
 * who tried four variants would need four Backs to leave the page, and the
 * back button would be useless for the thing it is actually wanted for.
 */
function update(mode: "push" | "replace" = "replace"): void {
  const next = urlForState(state);
  if (next !== location.pathname + location.search) {
    if (mode === "push") history.pushState(null, "", next);
    else history.replaceState(null, "", next);
  }
  render(root!, state, callbacks);
}

// Back/forward: the URL is the source of truth, so re-read it and render. No
// history write here — the browser has already moved the entry.
globalThis.addEventListener("popstate", () => {
  state = stateFromUrl(new URL(globalThis.location.href), first);
  render(root!, state, callbacks);
});

globalThis.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.source === window) return;
  const data: unknown = event.data;
  if (
    typeof data !== "object" ||
    data === null ||
    !("type" in data) ||
    data.type !== "mash-catalog-example-state" ||
    !("key" in data) ||
    typeof data.key !== "string" ||
    !/^[a-z][a-z0-9-]{0,31}$/.test(data.key) ||
    !("value" in data) ||
    typeof data.value !== "string" ||
    data.value.length > 4096
  )
    return;
  state = {
    ...state,
    exampleState: { ...state.exampleState, [data.key]: data.value },
  };
  const next = urlForState(state);
  if (next !== location.pathname + location.search) history.replaceState(null, "", next);
});

update();
