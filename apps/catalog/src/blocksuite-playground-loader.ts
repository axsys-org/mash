const selector = "[data-catalog-blocksuite-playground]";
let loadPromise: Promise<typeof import("./blocksuite-playground.js")> | null = null;

function loadPlayground() {
  loadPromise ??= import("./blocksuite-playground.js");
  return loadPromise;
}

async function reconcileBlockSuitePlaygrounds(): Promise<void> {
  const roots = [...document.querySelectorAll<HTMLElement>(selector)];
  if (!roots.length) return;

  try {
    const playground = await loadPlayground();
    playground.reconcileBlockSuitePlaygrounds();
  } catch (error) {
    console.error(error);
    for (const root of roots) {
      root.dataset.blocksuiteState = "error";
      root.dataset.blocksuiteError =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      const status = root.querySelector<HTMLOutputElement>("[data-blocksuite-status]");
      if (status) status.value = "BlockSuite failed to load. See the console for details.";
    }
  }
}

const observer = new MutationObserver(() => void reconcileBlockSuitePlaygrounds());

function observe(): void {
  observer.observe(document.body, { childList: true, subtree: true });
  void reconcileBlockSuitePlaygrounds();
}

if (document.body) observe();
else document.addEventListener("DOMContentLoaded", observe, { once: true });

const hot = (import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot;
hot?.dispose(() => observer.disconnect());
