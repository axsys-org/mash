import "@toeverything/theme/style.css";
import "@toeverything/theme/fonts.css";

import { FeatureFlagService } from "@blocksuite/affine/shared/services";
import { Text } from "@blocksuite/affine/store";
import { TestWorkspace } from "@blocksuite/affine/store/test";
import { effects as registerBlockSuiteEditor } from "@blocksuite/integration-test/effects";
import { getTestStoreManager } from "@blocksuite/integration-test/store";
import { getTestViewManager } from "@blocksuite/integration-test/view";

const playgrounds = new Map();
const storeManager = getTestStoreManager();
const viewManager = getTestViewManager();

function ensureEditorRegistered() {
  if (!customElements.get("affine-editor-container")) registerBlockSuiteEditor();
}

function addTextBlock(store, parentId, text, type = "text") {
  return store.addBlock("affine:paragraph", { text: new Text(text), type }, parentId);
}

function seedWorkspace() {
  const workspace = new TestWorkspace({ id: `mash-blocksuite-${crypto.randomUUID()}` });
  workspace.storeExtensions = storeManager.get("store");
  workspace.start();
  workspace.meta.initialize();

  const store = workspace.createDoc("mash-editor-factory").getStore({ id: "mash-editor-factory" });
  store.load(() => {
    const rootId = store.addBlock("affine:page", {
      title: new Text("Mash × BlockSuite editor factory"),
    });
    store.addBlock("affine:surface", {}, rootId);

    const briefId = store.addBlock("affine:note", { xywh: "[80, 80, 680, 520]" }, rootId);
    addTextBlock(store, briefId, "An editor engine, not a painted mockup", "h1");
    addTextBlock(
      store,
      briefId,
      "This is BlockSuite’s actual document model and editing surface mounted inside Mash catalogue chrome.",
    );
    addTextBlock(store, briefId, "Try the real interaction stack", "h2");
    store.addBlock(
      "affine:list",
      { text: new Text("Select text to open the contextual formatting toolbar"), type: "bulleted" },
      briefId,
    );
    store.addBlock(
      "affine:list",
      { text: new Text("Type / to open BlockSuite’s insertion menu"), type: "bulleted" },
      briefId,
    );
    store.addBlock(
      "affine:list",
      { text: new Text("Switch to Edgeless and use the native canvas toolbar"), type: "bulleted" },
      briefId,
    );
    addTextBlock(
      store,
      briefId,
      "Mash owns the surrounding mode switch, status, and host lifecycle. BlockSuite owns document mutation, selection, history, canvas geometry, and its editor widgets.",
      "quote",
    );

    const systemsId = store.addBlock(
      "affine:note",
      { xywh: "[840, 120, 520, 360]", background: "--affine-palette-shape-yellow" },
      rootId,
    );
    addTextBlock(store, systemsId, "The useful boundary", "h2");
    addTextBlock(
      store,
      systemsId,
      "BlockSuite is the stateful editor factory. Mash components are portable host controls and application accessories.",
    );
    store.addBlock(
      "affine:list",
      { text: new Text("One document, two projections"), type: "todo", checked: true },
      systemsId,
    );
    store.addBlock(
      "affine:list",
      {
        text: new Text("Native slash, toolbar, drag, and zoom behavior"),
        type: "todo",
        checked: true,
      },
      systemsId,
    );
    store.addBlock(
      "affine:list",
      { text: new Text("Mash command and selection adapters next"), type: "todo", checked: false },
      systemsId,
    );
  });
  store.resetHistory();
  return { workspace, store };
}

class BlockSuitePlayground {
  #destroyed = false;

  constructor(root) {
    const shell = root.querySelector("[data-blocksuite-editor-shell]");
    if (!shell) throw new Error("BlockSuite playground anatomy is incomplete.");

    this.root = root;
    this.status = root.querySelector("[data-blocksuite-status]");
    const { workspace, store } = seedWorkspace();
    this.workspace = workspace;
    this.store = store;

    ensureEditorRegistered();
    this.editor = document.createElement("affine-editor-container");
    this.editor.autofocus = false;
    this.editor.doc = store;
    this.editor.pageSpecs = viewManager.get("page");
    this.editor.edgelessSpecs = viewManager.get("edgeless");
    this.editor.mode = "page";
    this.editor.className = "example-blocksuite-editor";

    store.get(FeatureFlagService).setFlag("enable_advanced_block_visibility", true);
    root.addEventListener("ui-toggle-group-change", this.onModeChange);
    root.addEventListener("click", this.onAction);
    shell.replaceChildren(this.editor);
    root.dataset.blocksuiteState = "ready";
    this.report("Page editor ready — select text or type / inside the document.");
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.root.removeEventListener("ui-toggle-group-change", this.onModeChange);
    this.root.removeEventListener("click", this.onAction);
    this.editor.remove();
    this.workspace.dispose();
  }

  setMode(mode) {
    if (this.editor.mode === mode) return;
    this.editor.mode = mode;
    const group = this.root.querySelector("[data-blocksuite-mode-group]");
    if (group) group.value = mode;
    this.report(
      mode === "edgeless"
        ? "Edgeless editor ready — the canvas toolbar and zoom controls are BlockSuite-native."
        : "Page editor ready — select text or type / inside the document.",
    );
  }

  report(message) {
    if (this.status) this.status.value = message;
  }

  onModeChange = (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.matches("[data-blocksuite-mode-group]")) return;
    const mode = event.detail.values[0];
    if (mode === "page" || mode === "edgeless") this.setMode(mode);
  };

  onAction = (event) => {
    const action = event
      .composedPath()
      .find(
        (candidate) =>
          candidate instanceof HTMLElement && candidate.dataset.blocksuiteAction !== undefined,
      );
    if (!action) return;
    if (action.dataset.blocksuiteAction === "undo") {
      this.store.undo();
      this.report("Undid the last BlockSuite document transaction.");
    }
    if (action.dataset.blocksuiteAction === "redo") {
      this.store.redo();
      this.report("Redid the last BlockSuite document transaction.");
    }
  };
}

export function reconcileBlockSuitePlaygrounds() {
  for (const [root, playground] of playgrounds) {
    if (root.isConnected) continue;
    playground.destroy();
    playgrounds.delete(root);
  }

  for (const root of document.querySelectorAll("[data-catalog-blocksuite-playground]")) {
    if (playgrounds.has(root)) continue;
    try {
      playgrounds.set(root, new BlockSuitePlayground(root));
    } catch (error) {
      console.error(error);
      root.dataset.blocksuiteState = "error";
      const status = root.querySelector("[data-blocksuite-status]");
      if (status) status.value = "BlockSuite failed to mount. See the console for details.";
    }
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const playground of playgrounds.values()) playground.destroy();
    playgrounds.clear();
  });
}
