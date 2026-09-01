import { afterEach, describe, expect, it } from "vitest";

import { InlineOverflowController } from "./inline-overflow.js";

const tag = "test-inline-overflow-host";

class InlineOverflowHost extends HTMLElement {
  readonly internals = this.attachInternals();
  requestUpdate(): void {}
}

if (!customElements.get(tag)) customElements.define(tag, InlineOverflowHost);

describe("InlineOverflowController", () => {
  const NativeResizeObserver = window.ResizeObserver;

  afterEach(() => {
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      value: NativeResizeObserver,
    });
  });

  it("shares one ResizeObserver across independent label viewports", () => {
    let constructions = 0;
    let disconnects = 0;
    class ResizeObserverDouble {
      constructor(_callback: ResizeObserverCallback) {
        constructions += 1;
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {
        disconnects += 1;
      }
    }
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      value: ResizeObserverDouble,
    });

    const hosts = [new InlineOverflowHost(), new InlineOverflowHost()];
    const viewports = hosts.map(() => {
      const viewport = document.createElement("span");
      viewport.append(document.createElement("span"));
      return viewport;
    });
    const controllers = hosts.map((host) => new InlineOverflowController(host, host.internals));

    controllers[0]?.connect(viewports[0]!);
    controllers[1]?.connect(viewports[1]!);
    expect(constructions).toBe(1);

    controllers[0]?.disconnect();
    expect(disconnects).toBe(0);
    controllers[1]?.disconnect();
    expect(disconnects).toBe(1);
  });
});
