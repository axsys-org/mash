import { userEvent } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import "../catalogue/mash.css";
import { UIButton } from "./button.js";
import "./register.js";

const control = (button: Element) => inShadow<HTMLButtonElement>(button, "button");

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});

afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
});

describe("ui-button: lifecycle and registration", () => {
  it("registers the tag and upgrades elements parsed from markup", async () => {
    expect(customElements.get("ui-button")).toBe(UIButton);

    const button = await fixture<UIButton>(`<ui-button>Generate</ui-button>`);
    expect(button).toBeInstanceOf(UIButton);
    expect(button.shadowRoot).not.toBeNull();
  });

  it("upgrades an element created before its definition was imported", async () => {
    // The order components arrive in is not controllable in a real app, so an
    // element that exists in the DOM before registration must still upgrade.
    const early = document.createElement("ui-button");
    document.body.append(early);
    await customElements.whenDefined("ui-button");
    await settled(document.body);

    expect(early).toBeInstanceOf(UIButton);
    early.remove();
  });

  it("is idempotent to register twice", async () => {
    await import("./register.js");
    expect(customElements.get("ui-button")).toBe(UIButton);
  });
});

describe("ui-button: attribute and property reflection", () => {
  it("applies documented defaults", async () => {
    const button = await fixture<UIButton>(`<ui-button>Go</ui-button>`);

    expect(button.variant).toBe("primary");
    expect(button.size).toBe("medium");
    expect(button.tone).toBe("accent");
    expect(button.disabled).toBe(false);
    expect(button.loading).toBe(false);
    expect(button.selected).toBe(false);
    expect(button.type).toBe("button");
  });

  it("reflects properties back to attributes", async () => {
    const button = await fixture<UIButton>(`<ui-button>Go</ui-button>`);

    button.variant = "secondary";
    button.size = "large";
    button.tone = "critical";
    button.disabled = true;
    button.selected = true;
    await settled(button.parentElement!);

    expect(button.getAttribute("variant")).toBe("secondary");
    expect(button.getAttribute("size")).toBe("large");
    expect(button.getAttribute("tone")).toBe("critical");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.hasAttribute("selected")).toBe(true);
    expect(button.matches(":state(selected)")).toBe(true);
  });

  it("reads attributes set in markup into properties", async () => {
    const button = await fixture<UIButton>(
      `<ui-button variant="quiet" size="small" tone="positive" loading>Go</ui-button>`,
    );

    expect(button.variant).toBe("quiet");
    expect(button.size).toBe("small");
    expect(button.tone).toBe("positive");
    expect(button.loading).toBe(true);
  });
});

describe("ui-button: shadow DOM and parts", () => {
  it("exposes every documented part", async () => {
    const button = await fixture<UIButton>(`<ui-button loading>Go</ui-button>`);
    const parts = [...shadow(button).querySelectorAll("[part]")].flatMap((el) =>
      (el.getAttribute("part") ?? "").split(/\s+/),
    );

    expect(parts).toEqual(
      expect.arrayContaining(["control", "prefix", "label", "suffix", "spinner"]),
    );
  });

  it("renders a real button element, so it inherits native semantics", async () => {
    const button = await fixture<UIButton>(`<ui-button>Go</ui-button>`);
    expect(control(button).localName).toBe("button");
  });
});

describe("ui-button: slots", () => {
  it("projects default, prefix and suffix content", async () => {
    const button = await fixture<UIButton>(`
      <ui-button>
        <span slot="prefix" id="pre">*</span>
        Generate
        <span slot="suffix" id="post">&rsaquo;</span>
      </ui-button>
    `);

    const assignedTo = (name: string) =>
      shadow(button)
        .querySelector<HTMLSlotElement>(name ? `slot[name="${name}"]` : "slot:not([name])")!
        .assignedNodes({ flatten: true });

    expect(assignedTo("prefix").map((n) => (n as Element).id)).toEqual(["pre"]);
    expect(assignedTo("suffix").map((n) => (n as Element).id)).toEqual(["post"]);
    expect(
      assignedTo("")
        .map((n) => n.textContent?.trim())
        .join(""),
    ).toContain("Generate");
  });

  it("replaces the prefix slot with the spinner while loading", async () => {
    const button = await fixture<UIButton>(`<ui-button><span slot="prefix">*</span>Go</ui-button>`);
    expect(shadow(button).querySelector('slot[name="prefix"]')).not.toBeNull();
    expect(shadow(button).querySelector(".spinner")).toBeNull();

    button.loading = true;
    await settled(button.parentElement!);

    expect(shadow(button).querySelector(".spinner")).not.toBeNull();
    expect(shadow(button).querySelector('slot[name="prefix"]')).toBeNull();
  });

  it("does not reserve space for an empty prefix", async () => {
    const [bare, prefixed] = await Promise.all([
      fixture<UIButton>(`<ui-button>Go</ui-button>`),
      fixture<UIButton>(`<ui-button><span slot="prefix">*</span>Go</ui-button>`),
    ]);

    expect(bare.getBoundingClientRect().width).toBeLessThan(prefixed.getBoundingClientRect().width);
  });
});

describe("ui-button: focus", () => {
  it("delegates focus to the inner control", async () => {
    const button = await fixture<UIButton>(`<ui-button>Go</ui-button>`);
    button.focus();

    expect(document.activeElement).toBe(button);
    expect(shadow(button).activeElement).toBe(control(button));
  });

  it("is not focusable while disabled", async () => {
    const button = await fixture<UIButton>(`<ui-button disabled>Go</ui-button>`);
    button.focus();

    expect(shadow(button).activeElement).toBeNull();
  });
});

describe("ui-button: events", () => {
  it("emits a click retargeted to the host", async () => {
    const button = await fixture<UIButton>(`<ui-button>Go</ui-button>`);
    const targets: EventTarget[] = [];
    button.addEventListener("click", (e) => targets.push(e.target!));

    control(button).click();

    expect(targets).toEqual([button]);
  });

  it("suppresses clicks while disabled", async () => {
    const button = await fixture<UIButton>(`<ui-button disabled>Go</ui-button>`);
    let clicks = 0;
    button.addEventListener("click", () => (clicks += 1));

    button.click();
    control(button).click();

    expect(clicks).toBe(0);
  });

  it("suppresses clicks while loading", async () => {
    const button = await fixture<UIButton>(`<ui-button loading>Go</ui-button>`);
    let clicks = 0;
    button.addEventListener("click", () => (clicks += 1));

    button.click();

    expect(clicks).toBe(0);
  });
});

describe("ui-button: keyboard interaction", () => {
  // These drive the real browser's input pipeline rather than dispatching
  // synthetic events, which is the only way to prove that native button
  // activation still works through the shadow boundary.

  it("activates on Enter and on Space", async () => {
    const button = await fixture<UIButton>(`<ui-button>Go</ui-button>`);
    let clicks = 0;
    button.addEventListener("click", () => (clicks += 1));

    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(clicks).toBe(1);

    await userEvent.keyboard(" ");
    expect(clicks).toBe(2);
  });

  it("does not activate on Enter while disabled", async () => {
    const button = await fixture<UIButton>(`<ui-button disabled>Go</ui-button>`);
    let clicks = 0;
    button.addEventListener("click", () => (clicks += 1));

    button.focus();
    await userEvent.keyboard("{Enter}");

    expect(clicks).toBe(0);
  });

  /**
   * Whether this engine puts buttons in the tab order at all.
   *
   * WebKit on macOS does not: "Press Tab to highlight each item on a webpage"
   * is off by default, so Tab moves between text fields and skips buttons and
   * links entirely. That is a platform preference, not something a component
   * can or should override — a plain `<button>` behaves identically — so the
   * baseline is measured rather than assumed.
   */
  async function engineTabsToButtons(): Promise<boolean> {
    const probe = await fixture<HTMLElement>(
      `<div><input id="probe-input" /><button id="probe-native">native</button></div>`,
    );
    probe.querySelector<HTMLInputElement>("#probe-input")!.focus();
    await userEvent.keyboard("{Tab}");
    return document.activeElement?.id === "probe-native";
  }

  it("is exactly as tab-reachable as a native button, and skips disabled ones", async () => {
    const tabsToButtons = await engineTabsToButtons();

    const root = await fixture<HTMLElement>(`
      <div>
        <input id="start" />
        <ui-button id="one">One</ui-button>
        <ui-button id="two" disabled>Two</ui-button>
        <ui-button id="three">Three</ui-button>
        <input id="end" />
      </div>
    `);

    root.querySelector<HTMLInputElement>("#start")!.focus();
    await userEvent.keyboard("{Tab}");

    if (tabsToButtons) {
      expect(document.activeElement?.id).toBe("one");
      await userEvent.keyboard("{Tab}");
      // Straight past the disabled one.
      expect(document.activeElement?.id).toBe("three");
    } else {
      // The engine tabs over buttons. The custom element must be skipped too —
      // if it were reachable here it would be *more* prominent in the tab order
      // than the native control it stands in for.
      expect(document.activeElement?.id).toBe("end");
    }
  });
});

describe("ui-button: custom states", () => {
  it("exposes :state(loading)", async () => {
    const button = await fixture<UIButton>(`<ui-button>Go</ui-button>`);
    expect(button.matches(":state(loading)")).toBe(false);

    button.loading = true;
    await settled(button.parentElement!);
    expect(button.matches(":state(loading)")).toBe(true);

    button.loading = false;
    await settled(button.parentElement!);
    expect(button.matches(":state(loading)")).toBe(false);
  });

  it("exposes :state(pressed) while held, and clears it when the button goes inert", async () => {
    const button = await fixture<UIButton>(`<ui-button>Go</ui-button>`);
    const target = control(button);

    target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    expect(button.matches(":state(pressed)")).toBe(true);

    button.disabled = true;
    await settled(button.parentElement!);
    expect(button.matches(":state(pressed)")).toBe(false);
  });
});

describe("ui-button: accessibility", () => {
  it("marks the control disabled rather than only styling it", async () => {
    const button = await fixture<UIButton>(`<ui-button disabled>Go</ui-button>`);
    expect(control(button).disabled).toBe(true);
  });

  it("announces loading with aria-busy and blocks interaction", async () => {
    const button = await fixture<UIButton>(`<ui-button loading>Go</ui-button>`);
    expect(control(button).getAttribute("aria-busy")).toBe("true");
    expect(control(button).disabled).toBe(true);
  });

  it("hides the decorative spinner from assistive technology", async () => {
    const button = await fixture<UIButton>(`<ui-button loading>Go</ui-button>`);
    expect(shadow(button).querySelector(".spinner")!.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("ui-button: form association", () => {
  it("submits its form from inside the shadow root", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form><ui-button type="submit">Save</ui-button></form>
    `);
    let submits = 0;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submits += 1;
    });

    form.querySelector<UIButton>("ui-button")!.click();

    expect(submits).toBe(1);
  });

  it("resets its form", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form>
        <input name="field" value="initial" />
        <ui-button type="reset">Reset</ui-button>
      </form>
    `);
    const input = form.querySelector("input")!;
    input.value = "changed";

    form.querySelector<UIButton>("ui-button")!.click();

    expect(input.value).toBe("initial");
  });

  it("does nothing to the form when type is button", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form><ui-button type="button">Inert</ui-button></form>
    `);
    let submits = 0;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submits += 1;
    });

    form.querySelector<UIButton>("ui-button")!.click();

    expect(submits).toBe(0);
  });

  it("does not submit while disabled", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form><ui-button type="submit" disabled>Save</ui-button></form>
    `);
    let submits = 0;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submits += 1;
    });

    form.querySelector<UIButton>("ui-button")!.click();

    expect(submits).toBe(0);
  });
});

describe("ui-button: Mash recipe", () => {
  const background = (button: Element) => getComputedStyle(control(button)).backgroundColor;

  it("paints its background from --color-action, not from a hardcoded value", async () => {
    const button = await fixture<UIButton>(`<ui-button>Go</ui-button>`);

    // Compare against a probe painted directly with the token, so both values
    // go through the same serialisation and the assertion is about the colour
    // rather than about how the browser prints it.
    const probe = await fixture<HTMLElement>(
      `<div style="background-color: var(--color-action)"></div>`,
    );

    expect(background(button)).toBe(getComputedStyle(probe).backgroundColor);
    expect(background(button)).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("changes appearance per tone without any tone-specific component rule", async () => {
    const accent = await fixture<UIButton>(`<ui-button>Go</ui-button>`);
    const critical = await fixture<UIButton>(`<ui-button tone="critical">Go</ui-button>`);

    expect(background(accent)).not.toBe(background(critical));
  });

  it("inherits the theme from an ancestor, and nests", async () => {
    const root = await fixture<HTMLElement>(`
      <div data-theme="light">
        <ui-button id="light">Light</ui-button>
        <div data-theme="dark">
          <ui-button id="dark">Dark</ui-button>
        </div>
      </div>
    `);

    const light = root.querySelector("#light")!;
    const dark = root.querySelector("#dark")!;

    expect(background(light)).not.toBe(background(dark));
  });

  it("scales padding with the size axis", async () => {
    const small = await fixture<UIButton>(`<ui-button size="small">Go</ui-button>`);
    const large = await fixture<UIButton>(`<ui-button size="large">Go</ui-button>`);

    const padding = (b: Element) => parseFloat(getComputedStyle(control(b)).paddingInlineStart);
    expect(padding(small)).toBeLessThan(padding(large));
  });
});
