import { describe, it, expect } from "vitest";
import { fixture, settled, inShadow } from "../test-support/fixture.js";
import { UIDock } from "./dock.js";
import "./register.js";
const markup = `<ui-dock><ui-dock-panel name="notes" label="Notes"><input value="Keep this"></ui-dock-panel><ui-dock-panel name="preview" label="Preview">Preview</ui-dock-panel><ui-dock-panel name="console" label="Console">Console</ui-dock-panel></ui-dock>`;
describe("dock", () => {
  it("moves stable panel content into nested splits and restores a validated snapshot", async () => {
    const dock = await fixture<UIDock>(markup);
    await settled(dock);
    const input = dock.querySelector("input")!;
    input.value = "Edited";
    expect(dock.movePanel("preview", "main", "right")).toBe(true);
    await settled(dock);
    expect(dock.getLayout().root?.type).toBe("split");
    expect(dock.querySelector("input")).toBe(input);
    expect(input.value).toBe("Edited");
    const snapshot = dock.getLayout();
    dock.closePanel("preview");
    await settled(dock);
    expect(dock.getLayout().root?.type).toBe("tabs");
    expect(dock.restoreLayout(snapshot)).toBe(true);
    await settled(dock);
    expect(inShadow(dock, '[role="separator"]').getAttribute("aria-orientation")).toBe("vertical");
    expect(
      dock.restoreLayout({
        version: 1,
        root: { type: "tabs", id: "main", panels: ["missing"], active: "missing" },
      }),
    ).toBe(false);
  });
  it("reorders tabs and selects an adjacent panel when closing", async () => {
    const dock = await fixture<UIDock>(markup);
    await settled(dock);
    dock.movePanel("console", "main", "center", "notes");
    await settled(dock);
    const root = dock.getLayout().root!;
    expect(root.type === "tabs" && root.panels).toEqual(["console", "notes", "preview"]);
    dock.closePanel("console");
    await settled(dock);
    expect(inShadow(dock, '[role="tab"][aria-selected="true"]').textContent?.trim()).toBe("Notes");
    dock.openPanel("console");
    await settled(dock);
    expect(inShadow(dock, '[role="tab"][aria-selected="true"]').textContent?.trim()).toBe(
      "Console",
    );
  });
  it("resizes splits with the separator keyboard contract", async () => {
    const dock = await fixture<UIDock>(markup);
    await settled(dock);
    dock.movePanel("preview", "main", "bottom");
    await settled(dock);
    const separator = inShadow<HTMLElement>(dock, '[role="separator"]');
    expect(separator.getAttribute("aria-orientation")).toBe("horizontal");
    separator.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await settled(dock);
    expect(separator.getAttribute("aria-valuenow")).toBe("55");
  });
  it("reorders with Alt+Shift and reserves Ctrl+Alt for splitting", async () => {
    const dock = await fixture<UIDock>(markup);
    await settled(dock);
    const tab = inShadow<HTMLElement>(dock, '[data-panel="notes"]');
    tab.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        altKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    await settled(dock);
    const root = dock.getLayout().root!;
    expect(root.type === "tabs" && root.panels).toEqual(["preview", "notes", "console"]);
    expect(dock.movePanel("notes", "main", "center", "notes")).toBe(true);
    expect(dock.getLayout()).toEqual({ version: 1, root });
    tab.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        altKey: true,
        ctrlKey: true,
        bubbles: true,
      }),
    );
    await settled(dock);
    expect(dock.getLayout().root?.type).toBe("split");
  });
});
