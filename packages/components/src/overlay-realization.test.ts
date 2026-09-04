import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "./test-support/fixture.js";
import "./alert-dialog/register.js";
import "./button/register.js";
import "./context-menu/register.js";
import "./dialog/register.js";
import "./drawer/register.js";
import "./menu/register.js";
import "./menu-item/register.js";
import "./popover/register.js";
import "./preview-card/register.js";
import "./tooltip/register.js";

const overlayCases = [
  { tag: "ui-alert-dialog", contentPart: "content", hasClose: true, hasTitle: true },
  { tag: "ui-dialog", contentPart: "content", hasClose: true, hasTitle: true },
  { tag: "ui-drawer", contentPart: "content", hasClose: true, hasTitle: true },
  { tag: "ui-popover", contentPart: "content", hasClose: true, hasTitle: true },
  { tag: "ui-preview-card", contentPart: "content", hasClose: false, hasTitle: true },
  { tag: "ui-tooltip", contentPart: "description", hasClose: false, hasTitle: false },
  { tag: "ui-menu", contentPart: "actions", hasClose: true, hasTitle: false },
  { tag: "ui-context-menu", contentPart: "actions", hasClose: true, hasTitle: false },
] as const;

describe("overlay authored-slot realizations", () => {
  it.each(overlayCases)(
    "maps $tag slots to neutral same-node parts",
    async ({ tag, contentPart, hasClose, hasTitle }) => {
      const overlay = await fixture<HTMLElement>(`
        <${tag} label="Example">
          <button slot="trigger">Open</button>
          <span>Body</span>
          ${hasClose ? '<button slot="close">Close</button>' : ""}
        </${tag}>
      `);

      const triggerSlot = inShadow<HTMLSlotElement>(overlay, 'slot[name="trigger"]');
      const contentSlot = inShadow<HTMLSlotElement>(overlay, "slot:not([name])");
      const trigger = triggerSlot.parentElement!;
      const content = contentSlot.parentElement!;
      const positioner = inShadow<HTMLElement>(overlay, '[part="positioner"]');
      const popup = inShadow<HTMLElement>(overlay, '[part="popup"]');

      expect(trigger.getAttribute("part")).toBe("trigger");
      expect(content.getAttribute("part")).toBe(contentPart);
      expect(triggerSlot.assignedElements()[0]?.getAttribute("slot")).toBe("trigger");
      expect(contentSlot.assignedElements()[0]?.textContent).toBe("Body");
      expect(getComputedStyle(trigger).display).toBe("contents");
      expect(getComputedStyle(content).display).toBe("contents");
      expect(positioner.contains(popup)).toBe(true);
      expect(getComputedStyle(positioner).display).toBe("contents");

      if (hasTitle) {
        const title = inShadow<HTMLElement>(overlay, '[part="title"]');
        expect(title.textContent?.trim()).toBe("Example");
        expect(popup.getAttribute("aria-labelledby")).toBe(title.id);
      }

      if (hasClose) {
        const closeSlot = inShadow<HTMLSlotElement>(overlay, 'slot[name="close"]');
        const close = closeSlot.parentElement!;
        expect(close.getAttribute("part")).toBe("close");
        expect(closeSlot.assignedElements()[0]?.getAttribute("slot")).toBe("close");
        expect(getComputedStyle(close).display).toBe("contents");
      }
    },
  );

  it("exposes alert-dialog cancel and confirm as first-class actions", async () => {
    const alert = await fixture<HTMLElement>(`
      <ui-alert-dialog label="Delete project" open>
        <button slot="trigger">Open</button>
        <p slot="description">This cannot be undone.</p>
        <button slot="cancel">Cancel</button>
        <button slot="confirm">Delete</button>
      </ui-alert-dialog>
    `);
    const actions: string[] = [];
    alert.addEventListener("ui-alert-dialog-cancel", () => actions.push("cancel"));
    alert.addEventListener("ui-alert-dialog-confirm", () => actions.push("confirm"));

    alert.querySelector<HTMLButtonElement>('[slot="confirm"]')!.click();
    await settled(alert.parentElement!);

    expect(actions).toEqual(["confirm"]);
    expect(alert.hasAttribute("open")).toBe(false);
    expect(inShadow(alert, '[part="actions"]').contains(inShadow(alert, '[part="confirm"]'))).toBe(
      true,
    );
  });

  it("parks pointer-open menu focus on the popup without a native focus outline", async () => {
    const menu = await fixture<HTMLElement>(`
      <ui-menu label="Actions">
        <button slot="trigger">Actions</button>
        <ui-menu-item value="open">Open</ui-menu-item>
      </ui-menu>
    `);
    const trigger = menu.querySelector<HTMLButtonElement>('[slot="trigger"]')!;

    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 1 }));
    await settled(menu.parentElement!);

    const popup = inShadow<HTMLElement>(menu, '[part="popup"]');
    expect(menu.shadowRoot?.activeElement).toBe(popup);
    expect(getComputedStyle(popup).outlineStyle).toBe("none");
  });

  it("does not let dialog popup surfaces paint a native focus outline", async () => {
    const dialog = await fixture<HTMLElement>(`
      <ui-alert-dialog label="Archive project">
        <button slot="trigger">Archive</button>
        <button slot="cancel">Keep active</button>
        <button slot="confirm">Archive</button>
      </ui-alert-dialog>`);
    const trigger = dialog.querySelector<HTMLButtonElement>('[slot="trigger"]')!;

    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 1 }));
    await settled(dialog.parentElement!);

    expect(getComputedStyle(inShadow<HTMLElement>(dialog, '[part="popup"]')).outlineStyle).toBe(
      "none",
    );
  });

  it("does not return pointer-open menu selection to the trigger", async () => {
    const menu = await fixture<HTMLElement>(`
      <ui-menu label="Actions">
        <button slot="trigger">Actions</button>
        <ui-menu-item value="open">Open</ui-menu-item>
      </ui-menu>
    `);
    const trigger = menu.querySelector<HTMLButtonElement>('[slot="trigger"]')!;
    const item = menu.querySelector<HTMLElement>("ui-menu-item")!;

    trigger.focus();
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 1 }));
    await settled(menu.parentElement!);

    inShadow<HTMLButtonElement>(item, "button").click();
    await settled(menu.parentElement!);

    expect(menu.hasAttribute("open")).toBe(false);
    expect(document.activeElement).not.toBe(trigger);
  });

  it("clears delegated trigger focus after pointer-open menu selection", async () => {
    const menu = await fixture<HTMLElement>(`
      <ui-menu label="Actions">
        <ui-button slot="trigger">Actions</ui-button>
        <ui-menu-item value="open">Open</ui-menu-item>
      </ui-menu>
    `);
    const trigger = menu.querySelector<HTMLElement>('[slot="trigger"]')!;
    const control = inShadow<HTMLElement>(trigger, '[part="control"]');
    const item = menu.querySelector<HTMLElement>("ui-menu-item")!;

    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 1 }));
    await settled(menu.parentElement!);

    inShadow<HTMLButtonElement>(item, "button").click();
    await settled(menu.parentElement!);

    expect(menu.hasAttribute("open")).toBe(false);
    expect(document.activeElement).not.toBe(trigger);
    expect(control.matches(":focus-visible")).toBe(false);
  });

  it("preserves click, hover, and context-menu trigger paths through the wrappers", async () => {
    const dialog = await fixture<HTMLElement>(`
      <ui-dialog label="Example">
        <button slot="trigger">Open</button>
        <span>Body</span>
        <button slot="close">Close</button>
      </ui-dialog>
    `);
    dialog.querySelector<HTMLButtonElement>('[slot="trigger"]')!.click();
    await settled(dialog.parentElement!);
    expect(dialog.hasAttribute("open")).toBe(true);
    dialog.querySelector<HTMLButtonElement>('[slot="close"]')!.click();
    await settled(dialog.parentElement!);
    expect(dialog.hasAttribute("open")).toBe(false);

    const tooltip = await fixture<HTMLElement>(`
      <ui-tooltip label="Example" open-delay="0" close-delay="0">
        <button slot="trigger">Hover</button>
        Description
      </ui-tooltip>
    `);
    const tooltipTrigger = tooltip.querySelector<HTMLButtonElement>('[slot="trigger"]')!;
    tooltipTrigger.dispatchEvent(
      new PointerEvent("pointerover", { bubbles: true, composed: true }),
    );
    await settled(tooltip.parentElement!);
    expect(tooltip.hasAttribute("open")).toBe(true);
    tooltipTrigger.dispatchEvent(
      new PointerEvent("pointerout", {
        bubbles: true,
        composed: true,
        relatedTarget: document.body,
      }),
    );
    await settled(tooltip.parentElement!);
    expect(tooltip.hasAttribute("open")).toBe(false);

    const contextMenu = await fixture<HTMLElement>(`
      <ui-context-menu label="Example">
        <button slot="trigger">Open</button>
        <span>Action</span>
        <button slot="close">Close</button>
      </ui-context-menu>
    `);
    contextMenu
      .querySelector<HTMLButtonElement>('[slot="trigger"]')!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, composed: true }));
    await settled(contextMenu.parentElement!);
    expect(contextMenu.hasAttribute("open")).toBe(true);
    contextMenu.querySelector<HTMLButtonElement>('[slot="close"]')!.click();
    await settled(contextMenu.parentElement!);
    expect(contextMenu.hasAttribute("open")).toBe(false);
  });

  it("publishes shared popup presence lifecycle events", async () => {
    const dialog = await fixture<HTMLElement>(`
      <ui-dialog label="Example">
        <button slot="trigger">Open</button>
        <span>Body</span>
      </ui-dialog>
    `);
    const events: string[] = [];
    dialog.addEventListener("mash-presence-start", (event) => {
      const detail = event.detail as { open: boolean; phase: string };
      events.push(`${event.type}:${detail.phase}:${detail.open}`);
    });
    dialog.addEventListener("mash-presence-end", (event) => {
      const detail = event.detail as { open: boolean; phase: string };
      events.push(`${event.type}:${detail.phase}:${detail.open}`);
    });

    dialog.querySelector<HTMLButtonElement>('[slot="trigger"]')!.click();
    await settled(dialog.parentElement!);
    expect(dialog.matches(":state(open)")).toBe(true);
    expect(dialog.matches(":state(present)")).toBe(true);
    expect(dialog.matches(":state(active)")).toBe(true);

    dialog.querySelector<HTMLButtonElement>('[slot="trigger"]')!.click();
    await settled(dialog.parentElement!);
    expect(dialog.matches(":state(open)")).toBe(false);
    expect(dialog.matches(":state(present)")).toBe(false);

    expect(events).toEqual([
      "mash-presence-start:entering:true",
      "mash-presence-end:entering:true",
      "mash-presence-start:exiting:false",
      "mash-presence-end:exiting:false",
    ]);
  });

  it("contains modal Tab traversal and returns focus after Escape", async () => {
    const dialog = await fixture<HTMLElement>(`
      <ui-dialog label="Rename project">
        <button slot="trigger">Rename</button>
        <input aria-label="Project name" />
        <div slot="close">
          <button>Cancel</button>
          <button>Save</button>
        </div>
      </ui-dialog>
    `);
    const trigger = dialog.querySelector<HTMLButtonElement>('[slot="trigger"]')!;
    const input = dialog.querySelector<HTMLInputElement>("input")!;
    const actions = [...dialog.querySelectorAll<HTMLButtonElement>('[slot="close"] button')];
    const popup = inShadow<HTMLElement>(dialog, '[part="popup"]');

    trigger.focus();
    trigger.click();
    await settled(dialog.parentElement!);
    expect(document.activeElement).toBe(input);

    actions.at(-1)!.focus();
    actions
      .at(-1)!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true }));
    expect(document.activeElement).toBe(input);

    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        composed: true,
      }),
    );
    expect(document.activeElement).toBe(actions.at(-1));

    popup.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
    );
    await settled(dialog.parentElement!);
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("positions anchored popups against their trigger and flips at viewport edges", async () => {
    const popover = await fixture<
      HTMLElement & {
        open: boolean;
        placement: "top" | "bottom" | "left" | "right";
        align: "start" | "center" | "end";
        offset: number;
      }
    >(`
      <ui-popover label="Example">
        <button slot="trigger">Open</button>
        <span>Body</span>
      </ui-popover>
    `);
    const trigger = popover.querySelector<HTMLElement>('[slot="trigger"]')!;
    const popup = inShadow<HTMLElement>(popover, '[part="popup"]');
    const positioner = inShadow<HTMLElement>(popover, '[part="positioner"]');
    trigger.getBoundingClientRect = () => new DOMRect(24, window.innerHeight - 12, 80, 12);
    popup.getBoundingClientRect = () => new DOMRect(0, 0, 120, 80);

    popover.placement = "bottom";
    popover.align = "start";
    popover.offset = 6;
    popover.open = true;
    await settled(popover.parentElement!);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(positioner.dataset.side).toBe("top");
    expect(positioner.dataset.align).toBe("start");
    expect(positioner.style.position).toBe("fixed");
    expect(positioner.style.insetInlineStart).toBe("24px");
    expect(positioner.style.insetBlockStart).toBe(`${window.innerHeight - 98}px`);
  });

  it("reports close reasons and honors escape and outside dismissal policy", async () => {
    const dialog = await fixture<
      HTMLElement & {
        open: boolean;
        closeOnEscape: boolean;
        closeOnOutside: boolean;
      }
    >(`
      <ui-dialog label="Policy" open>
        <button slot="trigger">Open</button>
        <button slot="close">Close</button>
      </ui-dialog>
    `);
    const reasons: string[] = [];
    dialog.addEventListener("ui-dialog-open-change", (event) => {
      reasons.push((event as CustomEvent<{ reason: string }>).detail.reason);
    });
    const popup = inShadow<HTMLElement>(dialog, '[part="popup"]');
    const backdrop = inShadow<HTMLElement>(dialog, '[part="backdrop"]');

    dialog.closeOnEscape = false;
    popup.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(dialog.open).toBe(true);

    dialog.closeOnEscape = true;
    popup.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settled(dialog.parentElement!);
    expect(dialog.open).toBe(false);
    expect(reasons).toEqual(["escape"]);

    dialog.open = true;
    dialog.closeOnOutside = false;
    await settled(dialog.parentElement!);
    backdrop.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    expect(dialog.open).toBe(true);

    dialog.closeOnOutside = true;
    backdrop.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    await settled(dialog.parentElement!);
    expect(dialog.open).toBe(false);
    expect(reasons.at(-1)).toBe("outside");
  });

  it("keeps an inert overlay present until its exit motion settles", async () => {
    const dialog = await fixture<
      HTMLElement & { open: boolean; updateComplete: Promise<unknown> }
    >(`
      <ui-dialog label="Motion policy" open>
        <button slot="trigger">Open</button>
        <span>Body</span>
      </ui-dialog>
    `);
    const popup = inShadow<HTMLElement>(dialog, '[part="popup"]');
    const backdrop = inShadow<HTMLElement>(dialog, '[part="backdrop"]');
    const exit = popup.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1_000 });

    dialog.open = false;
    await dialog.updateComplete;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(backdrop.hidden).toBe(false);
    expect(backdrop.inert).toBe(true);
    expect(dialog.matches(":state(exiting)")).toBe(true);

    exit.finish();
    await exit.finished;
    await settled(dialog.parentElement!);

    expect(backdrop.hidden).toBe(true);
    expect(dialog.matches(":state(present)")).toBe(false);
  });

  it("keeps pinned hover-card open and close delays configurable", async () => {
    const preview = await fixture<HTMLElement & { open: boolean }>(`
      <ui-preview-card label="Delayed preview" open-delay="5" close-delay="5">
        <button slot="trigger">Hover</button>
        Preview
      </ui-preview-card>
    `);
    const trigger = preview.querySelector<HTMLElement>('[slot="trigger"]')!;
    trigger.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, composed: true }));
    expect(preview.open).toBe(false);
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    expect(preview.open).toBe(true);

    trigger.dispatchEvent(
      new PointerEvent("pointerout", {
        bubbles: true,
        composed: true,
        relatedTarget: document.body,
      }),
    );
    expect(preview.open).toBe(true);
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    expect(preview.open).toBe(false);
  });

  it("leaves a manually anchored preview under its external interaction owner", async () => {
    const preview = await fixture<
      HTMLElement & { open: boolean; show: (reason?: string) => void }
    >(`
      <ui-preview-card label="External preview" trigger="manual" close-delay="5">
        <a href="#open">Open path</a>
      </ui-preview-card>
    `);

    preview.show("hover");
    await settled(preview);
    preview.dispatchEvent(
      new PointerEvent("pointerout", {
        bubbles: true,
        composed: true,
        relatedTarget: document.body,
      }),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 10));

    expect(preview.open).toBe(true);
    expect(preview.getAttribute("trigger")).toBe("manual");
  });
});
