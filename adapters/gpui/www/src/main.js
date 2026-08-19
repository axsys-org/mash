import "./style.css";

const boot = document.querySelector("#boot");

function showFailure(error) {
  document.documentElement.dataset.ready = "error";
  boot?.classList.add("boot-error");
  if (boot) {
    boot.textContent = `Mash foundations could not start: ${error instanceof Error ? error.message : String(error)}`;
  }
  console.error(error);
}

async function start() {
  try {
    const wasm = await import("./wasm/mash_gpui.js");
    await wasm.default();
    wasm.run(window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.ready = "true";
    boot?.remove();
  } catch (error) {
    showFailure(error);
  }
}

start();
