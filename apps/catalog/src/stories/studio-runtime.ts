import type { StudioEntry } from "./studio-model.js";

export interface RuntimeMessage {
  kind: "log" | "info" | "warn" | "error" | "done";
  text: string;
}
/** Standalone scripts run in an opaque-origin sandbox with a cancellable worker. */
export function createRunner(container: HTMLElement, report: (message: RuntimeMessage) => void) {
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.title = "JavaScript execution sandbox";
  frame.sandbox.add("allow-scripts");
  const channel = new MessageChannel();
  let connected = false,
    pending: string | undefined,
    disposed = false,
    generation = 0;
  const workerPrefix = `const emit = self.postMessage.bind(self);
const format = value => { try { return typeof value === "string" ? value : JSON.stringify(value, null, 2) ?? String(value); } catch { return String(value); } };
for (const level of ["log", "info", "warn", "error", "table", "debug"]) console[level] = (...values) => emit({kind: ["warn","error","info"].includes(level) ? level : "log", text: values.map(format).join(" ").slice(0,16000)});
self.addEventListener("unhandledrejection", event => emit({kind:"error",text:String(event.reason)}));
`;
  // This function is serialized into the sandbox and has no parent-scope dependencies.
  function boot(prefix: string) {
    addEventListener(
      "message",
      (connection: MessageEvent) => {
        if (
          connection.source !== parent ||
          connection.data !== "studio-connect" ||
          !connection.ports[0]
        )
          return;
        const port = connection.ports[0];
        let worker: Worker | undefined,
          url: string | undefined,
          timer: ReturnType<typeof setTimeout> | undefined;
        const stop = () => {
          clearTimeout(timer);
          worker?.terminate();
          if (url) URL.revokeObjectURL(url);
          worker = undefined;
          url = undefined;
        };
        port.addEventListener(
          "message",
          (request: MessageEvent<{ type: string; code?: string; generation: number }>) => {
            if (request.data.type === "stop") {
              stop();
              return;
            }
            if (request.data.type !== "run" || typeof request.data.code !== "string") return;
            stop();
            const job = request.data.generation;
            const emit = (kind: string, text: string) =>
              port.postMessage({ kind, text, generation: job });
            url = URL.createObjectURL(
              new Blob(
                [
                  prefix,
                  "\n(async () => {\n",
                  request.data.code,
                  "\n})().then(() => self.postMessage({kind:'done',text:'Execution completed.'}), error => { self.postMessage({kind:'error',text:String(error)}); self.postMessage({kind:'done',text:'Execution failed.'}); });",
                ],
                { type: "text/javascript" },
              ),
            );
            try {
              worker = new Worker(url);
            } catch (error) {
              emit("error", String(error));
              emit("done", "Execution failed.");
              stop();
              return;
            }
            let messages = 0;
            worker.addEventListener("message", (message: MessageEvent) => {
              if (++messages > 1000) {
                stop();
                emit("warn", "Output limit reached.");
                emit("done", "Execution stopped.");
                return;
              }
              const kind = message.data?.kind;
              if (!["log", "info", "warn", "error", "done"].includes(kind)) return;
              emit(kind, String(message.data.text ?? "").slice(0, 16000));
              if (kind === "done") stop();
            });
            worker.addEventListener("error", (error: ErrorEvent) => {
              emit("error", error.message + " · line " + error.lineno);
              emit("done", "Execution failed.");
              stop();
            });
            timer = setTimeout(() => {
              stop();
              emit("warn", "Stopped after 10 seconds.");
              emit("done", "Execution limit reached.");
            }, 10000);
          },
        );
        port.start();
        port.postMessage({ kind: "ready" });
      },
      { once: true },
    );
  }
  frame.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:; connect-src 'none'"><script>(${boot.toString()})(${JSON.stringify(workerPrefix)})</script>`;
  frame.addEventListener(
    "load",
    () => {
      if (!disposed) frame.contentWindow?.postMessage("studio-connect", "*", [channel.port2]);
    },
    { once: true },
  );
  channel.port1.addEventListener(
    "message",
    (event: MessageEvent<(RuntimeMessage & { generation?: number }) | { kind: "ready" }>) => {
      if (disposed) return;
      if (event.data?.kind === "ready") {
        connected = true;
        if (pending !== undefined) {
          channel.port1.postMessage({ type: "run", code: pending, generation });
          pending = undefined;
        }
        return;
      }
      if (
        event.data?.generation !== generation ||
        !["log", "info", "warn", "error", "done"].includes(event.data?.kind)
      )
        return;
      report({ kind: event.data.kind, text: String(event.data.text ?? "").slice(0, 16000) });
    },
  );
  channel.port1.start();
  container.append(frame);
  return {
    run(code: string) {
      generation++;
      if (connected) channel.port1.postMessage({ type: "run", code, generation });
      else pending = code;
    },
    stop() {
      generation++;
      pending = undefined;
      channel.port1.postMessage({ type: "stop" });
    },
    destroy() {
      disposed = true;
      pending = undefined;
      channel.port1.postMessage({ type: "stop" });
      channel.port1.close();
      frame.remove();
    },
  };
}
/** Resolve local HTML resources without granting the preview access to the parent origin. */
export function previewDocument(htmlFile: StudioEntry, files: readonly StudioEntry[]): string {
  const parsed = new DOMParser().parseFromString(htmlFile.content, "text/html");
  const resolve = (path: string) => {
    const url = new URL(path, "https://workspace.invalid/" + htmlFile.path);
    if (url.origin !== "https://workspace.invalid") return undefined;
    return files.find(
      (file) => file.path === decodeURIComponent(url.pathname.slice(1)) && file.kind === "file",
    );
  };
  for (const link of parsed.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')) {
    const file = resolve(link.getAttribute("href")!);
    if (!file) continue;
    const style = parsed.createElement("style");
    style.textContent = file.content;
    link.replaceWith(style);
  }
  for (const script of parsed.querySelectorAll<HTMLScriptElement>("script[src]")) {
    const file = resolve(script.getAttribute("src")!);
    if (!file || !/\.(?:m?js)$/.test(file.path)) continue;
    script.removeAttribute("src");
    script.textContent = file.content;
  }
  for (const node of parsed.querySelectorAll('base,meta[http-equiv="Content-Security-Policy"]'))
    node.remove();
  const policy = parsed.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'";
  parsed.head.prepend(policy);
  return "<!doctype html>\n" + parsed.documentElement.outerHTML;
}
