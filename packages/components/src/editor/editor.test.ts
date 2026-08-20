import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIEditor } from "./editor.js";
import "./register.js";

describe("ui-editor", () => {
  it("projects source state and generated line anatomy", async () => {
    const editor = await fixture<UIEditor>(
      `<ui-editor language="typescript" value="const a = 1;\nconst b = 2;"></ui-editor>`,
    );
    const control = inShadow<HTMLTextAreaElement>(editor, "textarea");

    expect(control.value).toBe("const a = 1;\nconst b = 2;");
    expect(editor.shadowRoot?.querySelectorAll(`[part="line-number"]`)).toHaveLength(2);
    expect(control.dataset.language).toBe("typescript");
  });

  it("inserts semantic tab spacing and reports selection", async () => {
    const editor = await fixture<UIEditor>(`<ui-editor value="ab" tab-size="4"></ui-editor>`);
    const control = inShadow<HTMLTextAreaElement>(editor, "textarea");
    const onSelection = vi.fn();
    editor.addEventListener("ui-editor-selection-change", onSelection);
    control.setSelectionRange(2, 2);
    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true }),
    );
    await settled(editor);

    expect(editor.value).toBe("ab  ");
    expect(onSelection).toHaveBeenCalled();
    expect(onSelection.mock.calls.at(-1)?.[0].detail).toMatchObject({
      startLine: 1,
      startColumn: 4,
      endLine: 1,
      endColumn: 4,
    });
  });

  it("indents and outdents multi-line selections through one native edit contract", async () => {
    const editor = await fixture<UIEditor>(
      `<ui-editor value="alpha&#10;beta" tab-size="2"></ui-editor>`,
    );
    const control = inShadow<HTMLTextAreaElement>(editor, "textarea");
    const commands: string[] = [];
    editor.addEventListener("ui-editor-command", (event) => {
      commands.push((event as CustomEvent<{ command: string }>).detail.command);
    });

    control.setSelectionRange(0, control.value.length);
    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true }),
    );
    await settled(editor);
    expect(editor.value).toBe("  alpha\n  beta");

    control.setSelectionRange(0, control.value.length);
    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, composed: true }),
    );
    await settled(editor);
    expect(editor.value).toBe("alpha\nbeta");
    expect(commands).toEqual(["indent", "outdent"]);
  });

  it("searches, wraps, and replaces literal matches without prescribing search UI", async () => {
    const editor = await fixture<UIEditor>(
      `<ui-editor value="Alpha beta alpha" search-query="alpha"></ui-editor>`,
    );
    const reports: Array<{ count: number; index: number }> = [];
    editor.addEventListener("ui-editor-search-change", (event) => {
      reports.push((event as CustomEvent<{ count: number; index: number }>).detail);
    });

    expect(editor.findNext()).toEqual({ start: 0, end: 5 });
    expect(editor.findNext()).toEqual({ start: 11, end: 16 });
    expect(editor.findNext()).toEqual({ start: 0, end: 5 });
    expect(editor.replaceAllMatches("owner")).toBe(2);
    await settled(editor);

    expect(editor.value).toBe("owner beta owner");
    expect(reports.slice(0, 3).map(({ count, index }) => ({ count, index }))).toEqual([
      { count: 2, index: 0 },
      { count: 2, index: 1 },
      { count: 2, index: 0 },
    ]);
  });

  it("routes provider keyboard actions through portable command events", async () => {
    const editor = await fixture<UIEditor>(`<ui-editor completion-open></ui-editor>`);
    const control = inShadow<HTMLTextAreaElement>(editor, "textarea");
    const commands: string[] = [];
    editor.addEventListener("ui-editor-command", (event) => {
      commands.push((event as CustomEvent<{ command: string }>).detail.command);
    });

    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true }),
    );
    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "f", metaKey: true, bubbles: true, composed: true }),
    );
    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
    );
    await settled(editor);

    expect(commands).toEqual(["accept-completion", "find", "dismiss-overlays"]);
    expect(editor.searchOpen).toBe(false);
    expect(editor.completionOpen).toBe(false);
  });

  it("keeps overlays and status authored as semantic slots", async () => {
    const editor = await fixture<UIEditor>(`
      <ui-editor>
        <span slot="completion">Complete me</span>
        <span slot="diagnostics">One error</span>
        <span slot="decorations">Modified range</span>
        <span slot="document-colors">#5b8def</span>
        <button slot="fold-controls">Fold</button>
        <span slot="indent-guides">Depth 2</span>
        <span slot="hover">Definition</span>
        <button slot="code-actions">Extract</button>
        <input slot="search" />
        <span slot="status">TypeScript</span>
      </ui-editor>
    `);

    expect(
      inShadow<HTMLSlotElement>(editor, `slot[name="completion"]`).assignedElements(),
    ).toHaveLength(1);
    expect(
      inShadow<HTMLSlotElement>(editor, `slot[name="diagnostics"]`).assignedElements(),
    ).toHaveLength(1);
    expect(
      inShadow<HTMLSlotElement>(editor, `slot[name="status"]`).assignedElements(),
    ).toHaveLength(1);
    for (const slot of [
      "decorations",
      "document-colors",
      "fold-controls",
      "indent-guides",
      "hover",
      "code-actions",
      "search",
    ]) {
      expect(
        inShadow<HTMLSlotElement>(editor, `slot[name="${slot}"]`).assignedElements(),
      ).toHaveLength(1);
    }
  });
});
