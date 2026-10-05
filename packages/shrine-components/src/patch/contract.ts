/**
 * Proposed HTML-backend boundary for Goo's server-laid-out patching topos.
 * This is a specification companion, not a claim about existing repository APIs.
 * Map these concepts to established Goo contracts before adding new runtime types.
 * All records received from the server are read-only projection data.
 */
export type Key = string;
export type OpaqueRef = string;
export type OperationId = string;
export type GestureId = string;
export type QueryId = string;
export type Seq = number; // Nonnegative safe integer; ordered only in one encounter.

export interface Point {
  readonly x: number;
  readonly y: number;
}
export interface Rect extends Point {
  readonly width: number;
  readonly height: number;
}
export interface Camera {
  readonly tx: number;
  readonly ty: number;
  readonly scale: number;
}

export interface SceneHeader {
  readonly protocol: 1;
  readonly surface: OpaqueRef;
  readonly encounter: OpaqueRef;
  readonly viewSeq: Seq;
  readonly sourceRev: OpaqueRef;
  readonly layoutRev: OpaqueRef;
  readonly rendererEpoch: OpaqueRef;
}

export interface NodeTarget {
  readonly kind: "node";
  readonly node: Key;
  readonly lifetime: OpaqueRef;
}
export interface PortTarget {
  readonly kind: "port";
  readonly node: Key;
  readonly nodeLifetime: OpaqueRef;
  readonly port: Key;
  readonly lifetime: OpaqueRef;
}
export interface ConnectionTarget {
  readonly kind: "connection";
  readonly connection: Key;
  readonly lifetime: OpaqueRef;
}
export interface ConnectionPartTarget {
  readonly kind: "connection-part";
  readonly connection: Key;
  readonly connectionLifetime: OpaqueRef;
  readonly part: Key;
  readonly lifetime: OpaqueRef;
}
export type Target = NodeTarget | PortTarget | ConnectionTarget | ConnectionPartTarget;

export interface Identity {
  readonly key: Key;
  readonly lifetime: OpaqueRef;
  readonly selectorRef: OpaqueRef;
}

export interface PortRecord extends Identity {
  /** All geometry is relative to the owning node's resolved border-box origin. */
  readonly anchor: Point;
  readonly outward: Point; // Unit vector, supplied by the server.
  readonly hitRect: Rect;
  /** Optional visual hints only; neither field authorizes an edit. */
  readonly direction?: "input" | "output" | "bidirectional" | "neutral";
  readonly connectable: boolean;
}

export interface NodeRecord extends Identity {
  readonly rect: Rect; // Absolute world coordinates.
  readonly z: number;
  readonly presentation: "node" | "proxy";
  readonly draggable: boolean;
  readonly ports: readonly PortRecord[];
}

export interface Endpoint {
  readonly key: Key; // Identity within this connection, not its port key.
  readonly port: PortTarget;
  readonly role?: string; // Opaque to the browser.
}
export interface Junction {
  readonly key: Key;
  readonly point: Point;
  readonly marker?: "none" | "dot";
}
export type RouteEnd =
  | { readonly kind: "endpoint"; readonly key: Key }
  | { readonly kind: "junction"; readonly key: Key };

/** Absolute world-coordinate commands. Exactly one initial M; then L/C only. */
export type PathCommand =
  | { readonly op: "M"; readonly to: Point }
  | { readonly op: "L"; readonly to: Point }
  | { readonly op: "C"; readonly c1: Point; readonly c2: Point; readonly to: Point };

export interface ConnectionPart extends Identity {}
export interface RouteSegment {
  readonly key: Key;
  readonly from: RouteEnd;
  readonly to: RouteEnd;
  readonly commands: readonly PathCommand[];
  readonly part?: Key; // Only when this branch has explicit domain identity.
  readonly startMarker?: "none" | "arrow" | "dot";
  readonly endMarker?: "none" | "arrow" | "dot";
}
export interface ConnectionLabel {
  readonly key: Key;
  readonly rect: Rect; // Server-resolved world rectangle for ordinary Goo HTML.
  readonly part?: Key;
}
export interface ConnectionRecord extends Identity {
  readonly topologyRef: OpaqueRef;
  readonly z: number;
  readonly endpoints: readonly Endpoint[];
  readonly junctions: readonly Junction[];
  readonly segments: readonly RouteSegment[];
  readonly parts: readonly ConnectionPart[];
  readonly labels: readonly ConnectionLabel[];
  readonly reconnectable: boolean;
  readonly disconnectable: boolean;
}

export interface BindingOffers {
  /** These refer to existing Goo bindings. They are not endpoint URLs. */
  readonly moveNodes?: OpaqueRef;
  readonly connect?: OpaqueRef;
  readonly reconnect?: OpaqueRef;
  readonly disconnect?: OpaqueRef;
  readonly createFromPort?: OpaqueRef;
  readonly compatibility?: OpaqueRef;
  readonly context?: OpaqueRef;
  readonly createPicker?: OpaqueRef;
  readonly reveal?: OpaqueRef;
}

export interface InteractionPolicy {
  readonly minScale: number;
  readonly maxScale: number;
  readonly dragThresholdPx: number;
  readonly touchDragThresholdPx: number;
  readonly snapTolerancePx: number;
  readonly portTolerancePx: number;
  readonly touchPortTolerancePx: number;
  readonly wireTolerancePx: number;
  readonly grid?: { readonly origin: Point; readonly step: Point };
  readonly alignmentSnap: boolean;
  readonly autoPanBandPx: number;
  readonly autoPanMaxPxPerSecond: number;
}

export interface SceneSnapshot {
  readonly header: SceneHeader;
  readonly extent: Rect;
  /** Creation-only; no effect on ordinary later projections. */
  readonly initialCamera: Camera | { readonly kind: "fit"; readonly paddingPx: number };
  readonly policy: InteractionPolicy;
  readonly offers: BindingOffers;
  readonly nodes: readonly NodeRecord[];
  readonly connections: readonly ConnectionRecord[];
}

export type DomUpdate =
  { readonly kind: "complete" } | { readonly kind: "delta"; readonly baseViewSeq: Seq };

export interface ProjectionAdmission {
  readonly scene: SceneSnapshot;
  readonly dom: DomUpdate;
  /** Proof supplied by the owning runtime: this installed projection accounts for
   * these operations, including effects overwritten/filtered by later state.
   * Not inferred by comparing opaque revision strings.
   */
  readonly coveredOperationIds: readonly OperationId[];
  /** Explicit semantic retirement. Mere unrealization is not deletion. */
  readonly retiredTargets?: readonly Target[];
}

export interface Basis {
  readonly surface: OpaqueRef;
  readonly encounter: OpaqueRef;
  readonly viewSeq: Seq;
  readonly sourceRev: OpaqueRef;
  readonly layoutRev: OpaqueRef;
}

export type IntentArgs =
  | {
      readonly kind: "move-nodes";
      readonly nodes: readonly {
        readonly target: NodeTarget;
        readonly baseOrigin: Point;
        readonly proposedOrigin: Point;
      }[];
    }
  | { readonly kind: "connect"; readonly from: PortTarget; readonly to: PortTarget }
  | {
      readonly kind: "reconnect";
      readonly connection: ConnectionTarget;
      readonly topologyRef: OpaqueRef;
      readonly endpoint: Key;
      readonly to: PortTarget;
    }
  | {
      readonly kind: "disconnect";
      readonly connection: ConnectionTarget;
      readonly topologyRef: OpaqueRef;
      readonly endpoint?: Key;
    }
  | {
      readonly kind: "create-from-port";
      readonly from: PortTarget;
      readonly worldPoint: Point;
      readonly choiceRef: OpaqueRef;
    };

export interface PatchIntent {
  readonly basis: Basis;
  readonly operationId: OperationId;
  readonly gestureId: GestureId;
  /** Captured through the existing Goo activation path, not fabricated in JS. */
  readonly activationRef: OpaqueRef;
  readonly args: IntentArgs;
}

export interface SelectionRequest {
  readonly basis: Basis;
  readonly gestureId: GestureId;
  readonly mode: "replace" | "add" | "toggle";
  readonly targets: readonly Target[];
}

export type PatchQuery = {
  readonly basis: Basis;
  readonly queryId: QueryId;
  readonly gestureId?: GestureId;
} & (
  | { readonly kind: "compatibility"; readonly from: PortTarget }
  | { readonly kind: "context"; readonly target: Target; readonly worldPoint: Point }
  | { readonly kind: "create-picker"; readonly from: PortTarget; readonly worldPoint: Point }
  | { readonly kind: "reveal"; readonly selectorRef: OpaqueRef }
);

export interface CompatibilityResult {
  readonly queryId: QueryId;
  readonly gestureId: GestureId;
  readonly basis: Basis;
  readonly from: PortTarget;
  /** Missing entries remain unknown, never implicitly forbidden. */
  readonly candidates: readonly {
    readonly target: PortTarget;
    readonly status: "allowed" | "forbidden";
    readonly explanationRef?: OpaqueRef;
  }[];
}

export interface OperationReceipt {
  readonly operationId: OperationId;
  readonly surface: OpaqueRef;
  readonly encounter: OpaqueRef;
  /** "accepted" means admitted/committed, not merely queued. */
  readonly outcome: "accepted" | "rejected" | "unknown";
  readonly commitRef?: OpaqueRef;
  readonly explanationRef?: OpaqueRef;
}

export interface HitResult {
  readonly target: Target;
  readonly selectorRef: OpaqueRef;
  readonly worldPoint: Point;
}
export interface ProjectedRegion {
  readonly target: Target;
  readonly bounds: Rect;
  readonly space: "world";
}
export interface ViewportNotice {
  readonly basis: Basis;
  readonly viewportEpoch: Seq;
  readonly visibleWorldRect: Rect;
  readonly scale: number;
}

/** Public surface-level API. The Goo adapter supplies transport, authority,
 * selection algebra, focus policy and lifetime retirement. */
export interface PatchSurfaceAPI {
  pick(clientPoint: Point): HitResult | null;
  project(targets: readonly Target[]): readonly ProjectedRegion[];
  reveal(targets: readonly Target[]): "revealed" | "unrealized";
  fit(targets?: readonly Target[]): void;
  getCamera(): Camera;
  setCamera(camera: Camera): void;
  setSelection(targets: readonly Target[]): void; // Must not re-emit a selection intent.
  cancelGesture(reason: string): void;
  receiveCompatibility(result: CompatibilityResult): void;
  receiveReceipt(receipt: OperationReceipt): void;
}

export interface PatchEventDetailMap {
  "goo-patch-selection": SelectionRequest;
  "goo-patch-intent": PatchIntent;
  "goo-patch-query": PatchQuery;
  "goo-patch-viewport": ViewportNotice;
  "goo-patch-diagnostic": { readonly code: string; readonly message: string };
}
