import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const release = process.argv.includes("--release");
const adapter = "adapters/gpui/Cargo.toml";
const target = "wasm32-unknown-unknown";
const profile = release ? "release" : "debug";
const output = resolve("adapters/gpui/www/src/wasm");
const binary = resolve(`adapters/gpui/target/${target}/${profile}/mash_gpui.wasm`);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("rustup", [
  "run",
  "nightly",
  "cargo",
  "build",
  "--manifest-path",
  adapter,
  "--lib",
  "--target",
  target,
  ...(release ? ["--release"] : []),
]);

mkdirSync(output, { recursive: true });
run("wasm-bindgen", [binary, "--out-dir", output, "--target", "web", "--no-typescript"]);
