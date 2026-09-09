import { userEvent } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import "../input/register.js";
import "../catalogue/mash.css";
import { UIClipboard } from "./clipboard.js";
import "./register.js";

const control = (clipboard: Element) => inShadow<HTMLButtonElement>(clipboard, "button");

let originalClipboardDescriptor: PropertyDescriptor | undefined;
let originalExecCommand: Document["execCommand"] | undefined;

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
  originalClipboardDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, "clipboard");
  originalExecCommand = document.execCommand;
});

afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  vi.restoreAllMocks();
  if (originalClipboardDescriptor) {
    Object.defineProperty(Navigator.prototype, "clipboard", originalClipboardDescriptor);
  } else {
    Reflect.deleteProperty(Navigator.prototype, "clipboard");
  }
  if (originalExecCommand) {
    document.execCommand = originalExecCommand;
  } else {
    Reflect.deleteProperty(document, "execCommand");
  }
});

function stubClipboard(writer = vi.fn<NavigatorClipboard["clipboard"]["writeText"]>()) {
  Object.defineProperty(Navigator.prototype, "clipboard", {
    configurable: true,
    get: () => ({ writeText: writer }),
  });
  return writer;
}

describe("ui-clipboard: lifecycle and registration", () => {
  it("registers the tag and upgrades parsed markup", async () => {
    expect(customElements.get("ui-clipboard")).toBe(UIClipboard);

    const clipboard = await fixture<UIClipboard>(`<ui-clipboard value="copy me"></ui-clipboard>`);
    expect(clipboard).toBeInstanceOf(UIClipboard);
    expect(clipboard.shadowRoot).not.toBeNull();
  });

  it("is idempotent to register twice", async () => {
    await import("./register.js");
    expect(customElements.get("ui-clipboard")).toBe(UIClipboard);
  });
});

describe("ui-clipboard: attributes and anatomy", () => {
  it("applies documented defaults", async () => {
    const clipboard = await fixture<UIClipboard>(`<ui-clipboard></ui-clipboard>`);

    expect(clipboard.value).toBe("");
    expect(clipboard.source).toBe("");
    expect(clipboard.label).toBe("Copy");
    expect(clipboard.copiedLabel).toBe("Copied");
    expect(clipboard.errorLabel).toBe("Copy failed");
    expect(clipboard.variant).toBe("secondary");
    expect(clipboard.size).toBe("small");
    expect(clipboard.tone).toBe("neutral");
    expect(clipboard.compact).toBe(false);
    expect(clipboard.outline).toBe(false);
    expect(clipboard.disabled).toBe(false);
  });

  it("reflects styling properties and exposes documented parts", async () => {
    const clipboard = await fixture<UIClipboard>(
      `<ui-clipboard value="copy me" size="xs" variant="ghost" tone="accent" compact outline>Copy</ui-clipboard>`,
    );

    expect(clipboard.getAttribute("size")).toBe("xs");
    expect(clipboard.getAttribute("variant")).toBe("ghost");
    expect(clipboard.getAttribute("tone")).toBe("accent");
    expect(clipboard.hasAttribute("compact")).toBe(true);
    expect(clipboard.hasAttribute("outline")).toBe(true);

    const parts = [...shadow(clipboard).querySelectorAll("[part]")].flatMap((el) =>
      (el.getAttribute("part") ?? "").split(/\s+/),
    );
    expect(parts).toEqual(expect.arrayContaining(["control", "icon", "copy-icon", "label"]));
    expect(control(clipboard).localName).toBe("button");
  });
});

describe("ui-clipboard: copying", () => {
  it("copies a static value and reports feedback state", async () => {
    const writeText = stubClipboard(vi.fn(async () => undefined));
    const clipboard = await fixture<UIClipboard>(
      `<ui-clipboard value="https://example.com/project" reset-after="10000">Copy URL</ui-clipboard>`,
    );
    const copied: string[] = [];
    clipboard.addEventListener("ui-clipboard-copied", (event) => {
      copied.push((event as CustomEvent<{ value: string }>).detail.value);
    });

    await clipboard.copy();
    await settled(clipboard.parentElement!);

    expect(writeText).toHaveBeenCalledWith("https://example.com/project");
    expect(copied).toEqual(["https://example.com/project"]);
    expect(clipboard.matches(":state(copied)")).toBe(true);
    expect(control(clipboard).textContent?.trim()).toBe("Copied");
  });

  it("copies a live source value at activation time", async () => {
    const writeText = stubClipboard(vi.fn(async () => undefined));
    const root = await fixture<HTMLElement>(`
      <div>
        <ui-input id="share-url" value="https://example.com/live"></ui-input>
        <ui-clipboard source="#share-url">Copy</ui-clipboard>
      </div>
    `);
    const input = root.querySelector<HTMLElement & { value: string }>("#share-url")!;
    const clipboard = root.querySelector<UIClipboard>("ui-clipboard")!;

    input.value = "https://example.com/updated";
    await clipboard.copy();

    expect(writeText).toHaveBeenCalledWith("https://example.com/updated");
  });

  it("lets applications provide lazy values through the copy request event", async () => {
    const writeText = stubClipboard(vi.fn(async () => undefined));
    const clipboard = await fixture<UIClipboard>(`<ui-clipboard value="stale">Copy</ui-clipboard>`);
    clipboard.addEventListener("ui-clipboard-copy", (event) => {
      (event as CustomEvent<{ setValue(value: string): void }>).detail.setValue("fresh");
    });

    const value = await clipboard.copy();

    expect(value).toBe("fresh");
    expect(writeText).toHaveBeenCalledWith("fresh");
  });

  it("falls back to document copy when navigator.clipboard is unavailable", async () => {
    Reflect.deleteProperty(Navigator.prototype, "clipboard");
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand as Document["execCommand"];
    const clipboard = await fixture<UIClipboard>(
      `<ui-clipboard value="legacy">Copy</ui-clipboard>`,
    );

    await clipboard.copy();

    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("reports copy errors and exposes error state", async () => {
    stubClipboard(vi.fn(async () => Promise.reject(new Error("blocked"))));
    const clipboard = await fixture<UIClipboard>(
      `<ui-clipboard value="secret" reset-after="10000">Copy</ui-clipboard>`,
    );
    const errors: unknown[] = [];
    clipboard.addEventListener("ui-clipboard-error", (event) => {
      errors.push((event as CustomEvent<{ error: unknown }>).detail.error);
    });

    await expect(clipboard.copy()).rejects.toThrow("blocked");
    await settled(clipboard.parentElement!);

    expect(errors).toHaveLength(1);
    expect(clipboard.matches(":state(error)")).toBe(true);
    expect(control(clipboard).textContent?.trim()).toBe("Copy failed");
  });

  it("suppresses activation while disabled", async () => {
    const writeText = stubClipboard(vi.fn(async () => undefined));
    const clipboard = await fixture<UIClipboard>(
      `<ui-clipboard value="nope" disabled>Copy</ui-clipboard>`,
    );

    control(clipboard).click();
    await settled(clipboard.parentElement!);

    expect(writeText).not.toHaveBeenCalled();
    expect(control(clipboard).disabled).toBe(true);
    expect(clipboard.matches(":state(disabled)")).toBe(true);
  });
});

describe("ui-clipboard: Mash recipe", () => {
  it("maps size aliases to the expected control heights", async () => {
    const [xsmall, small, medium, large] = await Promise.all([
      fixture<UIClipboard>(`<ui-clipboard size="xs">Copy</ui-clipboard>`),
      fixture<UIClipboard>(`<ui-clipboard size="sm">Copy</ui-clipboard>`),
      fixture<UIClipboard>(`<ui-clipboard size="md">Copy</ui-clipboard>`),
      fixture<UIClipboard>(`<ui-clipboard size="lg">Copy</ui-clipboard>`),
    ]);

    const height = (clipboard: Element) => control(clipboard).getBoundingClientRect().height;
    expect(height(xsmall)).toBeCloseTo(20, 0);
    expect(height(small)).toBeCloseTo(24, 0);
    expect(height(medium)).toBeCloseTo(32, 0);
    expect(height(large)).toBeCloseTo(32, 0);
  });

  it("uses tokenized semantic feedback for copied state", async () => {
    // Park the real pointer away from this fixture: hover feedback has its own token.
    const parking = await fixture<HTMLElement>(
      '<div style="position:fixed;right:0;bottom:0;width:8px;height:8px"></div>',
    );
    await userEvent.hover(parking);
    stubClipboard(vi.fn(async () => undefined));
    const clipboard = await fixture<UIClipboard>(
      `<ui-clipboard value="done" reset-after="10000" style="--color-positive-subtle: rgb(1 2 3); --duration-control: 0ms">Copy</ui-clipboard>`,
    );
    const probe = await fixture<HTMLElement>(`<div style="background-color: rgb(1 2 3)"></div>`);

    await clipboard.copy();
    await settled(clipboard.parentElement!);

    expect(getComputedStyle(control(clipboard)).backgroundColor).toBe(
      getComputedStyle(probe).backgroundColor,
    );
  });
});

interface NavigatorClipboard {
  clipboard: {
    writeText(value: string): Promise<void>;
  };
}
