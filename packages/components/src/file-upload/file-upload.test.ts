import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIFileUpload } from "./file-upload.js";
import "./register.js";

describe("ui-file-upload", () => {
  it("uses one native picker and reports an immutable accepted selection", async () => {
    const upload = await fixture<UIFileUpload>(
      `<ui-file-upload accept="image/*" multiple label="Add images">Add files</ui-file-upload>`,
    );
    const listener = vi.fn();
    upload.addEventListener("ui-file-upload-change", listener);
    const image = new File(["image"], "cover.png", { type: "image/png" });

    const detail = upload.select([image]);
    await settled(upload.parentElement!);

    expect(detail.files).toEqual([image]);
    expect(detail.accepted).toEqual([image]);
    expect(detail.rejected).toEqual([]);
    expect(Object.isFrozen(detail.files)).toBe(true);
    expect(upload.files).toEqual([image]);
    expect(upload.matches(":state(selected)")).toBe(true);
    expect(upload.matches(":state(empty)")).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
    expect(inShadow<HTMLInputElement>(upload, "input").ariaLabel).toBe("Add images");
    expect(inShadow<HTMLInputElement>(upload, "input").tabIndex).toBe(0);
  });

  it("applies accept, byte, and count policy without discarding a valid selection", async () => {
    const upload = await fixture<UIFileUpload>(
      `<ui-file-upload accept="image/*,.md" max-size="5" max-files="2" multiple></ui-file-upload>`,
    );
    const image = new File(["ok"], "cover.png", { type: "image/png" });
    const note = new File(["note"], "notes.md", { type: "" });
    const large = new File(["too large"], "large.png", { type: "image/png" });
    const video = new File(["no"], "clip.mp4", { type: "video/mp4" });
    const extra = new File(["yes"], "extra.png", { type: "image/png" });

    const detail = upload.select([image, note, large, video, extra]);
    await settled(upload.parentElement!);

    expect(detail.accepted).toEqual([image, note]);
    expect(detail.rejected.map(({ file, reason }) => [file.name, reason])).toEqual([
      ["large.png", "max-size"],
      ["clip.mp4", "accept"],
      ["extra.png", "max-files"],
    ]);
    expect(upload.matches(":state(rejected)")).toBe(true);
    expect(upload.files).toEqual([image, note]);
  });

  it("accepts file drops and exposes their source", async () => {
    const upload = await fixture<UIFileUpload>(`<ui-file-upload></ui-file-upload>`);
    const data = new DataTransfer();
    data.items.add(new File(["draft"], "draft.txt", { type: "text/plain" }));
    const listener = vi.fn();
    upload.addEventListener("ui-file-upload-change", listener);
    const root = inShadow<HTMLElement>(upload, "[part='root']");

    root.dispatchEvent(new DragEvent("dragenter", { bubbles: true, dataTransfer: data }));
    await settled(upload.parentElement!);
    expect(upload.matches(":state(dragover)")).toBe(true);

    root.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: data }));
    await settled(upload.parentElement!);
    expect(upload.matches(":state(dragover)")).toBe(false);
    expect(listener.mock.calls[0]?.[0].detail.source).toBe("drop");
    expect(upload.files[0]?.name).toBe("draft.txt");
  });

  it("participates in required form validity and reset", async () => {
    const form = await fixture<HTMLFormElement>(
      `<form><ui-file-upload name="asset" required></ui-file-upload></form>`,
    );
    const upload = form.querySelector<UIFileUpload>("ui-file-upload")!;

    expect(upload.validity.valueMissing).toBe(true);
    upload.select([new File(["a"], "a.txt", { type: "text/plain" })]);
    await settled(form);
    expect(upload.checkValidity()).toBe(true);
    expect(new FormData(form).get("asset")).toBeInstanceOf(File);

    form.reset();
    await settled(form);
    expect(upload.files).toHaveLength(0);
    expect(upload.validity.valueMissing).toBe(true);
  });

  it("does nothing while disabled", async () => {
    const upload = await fixture<UIFileUpload>(`<ui-file-upload disabled></ui-file-upload>`);
    const listener = vi.fn();
    upload.addEventListener("ui-file-upload-change", listener);

    const detail = upload.select([new File(["a"], "a.txt")]);

    expect(detail.accepted).toEqual([]);
    expect(upload.files).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
    expect(inShadow<HTMLInputElement>(upload, "input").disabled).toBe(true);
  });
});
