/**
 * A tiny fixture helper.
 *
 * Deliberately not a Lit testing library. The components are Web Components,
 * and the tests should exercise them through the platform API that any consumer
 * would use — `innerHTML`, attributes, events, `shadowRoot` — so that the suite
 * keeps passing if the internals ever stop being Lit. The single concession is
 * awaiting `updateComplete` when a component happens to expose it, which is how
 * you wait for *any* async-rendering element to settle.
 */

const mounted = new Set<HTMLElement>();

/** Anything with an async render cycle, Lit or otherwise. */
interface AsyncRendering {
  updateComplete?: Promise<unknown>;
}

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });

/**
 * Wait until every element in the tree has finished rendering.
 *
 * The extra frame matters: `slotchange` and the first paint of a nested
 * component land after the outermost element's `updateComplete` resolves.
 */
export async function settled(root: ParentNode): Promise<void> {
  const nodes = [root, ...root.querySelectorAll("*")];
  await Promise.all(
    nodes.map((node) => (node as unknown as AsyncRendering).updateComplete).filter(Boolean),
  );
  await nextFrame();
}

/** Render `markup` into the document and return its first element, fully settled. */
export async function fixture<T extends Element = HTMLElement>(markup: string): Promise<T> {
  const container = document.createElement("div");
  container.innerHTML = markup;
  document.body.append(container);
  mounted.add(container);

  await settled(container);

  const element = container.firstElementChild;
  if (!element) throw new Error("fixture() markup produced no element");
  return element as T;
}

/** Remove everything mounted by `fixture()`. Registered globally in setup.ts. */
export function cleanupFixtures(): void {
  for (const container of mounted) container.remove();
  mounted.clear();
}

/** The shadow root of an element, or a clear failure if it has none. */
export function shadow(element: Element): ShadowRoot {
  const root = element.shadowRoot;
  if (!root) throw new Error(`<${element.localName}> has no shadow root`);
  return root;
}

/** Query inside an element's shadow root. */
export function inShadow<T extends Element = HTMLElement>(element: Element, selector: string): T {
  const found = shadow(element).querySelector<T>(selector);
  if (!found) throw new Error(`no ${selector} inside <${element.localName}>'s shadow root`);
  return found;
}
