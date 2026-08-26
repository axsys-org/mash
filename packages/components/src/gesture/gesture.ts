export type GestureKind = "command" | "press" | "long-press" | "drag" | "hover" | "wheel" | "key";
export type GesturePhase = "possible" | "began" | "changed" | "ended" | "cancelled" | "failed";
export type GestureSource = "imperative" | "pointer" | "touch" | "pen" | "keyboard" | "wheel";
export type GestureAxis = "x" | "y" | "both";
export type GestureModifier = "Alt" | "Control" | "Meta" | "Shift" | "Primary";
export type GesturePreventDefault = "never" | "recognized" | "always";

export interface GesturePoint {
  x: number;
  y: number;
}

export interface GestureModifiers {
  alt: boolean;
  control: boolean;
  meta: boolean;
  shift: boolean;
}

export interface GestureContext {
  event: Event;
  modifiers: GestureModifiers;
  source: GestureSource;
  target: HTMLElement;
}

export interface GestureDescriptor {
  kind: GestureKind;
  axis?: GestureAxis;
  button?: number;
  capture?: boolean;
  code?: string;
  delay?: number;
  key?: string;
  modifiers?: readonly GestureModifier[];
  pointerTypes?: readonly string[];
  preventDefault?: GesturePreventDefault;
  repeat?: boolean;
  threshold?: number;
}

export interface GestureBinding<T = unknown> {
  command: string;
  data?: T;
  disabled?: boolean;
  gesture: GestureDescriptor;
  group?: string;
  id?: string;
  priority?: number;
  requireFailure?: readonly string[];
  simultaneous?: boolean;
  when?: (context: GestureContext) => boolean;
}

export interface GestureValue {
  code?: string;
  delta?: GesturePoint;
  key?: string;
  movement?: GesturePoint;
  origin?: GesturePoint;
  point?: GesturePoint;
  velocity?: GesturePoint;
  wheel?: GesturePoint;
}

export interface MashCommandDetail<T = unknown> {
  bindingId: string;
  command: string;
  data?: T;
  gesture: GestureKind;
  modifiers: GestureModifiers;
  originalEvent?: Event;
  phase: Exclude<GesturePhase, "possible" | "failed">;
  source: GestureSource;
  target: HTMLElement;
  value: GestureValue;
}

export interface GestureStateDetail {
  bindingId: string;
  command: string;
  gesture: GestureKind;
  originalEvent?: Event;
  source: GestureSource;
  state: GesturePhase;
  target: HTMLElement;
}

export interface DispatchCommandOptions<T = unknown> {
  bindingId?: string;
  data?: T;
  gesture?: GestureKind;
  modifiers?: Partial<GestureModifiers>;
  originalEvent?: Event;
  phase?: Exclude<GesturePhase, "possible" | "failed">;
  source?: GestureSource;
  value?: GestureValue;
}

export interface GestureBindingHandle {
  readonly controller: GestureController;
  readonly id: string;
  destroy(): void;
  update(binding: GestureBinding): void;
}

interface NormalizedGestureBinding<T = unknown> extends GestureBinding<T> {
  id: string;
}

interface PointerSession {
  bindings: NormalizedGestureBinding[];
  claimedGroups: Map<string, string>;
  last: GesturePoint;
  lastEvent: PointerEvent;
  lastTime: number;
  origin: GesturePoint;
  pointerId: number;
  states: Map<string, GesturePhase>;
  timers: Map<string, number>;
}

interface WheelSession {
  binding: NormalizedGestureBinding;
  event: WheelEvent;
  timer: number;
}

const controllerRegistry = new WeakMap<HTMLElement, GestureController>();
let generatedBindingId = 0;

const modifierAliases = new Map<string, GestureModifier>([
  ["alt", "Alt"],
  ["option", "Alt"],
  ["⌥", "Alt"],
  ["control", "Control"],
  ["ctrl", "Control"],
  ["⌃", "Control"],
  ["meta", "Meta"],
  ["command", "Meta"],
  ["cmd", "Meta"],
  ["⌘", "Meta"],
  ["shift", "Shift"],
  ["⇧", "Shift"],
  ["primary", "Primary"],
  ["mod", "Primary"],
]);

const keyAliases = new Map<string, string>([
  ["esc", "Escape"],
  ["escape", "Escape"],
  ["return", "Enter"],
  ["enter", "Enter"],
  ["space", " "],
  ["spacebar", " "],
  ["left", "ArrowLeft"],
  ["right", "ArrowRight"],
  ["up", "ArrowUp"],
  ["down", "ArrowDown"],
]);

const emptyModifiers = (): GestureModifiers => ({
  alt: false,
  control: false,
  meta: false,
  shift: false,
});

const eventTime = (event: Event): number =>
  Number.isFinite(event.timeStamp) && event.timeStamp > 0 ? event.timeStamp : performance.now();

const pointFromPointer = (event: PointerEvent): GesturePoint => ({
  x: event.clientX,
  y: event.clientY,
});

const subtract = (left: GesturePoint, right: GesturePoint): GesturePoint => ({
  x: left.x - right.x,
  y: left.y - right.y,
});

const distance = (point: GesturePoint): number => Math.hypot(point.x, point.y);

const normalizedKey = (value: string): string => {
  const alias = keyAliases.get(value.toLowerCase());
  if (alias !== undefined) return alias;
  return value.length === 1 ? value.toLowerCase() : value;
};

const primaryModifier = (target: HTMLElement): "Meta" | "Control" => {
  const platform = target.ownerDocument.defaultView?.navigator.platform ?? "";
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? "Meta" : "Control";
};

function sourceFromEvent(event: Event): GestureSource {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof WheelEvent) return "wheel";
  if (event instanceof PointerEvent) {
    if (event.pointerType === "touch") return "touch";
    if (event.pointerType === "pen") return "pen";
    return "pointer";
  }
  return "imperative";
}

export function modifiersFromEvent(event?: Event): GestureModifiers {
  if (!(event instanceof MouseEvent || event instanceof KeyboardEvent)) return emptyModifiers();
  return {
    alt: event.altKey,
    control: event.ctrlKey,
    meta: event.metaKey,
    shift: event.shiftKey,
  };
}

function requestedModifiers(
  target: HTMLElement,
  values: readonly GestureModifier[] = [],
): GestureModifiers {
  const result = emptyModifiers();
  for (const value of values) {
    const resolved = value === "Primary" ? primaryModifier(target) : value;
    if (resolved === "Alt") result.alt = true;
    else if (resolved === "Control") result.control = true;
    else if (resolved === "Meta") result.meta = true;
    else if (resolved === "Shift") result.shift = true;
  }
  return result;
}

function modifiersMatch(
  target: HTMLElement,
  event: Event,
  requested: readonly GestureModifier[] = [],
): boolean {
  const actual = modifiersFromEvent(event);
  const expected = requestedModifiers(target, requested);
  return (
    actual.alt === expected.alt &&
    actual.control === expected.control &&
    actual.meta === expected.meta &&
    actual.shift === expected.shift
  );
}

function pointerSourceAllowed(binding: NormalizedGestureBinding, event: PointerEvent): boolean {
  const pointerTypes = binding.gesture.pointerTypes;
  return !pointerTypes || pointerTypes.length === 0 || pointerTypes.includes(event.pointerType);
}

function axisValue(point: GesturePoint, axis: GestureAxis = "both"): GesturePoint {
  if (axis === "x") return { x: point.x, y: 0 };
  if (axis === "y") return { x: 0, y: point.y };
  return point;
}

function shouldPrevent(
  binding: NormalizedGestureBinding,
  timing: "initial" | "recognized",
): boolean {
  const policy = binding.gesture.preventDefault ?? "never";
  return policy === "always" || (policy === "recognized" && timing === "recognized");
}

function canPrevent(event: Event): boolean {
  return event.cancelable && typeof event.preventDefault === "function";
}

function prevent(event: Event): void {
  if (canPrevent(event)) event.preventDefault();
}

export function parseGestureModifiers(value: string): GestureModifier[] {
  const result: GestureModifier[] = [];
  for (const token of value.split(/[+,\s]+/).filter(Boolean)) {
    const modifier = modifierAliases.get(token.toLowerCase());
    if (modifier && !result.includes(modifier)) result.push(modifier);
  }
  return result;
}

export function parseGestureShortcut(
  value: string,
): Pick<GestureDescriptor, "key" | "code" | "modifiers"> {
  const tokens = value
    .split("+")
    .map((token) => token.trim())
    .filter(Boolean);
  const modifiers: GestureModifier[] = [];
  let key: string | undefined;
  let code: string | undefined;
  for (const token of tokens) {
    const modifier = modifierAliases.get(token.toLowerCase());
    if (modifier) {
      if (!modifiers.includes(modifier)) modifiers.push(modifier);
      continue;
    }
    if (token.toLowerCase().startsWith("code:")) code = token.slice("code:".length);
    else key = normalizedKey(token);
  }
  return { key, code, modifiers };
}

export function formatAriaShortcut(
  target: HTMLElement,
  descriptor: GestureDescriptor,
): string | undefined {
  if (descriptor.kind !== "key" || !descriptor.key) return undefined;
  const modifiers = requestedModifiers(target, descriptor.modifiers);
  const tokens: string[] = [];
  if (modifiers.alt) tokens.push("Alt");
  if (modifiers.control) tokens.push("Control");
  if (modifiers.meta) tokens.push("Meta");
  if (modifiers.shift) tokens.push("Shift");
  const key = descriptor.key.length === 1 ? descriptor.key.toUpperCase() : descriptor.key;
  return [...tokens, key === " " ? "Space" : key].join("+");
}

export function dispatchCommand<T = unknown>(
  target: HTMLElement,
  command: string,
  options: DispatchCommandOptions<T> = {},
): boolean {
  const originalEvent = options.originalEvent;
  const detail: MashCommandDetail<T> = {
    bindingId: options.bindingId ?? "imperative",
    command,
    data: options.data,
    gesture: options.gesture ?? "command",
    modifiers: {
      ...emptyModifiers(),
      ...modifiersFromEvent(originalEvent),
      ...options.modifiers,
    },
    originalEvent,
    phase: options.phase ?? "ended",
    source: options.source ?? sourceFromEvent(originalEvent ?? new Event("command")),
    target,
    value: options.value ?? {},
  };
  return target.dispatchEvent(
    new CustomEvent<MashCommandDetail<T>>("mash-command", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    }),
  );
}

/**
 * Headless input recognizer and gesture arena.
 *
 * It owns transient recognition only. Consumers own application state, DOM
 * movement, selection, navigation, persistence, and visual feedback.
 */
export class GestureController {
  readonly target: HTMLElement;
  readonly #bindings = new Map<string, NormalizedGestureBinding>();
  readonly #authoredAriaKeyShortcuts: string | null;
  readonly #hovering = new Map<string, NormalizedGestureBinding>();
  readonly #activeKeys = new Map<string, NormalizedGestureBinding>();
  readonly #wheels = new Map<string, WheelSession>();
  #pointer: PointerSession | undefined;
  #destroyed = false;

  constructor(target: HTMLElement, bindings: readonly GestureBinding[] = []) {
    if (!target.ownerDocument.defaultView) {
      throw new Error("Gesture target must belong to a live document.");
    }
    this.target = target;
    this.#authoredAriaKeyShortcuts = target.getAttribute("aria-keyshortcuts");
    target.addEventListener("pointerdown", this.#onPointerDown);
    target.addEventListener("pointermove", this.#onPointerMove);
    target.addEventListener("pointerup", this.#onPointerEnd);
    target.addEventListener("pointercancel", this.#onPointerCancel);
    target.addEventListener("lostpointercapture", this.#onLostPointerCapture);
    target.addEventListener("pointerenter", this.#onPointerEnter);
    target.addEventListener("pointerleave", this.#onPointerLeave);
    target.addEventListener("keydown", this.#onKeyDown);
    target.addEventListener("keyup", this.#onKeyUp);
    target.addEventListener("wheel", this.#onWheel, { passive: false });
    for (const binding of bindings) this.addBinding(binding);
  }

  get size(): number {
    return this.#bindings.size;
  }

  get bindings(): readonly GestureBinding[] {
    return [...this.#bindings.values()];
  }

  addBinding(binding: GestureBinding): string {
    const id = binding.id || `mash-gesture-${++generatedBindingId}`;
    this.#bindings.set(id, { ...binding, id });
    this.#syncAriaKeyShortcuts();
    return id;
  }

  updateBinding(id: string, binding: GestureBinding): void {
    if (!this.#bindings.has(id)) return;
    this.#bindings.set(id, { ...binding, id });
    this.#syncAriaKeyShortcuts();
  }

  removeBinding(id: string): void {
    this.#bindings.delete(id);
    this.#hovering.delete(id);
    this.#syncAriaKeyShortcuts();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#clearPointer();
    for (const session of this.#wheels.values()) clearTimeout(session.timer);
    this.#wheels.clear();
    this.#hovering.clear();
    this.#activeKeys.clear();
    this.target.removeEventListener("pointerdown", this.#onPointerDown);
    this.target.removeEventListener("pointermove", this.#onPointerMove);
    this.target.removeEventListener("pointerup", this.#onPointerEnd);
    this.target.removeEventListener("pointercancel", this.#onPointerCancel);
    this.target.removeEventListener("lostpointercapture", this.#onLostPointerCapture);
    this.target.removeEventListener("pointerenter", this.#onPointerEnter);
    this.target.removeEventListener("pointerleave", this.#onPointerLeave);
    this.target.removeEventListener("keydown", this.#onKeyDown);
    this.target.removeEventListener("keyup", this.#onKeyUp);
    this.target.removeEventListener("wheel", this.#onWheel);
    if (this.#authoredAriaKeyShortcuts === null) this.target.removeAttribute("aria-keyshortcuts");
    else this.target.setAttribute("aria-keyshortcuts", this.#authoredAriaKeyShortcuts);
    this.#destroyed = true;
  }

  #eligible(binding: NormalizedGestureBinding, event: Event): boolean {
    if (binding.disabled || !binding.command) return false;
    const context: GestureContext = {
      event,
      modifiers: modifiersFromEvent(event),
      source: sourceFromEvent(event),
      target: this.target,
    };
    return (
      modifiersMatch(this.target, event, binding.gesture.modifiers) &&
      (!binding.when || binding.when(context))
    );
  }

  #matches(kind: GestureKind, event: Event): NormalizedGestureBinding[] {
    return [...this.#bindings.values()]
      .filter((binding) => binding.gesture.kind === kind && this.#eligible(binding, event))
      .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
  }

  #resolveConcurrent(bindings: NormalizedGestureBinding[]): NormalizedGestureBinding[] {
    const groups = new Set<string>();
    return bindings.filter((binding) => {
      if (binding.simultaneous) return true;
      const group = binding.group ?? "default";
      if (groups.has(group)) return false;
      groups.add(group);
      return true;
    });
  }

  #state(
    binding: NormalizedGestureBinding,
    state: GesturePhase,
    event: Event,
    source = sourceFromEvent(event),
  ): void {
    this.target.dispatchEvent(
      new CustomEvent<GestureStateDetail>("mash-gesture-state", {
        bubbles: true,
        composed: true,
        detail: {
          bindingId: binding.id,
          command: binding.command,
          gesture: binding.gesture.kind,
          originalEvent: event,
          source,
          state,
          target: this.target,
        },
      }),
    );
  }

  #command(
    binding: NormalizedGestureBinding,
    phase: Exclude<GesturePhase, "possible" | "failed">,
    event: Event,
    value: GestureValue = {},
  ): void {
    this.#state(binding, phase, event);
    dispatchCommand(this.target, binding.command, {
      bindingId: binding.id,
      data: binding.data,
      gesture: binding.gesture.kind,
      originalEvent: event,
      phase,
      source: sourceFromEvent(event),
      value,
    });
    if (shouldPrevent(binding, "recognized")) prevent(event);
  }

  #pointerValue(
    session: PointerSession,
    event: PointerEvent,
    axis: GestureAxis = "both",
  ): GestureValue {
    const point = pointFromPointer(event);
    const delta = axisValue(subtract(point, session.last), axis);
    const movement = axisValue(subtract(point, session.origin), axis);
    const elapsed = Math.max(1, eventTime(event) - session.lastTime);
    return {
      point,
      origin: session.origin,
      delta,
      movement,
      velocity: { x: delta.x / elapsed, y: delta.y / elapsed },
    };
  }

  #canClaim(session: PointerSession, binding: NormalizedGestureBinding): boolean {
    for (const dependency of binding.requireFailure ?? []) {
      const state = session.states.get(dependency);
      if (state !== "failed" && state !== "cancelled") return false;
    }
    if (binding.simultaneous) return true;
    const group = binding.group ?? "default";
    const winner = session.claimedGroups.get(group);
    if (winner && winner !== binding.id) return false;
    session.claimedGroups.set(group, binding.id);
    for (const competitor of session.bindings) {
      if (
        competitor.id !== binding.id &&
        !competitor.simultaneous &&
        (competitor.group ?? "default") === group &&
        session.states.get(competitor.id) === "possible"
      ) {
        session.states.set(competitor.id, "failed");
        this.#state(competitor, "failed", session.lastEvent);
      }
    }
    return true;
  }

  #onPointerDown = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (this.#pointer || !pointer.isPrimary) return;
    const bindings = [...this.#bindings.values()]
      .filter(
        (binding) =>
          ["press", "long-press", "drag"].includes(binding.gesture.kind) &&
          this.#eligible(binding, pointer) &&
          pointerSourceAllowed(binding, pointer) &&
          pointer.button === (binding.gesture.button ?? 0),
      )
      .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
    if (bindings.length === 0) return;
    const point = pointFromPointer(pointer);
    const session: PointerSession = {
      bindings,
      claimedGroups: new Map(),
      last: point,
      lastEvent: pointer,
      lastTime: eventTime(pointer),
      origin: point,
      pointerId: pointer.pointerId,
      states: new Map(),
      timers: new Map(),
    };
    this.#pointer = session;
    for (const binding of bindings) {
      session.states.set(binding.id, "possible");
      this.#state(binding, "possible", pointer);
      if (shouldPrevent(binding, "initial")) prevent(pointer);
      if (binding.gesture.kind === "long-press") {
        const timer = window.setTimeout(
          () => {
            if (this.#pointer !== session || session.states.get(binding.id) !== "possible") return;
            if (!this.#canClaim(session, binding)) return;
            session.states.set(binding.id, "ended");
            this.#command(binding, "ended", pointer, {
              point: session.last,
              origin: session.origin,
              movement: axisValue(subtract(session.last, session.origin), binding.gesture.axis),
            });
          },
          Math.max(0, binding.gesture.delay ?? 500),
        );
        session.timers.set(binding.id, timer);
      }
    }
    if (bindings.some((binding) => binding.gesture.capture !== false)) {
      try {
        this.target.setPointerCapture(pointer.pointerId);
      } catch {
        // Detached fixtures and synthetic pointer events may not support capture.
      }
    }
  };

  #onPointerMove = (event: Event): void => {
    const pointer = event as PointerEvent;
    const session = this.#pointer;
    if (!session || pointer.pointerId !== session.pointerId) return;
    session.lastEvent = pointer;
    for (const binding of session.bindings) {
      const state = session.states.get(binding.id);
      const value = this.#pointerValue(session, pointer, binding.gesture.axis);
      if (binding.gesture.kind === "drag" && state === "possible") {
        const movement = axisValue(
          subtract(pointFromPointer(pointer), session.origin),
          binding.gesture.axis,
        );
        if (distance(movement) >= Math.max(0, binding.gesture.threshold ?? 4)) {
          if (!this.#canClaim(session, binding)) continue;
          session.states.set(binding.id, "began");
          this.#command(binding, "began", pointer, value);
        }
      } else if (binding.gesture.kind === "drag" && (state === "began" || state === "changed")) {
        session.states.set(binding.id, "changed");
        this.#command(binding, "changed", pointer, value);
      } else if (
        (binding.gesture.kind === "press" || binding.gesture.kind === "long-press") &&
        state === "possible" &&
        distance(subtract(pointFromPointer(pointer), session.origin)) >
          Math.max(0, binding.gesture.threshold ?? 8)
      ) {
        session.states.set(binding.id, "failed");
        const timer = session.timers.get(binding.id);
        if (timer !== undefined) clearTimeout(timer);
        this.#state(binding, "failed", pointer);
      }
    }
    session.last = pointFromPointer(pointer);
    session.lastTime = eventTime(pointer);
  };

  #onPointerEnd = (event: Event): void => {
    const pointer = event as PointerEvent;
    const session = this.#pointer;
    if (!session || pointer.pointerId !== session.pointerId) return;
    session.lastEvent = pointer;
    for (const binding of session.bindings) {
      const state = session.states.get(binding.id);
      const value = this.#pointerValue(session, pointer, binding.gesture.axis);
      if (binding.gesture.kind === "drag" && (state === "began" || state === "changed")) {
        session.states.set(binding.id, "ended");
        this.#command(binding, "ended", pointer, value);
      } else if (binding.gesture.kind === "press" && state === "possible") {
        if (!this.#canClaim(session, binding)) continue;
        session.states.set(binding.id, "ended");
        this.#command(binding, "ended", pointer, value);
      } else if (state === "possible") {
        session.states.set(binding.id, "failed");
        this.#state(binding, "failed", pointer);
      }
    }
    this.#clearPointer();
  };

  #onPointerCancel = (event: Event): void => {
    const pointer = event as PointerEvent;
    const session = this.#pointer;
    if (!session || pointer.pointerId !== session.pointerId) return;
    for (const binding of session.bindings) {
      const state = session.states.get(binding.id);
      if (state === "began" || state === "changed") {
        session.states.set(binding.id, "cancelled");
        this.#command(binding, "cancelled", pointer);
      } else if (state === "possible") {
        session.states.set(binding.id, "failed");
        this.#state(binding, "failed", pointer);
      }
    }
    this.#clearPointer();
  };

  #onLostPointerCapture = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (this.#pointer?.pointerId === pointer.pointerId) this.#onPointerCancel(pointer);
  };

  #clearPointer(): void {
    const session = this.#pointer;
    if (!session) return;
    for (const timer of session.timers.values()) clearTimeout(timer);
    this.#pointer = undefined;
  }

  #onPointerEnter = (event: Event): void => {
    const pointer = event as PointerEvent;
    const matches = this.#resolveConcurrent(
      this.#matches("hover", pointer).filter((binding) => pointerSourceAllowed(binding, pointer)),
    );
    for (const binding of matches) {
      this.#hovering.set(binding.id, binding);
      this.#command(binding, "began", pointer, { point: pointFromPointer(pointer) });
    }
  };

  #onPointerLeave = (event: Event): void => {
    const pointer = event as PointerEvent;
    for (const binding of this.#hovering.values()) {
      this.#command(binding, "ended", pointer, { point: pointFromPointer(pointer) });
    }
    this.#hovering.clear();
  };

  #keyMatches(binding: NormalizedGestureBinding, event: KeyboardEvent): boolean {
    const { key, code } = binding.gesture;
    if (!key && !code) return false;
    const keyMatches = !key || normalizedKey(event.key) === normalizedKey(key);
    const codeMatches = !code || event.code === code;
    return keyMatches && codeMatches;
  }

  #onKeyDown = (event: Event): void => {
    const keyboard = event as KeyboardEvent;
    if (keyboard.isComposing) return;
    const matches = this.#resolveConcurrent(
      this.#matches("key", keyboard).filter(
        (binding) =>
          this.#keyMatches(binding, keyboard) && (!keyboard.repeat || binding.gesture.repeat),
      ),
    );
    for (const binding of matches) {
      const activeKey = `${binding.id}:${keyboard.code || keyboard.key}`;
      const phase = this.#activeKeys.has(activeKey) ? "changed" : "began";
      this.#activeKeys.set(activeKey, binding);
      this.#command(binding, phase, keyboard, { key: keyboard.key, code: keyboard.code });
    }
  };

  #onKeyUp = (event: Event): void => {
    const keyboard = event as KeyboardEvent;
    for (const [activeKey, binding] of this.#activeKeys) {
      if (!activeKey.endsWith(`:${keyboard.code || keyboard.key}`)) continue;
      this.#command(binding, "ended", keyboard, { key: keyboard.key, code: keyboard.code });
      this.#activeKeys.delete(activeKey);
    }
  };

  #onWheel = (event: Event): void => {
    const wheel = event as WheelEvent;
    const matches = this.#resolveConcurrent(this.#matches("wheel", wheel));
    for (const binding of matches) {
      const current = this.#wheels.get(binding.id);
      if (current) clearTimeout(current.timer);
      this.#command(binding, current ? "changed" : "began", wheel, {
        wheel: axisValue({ x: wheel.deltaX, y: wheel.deltaY }, binding.gesture.axis),
      });
      const timer = window.setTimeout(
        () => {
          const active = this.#wheels.get(binding.id);
          if (!active) return;
          this.#command(binding, "ended", active.event, {
            wheel: axisValue(
              { x: active.event.deltaX, y: active.event.deltaY },
              binding.gesture.axis,
            ),
          });
          this.#wheels.delete(binding.id);
        },
        Math.max(0, binding.gesture.delay ?? 120),
      );
      this.#wheels.set(binding.id, { binding, event: wheel, timer });
    }
  };

  #syncAriaKeyShortcuts(): void {
    const shortcuts = [...this.#bindings.values()]
      .filter((binding) => !binding.disabled)
      .map((binding) => formatAriaShortcut(this.target, binding.gesture))
      .filter((value): value is string => Boolean(value));
    const values = new Set(
      [this.#authoredAriaKeyShortcuts, ...shortcuts]
        .flatMap((value) => value?.split(/\s+/) ?? [])
        .filter(Boolean),
    );
    if (values.size === 0) this.target.removeAttribute("aria-keyshortcuts");
    else this.target.setAttribute("aria-keyshortcuts", [...values].join(" "));
  }
}

export function bindGesture(target: HTMLElement, binding: GestureBinding): GestureBindingHandle {
  let controller = controllerRegistry.get(target);
  if (!controller) {
    controller = new GestureController(target);
    controllerRegistry.set(target, controller);
  }
  const id = controller.addBinding(binding);
  let destroyed = false;
  return {
    controller,
    id,
    destroy() {
      if (destroyed) return;
      controller!.removeBinding(id);
      if (controller!.size === 0) {
        controller!.destroy();
        controllerRegistry.delete(target);
      }
      destroyed = true;
    },
    update(next) {
      if (!destroyed) controller!.updateBinding(id, next);
    },
  };
}

declare global {
  interface HTMLElementEventMap {
    "mash-command": CustomEvent<MashCommandDetail>;
    "mash-gesture-state": CustomEvent<GestureStateDetail>;
  }
}
