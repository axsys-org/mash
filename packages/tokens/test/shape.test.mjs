import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("controls use the 8px semantic radius without changing the reference scale or menu roles", async () => {
  const { tokens } = JSON.parse(
    await readFile(new URL("../dist/tokens.json", import.meta.url), "utf8"),
  );
  assert.equal(tokens["radius.control"].aliasOf, "radius.reference.4");
  assert.equal(tokens["radius.control"].value, "8px");
  assert.equal(tokens["radius.reference.3"].value, "6px");
  assert.equal(tokens["radius.menu"].value, "6px");
  assert.equal(tokens["radius.menuItem"].value, "4px");
  const css = await readFile(new URL("../dist/semantic.css", import.meta.url), "utf8");
  assert.ok(css.includes(`--radius-control: var(${tokens["radius.reference.4"].cssVar})`));
});
