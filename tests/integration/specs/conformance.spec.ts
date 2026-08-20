import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

interface MashBinding {
  kind: "attribute" | "slot" | "part" | "state" | "event";
  name: string;
  nodeAddress: string;
  intent?: "request" | "report";
}

interface Declaration {
  tagName: string;
  mash: { nodes: Array<{ id: string; address: string }>; bindings: MashBinding[] };
}

interface BehaviorFixture {
  id: string;
  component: string;
  authored?: Record<
    string,
    | string
    | {
        component: string;
        initial?: Record<string, unknown>;
        authored?: BehaviorFixture["authored"];
      }
  >;
  initial?: Record<string, unknown>;
  steps: Array<{ action: "activate" | "focus" | "key" | "set"; node: string; key?: string }>;
  expects: Array<{
    event: string;
    intent: "request" | "report";
    detail?: Record<string, unknown>;
  }>;
}

const readJson = async <T>(relative: string): Promise<T> =>
  JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8")) as T;

const manifests = await Promise.all([
  readJson<{ modules: Array<{ declarations?: Declaration[] }> }>(
    "../../../packages/components/custom-elements.json",
  ),
  readJson<{ modules: Array<{ declarations?: Declaration[] }> }>(
    "../../../packages/shrine-components/custom-elements.json",
  ),
]);
const declarations = new Map(
  manifests
    .flatMap((manifest) => manifest.modules)
    .flatMap((module) => module.declarations ?? [])
    .filter((declaration) => declaration.tagName && declaration.mash)
    .map((declaration) => [declaration.tagName, declaration]),
);
const surfaceFixtures = await readJson<{
  components: Array<{ tag: string; nodes: Array<{ address: string }> }>;
}>("../../../packages/conformance/fixtures/surface-tree.json");
const behaviorFixtures = await readJson<{ fixtures: BehaviorFixture[] }>(
  "../../../packages/conformance/fixtures/behaviors.json",
);

test("the Web renderer realizes every shared SurfaceTree component and authored slot", async ({
  page,
}) => {
  await page.goto("/");
  const inputs = surfaceFixtures.components.map((fixture) => {
    const declaration = declarations.get(fixture.tag);
    if (!declaration) throw new Error(`Missing Web declaration for ${fixture.tag}`);
    return {
      tag: fixture.tag,
      nodes: fixture.nodes.map((node) => node.address),
      slots: declaration.mash.bindings
        .filter((binding) => binding.kind === "slot")
        .map((binding) => binding.name),
    };
  });

  const results = await page.evaluate(async (fixtures) => {
    const allRoots = (root: ParentNode): ShadowRoot[] => {
      const roots: ShadowRoot[] = [];
      const visit = (node: ParentNode) => {
        for (const element of node.querySelectorAll("*")) {
          if (element.shadowRoot) {
            roots.push(element.shadowRoot);
            visit(element.shadowRoot);
          }
        }
      };
      visit(root);
      return roots;
    };

    const realized = [];
    for (const fixture of fixtures) {
      const element = document.createElement(fixture.tag) as HTMLElement & {
        updateComplete?: Promise<unknown>;
      };
      if (fixture.tag === "ui-field") element.setAttribute("invalid", "");
      if (fixture.tag === "ui-slider") element.setAttribute("values", "[20,80]");
      if (fixture.tag === "ui-tree-item") element.setAttribute("kind", "folder");
      document.body.replaceChildren(element);
      await customElements.whenDefined(fixture.tag);
      await element.updateComplete;
      const roots = allRoots(document);
      const missingSlots = fixture.slots.filter((name) =>
        roots.every((root) =>
          name
            ? !root.querySelector(`slot[name="${CSS.escape(name)}"]`)
            : !root.querySelector("slot:not([name]), slot[name='']"),
        ),
      );
      realized.push({
        tag: fixture.tag,
        upgraded: element.constructor !== HTMLElement,
        hasShadowTree: roots.length > 0,
        nodeCount: fixture.nodes.length,
        missingSlots,
      });
    }
    document.body.replaceChildren();
    return realized;
  }, inputs);

  expect(results).toHaveLength(82);
  expect(results.filter((result) => !result.upgraded)).toEqual([]);
  expect(results.filter((result) => !result.hasShadowTree)).toEqual([]);
  expect(results.filter((result) => result.nodeCount === 0)).toEqual([]);
  expect(results.filter((result) => result.missingSlots.length > 0)).toEqual([]);
});

for (const fixture of behaviorFixtures.fixtures) {
  test(`shared behavior: ${fixture.id}`, async ({ page }) => {
    const declaration = declarations.get(fixture.component);
    if (!declaration) throw new Error(`Missing Web declaration for ${fixture.component}`);
    await page.goto("/");

    const observed = await page.evaluate(
      async ({ scenario, webDeclaration, allDeclarations }) => {
        const declarationForNode = (idOrAddress: string) => {
          if (!idOrAddress.startsWith("mash://")) return webDeclaration;
          const tag = /^mash:\/\/([^/]+)\//.exec(idOrAddress)?.[1];
          return allDeclarations.find((candidate) => candidate.tagName === tag);
        };
        const nodeAddress = (idOrAddress: string) => {
          if (idOrAddress.startsWith("mash://")) return idOrAddress;
          return webDeclaration.mash.nodes.find((node) => node.id === idOrAddress)?.address;
        };
        const bindingFor = (idOrAddress: string, kind: MashBinding["kind"]) => {
          const address = nodeAddress(idOrAddress);
          return declarationForNode(idOrAddress)?.mash.bindings.find(
            (binding) => binding.kind === kind && binding.nodeAddress === address,
          );
        };
        const element = document.createElement(scenario.component) as HTMLElement & {
          updateComplete?: Promise<unknown>;
        };

        for (const [id, value] of Object.entries(scenario.initial ?? {})) {
          const binding = bindingFor(id, "attribute");
          if (!binding) throw new Error(`${scenario.id}: no attribute for ${id}`);
          if (typeof value === "boolean") {
            element.toggleAttribute(binding.name, value);
          } else {
            element.setAttribute(binding.name, String(value));
          }
        }

        for (const [id, authored] of Object.entries(scenario.authored ?? {})) {
          const binding = bindingFor(id, "slot");
          if (!binding) throw new Error(`${scenario.id}: no slot for ${id}`);
          const child = document.createElement(
            typeof authored === "string"
              ? id === "trigger"
                ? "button"
                : "span"
              : authored.component,
          );
          if (binding.name) child.slot = binding.name;
          if (typeof authored === "string") {
            child.textContent = authored;
          } else {
            const childDeclaration = allDeclarations.find(
              (candidate) => candidate.tagName === authored.component,
            );
            for (const [childNode, value] of Object.entries(authored.initial ?? {})) {
              const childAddress = childDeclaration?.mash.nodes.find(
                (node) => node.id === childNode,
              )?.address;
              const attribute = childDeclaration?.mash.bindings.find(
                (candidate) =>
                  candidate.kind === "attribute" && candidate.nodeAddress === childAddress,
              );
              if (!attribute)
                throw new Error(`${scenario.id}: no child attribute for ${childNode}`);
              if (typeof value === "boolean") child.toggleAttribute(attribute.name, value);
              else child.setAttribute(attribute.name, String(value));
            }
          }
          element.append(child);
        }

        const events: Array<{ node: string; intent?: string; detail?: unknown }> = [];
        for (const expected of scenario.expects) {
          const binding = bindingFor(expected.event, "event");
          if (!binding) throw new Error(`${scenario.id}: no event for ${expected.event}`);
          element.addEventListener(binding.name, (event) => {
            events.push({
              node: expected.event,
              intent: binding.intent,
              detail: event instanceof CustomEvent ? event.detail : undefined,
            });
          });
        }

        document.body.replaceChildren(element);
        await customElements.whenDefined(scenario.component);
        await element.updateComplete;

        for (const step of scenario.steps) {
          const part = bindingFor(step.node, "part");
          const slot = bindingFor(step.node, "slot");
          const owner = step.node.startsWith("mash://")
            ? element.querySelector<HTMLElement>(
                /^mash:\/\/([^/]+)\//.exec(step.node)?.[1] ?? "__missing__",
              )
            : element;
          const target = part
            ? owner?.shadowRoot?.querySelector<HTMLElement>(`[part~="${CSS.escape(part.name)}"]`)
            : slot
              ? owner?.querySelector<HTMLElement>(
                  slot.name ? `[slot="${CSS.escape(slot.name)}"]` : ":scope > :not([slot])",
                )
              : undefined;
          if (!target) throw new Error(`${scenario.id}: no realized target for ${step.node}`);
          if (step.action === "activate") target.click();
          else if (step.action === "focus") target.focus();
          else if (step.action === "key") {
            target.dispatchEvent(
              new KeyboardEvent("keydown", { key: step.key, bubbles: true, composed: true }),
            );
            target.dispatchEvent(
              new KeyboardEvent("keyup", { key: step.key, bubbles: true, composed: true }),
            );
          }
          await element.updateComplete;
        }
        return events;
      },
      {
        scenario: fixture,
        webDeclaration: declaration,
        allDeclarations: [...declarations.values()],
      },
    );

    expect(observed).toHaveLength(fixture.expects.length);
    fixture.expects.forEach((expected, index) => {
      expect(observed[index]?.node).toBe(expected.event);
      expect(observed[index]?.intent).toBe(expected.intent);
      if (expected.detail) expect(observed[index]?.detail).toMatchObject(expected.detail);
    });
  });
}
