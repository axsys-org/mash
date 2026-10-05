import { exampleScene } from "@mash/shrine/patch/fixtures";
import { fixtureDOM, FixtureHarness, largeScene } from "@mash/shrine/patch/fixtures";
import type { OperationReceipt, SceneSnapshot } from "@mash/shrine/patch";
const count = Number(new URLSearchParams(location.search).get("nodes") ?? 0);
const scene: SceneSnapshot =
  count > 0 ? largeScene(Math.min(1000, count), exampleScene) : exampleScene;
const root = fixtureDOM(scene);
root.style.width = "100%";
root.style.height = "650px";
document.querySelector("#fixture")!.append(root);
const harness = new FixtureHarness(root);
const start = performance.now();
root.hydrate();
const installMs = performance.now() - start;
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const report = (message: string) => {
  document.querySelector("#message")!.textContent = message;
};
const log = () => {
  document.querySelector("#log")!.textContent = JSON.stringify(
    {
      installMs,
      intents: harness.intents,
      queries: harness.queries,
      outcomes: [...harness.outcomes.values()],
      repairs: harness.repairs,
    },
    null,
    2,
  );
  const last = harness.intents.at(-1);
  if (last) {
    input("operation").value = last.operationId;
    input("covered").value = last.operationId;
  }
};
for (const name of ["goo-patch-intent", "goo-patch-query", "goo-patch-diagnostic"])
  root.addEventListener(name, () => queueMicrotask(log));
document.querySelector("#delivery")!.addEventListener("submit", (event) => {
  event.preventDefault();
  const seq = Number(input("seq").value),
    base = input("base").value;
  report(
    harness.frame(
      { ...scene, header: { ...scene.header, viewSeq: seq } },
      {
        ...(base ? { base: Number(base) } : {}),
        covered: input("covered")
          .value.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    ),
  );
  log();
});
const deliver = (delayed: boolean) => {
  const id = input("operation").value,
    outcome = input("outcome").value as OperationReceipt["outcome"];
  if (!harness.intents.some((i) => i.operationId === id)) {
    report("Choose a captured operation ID.");
    return;
  }
  if (delayed) void harness.delayedReceipt(id, outcome).then(log);
  else {
    harness.receipt(id, outcome);
    log();
  }
};
document.querySelector("#receipt")!.addEventListener("submit", (event) => {
  event.preventDefault();
  deliver(false);
});
document.querySelector("#delayed")!.addEventListener("click", () => deliver(true));
Object.assign(window, { patchFixture: { root, harness, scene, installMs } });
log();
