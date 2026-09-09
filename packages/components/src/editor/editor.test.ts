import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIEditor } from "./editor.js";
import "./register.js";

describe("ui-editor", () => {
  it("forwards one committed change across its shadow boundary", async () => {
    const editor = await fixture<UIEditor>("<ui-editor></ui-editor>");
    const control = inShadow<HTMLTextAreaElement>(editor, "textarea");
    const hostChanges = vi.fn();
    const parentChanges = vi.fn();
    editor.addEventListener("change", hostChanges);
    editor.parentElement!.addEventListener("change", parentChanges);
    control.value = "edited";
    control.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    expect(hostChanges).not.toHaveBeenCalled();
    control.dispatchEvent(new Event("change", { bubbles: true }));
    expect(hostChanges).toHaveBeenCalledTimes(1);
    expect(parentChanges).toHaveBeenCalledTimes(1);
    expect(hostChanges.mock.calls[0]![0].target).toBe(editor);
    expect(editor.value).toBe("edited");
    await settled(editor);
  });
  it("colors source as text without interpreting authored markup", async () => {
    const editor = await fixture<UIEditor>("<ui-editor></ui-editor>");
    editor.value = 'const value = "<img src=x onerror=alert(1)>"; // text';
    await settled(editor);
    expect(editor.shadowRoot?.querySelector("img")).toBeNull();
    expect(inShadow(editor, '[part="syntax"]').textContent?.trim()).toBe(editor.value);
    expect(inShadow(editor, '[part="keyword"]').textContent).toBe("const");
    expect(inShadow(editor, '[part="syntax"]').getAttribute("aria-hidden")).toBe("true");
  });
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

    expect(inShadow<HTMLElement>(editor, '[part="hover"]').hidden).toBe(false);
    expect(inShadow<HTMLElement>(editor, '[part="code-actions"]').hidden).toBe(false);
    expect(inShadow<HTMLElement>(editor, '[part="search"]').hidden).toBe(true);
    expect(inShadow<HTMLElement>(editor, '[part="completion"]').hidden).toBe(true);

    editor.searchOpen = true;
    editor.completionOpen = true;
    await settled(editor);

    expect(inShadow<HTMLElement>(editor, '[part="search"]').hidden).toBe(false);
    expect(inShadow<HTMLElement>(editor, '[part="completion"]').hidden).toBe(false);
  });
});

it("maps decoration ranges through native input at an ambiguous repeated-text boundary", async () => {
  const editor = await fixture<UIEditor>('<ui-editor value="aaaa"></ui-editor>');
  editor.decorations = [
    { id: "range", start: 1, end: 3, kind: "warning", message: "Check this range" },
  ];
  await settled(editor);
  const control = editor.control!;
  control.setSelectionRange(0, 0);
  control.dispatchEvent(
    new InputEvent("beforeinput", {
      inputType: "insertText",
      data: "a",
      bubbles: true,
      composed: true,
    }),
  );
  control.setRangeText("a", 0, 0, "end");
  control.dispatchEvent(
    new InputEvent("input", { inputType: "insertText", data: "a", bubbles: true, composed: true }),
  );
  await settled(editor);
  expect(editor.decorations[0]).toMatchObject({ start: 2, end: 4 });
  expect(inShadow(editor, '[part~="range-warning"]').textContent).toBe("aa");
  editor.setSelectionRange(2, 4);
  editor.replaceSelection("updated");
  await settled(editor);
  expect(editor.decorations).toEqual([]);
});

it("preserves marked words through multiline hard-tab indent and outdent", async () => {
  const editor = await fixture<UIEditor>(
    '<ui-editor value="alpha&#10;beta" hard-tabs></ui-editor>',
  );
  editor.decorations = [{ id: "word", start: 6, end: 10, kind: "highlight" }];
  await settled(editor);
  const control = editor.control!;
  control.setSelectionRange(0, editor.value.length);
  control.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true }),
  );
  await settled(editor);
  expect(editor.value).toBe("\talpha\n\tbeta");
  expect(editor.decorations[0]).toMatchObject({ start: 8, end: 12 });
  control.setSelectionRange(0, editor.value.length);
  control.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, composed: true }),
  );
  await settled(editor);
  expect(editor.value).toBe("alpha\nbeta");
  expect(editor.decorations[0]).toMatchObject({ start: 6, end: 10 });
});

it("does not indent a line excluded by a selection ending at its start", async () => {
  const editor = await fixture<UIEditor>(
    '<ui-editor value="alpha&#10;beta" hard-tabs></ui-editor>',
  );
  const control = editor.control!;
  control.setSelectionRange(0, 6);
  control.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true }),
  );
  await settled(editor);
  expect(editor.value).toBe("\talpha\nbeta");
});

it("renders whitespace and overlapping diagnostics without altering source or exposing decorative text", async () => {
  const editor = await fixture<UIEditor>("<ui-editor show-whitespace></ui-editor>");
  editor.value = "const\tname = 'A B';";
  editor.decorations = [
    { id: "whole", start: 0, end: 10, kind: "highlight" },
    { id: "name", start: 6, end: 10, kind: "error" },
  ];
  await settled(editor);
  const syntax = inShadow(editor, '[part="syntax"]');
  expect(syntax.textContent).toBe(editor.value + "\n");
  expect(syntax.getAttribute("aria-hidden")).toBe("true");
  expect(
    editor.shadowRoot?.querySelector('[part~="range-highlight"][part~="range-error"]')?.textContent,
  ).toBe("name");
  expect(editor.shadowRoot?.querySelector('[data-whitespace="→"]')?.textContent).toBe("\t");
  editor.highlight = false;
  await settled(editor);
  expect(editor.control?.value).toBe("const\tname = 'A B';");
  expect(editor.shadowRoot?.querySelector('[part~="range-error"]')).not.toBeNull();
});

it("maps unaffected diagnostics through each replace-all edit", async () => {
  const editor = await fixture<UIEditor>(
    '<ui-editor value="one keep one" search-query="one"></ui-editor>',
  );
  editor.decorations = [{ id: "keep", start: 4, end: 8, kind: "info" }];
  await settled(editor);
  expect(editor.replaceAllMatches("three")).toBe(2);
  await settled(editor);
  expect(editor.value).toBe("three keep three");
  expect(editor.decorations[0]).toMatchObject({ start: 6, end: 10 });
});
