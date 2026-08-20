import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import "@mash/ui/catalogue/mash.css";
import "../catalogue/mash.css";
import { ShrineConfirm } from "./confirm.js";
import "./register.js";

const buttons = (host: Element) => [...shadow(host).querySelectorAll("ui-button")];
const confirmButton = (host: Element) => inShadow(host, 'ui-button[part="confirm"]');
const cancelButton = (host: Element) => inShadow(host, 'ui-button[part="cancel"]');

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});

afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
});

describe("shrine-confirm: lifecycle", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("shrine-confirm")).toBe(ShrineConfirm);

    const host = await fixture<ShrineConfirm>(`<shrine-confirm>Sure?</shrine-confirm>`);
    expect(host).toBeInstanceOf(ShrineConfirm);
    expect(host.tone).toBe("accent");
    expect(host.pending).toBe(false);
  });

  it("reflects its attributes", async () => {
    const host = await fixture<ShrineConfirm>(`<shrine-confirm>Sure?</shrine-confirm>`);

    host.tone = "critical";
    host.pending = true;
    await settled(host.parentElement!);

    expect(host.getAttribute("tone")).toBe("critical");
    expect(host.hasAttribute("pending")).toBe(true);
  });
});

describe("shrine-confirm: composition", () => {
  it("registers the @mash/ui elements it composes", async () => {
    await fixture<ShrineConfirm>(`<shrine-confirm>Sure?</shrine-confirm>`);

    // Importing this component's register module must be enough — a consumer
    // should not have to know which @mash/ui elements it happens to use.
    expect(customElements.get("ui-card")).toBeDefined();
    expect(customElements.get("ui-button")).toBeDefined();
  });

  it("upgrades the composed elements rather than leaving them inert", async () => {
    const host = await fixture<ShrineConfirm>(`<shrine-confirm>Sure?</shrine-confirm>`);

    const card = inShadow(host, "ui-card");
    expect(card.shadowRoot).not.toBeNull();
    for (const button of buttons(host)) {
      expect(button.shadowRoot).not.toBeNull();
    }
  });

  it("renders exactly two actions, cancel before confirm", async () => {
    const host = await fixture<ShrineConfirm>(`<shrine-confirm>Sure?</shrine-confirm>`);
    const parts = buttons(host).map((b) => b.getAttribute("part"));

    expect(parts).toEqual(["cancel", "confirm"]);
  });

  it("maps its tone onto the confirm button", async () => {
    const host = await fixture<ShrineConfirm>(
      `<shrine-confirm tone="critical">Sure?</shrine-confirm>`,
    );

    expect(confirmButton(host).getAttribute("tone")).toBe("critical");
    // Cancel stays neutral regardless: only one action in the pair is the
    // consequential one.
    expect(cancelButton(host).getAttribute("tone")).toBe("neutral");
  });
});

describe("shrine-confirm: slots", () => {
  it("falls back to default button labels", async () => {
    const host = await fixture<ShrineConfirm>(`<shrine-confirm>Sure?</shrine-confirm>`);

    expect(confirmButton(host).textContent?.trim()).toBe("Confirm");
    expect(cancelButton(host).textContent?.trim()).toBe("Cancel");
  });

  it("lets slotted labels override the defaults", async () => {
    const host = await fixture<ShrineConfirm>(`
      <shrine-confirm>
        <span slot="confirm">Delete</span>
        <span slot="cancel">Keep</span>
        Sure?
      </shrine-confirm>
    `);

    const assigned = (name: string) =>
      shadow(host)
        .querySelector<HTMLSlotElement>(`slot[name="${name}"]`)!
        .assignedNodes({ flatten: true })
        .map((node) => node.textContent?.trim())
        .join("");

    expect(assigned("confirm")).toBe("Delete");
    expect(assigned("cancel")).toBe("Keep");
  });

  it("projects the explanatory message through the semantic description slot", async () => {
    const host = await fixture<ShrineConfirm>(`
      <shrine-confirm><p slot="description">This cannot be undone.</p></shrine-confirm>
    `);
    const description = shadow(host).querySelector<HTMLSlotElement>('slot[name="description"]')!;
    expect(description.assignedElements()).toHaveLength(1);
    expect(description.assignedElements()[0]?.textContent).toBe("This cannot be undone.");
  });

  it("hides the heading when the title slot is empty", async () => {
    const host = await fixture<ShrineConfirm>(`<shrine-confirm>Sure?</shrine-confirm>`);
    expect(inShadow(host, ".title").hasAttribute("hidden")).toBe(true);
  });

  it("shows the heading once a title is provided", async () => {
    const host = await fixture<ShrineConfirm>(
      `<shrine-confirm><span slot="title">Delete project</span>Sure?</shrine-confirm>`,
    );
    expect(inShadow(host, ".title").hasAttribute("hidden")).toBe(false);
  });
});

describe("shrine-confirm: events", () => {
  const record = (host: Element) => {
    const seen: string[] = [];
    host.addEventListener("shrine-confirm", () => seen.push("confirm"));
    host.addEventListener("shrine-cancel", () => seen.push("cancel"));
    return seen;
  };

  it("emits shrine-confirm when the confirm button is pressed", async () => {
    const host = await fixture<ShrineConfirm>(`<shrine-confirm>Sure?</shrine-confirm>`);
    const seen = record(host);

    (confirmButton(host) as HTMLElement).click();

    expect(seen).toEqual(["confirm"]);
  });

  it("emits shrine-cancel when the cancel button is pressed", async () => {
    const host = await fixture<ShrineConfirm>(`<shrine-confirm>Sure?</shrine-confirm>`);
    const seen = record(host);

    (cancelButton(host) as HTMLElement).click();

    expect(seen).toEqual(["cancel"]);
  });

  it("bubbles out of the shadow tree so ancestors can handle it", async () => {
    const wrapper = await fixture<HTMLElement>(`<div><shrine-confirm>Sure?</shrine-confirm></div>`);
    const host = wrapper.querySelector<ShrineConfirm>("shrine-confirm")!;

    const targets: string[] = [];
    wrapper.addEventListener("shrine-confirm", (event) => {
      targets.push((event.target as Element).localName);
    });

    (confirmButton(host) as HTMLElement).click();

    // Retargeted to the host, not to the inner ui-button.
    expect(targets).toEqual(["shrine-confirm"]);
  });

  it("answers nothing while pending", async () => {
    const host = await fixture<ShrineConfirm>(`<shrine-confirm pending>Sure?</shrine-confirm>`);
    const seen = record(host);

    (confirmButton(host) as HTMLElement).click();
    (cancelButton(host) as HTMLElement).click();

    expect(seen).toEqual([]);
  });
});

describe("shrine-confirm: pending state", () => {
  it("puts the confirm button in its loading state and disables cancel", async () => {
    const host = await fixture<ShrineConfirm>(`<shrine-confirm pending>Sure?</shrine-confirm>`);

    // The loading affordance is @mash/ui's, not this component's — asserting
    // through :state() proves the composition wired it up rather than that
    // this package reimplemented a spinner.
    expect(confirmButton(host).matches(":state(loading)")).toBe(true);
    expect(cancelButton(host).hasAttribute("disabled")).toBe(true);
    expect(host.matches(":state(pending)")).toBe(true);
  });

  it("returns to interactive when pending clears", async () => {
    const host = await fixture<ShrineConfirm>(`<shrine-confirm pending>Sure?</shrine-confirm>`);

    host.pending = false;
    await settled(host.parentElement!);

    expect(confirmButton(host).matches(":state(loading)")).toBe(false);

    const seen: string[] = [];
    host.addEventListener("shrine-confirm", () => seen.push("confirm"));
    (confirmButton(host) as HTMLElement).click();

    expect(seen).toEqual(["confirm"]);
  });
});

describe("shrine-confirm: design tokens", () => {
  it("inherits the theme through to the composed buttons", async () => {
    const root = await fixture<HTMLElement>(`
      <div data-theme="light">
        <shrine-confirm id="light">Sure?</shrine-confirm>
        <div data-theme="dark">
          <shrine-confirm id="dark">Sure?</shrine-confirm>
        </div>
      </div>
    `);

    const background = (id: string) => {
      const host = root.querySelector(`#${id}`)!;
      const button = confirmButton(host);
      return getComputedStyle(inShadow(button, "button")).backgroundColor;
    };

    expect(background("light")).not.toBe(background("dark"));
  });

  it("adds no colour of its own — the card owns the surface", async () => {
    const host = await fixture<ShrineConfirm>(`<shrine-confirm>Sure?</shrine-confirm>`);

    // The host is a transparent layout wrapper; if this ever becomes opaque,
    // the component has started restating the design language.
    expect(getComputedStyle(host).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });
});
