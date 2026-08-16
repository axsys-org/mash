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

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("#app not found");

const first = components[0];
if (!first) throw new Error("custom-elements.json contains no custom elements");

let state: State = initialState(first);

const callbacks: AppCallbacks = {
  select(tagName) {
    const component = components.find((entry) => entry.tagName === tagName);
    if (!component) return;
    // Each component gets a fresh state seeded from its own documented
    // defaults, rather than inheriting attributes that may not apply.
    state = { ...initialState(component), theme: state.theme };
    update();
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

function update(): void {
  render(root!, state, callbacks);
}

update();
