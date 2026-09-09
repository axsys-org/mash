import { LitElement, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { parseGestureShortcut, type GestureModifier } from "../internal/gesture-shortcut.js";

const modifierLabel = (
  modifier: GestureModifier,
  mac: boolean,
): { label: string; glyph: boolean } => {
  if (modifier === "Primary") return { label: mac ? "⌘" : "Ctrl", glyph: mac };
  if (modifier === "Meta") return { label: mac ? "⌘" : "Win", glyph: mac };
  if (modifier === "Alt") return { label: mac ? "⌥" : "Alt", glyph: mac };
  if (modifier === "Control") return { label: mac ? "⌃" : "Ctrl", glyph: mac };
  return { label: mac ? "⇧" : "Shift", glyph: mac };
};

const keyLabel = (key: string, mac: boolean): { label: string; glyph: boolean } => {
  const glyphs: Record<string, string> = {
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    Backspace: "⌫",
    Delete: "⌦",
    Enter: "↩",
    Escape: "⎋",
    " ": "Space",
    Tab: "⇥",
  };
  if (!mac)
    return {
      label:
        (
          {
            Escape: "Esc",
            " ": "Space",
            ArrowLeft: "Left",
            ArrowRight: "Right",
            ArrowUp: "Up",
            ArrowDown: "Down",
          } as Record<string, string>
        )[key] ?? (key.length === 1 ? key.toUpperCase() : key),
      glyph: false,
    };
  const glyph = glyphs[key];
  return glyph
    ? { label: glyph, glyph: glyph !== "Space" }
    : { label: key.length === 1 ? key.toUpperCase() : key, glyph: false };
};

/**
 * Marks a keyboard shortcut or key name.
 *
 * @tag ui-kbd
 * @summary Displays a keyboard shortcut using Mash's compact code typography.
 *
 * @example Keyboard shortcut
 * <p class="demo">Press <ui-kbd command="workspace.search" shortcut="Primary+K"></ui-kbd> to open command search.</p>
 *
 * @slot - The key or shortcut text.
 *
 * @csspart root - The visible keyboard-key surface.
 * @csspart value - The authored key or shortcut value.
 * @csspart key - Each generated key or modifier token.
 * @csspart modifier - Each generated modifier token.
 * @csspart glyph - A generated Unicode key glyph.
 * @csspart separator - The visual separator between generated tokens.
 *
 * @mashnode root root
 * @mashnode value value root
 * @mashnode command command root
 * @mashnode shortcut shortcut root
 * @mashnode key key value
 * @mashnode modifier modifier key
 * @mashnode glyph glyph key
 * @mashnode separator separator value
 * @mashrole slot default value value
 */
export class UIKbd extends LitElement {
  static override properties = {
    platform: { type: String, reflect: true },
    appearance: { type: String, reflect: true },
    command: { type: String, reflect: true },
    shortcut: { type: String, reflect: true },
  };

  /** Platform formatting; auto follows the device. */
  declare platform: "auto" | "mac" | "windows";
  /** Bordered key surface or inline text. */
  declare appearance: "key" | "plain";

  /** Semantic command this hint advertises; execution belongs to a gesture binding. */
  declare command: string;
  /** Machine-readable portable chord shared with the gesture binding. */
  declare shortcut: string;

  constructor() {
    super();
    this.platform = "auto";
    this.appearance = "key";
    this.command = "";
    this.shortcut = "";
  }

  static override styles = baseStyles;

  #isMac(): boolean {
    if (this.platform !== "auto") return this.platform === "mac";
    return /Mac|iPhone|iPad|iPod/i.test(globalThis.navigator?.platform ?? "");
  }

  #generatedShortcut(): TemplateResult[] {
    if (!this.shortcut) return [];
    const parsed = parseGestureShortcut(this.shortcut);
    const tokens = [
      ...[...(parsed.modifiers ?? [])]
        .sort((a, b) => {
          const rank = (modifier: GestureModifier) =>
            modifier === "Control" || (!this.#isMac() && modifier === "Primary")
              ? 0
              : modifier === "Alt"
                ? 1
                : modifier === "Shift"
                  ? 2
                  : 3;
          return rank(a) - rank(b);
        })
        .map((modifier) => ({
          ...modifierLabel(modifier, this.#isMac()),
          modifier: true,
        })),
      ...(parsed.key ? [{ ...keyLabel(parsed.key, this.#isMac()), modifier: false }] : []),
      ...(parsed.code && !parsed.key
        ? [{ label: parsed.code.replace(/^Key/, ""), glyph: false, modifier: false }]
        : []),
    ];
    return tokens.map(
      (token, index) =>
        html`${index > 0 && !this.#isMac() ? html`<span part="separator" aria-hidden="true">+</span>` : nothing}<span
            part=${`key${token.modifier ? " modifier" : ""}${token.glyph ? " glyph" : ""}`}
            >${token.label}</span
          >`,
    );
  }

  protected override render(): TemplateResult {
    return html`
      <kbd
        part="root"
        data-command=${this.command || nothing}
        data-shortcut=${this.shortcut || nothing}
      >
        <span part="value"><slot>${this.#generatedShortcut()}</slot></span>
      </kbd>
    `;
  }
}
