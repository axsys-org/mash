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
  };
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const frame = entry.target as HTMLIFrameElement;
        frame.src = "/fixture.html";
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
  const target = root.querySelector(".showcase-variants")!;
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
        doc.body.innerHTML = variant.code;
        if (variant.script) {
          const script = doc.createElement("script");
          script.type = "module";
          script.textContent = variant.script;
          doc.body.append(script);
        }
        const resize = () => {
          const height = Math.max(
            180,
            Math.min(1200, Math.ceil(doc.body.getBoundingClientRect().height)),
          );
          if (frame.height !== String(height)) frame.height = String(height);
        };
        const size = new ResizeObserver(resize);
        size.observe(doc.body);
        observers.push(size);
        resize();
      },
      { signal: abort.signal },
    );
    if (index === 0 || variant === selectedVariant) frame.src = "/fixture.html";
    else observer.observe(frame);
  });
  target.append(api(component));
  const oldVariant = new URL(location.href).searchParams.get("example");
  const anchor = location.hash.slice(1) || oldVariant?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (anchor) requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView());
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
