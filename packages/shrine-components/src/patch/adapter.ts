import type {
  Basis,
  BindingOffers,
  IntentArgs,
  OperationReceipt,
  PatchIntent,
  PatchQuery,
  ProjectionAdmission,
  SceneSnapshot,
  SelectionRequest,
  Target,
} from "./contract.js";
import type { GooPatch } from "./patch.js";
/** Existing Goo runtime owns the captured activation, operation ID and receipt ledger. */
export interface CapturedActivation {
  readonly operationId: string;
  readonly activationRef: string;
}
export interface PatchAdapter {
  live(basis: Basis): boolean;
  capture(offer: string, basis: Basis, targets: readonly Target[]): CapturedActivation | null;
  discardCapture?(capture: CapturedActivation): void;
  submit(intent: PatchIntent): void;
  select(request: SelectionRequest): void;
  query(request: PatchQuery): void;
  reconcileOperation(operationId: string): void;
  repair(code: string): void;
  focusRemoved?(): void;
  describeExplanation?(reference: string): string | undefined;
  /** Common Goo working-input policy; no second local form buffer. */
  composing(): boolean;
  subscribeReceipts?(listener: (receipt: OperationReceipt) => void): () => void;
}
export interface PreparedDOM {
  /** Detached proposal (or the live root for geometry-only updates), checked before commit. */
  readonly proposed: Element;
  /** Synchronous common Goo patcher installation. May throw; there is no rollback promise. */
  commit(): void;
}
export interface ProjectionFrame extends ProjectionAdmission {
  prepare(scene: SceneSnapshot): PreparedDOM;
}
export const offerFor = (args: IntentArgs): keyof BindingOffers =>
  (
    ({
      "move-nodes": "moveNodes",
      connect: "connect",
      reconnect: "reconnect",
      disconnect: "disconnect",
      "create-from-port": "createFromPort",
    }) as const
  )[args.kind];
/** Bind only the emitting root. Outer topoi cannot intercept inner semantic events. */
export function bindAdapter(surface: GooPatch, adapter: PatchAdapter): () => void {
  const controller = new AbortController();
  const on = <T>(name: string, callback: (detail: T) => void): void => {
    surface.addEventListener(
      name,
      (event) => {
        if (event.composedPath()[0] !== surface) return;
        callback((event as CustomEvent<T>).detail);
      },
      { signal: controller.signal },
    );
  };
  on<PatchIntent>("goo-patch-intent", (detail) => {
    if (adapter.live(detail.basis)) adapter.submit(detail);
  });
  on<SelectionRequest>("goo-patch-selection", (detail) => {
    if (adapter.live(detail.basis)) adapter.select(detail);
  });
  on<PatchQuery>("goo-patch-query", (detail) => {
    if (adapter.live(detail.basis)) adapter.query(detail);
  });
  const stop = adapter.subscribeReceipts?.((receipt) => surface.receiveReceipt(receipt));
  return () => {
    controller.abort();
    stop?.();
  };
}
