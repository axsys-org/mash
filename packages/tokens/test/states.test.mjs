import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const reference = await read("../src/reference/color.json");
const luminance = (rgb) => {
  const linear = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
};
for (const mode of ["light", "dark"]) {
  const { color } = await read(`../src/themes/${mode}.json`);
  const rgb = (name) =>
    color[name].$value
      .slice(1, -1)
      .split(".")
      .reduce((value, key) => value[key], reference).$value.components;
  const contrast = (a, b) => {
    const levels = [luminance(rgb(a)), luminance(rgb(b))].sort((first, second) => second - first);
    return (levels[0] + 0.05) / (levels[1] + 0.05);
  };
  test(`${mode} foreground pairs remain legible through every filled interaction state`, () => {
    assert.ok(
      contrast("canvas", "focusRing") >= 3,
      "Focus rings must remain visible against the canvas",
    );
    for (const role of ["action", "neutral", "positive", "warning", "critical", "info"]) {
      const foreground = `on${role[0].toUpperCase()}${role.slice(1)}`;
      for (const suffix of ["", "Hover", "Pressed"]) {
        const ratio = contrast(role + suffix, foreground);
        assert.ok(ratio >= 4.5, `${role}${suffix}/${foreground}: ${ratio.toFixed(2)}:1`);
      }
      assert.equal(
        new Set(["", "Hover", "Pressed"].map((suffix) => color[role + suffix].$value)).size,
        3,
        `${role} must have distinct interaction states`,
      );
    }
    for (const [bg, fg] of [
      ["surfaceInverse", "onSurfaceInverse"],
      ["surfaceInverse", "onSurfaceInverseMuted"],
      ["selection", "onSelection"],
      ["selectionHover", "onSelection"],
    ]) {
      assert.ok(contrast(bg, fg) >= 4.5, `${bg}/${fg} must retain readable text`);
    }
    for (const role of ["positive", "warning", "critical", "info"]) {
      assert.ok(
        contrast("surface", role + "Text") >= 4.5,
        `${role}Text must be readable on the ordinary surface`,
      );
      const foreground = rgb(role + "Text");
      const surface = rgb("surface");
      // The strongest tinted state used by soft action controls.
      const tint = foreground.map((value, index) => value * 0.2 + surface[index] * 0.8);
      const levels = [luminance(foreground), luminance(tint)].sort(
        (first, second) => second - first,
      );
      assert.ok(
        (levels[0] + 0.05) / (levels[1] + 0.05) >= 4.5,
        `${role}Text must remain legible on its pressed tint`,
      );
    }
  });
}
