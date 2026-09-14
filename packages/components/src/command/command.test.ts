import { describe, expect, it, vi } from "vitest";

import { dispatchCommand } from "../gesture/gesture.js";
import { fixture } from "../test-support/fixture.js";
import { CommandRegistry } from "./command.js";

interface Context {
  editable: boolean;
  marks: Set<string>;
}

describe("command registry", () => {
  it("merges broad and specific modules by command identity", () => {
    const registry = new CommandRegistry<Context>();
    registry.register({
      id: "base",
      scope: "editor:*",
      commands: [
        { id: "format.bold", label: "Bold", order: 2 },
        { id: "history.undo", label: "Undo", placement: "start", order: 1 },
      ],
    });
    registry.register({
      id: "text-overrides",
      scope: "editor:text",
      commands: [{ id: "format.bold", label: "Strong", shortcut: "Primary+B" }],
    });

    const commands = registry.resolve(["editor:text"], {
      editable: true,
      marks: new Set(),
    });

    expect(commands.map((command) => command.id)).toEqual(["history.undo", "format.bold"]);
    expect(commands[1]).toMatchObject({
      label: "Strong",
      order: 2,
      shortcut: "Primary+B",
    });
  });

  it("evaluates visibility, active state, and availability against live context", () => {
    const registry = new CommandRegistry<Context>();
    registry.register({
      id: "formatting",
      scope: "editor:text",
      when: (context) => context.editable,
      commands: [
        {
          id: "format.bold",
          active: (context) => context.marks.has("bold"),
          disabled: (context) => !context.editable,
        },
        { id: "format.hidden", when: false },
      ],
    });

    expect(
      registry.resolve(["editor:text"], { editable: true, marks: new Set(["bold"]) }),
    ).toMatchObject([{ id: "format.bold", active: true, disabled: false }]);
    expect(registry.resolve(["editor:text"], { editable: false, marks: new Set() })).toEqual([]);
  });

  it("routes completed gesture commands through a connected host", async () => {
    const host = await fixture<HTMLElement>(`<section><button>Bold</button></section>`);
    const button = host.querySelector("button")!;
    const run = vi.fn();
    const registry = new CommandRegistry<Context, { origin: string }>();
    registry.register({
      id: "formatting",
      scope: "editor:text",
      commands: [{ id: "format.bold", run }],
    });
    const connection = registry.connect(host, {
      context: () => ({ editable: true, marks: new Set() }),
      scopes: () => ["editor:text"],
    });

    const accepted = dispatchCommand(button, "format.bold", {
      data: { origin: "toolbar" },
    });
    await Promise.resolve();

    expect(accepted).toBe(false);
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]![1]).toMatchObject({ data: { origin: "toolbar" } });
    expect(run.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
    connection.destroy();
  });

  it("exposes execution state and replaces stale async work", async () => {
    const registry = new CommandRegistry<Context>();
    const signals: AbortSignal[] = [];
    const releases: Array<(value: boolean) => void> = [];
    registry.register({
      id: "async-formatting",
      scope: "editor:text",
      commands: [
        {
          id: "format.link-preview",
          execution: "replace",
          run: (_context, input) =>
            new Promise<boolean>((resolve) => {
              signals.push(input.signal);
              releases.push(resolve);
              input.signal.addEventListener("abort", () => resolve(false), { once: true });
            }),
        },
      ],
    });
    const context = { editable: true, marks: new Set<string>() };

    const first = registry.execute("format.link-preview", ["editor:text"], context);
    expect(registry.find("format.link-preview", ["editor:text"], context)?.executing).toBe(true);
    const second = registry.execute("format.link-preview", ["editor:text"], context);

    expect(signals[0]?.aborted).toBe(true);
    expect(await first).toBe(false);
    releases[1]?.(true);
    expect(await second).toBe(true);
    expect(registry.find("format.link-preview", ["editor:text"], context)?.executing).toBe(false);
  });

  it("lets a replacement registration dispose without deleting a newer module", () => {
    const registry = new CommandRegistry<Context>();
    const first = registry.register({
      id: "formatting",
      scope: "*",
      commands: [{ id: "format.bold", label: "First" }],
    });
    registry.register({
      id: "formatting",
      scope: "*",
      commands: [{ id: "format.bold", label: "Second" }],
    });

    first.destroy();

    expect(
      registry.find("format.bold", ["editor:text"], {
        editable: true,
        marks: new Set(),
      })?.label,
    ).toBe("Second");
  });

  it("ranks one command vocabulary across slash menus and palettes", () => {
    const registry = new CommandRegistry<Context>();
    registry.register({
      id: "blocks",
      scope: "editor:block",
      commands: [
        {
          id: "insert.table",
          label: "Table",
          description: "Insert a structured data grid.",
          group: "Data",
          keywords: ["database", "spreadsheet"],
        },
        {
          id: "insert.text",
          label: "Text",
          description: "Start writing plain text.",
          group: "Basic",
        },
        {
          id: "insert.callout",
          label: "Callout",
          description: "Highlight important information.",
          group: "Basic",
          disabled: true,
        },
      ],
    });
    const context = { editable: true, marks: new Set<string>() };

    expect(registry.search("spread", ["editor:block"], context).map(({ id }) => id)).toEqual([
      "insert.table",
    ]);
    expect(registry.search("basic", ["editor:block"], context).map(({ id }) => id)).toEqual([
      "insert.text",
    ]);
    expect(
      registry.search("callout", ["editor:block"], context, { includeDisabled: true })[0]?.id,
    ).toBe("insert.callout");
  });
});
