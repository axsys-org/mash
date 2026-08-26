import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";

import {
  bindGesture,
  parseGestureModifiers,
  parseGestureShortcut,
  type GestureAxis,
  type GestureBinding,
  type GestureBindingHandle,
  type GestureContext,
  type GestureKind,
  type GesturePreventDefault,
} from "../gesture/gesture.js";
import { baseStyles } from "../internal/base-styles.js";

/**
 * A declarative adapter for the headless Mash gesture and command controller.
 *
 * The element contributes no layout and never mutates the bound target. It
 * resolves either an imperative `target`, the element named by `for`, or its
 * parent, then registers one gesture-to-command binding with the shared
 * controller for that target.
 *
 * @tag ui-gesture-binding
 * @summary Maps pointer, keyboard, wheel, and hover recognition to a semantic command.
 *
 * @example Keyboard and pointer command
 * <ui-button id="command-search">Command search</ui-button>
 * <ui-gesture-binding for="command-search" gesture="press" command="workspace.search"></ui-gesture-binding>
 * <ui-gesture-binding for="command-search" gesture="key" shortcut="Primary+K" command="workspace.search"></ui-gesture-binding>
 *
 * @csspart root - The inert declarative binding marker.
 *
 * @fires {CustomEvent<import('../gesture/gesture.js').MashCommandDetail>} mash-command - Fired from the bound target when a gesture resolves to a command.
 * @fires {CustomEvent<import('../gesture/gesture.js').GestureStateDetail>} mash-gesture-state - Reports recognizer state transitions from the bound target.
 *
 * @mashnode root binding
 * @mashnode target target root
 * @mashnode command command root
 * @mashnode gesture gesture root
 * @mashnode group group root
 * @mashnode priority priority root
 * @mashnode disabled disabled root
 * @mashnode bind bind root
 * @mashnode state state root
 * @mashrole part root binding root
 * @mashrole event mash-command command command
 * @mashrole event mash-gesture-state state state
 */
export class UIGestureBinding extends LitElement {
  static override properties = {
    forId: { type: String, attribute: "for", reflect: true },
    command: { type: String, reflect: true },
    gesture: { type: String, reflect: true },
    shortcut: { type: String, reflect: true },
    modifiers: { type: String, reflect: true },
    axis: { type: String, reflect: true },
    pointerTypes: { type: String, attribute: "pointer-types", reflect: true },
    button: { type: Number, reflect: true },
    threshold: { type: Number, reflect: true },
    delay: { type: Number, reflect: true },
    group: { type: String, reflect: true },
    priority: { type: Number, reflect: true },
    requireFailure: { type: String, attribute: "require-failure", reflect: true },
    simultaneous: { type: Boolean, reflect: true },
    capture: { type: Boolean, reflect: true },
    repeat: { type: Boolean, reflect: true },
    preventDefaultMode: { type: String, attribute: "prevent-default", reflect: true },
    disabled: { type: Boolean, reflect: true },
    target: { attribute: false },
    data: { attribute: false },
    predicate: { attribute: false },
  };

  /** ID of the target in the same document or shadow root. The parent is the fallback target. */
  declare forId: string;
  /** Semantic command name emitted by the target. */
  declare command: string;
  /** Recognizer kind. */
  declare gesture: GestureKind;
  /** Portable key chord such as `Primary+K` or `Shift+ArrowRight`. */
  declare shortcut: string;
  /** Exact modifier chord for non-key gestures. */
  declare modifiers: string;
  /** Logical movement axis for drag and wheel recognition. */
  declare axis: GestureAxis;
  /** Space-separated allowed pointer types such as `mouse touch pen`. */
  declare pointerTypes: string;
  /** Pointer button for press, long-press, and drag gestures. */
  declare button: number;
  /** Movement threshold in CSS pixels before drag begins or press fails. */
  declare threshold: number;
  /** Long-press duration or wheel-idle completion delay in milliseconds. */
  declare delay: number;
  /** Arbitration group. Only one non-simultaneous recognizer wins each group. */
  declare group: string;
  /** Arbitration priority inside a group. */
  declare priority: number;
  /** Space-separated recognizer IDs which must fail before this binding can win. */
  declare requireFailure: string;
  /** Allows the binding to recognize beside another winner in the same group. */
  declare simultaneous: boolean;
  /** Captures an active pointer to the bound target. */
  declare capture: boolean;
  /** Allows held keydown events to emit changed phases. */
  declare repeat: boolean;
  /** Native-default policy: never, after recognition, or from the initial event. */
  declare preventDefaultMode: GesturePreventDefault;
  /** Removes the binding without changing authored markup. */
  declare disabled: boolean;
  /** Imperative target override. */
  declare target: HTMLElement | undefined;
  /** Parent-owned value copied into each semantic command detail. */
  declare data: unknown;
  /** Imperative admission predicate for application state. */
  declare predicate: ((context: GestureContext) => boolean) | undefined;

  #handle: GestureBindingHandle | undefined;
  #boundTarget: HTMLElement | undefined;

  constructor() {
    super();
    this.forId = "";
    this.command = "";
    this.gesture = "press";
    this.shortcut = "";
    this.modifiers = "";
    this.axis = "both";
    this.pointerTypes = "";
    this.button = 0;
    this.threshold = 0;
    this.delay = 0;
    this.group = "default";
    this.priority = 0;
    this.requireFailure = "";
    this.simultaneous = false;
    this.capture = true;
    this.repeat = false;
    this.preventDefaultMode = "never";
    this.disabled = false;
    this.target = undefined;
    this.data = undefined;
    this.predicate = undefined;
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: none !important;
      }
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => this.#syncBinding());
  }

  override disconnectedCallback(): void {
    this.#unbind();
    super.disconnectedCallback();
  }

  protected override updated(_changed: PropertyValues<this>): void {
    this.#syncBinding();
  }

  get boundTarget(): HTMLElement | undefined {
    return this.#boundTarget;
  }

  #resolveTarget(): HTMLElement | undefined {
    if (this.target) return this.target;
    if (this.forId) {
      const root = this.getRootNode();
      if (root instanceof Document || root instanceof ShadowRoot) {
        return root.getElementById(this.forId) ?? undefined;
      }
    }
    return this.parentElement ?? undefined;
  }

  #descriptor(): GestureBinding {
    const shortcut = this.shortcut ? parseGestureShortcut(this.shortcut) : {};
    const modifiers = this.modifiers
      ? parseGestureModifiers(this.modifiers)
      : (shortcut.modifiers ?? []);
    return {
      command: this.command,
      data: this.data,
      disabled: this.disabled,
      gesture: {
        kind: this.gesture,
        axis: this.axis,
        button: this.button,
        capture: this.capture,
        code: shortcut.code,
        delay: this.delay > 0 ? this.delay : undefined,
        key: shortcut.key,
        modifiers,
        pointerTypes: this.pointerTypes.split(/\s+/).filter(Boolean),
        preventDefault: this.preventDefaultMode,
        repeat: this.repeat,
        threshold: this.threshold > 0 ? this.threshold : undefined,
      },
      group: this.group || "default",
      id: this.id || undefined,
      priority: this.priority,
      requireFailure: this.requireFailure.split(/\s+/).filter(Boolean),
      simultaneous: this.simultaneous,
      when: this.predicate,
    };
  }

  #syncBinding(): void {
    if (!this.isConnected) return;
    const target = this.#resolveTarget();
    if (!target || !this.command) {
      this.#unbind();
      return;
    }
    const descriptor = this.#descriptor();
    if (this.#handle && target === this.#boundTarget) {
      this.#handle.update(descriptor);
      return;
    }
    this.#unbind();
    this.#boundTarget = target;
    this.#handle = bindGesture(target, descriptor);
  }

  #unbind(): void {
    this.#handle?.destroy();
    this.#handle = undefined;
    this.#boundTarget = undefined;
  }

  protected override render(): TemplateResult {
    return html`<span part="root" hidden aria-hidden="true"></span>`;
  }
}
