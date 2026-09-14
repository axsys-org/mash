import type { CatalogExample } from "./examples.js";

/** The same setup is usable in a standalone document and a composed preview. */
export function exampleScript(example: CatalogExample): string | undefined {
  if (!example.script || !example.scoped) return example.script;
  return `async function mountExample(root) {
  const lifecycle = new AbortController();
  const signal = lifecycle.signal;
${example.script}
  return () => lifecycle.abort();
}
const disposeExample = await mountExample(document.querySelector('body > [data-mash-catalogue="mash"]'));
addEventListener("pagehide", disposeExample, { once: true });`;
}
