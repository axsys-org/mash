import { describe, expect, it, vi } from "vitest";
import { fixture } from "../test-support/fixture.js";
import { bindMessageComposer } from "./register.js";

const markup = `<form class="mash-composer"><div class="mash-composer-queue"></div><div class="mash-composer-context"></div><ui-textarea label="Message"></ui-textarea><ui-button type="submit" data-send><ui-icon></ui-icon></ui-button><ui-button data-stop>Stop</ui-button><input type="file" multiple><div class="mash-composer-suggestions"></div><div class="mash-composer-status"><output></output><ui-button data-retry>Retry</ui-button></div></form>`;

describe("public message composer", () => {
  it("restores rejected and cancelled delivery, then releases the binding for a clean remount", async () => {
    const form = await fixture<HTMLFormElement>(markup);
    const lifetime = new AbortController();
    const onSend = vi.fn().mockRejectedValueOnce(new Error("offline"));
    const sent = vi.fn();
    form.addEventListener("composer-send", sent);
    const composer = bindMessageComposer(form, { signal: lifetime.signal, onSend });
    expect(bindMessageComposer(form)).toBe(composer);
    composer.value = "Keep this draft";
    composer.send();
    await vi.waitFor(() => expect(composer.value).toBe("Keep this draft"));
    expect(sent).not.toHaveBeenCalled();
    let request: AbortSignal | undefined;
    onSend.mockImplementationOnce((_message, signal) => {
      request = signal;
      return new Promise(() => {});
    });
    composer.send();
    await vi.waitFor(() => expect(request).toBeDefined());
    composer.stop();
    expect(request!.aborted).toBe(true);
    expect(composer.value).toBe("Keep this draft");
    lifetime.abort();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(onSend).toHaveBeenCalledTimes(2);
    const rebound = bindMessageComposer(form);
    rebound.send();
    expect(sent).toHaveBeenCalledTimes(1);
    rebound.destroy();
  });

  it("dispatches one queued message at a time and protects queue snapshots from consumer edits", async () => {
    const form = await fixture<HTMLFormElement>(markup);
    const composer = bindMessageComposer(form);
    const texts: string[] = [];
    form.addEventListener("composer-send", (event) => {
      texts.push((event as CustomEvent).detail.text);
      composer.status = "streaming";
    });
    composer.status = "streaming";
    composer.value = "First";
    composer.send();
    composer.value = "Second";
    composer.send();
    const snapshot = composer.queue;
    snapshot[0]!.text = "Mutated";
    snapshot.splice(1);
    expect(composer.queue.map((item) => item.text)).toEqual(["First", "Second"]);
    composer.status = "idle";
    expect(texts).toEqual(["First"]);
    expect(composer.queue).toHaveLength(1);
    composer.status = "idle";
    expect(texts).toEqual(["First", "Second"]);
    composer.destroy();
  });
});
