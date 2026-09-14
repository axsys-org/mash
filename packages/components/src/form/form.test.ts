import { describe, expect, it, vi } from "vitest";
import { fixture, settled } from "../test-support/fixture.js";
import type { UIForm } from "./form.js";
import type { UIInput } from "../input/input.js";
import "./register.js";
import "../input/register.js";
import "../button/register.js";

describe("ui-form native ownership", () => {
  it("associates authored controls with a native form and submits their live values", async () => {
    const form = await fixture<UIForm>(
      `<ui-form><ui-input name="title" value="Draft"></ui-input><input name="category" value="Notes"><ui-button type="submit">Save</ui-button></ui-form>`,
    );
    const submit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("ui-form-submit", submit);
    const title = form.querySelector<UIInput>("ui-input")!;
    title.value = "Edited draft";
    await settled(form);
    form.querySelector("ui-button")!.click();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(
      Object.fromEntries(
        (submit.mock.calls[0]![0] as CustomEvent<{ formData: FormData }>).detail.formData,
      ),
    ).toEqual({ title: "Edited draft", category: "Notes" });
  });

  it("validates before submission and resets the original values through the native owner", async () => {
    const form = await fixture<UIForm>(
      `<ui-form><ui-input name="title" value="" required label="Title"></ui-input><ui-button type="submit">Save</ui-button><ui-button type="reset">Reset</ui-button></ui-form>`,
    );
    const submit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("ui-form-submit", submit);
    const title = form.querySelector<UIInput>("ui-input")!;
    form.querySelector<HTMLElement>('ui-button[type="submit"]')!.click();
    expect(submit).not.toHaveBeenCalled();
    title.value = "Ready";
    await settled(form);
    form.querySelector<HTMLElement>('ui-button[type="submit"]')!.click();
    expect(submit).toHaveBeenCalledTimes(1);
    form.querySelector<HTMLElement>('ui-button[type="reset"]')!.click();
    await settled(form);
    expect(title.value).toBe("");
  });

  it("reuses an authored native form and preserves its action and method", async () => {
    const wrapper = await fixture<UIForm>(
      `<ui-form><form action="/save" method="post"><ui-input name="title" value="Draft"></ui-input><ui-button type="submit">Save</ui-button></form></ui-form>`,
    );
    const submit = vi.fn((event: Event) => event.preventDefault());
    wrapper.addEventListener("ui-form-submit", submit);
    wrapper.querySelector("form")!.addEventListener("submit", (event) => event.preventDefault());
    wrapper.querySelector("ui-button")!.click();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(wrapper.querySelectorAll("form")).toHaveLength(1);
    expect(wrapper.querySelector("form")!.getAttribute("action")).toBe("/save");
    expect(wrapper.querySelector("form")!.method).toBe("post");
  });

  it("associates later appended controls without replacing existing nodes or values", async () => {
    const wrapper = await fixture<UIForm>(
      `<ui-form><ui-input name="first" value="Original"></ui-input></ui-form>`,
    );
    const first = wrapper.querySelector<UIInput>("ui-input")!;
    first.value = "Retained edit";
    const second = document.createElement("input");
    second.name = "second";
    second.value = "Added";
    wrapper.append(second);
    await settled(wrapper);
    const owner = wrapper.querySelector("form");
    expect(owner).not.toBeNull();
    expect(wrapper.querySelector("ui-input")).toBe(first);
    expect(Object.fromEntries(new FormData(owner!))).toEqual({
      first: "Retained edit",
      second: "Added",
    });
  });
});
