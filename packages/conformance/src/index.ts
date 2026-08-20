/** A renderer-independent reference to one node in a Mash SurfaceTree. */
export interface SurfaceNodeFixture {
  id: string;
  address: string;
  role: string;
  family: string;
  ownership: "authored" | "controlled" | "reported" | "realized";
  parent?: string;
  values: unknown[];
  defaults: unknown[];
  fallbacks: unknown[];
  channels: Array<"content" | "input" | "output" | "realization" | "state">;
  availability: string[];
}

export interface EventRelationFixture {
  kind: "requests" | "reports";
  path: string[];
  nodeAddress: string;
}

export interface EventFixture {
  nodeAddress: string;
  role: string;
  intent: "request" | "report";
  relations: EventRelationFixture[];
  value: unknown;
}

export interface ComponentFixture {
  tag: string;
  package: "ui" | "shrine";
  address: string;
  root: string;
  nodes: SurfaceNodeFixture[];
  events: EventFixture[];
}

export interface SurfaceTreeFixtures {
  $schema: string;
  version: "1.0.0";
  componentContract: "1.0.0";
  components: ComponentFixture[];
}

export interface BehaviorStep {
  action: "activate" | "focus" | "key" | "set";
  node: string;
  key?: string;
  value?: unknown;
}

export interface AuthoredFixtureComponent {
  component: string;
  initial?: Record<string, unknown>;
  authored?: Record<string, string | AuthoredFixtureComponent>;
}

export interface BehaviorExpectation {
  event: string;
  intent: "request" | "report";
  detail?: Record<string, unknown>;
}

export interface BehaviorFixture {
  id: string;
  component: string;
  authored?: Record<string, string | AuthoredFixtureComponent>;
  initial?: Record<string, unknown>;
  steps: BehaviorStep[];
  expects: BehaviorExpectation[];
}

export interface RendererSnapshot {
  component: string;
  nodes: Array<{ address: string; parent?: string }>;
  events: Array<{ nodeAddress: string; intent: "request" | "report" }>;
}

export interface RecipePatchValue {
  kind: "token" | "literal" | "expression" | "inherited";
  value?: string;
  token?: string;
  tokens?: string[];
}

export interface PortableRecipeOverride {
  nodeAddress: string;
  trait: string;
  conditions: unknown[];
  occurrence: number;
  value: RecipePatchValue;
}

export interface PortableRecipePatch {
  $schema: "https://mash.axsys.dev/schema/recipe-patch-1.0.0.json";
  version: "1.0.0";
  componentContract: string;
  layoutContract: string;
  presentationContract: string;
  overrides: PortableRecipeOverride[];
}

/**
 * Shared structural gate used by every renderer runner. It deliberately deals
 * only in semantic node addresses; DOM slots and GPUI builders are adapter
 * details and cannot leak into the fixture.
 */
export function compareRendererSnapshot(
  fixture: ComponentFixture,
  snapshot: RendererSnapshot,
): string[] {
  const problems: string[] = [];
  if (snapshot.component !== fixture.tag) {
    problems.push(`expected ${fixture.tag}, received ${snapshot.component}`);
  }

  const actualNodes = new Map(snapshot.nodes.map((node) => [node.address, node]));
  for (const expected of fixture.nodes) {
    const actual = actualNodes.get(expected.address);
    if (!actual) {
      problems.push(`missing node ${expected.address}`);
    } else if (actual.parent !== expected.parent) {
      problems.push(`parent mismatch for ${expected.address}`);
    }
  }

  const actualEvents = new Map(snapshot.events.map((event) => [event.nodeAddress, event]));
  for (const expected of fixture.events) {
    const actual = actualEvents.get(expected.nodeAddress);
    if (!actual) {
      problems.push(`missing event ${expected.nodeAddress}`);
    } else if (actual.intent !== expected.intent) {
      problems.push(`intent mismatch for ${expected.nodeAddress}`);
    }
  }
  return problems;
}
