import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

export type StaggerOrigin = "first" | "last" | "center" | "index";

export interface StaggerChangeDetail {
  count: number;
  maxDelay: number;
  origin: StaggerOrigin;
  originIndex: number;
  step: number;
}

/**
 * Assigns deterministic timing offsets to slotted child elements.
 *
 * Stagger does not animate its children directly. It writes stable CSS
 * variables to each assigned element, so authored motion recipes can consume
 * `--mash-stagger-delay` without adding timers or per-item controllers.
 *
 * @tag ui-stagger
 * @summary Publishes allocation-light stagger timing variables for a list.
 *
 * @example Center-origin entrance list
 * <ui-stagger step="48" origin="center">
 *   <ui-motion motion="slide-block" state="entering">Alpha</ui-motion>
 *   <ui-motion motion="slide-block" state="entering">Bravo</ui-motion>
 *   <ui-motion motion="slide-block" state="entering">Charlie</ui-motion>
 * </ui-stagger>
 *
 * @slot - Elements that receive stagger index, count, origin, and delay variables.
 *
 * @csspart root - The passthrough boundary around the staggered children.
 *
 * @cssstate empty - Matches `:state(empty)` when no element children are assigned.
 *
 * @fires {CustomEvent<StaggerChangeDetail>} mash-stagger-change - Announces a recomputed stagger map.
 *
 * @mashnode root root
 * @mashnode step step root
 * @mashnode origin origin root
 * @mashnode origin-index origin-index root
 * @mashnode empty empty root
 * @mashrole event mash-stagger-change count root
 */
export class UIStagger extends LitElement {
  static override properties = {
    step: { type: Number, reflect: true },
    origin: { type: String, reflect: true },
    originIndex: { type: Number, attribute: "origin-index", reflect: true },
  };

  /** Delay in milliseconds between each stagger distance. */
  declare step: number;
  /** Origin used when computing each child's distance from the start point. */
  declare origin: StaggerOrigin;
  /** Child index used when `origin` is `index`. */
  declare originIndex: number;

  readonly #internals: ElementInternals;
  #targets = new Set<HTMLElement>();
  #lastSignature = "";

  constructor() {
    super();
    this.step = 40;
    this.origin = "first";
    this.originIndex = 0;
    this.#internals = this.attachInternals();
  }

  static override styles = [
    baseStyles,
    css`
      :host,
      [part="root"] {
        display: contents;
      }
    `,
  ];

  protected override firstUpdated(): void {
    this.#syncTargets();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("step") || changed.has("origin") || changed.has("originIndex")) {
      this.#syncTargets();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#clearTargets();
  }

  /**
   * Computes the CSS delay, in milliseconds, for an item at `index`.
   */
  delayFor(index: number, count = this.#targets.size): number {
    if (!Number.isFinite(index) || count <= 0) return 0;
    const normalizedIndex = Math.max(0, Math.min(count - 1, index));
    const origin = this.#resolvedOrigin(count);
    return Math.abs(normalizedIndex - origin) * this.#normalizedStep();
  }

  #onSlotChange = (): void => {
    this.#syncTargets();
  };

  #syncTargets(): void {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>("slot");
    const nextTargets = new Set(
      (slot?.assignedElements({ flatten: true }) ?? []).filter(
        (element): element is HTMLElement => element instanceof HTMLElement,
      ),
    );

    for (const target of this.#targets) {
      if (!nextTargets.has(target)) this.#clearTarget(target);
    }

    this.#targets = nextTargets;
    const targets = [...nextTargets];
    const count = targets.length;
    const originIndex = this.#resolvedOrigin(count);
    const step = this.#normalizedStep();

    targets.forEach((target, index) => {
      const delay = this.delayFor(index, count);
      target.style.setProperty("--mash-stagger-index", String(index));
      target.style.setProperty("--mash-stagger-count", String(count));
      target.style.setProperty("--mash-stagger-origin", String(originIndex));
      target.style.setProperty("--mash-stagger-delay", `${delay}ms`);
    });

    if (count === 0) this.#internals.states.add("empty");
    else this.#internals.states.delete("empty");

    const maxDelay =
      count > 0 ? Math.max(...targets.map((_, index) => this.delayFor(index, count))) : 0;
    this.#emitChange({ count, maxDelay, origin: this.origin, originIndex, step });
  }

  #emitChange(detail: StaggerChangeDetail): void {
    const signature = [
      detail.count,
      detail.maxDelay,
      detail.origin,
      detail.originIndex,
      detail.step,
    ].join(":");
    if (signature === this.#lastSignature) return;
    this.#lastSignature = signature;
    this.dispatchEvent(
      new CustomEvent<StaggerChangeDetail>("mash-stagger-change", {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }

  #clearTargets(): void {
    for (const target of this.#targets) this.#clearTarget(target);
    this.#targets.clear();
    this.#lastSignature = "";
  }

  #clearTarget(target: HTMLElement): void {
    target.style.removeProperty("--mash-stagger-index");
    target.style.removeProperty("--mash-stagger-count");
    target.style.removeProperty("--mash-stagger-origin");
    target.style.removeProperty("--mash-stagger-delay");
  }

  #resolvedOrigin(count: number): number {
    if (count <= 0) return 0;
    if (this.origin === "last") return count - 1;
    if (this.origin === "center") return (count - 1) / 2;
    if (this.origin === "index") return this.#resolvedOriginIndex(count);
    return 0;
  }

  #resolvedOriginIndex(count: number): number {
    if (count <= 0) return 0;
    const index = Number.isFinite(this.originIndex) ? Math.round(this.originIndex) : 0;
    return Math.max(0, Math.min(count - 1, index));
  }

  #normalizedStep(): number {
    return Number.isFinite(this.step) ? Math.max(0, this.step) : 0;
  }

  protected override render(): TemplateResult {
    return html`<span part="root"><slot @slotchange=${this.#onSlotChange}></slot></span>`;
  }
}

declare global {
  interface HTMLElementEventMap {
    "mash-stagger-change": CustomEvent<StaggerChangeDetail>;
  }
}
