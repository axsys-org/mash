import { siteHeader } from "./site-header.js";
import "./stories.css";

type Story = {
  id: string;
  title: string;
  description: string;
  symbol: string;
  load: () => Promise<{ mount(root: HTMLElement): Promise<() => void> }>;
};

const stories: Story[] = [
  {
    id: "studio",
    title: "Studio",
    description: "A coding workspace with files, search, changes, and live previews.",
    symbol: "⌘",
    load: () => import("./stories/studio.js"),
  },
  {
    id: "command-center",
    title: "Command Center",
    description: "Search, calculate, collect, and act without leaving the keyboard.",
    symbol: "↗",
    load: () => import("./stories/launcher.js"),
  },
  {
    id: "documents",
    title: "Documents",
    description: "Write in blocks. Arrange the same work on an open canvas.",
    symbol: "▤",
    load: () => import("./stories/documents.js"),
  },
  {
    id: "projects",
    title: "Projects",
    description: "Plan a release through issues, projects, boards, and cycles.",
    symbol: "◒",
    load: () => import("./stories/issues.js"),
  },
  {
    id: "commons",
    title: "Commons",
    description: "Conversations, shared notebooks, and a place for your community.",
    symbol: "⌁",
    load: () => import("./stories/community.js"),
  },
];

export async function mount(root: HTMLElement): Promise<() => void> {
  const controller = new AbortController();
  let destroyApp: (() => void) | undefined;
  let loadVersion = 0;
  const theme =
    new URL(location.href).searchParams.get("theme") ??
    localStorage.getItem("mash-theme") ??
    "light";
  document.documentElement.dataset.theme = theme;
  root.innerHTML = siteHeader("stories", theme);
  root.querySelector(".theme-toggle")!.addEventListener(
    "click",
    () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("mash-theme", next);
      root.querySelector(".theme-toggle")!.textContent = next === "dark" ? "☀" : "☾";
      const url = new URL(location.href);
      url.searchParams.set("theme", next);
      history.replaceState(null, "", url);
    },
    { signal: controller.signal },
  );
  const id = location.pathname.split("/")[2];
  const story = stories.find((item) => item.id === id);
  if (!id) {
    const main = document.createElement("main");
    main.className = "stories-index";
    main.innerHTML = `<header><span class="stories-eyebrow">BUILT WITH MASH</span><h1>Stories</h1><p>Working applications to explore, adapt, and make your own.</p></header><div class="stories-grid">${stories.map((item) => `<a class="story-card" href="/stories/${item.id}"><div class="story-card-preview" data-story="${item.id}" aria-hidden="true"><div class="story-card-rail"><i></i><i></i><i></i><i></i></div><div class="story-card-content"><span>${item.symbol}</span><i></i><i></i><i></i></div></div><div class="story-card-label"><h2>${item.title}</h2><span aria-hidden="true">↗</span><p>${item.description}</p></div></a>`).join("")}</div>`;
    root.append(main);
  } else if (!story) {
    const main = document.createElement("main");
    main.className = "stories-index";
    main.innerHTML = '<h1>Story not found</h1><a href="/stories">Browse all stories →</a>';
    root.append(main);
  } else {
    const target = document.createElement("main");
    target.className = "story-mount";
    target.setAttribute("aria-label", story.title);
    root.append(target);
    const open = async () => {
      const version = ++loadVersion;
      target.setAttribute("aria-busy", "true");
      target.innerHTML = `<div class="story-loading" role="status">Opening ${story.title}…</div>`;
      try {
        const module = await story.load();
        if (controller.signal.aborted || version !== loadVersion) return;
        target.replaceChildren();
        const cleanup = await module.mount(target);
        if (controller.signal.aborted || version !== loadVersion) cleanup();
        else destroyApp = cleanup;
      } catch {
        if (controller.signal.aborted || version !== loadVersion) return;
        target.innerHTML =
          '<div class="story-loading" role="alert"><p>This workspace could not open.</p><button type="button">Try again</button></div>';
        target
          .querySelector("button")!
          .addEventListener("click", () => void open(), { once: true, signal: controller.signal });
      } finally {
        if (version === loadVersion) target.removeAttribute("aria-busy");
      }
    };
    void open();
  }
  return () => {
    controller.abort();
    ++loadVersion;
    destroyApp?.();
  };
}
