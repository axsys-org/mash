import type {
  Basis,
  IntentArgs,
  OperationReceipt,
  PatchIntent,
  PatchQuery,
  SelectionRequest,
  Target,
  SceneSnapshot,
} from "../contract.js";
import type { CapturedActivation, PatchAdapter, PreparedDOM } from "../adapter.js";
import { immutable, sameBasis } from "../scene.js";
import type { GooPatch } from "../patch.js";
/** Structural interfaces for Explorer's actual goo-actions.js API; no transport here. */
export interface GooControl {
  readonly id: string;
  readonly kind: string;
  readonly control: string;
  readonly slot?: string;
  readonly captures?: readonly unknown[];
  readonly invoke?: boolean;
}
export interface GooActionContext {
  readonly target: string;
  readonly view: string;
  readonly snapshot: {
    readonly target: string;
    readonly expected: string;
    readonly displayed: string;
    readonly publication: string;
    readonly life: string;
  };
  readonly controls: readonly GooControl[];
  readonly saved?: (result: unknown, inputs: Map<string, string>) => unknown;
  readonly [key: string]: unknown;
}
export interface GooPresentation {
  readonly html: string;
  readonly controls: readonly GooControl[];
  readonly context: unknown;
  readonly profile?: unknown;
  readonly display?: unknown;
}
export interface GooActionsBoundary {
  bind(container: Element, context: GooActionContext): void;
  captureActivation(
    container: Element,
    context: GooActionContext,
    control: GooControl,
  ): CapturedActivation;
  discardCaptured(handle: CapturedActivation): void;
  activateCaptured(
    handle: CapturedActivation,
    inputs?: readonly (readonly [string, string])[],
  ): Promise<unknown>;
  subscribeOutcomes(
    listener: (receipt: {
      operationId: string;
      outcome: OperationReceipt["outcome"];
      result?: unknown;
    }) => void,
  ): () => void;
  prepareMount(
    container: Element,
    data: GooPresentation,
    preserve: boolean,
    section: boolean,
  ): { proposed: Element; commit(): unknown };
}
export interface OfferedPatchBinding {
  readonly container: Element;
  readonly context: GooActionContext;
  readonly control: GooControl;
  /** Server-declared input slot receiving the typed gesture arguments. No receiver override. */
  readonly argumentSlot: string;
  readonly kind: IntentArgs["kind"];
}
export interface GooPatchOwner {
  /** Implement using GooSession.current(ticket) and the live presentation occurrence. */
  live(basis: Basis): boolean;
  /** Translate occurrences through the owning selection port, then reflect accepted selection. */
  select(request: SelectionRequest): void;
  query(request: PatchQuery): void;
  composing(): boolean;
  repair(code: string): void;
  reconcileOperation(id: string): void;
  focusRemoved?(): void;
  describeExplanation?(reference: string): string | undefined;
}
/** Uses the same captured invocation and /goo/act admission path as ordinary Goo buttons.
 * The owner must supply real offered controls and a canonical selection adapter.
 */
export function gooAdapter(
  actions: GooActionsBoundary,
  owner: GooPatchOwner,
  offers: ReadonlyMap<string, OfferedPatchBinding>,
): PatchAdapter {
  const explanations = new Map<string, string>();
  const captures = new Map<
    string,
    {
      handle: CapturedActivation;
      binding: OfferedPatchBinding;
      basis: Basis;
      targets: readonly Target[];
      submitted: boolean;
    }
  >();
  return {
    ...owner,
    describeExplanation: (reference) =>
      explanations.get(reference) ?? owner.describeExplanation?.(reference),
    live: (b) => owner.live(b),
    select: (r) => owner.select(r),
    query: (r) => owner.query(r),
    composing: () => owner.composing(),
    repair: (c) => owner.repair(c),
    reconcileOperation: (id) => owner.reconcileOperation(id),
    capture(offer, basis, targets) {
      const binding = offers.get(offer);
      if (!binding || !owner.live(basis)) return null;
      if (captures.size >= 128) {
        const oldest = [...captures].find(([, v]) => !v.submitted);
        if (!oldest) return null;
        captures.delete(oldest[0]);
      }
      const handle = actions.captureActivation(binding.container, binding.context, binding.control);
      captures.set(handle.activationRef, {
        handle,
        binding,
        basis: immutable(structuredClone(basis)),
        targets: immutable(structuredClone(targets)),
        submitted: false,
      });
      return handle;
    },
    discardCapture(handle) {
      const held = captures.get(handle.activationRef);
      if (held && !held.submitted) {
        actions.discardCaptured(held.handle);
        captures.delete(handle.activationRef);
      }
    },
    submit(intent: PatchIntent) {
      const held = captures.get(intent.activationRef);
      if (
        !held ||
        held.handle.operationId !== intent.operationId ||
        held.binding.kind !== intent.args.kind ||
        !sameBasis(held.basis, intent.basis) ||
        !owner.live(intent.basis)
      ) {
        owner.repair("binding-unavailable");
        return;
      }
      held.submitted = true;
      // This slot belongs to the offered action's declared myth input. Server admission
      // still validates the typed arguments, receiver, evidence and occurrence lifetimes.
      void actions
        .activateCaptured(held.handle, [[held.binding.argumentSlot, JSON.stringify(intent.args)]])
        .then((value) => {
          const result = value as { result: unknown; savedInputs: Map<string, string> };
          return held.binding.context.saved?.(result.result, result.savedInputs);
        })
        .catch(() => {
          /* Shared outcome subscription owns feedback. */
        });
    },
    subscribeReceipts(listener) {
      return actions.subscribeOutcomes((receipt) => {
        const held = [...captures.values()].find(
          (v) => v.handle.operationId === receipt.operationId,
        );
        if (!held) return;
        const explanation =
          typeof receipt.result === "object" && receipt.result !== null && "error" in receipt.result
            ? String(receipt.result.error).slice(0, 500)
            : undefined;
        if (explanation) {
          explanations.set(receipt.operationId, explanation);
          if (explanations.size > 64) explanations.delete(explanations.keys().next().value!);
        }
        listener({
          operationId: receipt.operationId,
          surface: held.basis.surface,
          encounter: held.basis.encounter,
          outcome: receipt.outcome,
          ...(explanation ? { explanationRef: receipt.operationId } : {}),
        });
        if (receipt.outcome !== "unknown") captures.delete(held.handle.activationRef);
      });
    },
  };
}
/** Stage per-occurrence HTML through GooActions.prepareMount. Geometry, ports and labels
 * must all be supplied by the same upstream prepared scene. Stable shells are retained.
 * Called by ProjectionFrame.prepare only after freshness and composition admission.
 */
export function prepareGooDOM(
  actions: GooActionsBoundary,
  surface: GooPatch,
  scene: SceneSnapshot,
  content: {
    nodes: ReadonlyMap<string, GooPresentation>;
    connections: ReadonlyMap<string, GooPresentation>;
    actionContext(
      key: string,
      kind: "node" | "connection",
      data: GooPresentation,
    ): GooActionContext;
  },
): PreparedDOM {
  const proposed = document.createElement("goo-patch");
  const commits: (() => void)[] = [];
  const desired: Element[] = [];
  for (const [records, tag, source] of [
    [scene.nodes, "goo-patch-node", content.nodes],
    [scene.connections, "goo-patch-connection", content.connections],
  ] as const) {
    for (const record of records) {
      const data = source.get(record.key);
      if (!data) throw new Error("invalid-scene");
      const previous =
        tag === "goo-patch-node"
          ? surface.index?.nodes.get(record.key)
          : surface.index?.connections.get(record.key);
      const held =
        tag === "goo-patch-node"
          ? surface.dom?.nodes.get(record.key)
          : surface.dom?.connections.get(record.key);
      const continuing = previous?.lifetime === record.lifetime;
      const element = continuing && held ? held : document.createElement(tag);
      element.dataset.key = record.key;
      const plan = actions.prepareMount(element, data, !!continuing, false);
      const preview = document.createElement(tag);
      preview.dataset.key = record.key;
      // Only detached prepared nodes move during staging. No working input is cloned.
      preview.append(...plan.proposed.childNodes);
      proposed.append(preview);
      commits.push(() => {
        plan.proposed.append(...preview.childNodes);
        plan.commit();
        actions.bind(
          element,
          content.actionContext(record.key, tag === "goo-patch-node" ? "node" : "connection", data),
        );
      });
      desired.push(element);
    }
  }
  return {
    proposed,
    commit() {
      for (const commit of commits) commit();
      const keep = new Set(desired);
      for (const child of Array.from(surface.children))
        if (child.matches("goo-patch-node,goo-patch-connection") && !keep.has(child))
          child.remove();
      // Placement alone does not reorder DOM; append only newly realized occurrences.
      for (const element of desired) if (element.parentElement !== surface) surface.append(element);
    },
  };
}

/** Connect the adapter to an existing GooPanes work lifetime and composition policy.
 * The selector/query translators remain explicit because GooSession currently accepts
 * one member, whereas this boundary can propose multiple occurrence targets.
 */
export function attachGooPatch(
  surface: GooPatch,
  actions: GooActionsBoundary,
  panes: { registerPatchSurface(surface: GooPatch, work: PatchWork): () => void },
  work: PatchWork,
  offers: ReadonlyMap<string, OfferedPatchBinding>,
  owner: Omit<GooPatchOwner, "live" | "composing">,
): () => void {
  const encounter = work.encounter?.id;
  const adapter = gooAdapter(
    actions,
    {
      ...owner,
      live: (basis) =>
        work.live &&
        work.encounter?.id === encounter &&
        basis.surface === work.id &&
        basis.encounter === String(encounter),
      composing: () => [...work.inputs.values()].some((input) => input.composing),
    },
    offers,
  );
  surface.attachAdapter(adapter);
  const unregister = panes.registerPatchSurface(surface, work);
  return () => {
    unregister();
    surface.retire();
  };
}
export interface PatchWork {
  id: string;
  live: boolean;
  encounter?: { id: unknown };
  inputs: Map<string, { composing: boolean }>;
}
