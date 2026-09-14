/** Opt-in comparison host. Application components never import this module. */
export function mountSharedPreview(
  target: HTMLElement,
  tag: string,
  variants: { name: string }[],
  index: Element,
  zoom: HTMLElement & { value: string },
  restore: () => void,
  signal: AbortSignal,
): void {
  const frame = document.createElement("iframe");
  frame.className = "stage-frame shared-frame";
  frame.title = `${tag} examples`;
  frame.style.cssText = "display:block;border:0;width:100%;height:100%";
  target.style.cssText = "height:100%;padding:0";
  target.parentElement!.style.overflow = "hidden";
  const url = new URL("/shared-fixture.html", location.href);
  url.search = location.search;
  url.searchParams.set("component", tag);
  url.searchParams.set("theme", document.documentElement.dataset.theme ?? "light");
  url.hash = location.hash;
  frame.src = url.href;
  target.append(frame);
  for (const variant of variants) {
    const id = variant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const link = document.createElement("a");
    link.href = `#${id}`;
    link.textContent = variant.name;
    link.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        history.replaceState(null, "", `#${id}`);
        frame.contentWindow?.mashSharedPreview?.reveal(id);
      },
      { signal },
    );
    index.append(link);
  }
  const applyZoom = () => {
    target.style.zoom = "";
    frame.contentWindow?.mashSharedPreview?.zoom(zoom.value);
  };
  zoom.addEventListener("ui-select-change", applyZoom, { signal });
  frame.addEventListener(
    "load",
    async () => {
      await frame.contentWindow?.mashPreviewReady;
      if (signal.aborted) return;
      applyZoom();
      frame.contentDocument?.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape" && !event.defaultPrevented) restore();
        },
        { signal },
      );
    },
    { signal },
  );
  signal.addEventListener("abort", () => frame.contentWindow?.mashSharedPreview?.dispose(), {
    once: true,
  });
}
