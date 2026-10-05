/** Real-browser adapter/interaction checks and bounded fixture benchmarks.
 * Usage: node scripts/check-goo-patch.mjs /path/to/reaver [/tmp/output-dir]
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import os from "node:os";
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reaver = process.argv[2];
if (!reaver)
  throw Error("Pass the Reaver checkout path; integration never substitutes a mocked Goo runtime.");
const output = resolve(process.argv[3] ?? "/tmp/goo-patch-results");
await mkdir(output, { recursive: true });
const require = createRequire(resolve(repo, "packages/shrine-components/package.json"));
const engines = require("playwright");
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><html lang="en"><title>Patch integration fixture</title><body><script src="/goo-actions.js"></script><script src="/goo-session.js"></script><script src="/goo-panes.js"></script><script type="module">import {fixtureDOM,FixtureHarness,largeScene,exampleScene} from "/patch/fixtures/index.js";import {prepareGooDOM,gooAdapter,attachGooPatch} from "/patch/integration/goo-adapter.js";window.fixture={fixtureDOM,FixtureHarness,largeScene,exampleScene,prepareGooDOM,gooAdapter,attachGooPatch};</script></body></html>',
      );
      return;
    }
    const path = pathname.startsWith("/patch/")
      ? resolve(repo, "packages/shrine-components/dist", `.${pathname}`)
      : /^\/goo-(actions|session|panes)\.js$/.test(pathname)
        ? resolve(reaver, "extras/mounts/explorer", pathname.slice(1))
        : null;
    if (!path || pathname.includes("..")) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("Content-Type", "text/javascript");
    res.end(await readFile(path));
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}`;
const results = {
  device: {
    cpu: os.cpus()[0].model,
    arch: os.arch(),
    platform: os.platform(),
    release: os.release(),
    memoryGB: os.totalmem() / 2 ** 30,
  },
  engines: [],
};
try {
  for (const name of ["chromium", "firefox", "webkit"]) {
    const browser = await engines[name].launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(url);
      await page.waitForFunction(() => window.fixture);
      await page.evaluate(() => {
        const f = fixture;
        const root = f.fixtureDOM(f.exampleScene);
        document.body.append(root);
        const harness = new f.FixtureHarness(root);
        root.hydrate();
        root.setCamera({ tx: 0, ty: 80, scale: 1 });
        Object.assign(window, { root, harness });
      });
      // Real trusted pointer and keyboard events, beyond synthetic transition tests.
      await page.getByRole("button", { name: "source out", exact: true }).click();
      await page.getByRole("button", { name: "sink in", exact: true }).focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => harness.intents[0]?.args.kind), "connect");
      await page.getByRole("button", { name: "Move source right", exact: true }).focus();
      await page.keyboard.press("Space");
      assert.equal(await page.evaluate(() => harness.intents.at(-1)?.args.kind), "move-nodes");
      await page.evaluate(() => {
        for (const i of harness.intents) harness.receipt(i.operationId, "rejected");
      });
      const handle = page.getByRole("button", { name: "Move source", exact: true });
      const box = await handle.boundingBox();
      assert(box);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 75, box.y + box.height / 2 + 45, { steps: 6 });
      await page.mouse.up();
      assert.equal(await page.evaluate(() => harness.intents.length), 3);
      assert.equal(await page.evaluate(() => harness.intents.at(-1).args.kind), "move-nodes");
      // Transport-only stub: prove both treatments enter the actual GooActions path.
      // This does not stand in for server domain admission (X01 remains upstream).
      const bodies = [];
      await page.route("**/goo/act", async (route) => {
        bodies.push(new URLSearchParams(route.request().postData()));
        await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      });
      await page.evaluate(() => {
        root.retire();
        root.remove();
        root = fixture.fixtureDOM(fixture.exampleScene);
        document.body.append(root);
        root.hydrate();
        const actor = document.createElement("section");
        actor.id = "ordinary-action-fixture";
        const field = document.createElement("input");
        field.dataset.inputSlot = "/gesture";
        field.value = JSON.stringify({
          kind: "move-nodes",
          nodes: [
            {
              target: { kind: "node", node: "source", lifetime: "node-life:source" },
              baseOrigin: { x: 40, y: 80 },
              proposedOrigin: { x: 50, y: 80 },
            },
          ],
        });
        const button = document.createElement("button");
        button.dataset.node = "offered-move";
        button.textContent = "Ordinary offered move";
        actor.append(field, button);
        document.body.append(actor);
        const control = {
          id: "offered-move",
          kind: "action",
          control: "0.1",
          slot: "/gesture",
          invoke: true,
        };
        const context = {
          target: "/fixture-receiver",
          view: "/fixture-view",
          snapshot: {
            target: "/fixture-receiver",
            life: "1",
            expected: "1",
            displayed: "1",
            publication: "1",
          },
          controls: [control],
          report: () => {},
          saved: () => {},
        };
        GooActions.bind(actor, context);
        const offers = new Map([
          [
            fixture.exampleScene.offers.moveNodes,
            { container: actor, context, control, argumentSlot: "/gesture", kind: "move-nodes" },
          ],
        ]);
        root.attachAdapter(
          fixture.gooAdapter(
            GooActions,
            {
              live: () => true,
              select: () => {},
              query: () => {},
              composing: () => false,
              repair: () => {},
              reconcileOperation: () => {},
            },
            offers,
          ),
        );
        root.gestures.moveBy([{ kind: "node", node: "source", lifetime: "node-life:source" }], {
          x: 10,
          y: 0,
        });
      });
      await page.waitForFunction(() =>
        [...root.pending.values()].some((p) => p.state === "accepted"),
      );
      await page.getByRole("button", { name: "Ordinary offered move", exact: true }).click();
      await page.waitForFunction(
        () => !document.querySelector("#ordinary-action-fixture button").disabled,
      );
      assert.equal(bodies.length, 2);
      for (const key of [
        "target",
        "subject",
        "view",
        "control",
        "expected",
        "displayed",
        "publication",
        "input:/gesture",
      ])
        assert.equal(bodies[0].get(key), bodies[1].get(key), `same offered operation: ${key}`);
      assert.notEqual(bodies[0].get("invocation"), bodies[1].get("invocation"));
      await page.evaluate(() => document.getElementById("ordinary-action-fixture").remove());
      // Actual native input preserved by GooActions, with GooPanes' real composition policy.
      const preservation = await page.evaluate(() => {
        const f = fixture,
          host = document.createElement("section");
        document.body.append(host);
        const panes = new GooPanes(host, { report: () => {} });
        const work = {
          id: "patch-demo",
          live: true,
          generation: 1,
          encounter: { id: "encounter-demo:1" },
          inputs: new Map(),
        };
        panes.registerWork(work, root);
        panes.nativeWorks.set(root, work);
        const stop = f.attachGooPatch(root, GooActions, panes, work, new Map(), {
          select: () => {},
          query: () => {},
          repair: () => {},
          reconcileOperation: () => {},
        });
        const node = root.dom.nodes.get("source"),
          input = node.querySelector("input");
        input.dataset.node = "edit";
        input.dataset.inputSlot = "/draft";
        const context = panes.actionContext(
          "/item",
          "/view",
          { target: "/item", life: "1", expected: "1", displayed: "1", publication: "1" },
          [{ kind: "input", id: "edit", slot: "/draft" }],
          [],
          work,
        );
        GooActions.bind(node, context);
        input.focus();
        input.value = "unsaved 日本語";
        input.setSelectionRange(2, 5);
        input.dispatchEvent(
          new CompositionEvent("compositionstart", { bubbles: true, data: "日" }),
        );
        const scene = structuredClone(f.exampleScene);
        scene.header.viewSeq = 2;
        // Row/column body, anchors and route terminals change in the same admitted batch.
        scene.nodes[0].rect.height = 180;
        scene.nodes[0].ports[0].anchor.y = 100;
        scene.nodes[0].ports[0].hitRect.y = 88;
        scene.connections[0].segments[0].commands[0].to.y = 180;
        const data = {
          nodes: new Map(),
          connections: new Map(),
          actionContext: (_key, _kind, data) =>
            panes.actionContext(
              "/item",
              "/view",
              { target: "/item", life: "1", expected: "1", displayed: "1", publication: "1" },
              data.controls,
              [],
              work,
            ),
        };
        for (const n of scene.nodes) {
          const element = root.dom.nodes.get(n.key);
          let html = element.innerHTML;
          if (n.key === "source")
            html = '<section data-arrangement="column">' + html + "</section>";
          data.nodes.set(n.key, {
            html,
            controls: n.key === "source" ? [{ kind: "input", id: "edit", slot: "/draft" }] : [],
            context: { width: n.rect.width },
            profile: { revision: "fixture" },
          });
        }
        for (const c of scene.connections)
          data.connections.set(c.key, {
            html: root.dom.connections.get(c.key).innerHTML,
            controls: [],
            context: { width: 1000 },
          });
        const frame = {
          scene,
          dom: { kind: "complete" },
          coveredOperationIds: [],
          prepare: () => f.prepareGooDOM(GooActions, root, scene, data),
        };
        const deferred = root.admit(frame),
          before = root.installedScene.header.viewSeq;
        input.dispatchEvent(
          new CompositionEvent("compositionend", { bubbles: true, data: "日本語" }),
        );
        const result = {
          deferred,
          before,
          after: root.installedScene.header.viewSeq,
          same: root.dom.nodes.get("source").querySelector("input") === input,
          value: input.value,
          start: input.selectionStart,
          end: input.selectionEnd,
          focused: document.activeElement === input,
          anchor: root.index.anchor({
            kind: "port",
            node: "source",
            nodeLifetime: "node-life:source",
            port: "out",
            lifetime: "port-life:source:out",
          }),
          arrangement: !!root.querySelector("[data-arrangement=column]"),
        };
        stop();
        panes.nativeWorks.clear();
        host.remove();
        return result;
      });
      assert.deepEqual(preservation, {
        deferred: "deferred",
        before: 1,
        after: 2,
        same: true,
        value: "unsaved 日本語",
        start: 2,
        end: 5,
        focused: true,
        anchor: { x: 240, y: 180 },
        arrangement: true,
      });
      const engine = {
        name,
        version: browser.version(),
        nativeInputPreservation: preservation,
        interactionChecks: 5,
        benchmarks: [],
      };
      for (const count of [100, 1000]) {
        await page.evaluate(() => {
          root?.retire();
          root?.remove();
        });
        const measurements = await page.evaluate(async (count) => {
          const f = fixture,
            scene = f.largeScene(count, f.exampleScene),
            surface = f.fixtureDOM(scene);
          document.body.append(surface);
          const _h = new f.FixtureHarness(surface);
          const t = performance.now();
          surface.hydrate();
          const installMs = performance.now() - t;
          surface.setCamera({ tx: 0, ty: 50, scale: 1 });
          window.root = surface;
          const walk = (n) =>
            1 +
            [...n.children].reduce((sum, child) => sum + walk(child), 0) +
            (n.shadowRoot ? walk(n.shadowRoot) : 0);
          const domCount = walk(surface);
          const before = { ...surface.painter.metrics };
          const pan = [];
          for (let i = 0; i < 100; i++) {
            const start = performance.now();
            surface.setCamera({ tx: i, ty: 50, scale: 1 });
            pan.push(performance.now() - start);
          }
          const after = { ...surface.painter.metrics };
          const handle = surface.dom.nodes.get("n0").querySelector("[data-patch-handle]");
          const m = surface.mapping(),
            at = (x, y) => ({ clientX: m.left + x * m.sx, clientY: m.top + y * m.sy });
          handle.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              composed: true,
              pointerId: 7,
              pointerType: "mouse",
              button: 0,
              ...at(120, 65),
            }),
          );
          const handlers = [],
            frames = [];
          for (let i = 0; i < 60; i++) {
            const start = performance.now();
            surface.dispatchEvent(
              new PointerEvent("pointermove", {
                bubbles: true,
                composed: true,
                pointerId: 7,
                pointerType: "mouse",
                ...at(200 + i, 110),
              }),
            );
            handlers.push(performance.now() - start);
            await new Promise((resolve) => requestAnimationFrame(resolve));
            frames.push(surface.gestures.timings.lastFrameMs);
          }
          surface.cancelGesture("benchmark");
          const summarize = (values) => {
            values.sort((a, b) => a - b);
            return {
              p50: values[Math.floor(values.length * 0.5)],
              p95: values[Math.floor(values.length * 0.95)],
              max: values.at(-1),
            };
          };
          return {
            nodes: count,
            connections: scene.connections.length,
            installMs,
            domCount,
            panMs: summarize(pan),
            pointerHandlerMs: summarize(handlers),
            gestureFrameMs: summarize(frames),
            cameraOnly: after.nodes === before.nodes && after.connections === before.connections,
            retainedPending: surface.pending.size,
          };
        }, count);
        assert(measurements.cameraOnly);
        engine.benchmarks.push(measurements);
      }
      if (name === "chromium") {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Performance.enable");
        await cdp.send("HeapProfiler.collectGarbage");
        const before = await cdp.send("Performance.getMetrics");
        await page.evaluate(() => {
          root.retire();
          root.remove();
          window.root = null;
          window.harness = null;
        });
        await cdp.send("HeapProfiler.collectGarbage");
        const after = await cdp.send("Performance.getMetrics");
        const select = (x) =>
          Object.fromEntries(
            x.metrics
              .filter((m) => ["JSHeapUsedSize", "Nodes", "JSEventListeners"].includes(m.name))
              .map((m) => [m.name, m.value]),
          );
        engine.memory = { mounted: select(before), afterRetirementAndGC: select(after) };
      }
      await page.evaluate(() => {
        document.body.replaceChildren();
        const root = fixture.fixtureDOM(fixture.exampleScene);
        document.body.append(root);
        const _harness = new fixture.FixtureHarness(root);
        root.hydrate();
      });
      assert(
        await page.getByText("caption", { exact: true }).isVisible(),
        "Resolved connection label is visible",
      );
      await page.screenshot({ path: resolve(output, `${name}.png`) });
      assert.deepEqual(errors, []);
      results.engines.push(engine);
      console.log(
        `${name} ${engine.version}: native interaction and Goo SSR integration passed; benchmark ${engine.benchmarks.map((b) => `${b.nodes}: ${b.installMs.toFixed(1)} ms`).join(", ")}`,
      );
    } finally {
      await browser.close();
    }
  }
  await writeFile(resolve(output, "results.json"), JSON.stringify(results, null, 2) + "\n");
  console.log(`Results: ${output}`);
} finally {
  server.close();
}
