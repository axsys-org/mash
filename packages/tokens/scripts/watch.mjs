#!/usr/bin/env node
/**
 * Rebuild tokens when a source file changes.
 *
 * Deliberately dependency-free: `fs.watch` with `recursive: true` is supported
 * on macOS, Windows and Linux (Node 20+), which is the whole requirement. The
 * catalog picks the rebuilt CSS up through Vite's own file watcher, so this
 * only has to regenerate dist/.
 *
 * A failed rebuild logs and keeps watching — a typo in a token file should not
 * kill the dev loop.
 */

import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SRC_DIR } from "../config/index.mjs";

const buildScript = fileURLToPath(new URL("./build.mjs", import.meta.url));

let running = false;
let queued = false;

function build(reason) {
  if (running) {
    queued = true;
    return;
  }
  running = true;

  const child = spawn(process.execPath, [buildScript], { stdio: "inherit" });
  child.on("exit", (code) => {
    running = false;
    if (code !== 0) {
      console.error(`tokens: rebuild failed (${reason}) — fix the error above; still watching.`);
    }
    if (queued) {
      queued = false;
      build("queued change");
    }
  });
}

let debounce;
watch(SRC_DIR, { recursive: true }, (_event, filename) => {
  if (!filename?.endsWith(".json")) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => build(path.basename(filename)), 50);
});

console.log(`tokens: watching ${path.relative(process.cwd(), SRC_DIR)} for changes`);
build("initial");
