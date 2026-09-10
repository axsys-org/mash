import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";
import { baseStyles } from "../internal/base-styles.js";

/**
 * An ordered set of steps with one current position.
 * @mashnode size size root
 * @mashaxis size control-size
 * @tag ui-stepper
 * @summary Shows progress through a sequence and supports step navigation.
 * @example Steps
 * <ui-stepper value="details"><ui-step value="account" label="Account"></ui-step><ui-step value="details" label="Details"></ui-step><ui-step value="review" label="Review"></ui-step></ui-stepper>
 * @slot - Ordered ui-step children.
 * @csspart root - The step navigation boundary.
 * @mashnode root stepper
 * @fires {CustomEvent<{ value: string }>} ui-stepper-change - Cancelable request to navigate to a step.
 */
export class UIStepper extends LitElement {
  static override properties = {
    size: { type: String, reflect: true },
    align: { type: String, reflect: true },
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };
  /** Step control size; inherit follows its surrounding size context. */
  declare size: "inherit" | "default" | "compact" | "xsmall" | "small" | "medium" | "large";
  /** Align labels beside or below the indicator. */
  declare align: "start" | "center";
  /** Current step value. */
  declare value: string;
  /** Accessible name for the sequence. */
  declare label: string;
  /** Horizontal or vertical arrangement and keyboard axis. */
  declare orientation: "horizontal" | "vertical";
  /** Disable all step navigation. */
  declare disabled: boolean;
  constructor() {
    super();
    this.size = "inherit";
    this.align = "start";
    this.value = "";
    this.label = "Progress";
    this.orientation = "horizontal";
    this.disabled = false;
    this.addEventListener("ui-step-select", this.#select);
  }
  static override styles = baseStyles;
  get #steps(): UIStep[] {
    return [...this.querySelectorAll<UIStep>(":scope > ui-step")];
  }
  #sync = (): void => {
    const steps = this.#steps;
    if (!steps.some((step) => step.value === this.value)) this.value = steps[0]?.value ?? "";
    const current = steps.findIndex((step) => step.value === this.value);
    for (const [index, step] of steps.entries()) {
      step.index = index + 1;
      step.current = index === current;
      step.completed = index < current;
      step.groupDisabled = this.disabled;
    }
  };
  protected override updated(_changed: PropertyValues<this>): void {
    this.#sync();
  }
  #select = (event: Event): void => {
    const step = event.target as UIStep;
    if (!this.#steps.includes(step) || step.disabled || this.disabled || step.value === this.value)
      return;
    if (
      this.dispatchEvent(
        new CustomEvent("ui-stepper-change", {
          bubbles: true,
          composed: true,
          cancelable: true,
          detail: { value: step.value },
        }),
      )
    )
      this.value = step.value;
  };
  #keydown = (event: KeyboardEvent): void => {
    const rtl = getComputedStyle(this).direction === "rtl";
    const previous = this.orientation === "vertical" ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    const next = this.orientation === "vertical" ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
    if (![previous, next, "Home", "End"].includes(event.key) || this.disabled) return;
    const steps = this.#steps.filter((step) => !step.disabled);
    const source = event.composedPath().find((node) => node instanceof UIStep) as UIStep;
    const index = steps.indexOf(source);
    const target =
      event.key === "Home"
        ? steps[0]
        : event.key === "End"
          ? steps.at(-1)
          : steps[(index + (event.key === next ? 1 : -1) + steps.length) % steps.length];
    event.preventDefault();
    target?.focus();
  };
  protected override render(): TemplateResult {
    return html`<nav part="root" aria-label=${this.label} @keydown=${this.#keydown}>
      <slot @slotchange=${this.#sync}></slot>
    </nav>`;
  }
}

/**
 * A named position within a stepper.
 * @tag ui-step
 * @summary Names a step and describes its completion state.
 * @example Step
 * <ui-stepper><ui-step value="details" label="Details" description="Contact information"></ui-step></ui-stepper>
 * @slot icon - Replaces the numbered or completed indicator.
 * @csspart control - Native step button.
 * @csspart icon - Authored step icon.
 * @mashnode icon icon indicator
 * @csspart indicator - Number or completion mark.
 * @csspart label - Step name.
 * @csspart description - Supporting step description.
 * @mashnode control control
 * @mashnode indicator indicator control
 * @mashnode label label control
 * @mashnode description description control
 * @fires {CustomEvent} ui-step-select - Requests navigation from the stepper.
 */
export class UIStep extends LitElement {
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static override properties = {
    value: { type: String, reflect: true },
    label: { type: String, reflect: true },
    description: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    current: { type: Boolean, reflect: true },
    completed: { type: Boolean, reflect: true },
    index: { type: Number, reflect: true },
    groupDisabled: { state: true },
  };
  /** Stable step identifier. */
  declare value: string;
  /** Step name. */
  declare label: string;
  /** Optional supporting explanation. */
  declare description: string;
  /** Prevent navigation to this step. */
  declare disabled: boolean;
  /** Current position, assigned by the stepper. */
  declare current: boolean;
  /** Whether the step precedes the current position. */
  declare completed: boolean;
  /** One-based position, assigned by the stepper. */
  declare index: number;
  /** Disabled context from the owning stepper. */
  groupDisabled = false;
  constructor() {
    super();
    this.value = "";
    this.label = "";
    this.description = "";
    this.disabled = false;
    this.current = false;
    this.completed = false;
    this.index = 1;
  }
  static override styles = baseStyles;
  protected override render(): TemplateResult {
    return html`<button
      part="control"
      type="button"
      aria-current=${this.current ? "step" : "false"}
      ?disabled=${this.disabled || this.groupDisabled}
      @click=${() => this.dispatchEvent(new CustomEvent("ui-step-select", { bubbles: true, composed: true }))}
    >
      <span part="indicator"
        ><slot part="icon" name="icon">${this.completed ? "✓" : this.index}</slot></span
      ><span
        ><span part="label">${this.label}</span
        ><span part="description" ?hidden=${!this.description}>${this.description}</span></span
      >
    </button>`;
  }
}
