/**
 * Catalog entry point.
 *
 * Note what is imported: the real workspace packages, exactly as an application
 * would consume them. There is no parallel copy of the components here, and no
 * build step that treats the catalog specially — if an import in this file
 * breaks, a consumer's would too.
 */

import "@mash/tokens/tokens.css";
import "@mash/ui/register";
import "@mash/shrine/register";

import "./catalog.css";

import { initialState, render, type AppCallbacks, type State } from "./app.js";
import { components } from "./schema.js";
import { stateFromUrl, urlForState } from "./url-state.js";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("#app not found");

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
    state = { ...initialState(component), theme: state.theme };
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

update();
