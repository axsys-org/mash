export const desktopChannel = "mash:desktop";
export const beforeWorkspaceNavigation = "mash:before-workspace-navigation";

type Direction = "left" | "right" | "up" | "down";
export type DesktopAction =
  | { action: "launcher" | "close" | "maximize" | "float" | "layout" | "help" }
  | { action: "focus" | "swap"; direction: Direction }
  | { action: "workspace" | "move-workspace"; workspace: number };

export type DesktopMessage = { channel: typeof desktopChannel } & (
  | { type: "focus" | "ready" | "activate" | "dispose" | "disposed" }
  | { type: "open"; href: string }
  | ({ type: "shortcut" } & DesktopAction)
  | { type: "theme"; theme: "light" | "dark" }
);

export function isDesktopMessage(value: unknown): value is DesktopMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (message.channel !== desktopChannel) return false;
  switch (message.type) {
    case "focus":
    case "ready":
    case "activate":
    case "dispose":
    case "disposed":
      return true;
    case "open":
      return typeof message.href === "string" && storyDestination(message.href) !== null;
    case "theme":
      return message.theme === "light" || message.theme === "dark";
    case "shortcut":
      if (message.action === "focus" || message.action === "swap")
        return ["left", "right", "up", "down"].includes(String(message.direction));
      if (message.action === "workspace" || message.action === "move-workspace")
        return (
          Number.isInteger(message.workspace) &&
          Number(message.workspace) >= 1 &&
          Number(message.workspace) <= 5
        );
      return ["launcher", "close", "maximize", "float", "layout", "help"].includes(
        String(message.action),
      );
    default:
      return false;
  }
}

export function shortcutAction(event: KeyboardEvent): DesktopAction | null {
  if (
    !event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.isComposing ||
    event.getModifierState("AltGraph")
  )
    return null;
  const code = event.code;
  if (/^Digit[1-5]$/.test(code))
    return {
      action: event.shiftKey ? "move-workspace" : "workspace",
      workspace: Number(code.slice(-1)),
    };
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(code))
    return {
      action: event.shiftKey ? "swap" : "focus",
      direction: code.slice(5).toLowerCase() as Direction,
    };
  if (event.shiftKey) return null;
  const action = {
    Space: "launcher",
    KeyW: "close",
    Enter: "maximize",
    KeyT: "float",
    KeyJ: "layout",
    Slash: "help",
  } as const;
  return code in action ? { action: action[code as keyof typeof action] } : null;
}

export function isDesktopEmbedded(): boolean {
  return (
    window.parent !== window && new URL(location.href).searchParams.get("embedded") === "desktop"
  );
}

function storyDestination(value: string): string | null {
  try {
    const url = new URL(value, location.href);
    if (
      url.origin !== location.origin ||
      !/^\/stories\/(?!desktop(?:\/|$))[a-z0-9-]+\/?$/.test(url.pathname)
    )
      return null;
    url.searchParams.delete("embedded");
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

function post(message: DesktopMessage): void {
  window.parent.postMessage(message, location.origin);
}

export function requestDesktopAction(action: DesktopAction): boolean {
  if (!isDesktopEmbedded()) return false;
  post({ channel: desktopChannel, type: "shortcut", ...action });
  return true;
}

/** Keep source navigation in the desktop while preserving the standalone story route. */
export function navigateWorkspace(href: string): void {
  const destination = storyDestination(href);
  if (isDesktopEmbedded() && destination) {
    window.dispatchEvent(new Event(beforeWorkspaceNavigation));
    post({ channel: desktopChannel, type: "open", href: destination });
  } else location.assign(href);
}

/** Flush live source editors before synchronous catalogue navigation removes their frames. */
export function flushDesktopFrames(root: HTMLElement): void {
  for (const frame of root.querySelectorAll<HTMLIFrameElement>(".desktop-app > iframe")) {
    try {
      const child = frame.contentWindow;
      if (
        child &&
        child.location.origin === location.origin &&
        new URL(child.location.href).searchParams.get("embedded") === "desktop"
      )
        child.dispatchEvent(new Event(beforeWorkspaceNavigation));
    } catch {
      // A frame still navigating has no editor to flush yet.
    }
  }
}

/** Each app keeps its own document, styles and shortcuts; only shell commands cross the frame. */
export function connectDesktopStory(onDispose: () => void | Promise<void>): {
  ready(): void;
  disconnect(): void;
} {
  const controller = new AbortController();
  const { signal } = controller;
  const focus = () => post({ channel: desktopChannel, type: "focus" });
  document.addEventListener("pointerdown", focus, { capture: true, passive: true, signal });
  window.addEventListener(
    "keydown",
    (event) => {
      const action = shortcutAction(event);
      if (!action) {
        focus();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      post({ channel: desktopChannel, type: "shortcut", ...action });
    },
    { capture: true, signal },
  );
  document.addEventListener(
    "click",
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = event
        .composedPath()
        .find(
          (node): node is HTMLAnchorElement =>
            node instanceof HTMLAnchorElement && node.hasAttribute("href"),
        );
      if (!link || link.hasAttribute("download")) return;
      const destination = storyDestination(link.href);
      if (!destination) return;
      event.preventDefault();
      // Keep bubbling so the source editor can flush before the parent handles the message.
      navigateWorkspace(destination);
    },
    { capture: true, signal },
  );
  window.addEventListener(
    "message",
    (event: MessageEvent<unknown>) => {
      if (
        event.origin !== location.origin ||
        event.source !== window.parent ||
        !isDesktopMessage(event.data)
      )
        return;
      const message = event.data;
      if (message.type === "theme") {
        document.documentElement.dataset.theme = message.theme;
        const url = new URL(location.href);
        url.searchParams.set("theme", message.theme);
        history.replaceState(null, "", url);
      } else if (message.type === "activate") window.focus();
      else if (message.type === "dispose") {
        void Promise.resolve()
          .then(onDispose)
          .then(() => {
            post({ channel: desktopChannel, type: "disposed" });
          })
          .catch(() => {
            // The parent owns the bounded fallback if a story cannot finish cleanup.
          });
      }
    },
    { signal },
  );
  return {
    ready: () => post({ channel: desktopChannel, type: "ready" }),
    disconnect: () => controller.abort(),
  };
}
