import { components, type ComponentSchema } from "./schema.js";
import { examplesFor } from "./examples.js";
import { formatMarkup } from "./format-markup.js";

export const nameOf = (tag: string) =>
  tag
    .replace(/^ui-/, "")
    .split("-")
    .map((word) => (word === "kbd" ? "Keyboard" : word[0]!.toUpperCase() + word.slice(1)))
    .join(" ");
export const escape = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}
const catalogue = components.filter((component) => component.packageName === "@mash/ui");
let dispose = () => {};
export function showCatalogue(root: HTMLElement): void {
  dispose();
  const abort = new AbortController();
  const observers: ResizeObserver[] = [];
  dispose = () => {
    abort.abort();
    observer.disconnect();
    observers.forEach((item) => item.disconnect());
    restorePreview();
  };
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const frame = entry.target as HTMLIFrameElement;
        frame.src = `/fixture.html?theme=${document.documentElement.dataset.theme}`;
      }),
    { rootMargin: "400px" },
  );
  const tag = location.pathname.split("/")[2];
  const component =
    catalogue.find((item) => item.tagName === tag) ??
    catalogue.find((item) => item.tagName === "ui-button")!;
  const theme =
    new URL(location.href).searchParams.get("theme") ??
    localStorage.getItem("mash-theme") ??
    "light";
  document.documentElement.dataset.theme = theme;
  root.innerHTML = `<header class="site-header"><a class="wordmark" href="/components/ui-button">mash<span> / </span></a><nav aria-label="Site"><a aria-current="page" href="/components/ui-button">Components</a></nav><button class="theme-toggle" aria-label="Switch color theme">${theme === "dark" ? "☀" : "☾"}</button></header><div class="showcase-layout"><aside class="component-sidebar"><input type="search" placeholder="Find component…" aria-label="Find component"><nav aria-label="Components">${catalogue.map((item) => `<a href="/components/${item.tagName}" ${item === component ? 'aria-current="page"' : ""}>${nameOf(item.tagName)}</a>`).join("")}</nav></aside><main class="showcase-main"><header class="component-heading"><code>${component.tagName}</code><h1>${nameOf(component.tagName)}</h1><p>${escape(component.summary ?? "")}</p></header><div class="showcase-variants"></div></main><aside class="page-index"><span>On this page</span></aside></div>`;
  root.querySelector<HTMLInputElement>('input[type="search"]')!.addEventListener(
    "input",
    (event) => {
      const query = (event.target as HTMLInputElement).value.toLowerCase();
      root.querySelectorAll<HTMLAnchorElement>(".component-sidebar nav a").forEach((link) => {
        link.hidden = !link.textContent!.toLowerCase().includes(query);
      });
    },
    { signal: abort.signal },
  );
  root.querySelector(".theme-toggle")!.addEventListener(
    "click",
    () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem("mash-theme", nextTheme);
      root.querySelector(".theme-toggle")!.textContent = nextTheme === "dark" ? "☀" : "☾";
      root.querySelectorAll("iframe").forEach((frame) => {
        if (frame.contentDocument) frame.contentDocument.documentElement.dataset.theme = nextTheme;
      });
      const url = new URL(location.href);
      url.searchParams.set("theme", nextTheme);
      history.replaceState(null, "", url);
    },
    { signal: abort.signal },
  );
  const variants = examplesFor(component).filter(
    (example) => !/<(?:sh-|shrine-)/.test(example.code),
  );
  const target = root.querySelector<HTMLElement>(".showcase-variants")!;
  const preview = node("dialog", "preview-window");
  preview.open = true;
  preview.setAttribute("role", "region");
  preview.setAttribute("aria-label", `${nameOf(component.tagName)} preview`);
  const chrome = node("div", "preview-chrome");
  const title = node("span", "preview-title", nameOf(component.tagName));
  const zoom = node("select", "preview-zoom");
  zoom.setAttribute("aria-label", "Preview zoom");
  for (const value of [50, 75, 100, 125, 150]) {
    const option = node("option", "", `${value}%`);
    option.value = String(value / 100);
    option.selected = value === 100;
    zoom.append(option);
  }
  const expand = node("button", "preview-expand");
  expand.type = "button";
  expand.innerHTML =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6 2H2v4m8-4h4v4M2 10v4h4m8-4v4h-4"/></svg>';
  expand.setAttribute("aria-label", "Expand preview");
  expand.title = "Expand preview";
  expand.setAttribute("aria-expanded", "false");
  chrome.append(title, zoom, expand);
  const viewport = node("div", "preview-viewport");
  viewport.setAttribute("aria-label", "Component variants");
  viewport.tabIndex = 0;
  target.replaceWith(preview);
  viewport.append(target);
  preview.append(chrome, viewport);
  let expanded = false;
  let priorFocus: HTMLElement | null = null;
  let priorOverflow = "";
  function restorePreview() {
    if (!expanded) return;
    expanded = false;
    preview.close();
    preview.open = true;
    preview.setAttribute("role", "region");
    preview.removeAttribute("aria-modal");
    expand.setAttribute("aria-label", "Expand preview");
    expand.title = "Expand preview";
    expand.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = priorOverflow;
    priorFocus?.focus({ preventScroll: true });
  }
  expand.addEventListener(
    "click",
    () => {
      if (expanded) return restorePreview();
      priorFocus = document.activeElement as HTMLElement;
      priorOverflow = document.documentElement.style.overflow;
      preview.close();
      preview.showModal();
      expanded = true;
      preview.setAttribute("role", "dialog");
      preview.setAttribute("aria-modal", "true");
      expand.setAttribute("aria-label", "Restore preview");
      expand.title = "Restore preview · Esc";
      expand.setAttribute("aria-expanded", "true");
      document.documentElement.style.overflow = "hidden";
      expand.focus({ preventScroll: true });
    },
    { signal: abort.signal },
  );
  preview.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      restorePreview();
    },
    { signal: abort.signal },
  );
  zoom.addEventListener(
    "change",
    () => {
      // CSS zoom changes available layout space, so charts and menus reflow naturally.
      target.style.zoom = zoom.value;
    },
    { signal: abort.signal },
  );
  const requested = new URL(location.href).searchParams.get("example");
  const selectedVariant = variants.find((variant) => variant.name === requested) ?? variants[0];
  variants.forEach((variant, index) => {
    const id = variant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const section = node("section", "showcase-section");
    section.id = id;
    section.append(node("h2", "", variant.name));
    if (variant.description) section.append(node("p", "variant-description", variant.description));
    const frame = node(
      "iframe",
      "variant-frame" + (variant === selectedVariant ? " stage-frame" : ""),
    );
    frame.title = `${nameOf(component.tagName)} — ${variant.name}`;
    frame.dataset.variant = variant.name;
    frame.setAttribute("loading", "lazy");
    section.append(frame);
    target.append(section);
    const details = node("details", "reference-code");
    details.append(node("summary", "", "Code"));
    const code = node(
      "pre",
      "",
      `import "@mash/ui";\nimport "@mash/tokens/tokens.css";\nimport "@mash/ui/catalogue/mash.css";\n\n${formatMarkup(variant.code)}${variant.script ? `\n\n<script type="module">\n${variant.script}\n</script>` : ""}`,
    );
    const copy = node("button", "copy-code", "Copy");
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.textContent!);
        copy.textContent = "Copied";
      } catch {
        copy.textContent = "Select code to copy";
      }
    });
    details.append(copy, code);
    section.append(details);
    const link = node("a", "", variant.name);
    link.href = `#${id}`;
    root.querySelector(".page-index")!.append(link);
    frame.addEventListener(
      "load",
      async () => {
        const doc = frame.contentDocument;
        if (!doc) return;
        while (
          doc.documentElement.dataset.stageReady !== "true" &&
          frame.isConnected &&
          !abort.signal.aborted
        )
          await new Promise((resolve) => setTimeout(resolve, 25));
        if (abort.signal.aborted || !frame.isConnected) return;
        doc.documentElement.dataset.theme = document.documentElement.dataset.theme;
        doc.documentElement.dataset.layout = "start";
        doc.body.style.minHeight = "0";
        doc.body.style.padding = "24px";
        doc.addEventListener(
          "keydown",
          (event) => {
            // Keyboard events do not cross an iframe boundary.
            if (event.key === "Escape" && expanded && !event.defaultPrevented) {
              event.preventDefault();
              restorePreview();
            }
          },
          { signal: abort.signal },
        );
        doc.body.innerHTML = variant.code;
        if (
          doc.body.querySelector(
            "ui-menu, ui-context-menu, ui-select, ui-combobox, ui-date-picker, ui-popover, ui-hover-card, ui-color-picker:not([inline])",
          )
        ) {
          // Floating surfaces do not contribute to body height. Reserve the public
          // menu recipe's ten rows, two control rows, and outer/inner breathing room.
          frame.style.minHeight =
            "calc(var(--layout-menu-row-regular) * 10 + var(--layout-dimension-control-medium) * 2 + var(--space-region) * 4)";
        }
        if (variant.script) {
          const script = doc.createElement("script");
          script.type = "module";
          script.textContent = variant.script;
          doc.body.append(script);
        }
        const modalSurfaces: { popup: HTMLElement; backdrop: HTMLElement }[] = [];
        let modalVisible = false;
        const resize = () => {
          let height = Math.max(180, Math.ceil(doc.body.getBoundingClientRect().height));
          const zoomFactor = parseFloat(getComputedStyle(target).zoom) || 1;
          const modalLimit = Math.max(
            180,
            Math.min(viewport.clientHeight, window.innerHeight - 96) / zoomFactor,
          );
          let hasVisibleModal = false;
          for (const { popup, backdrop } of modalSurfaces) {
            if (!popup.getClientRects().length) continue;
            hasVisibleModal = true;
            const style = doc.defaultView!.getComputedStyle(backdrop);
            const padding =
              parseFloat(style.paddingTop || "0") + parseFloat(style.paddingBottom || "0");
            // Modals can exceed a small initial frame without contributing to body
            // height. Bound their growth to the outer window to avoid feedback from
            // viewport-relative content, and scroll only genuinely oversized panels.
            popup.style.maxBlockSize = `calc(100dvh - ${padding}px)`;
            popup.style.overflowY = "auto";
            const border = popup.offsetHeight - popup.clientHeight;
            height = Math.max(
              height,
              Math.min(modalLimit, Math.ceil(popup.scrollHeight + border + padding)),
            );
          }
          const heightChanged = frame.height !== String(Math.ceil(height));
          if (heightChanged) frame.height = String(Math.ceil(height));
          // A child document cannot reveal the portion clipped by its parent's
          // scrollport. Bring the live frame into that scrollport as its modal opens.
          if (hasVisibleModal && (!modalVisible || heightChanged)) {
            requestAnimationFrame(() => {
              if (frame.isConnected && !abort.signal.aborted)
                frame.scrollIntoView({ block: "center", inline: "nearest" });
            });
          }
          modalVisible = hasVisibleModal;
        };
        const size = new ResizeObserver(resize);
        size.observe(doc.body);
        window.addEventListener("resize", resize, { signal: abort.signal });
        zoom.addEventListener("change", resize, { signal: abort.signal });
        observers.push(size);
        resize();
        const modals = [
          ...doc.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>(
            "ui-dialog, ui-alert-dialog",
          ),
        ];
        void Promise.all(modals.map((modal) => modal.updateComplete)).then(() => {
          if (abort.signal.aborted || !frame.isConnected) return;
          for (const modal of modals) {
            const popup = modal.shadowRoot?.querySelector<HTMLElement>('[part="popup"]');
            const backdrop = modal.shadowRoot?.querySelector<HTMLElement>('[part="backdrop"]');
            if (!popup || !backdrop) continue;
            modalSurfaces.push({ popup, backdrop });
            size.observe(popup);
            for (const child of modal.children) size.observe(child);
          }
          resize();
        });
      },
      { signal: abort.signal },
    );
    if (index === 0 || variant === selectedVariant)
      frame.src = `/fixture.html?theme=${document.documentElement.dataset.theme}`;
    else observer.observe(frame);
  });
  preview.after(api(component));
  const oldVariant = new URL(location.href).searchParams.get("example");
  const anchor = location.hash.slice(1) || oldVariant?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (anchor)
    requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ block: "nearest" });
    });
}
function api(component: ComponentSchema): HTMLElement {
  const section = node("section", "api-reference");
  section.id = "api";
  section.append(node("h2", "", "Reference"));
  for (const [title, values] of [
    ["Attributes", component.attributes],
    ["Slots", component.slots],
    ["Events", component.events],
    ["CSS parts", component.cssParts],
    ["CSS properties", component.cssProperties],
  ] as const) {
    if (!values.length) continue;
    const details = node("details");
    details.append(node("summary", "", `${title} · ${values.length}`));
    const list = node("dl");
    for (const value of values) {
      list.append(node("dt", "", value.name || "default"), node("dd", "", value.description ?? ""));
    }
    details.append(list);
    section.append(details);
  }
  return section;
}
