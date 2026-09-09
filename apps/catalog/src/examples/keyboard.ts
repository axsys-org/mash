import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const chords = [
  "Primary+Shift+P",
  "Primary+Control+T",
  "Primary+-",
  "Primary++",
  "Escape",
  "Backspace",
  "/",
  "Enter",
];
export const keyboardExamples: CatalogExample[] = [
  sample(
    "Treatments and punctuation",
    ["key", "outline", "plain"]
      .map(
        (appearance) =>
          `<div class="mash-stack"><strong>${{ key: "Default", outline: "Outlined", plain: "Plain" }[appearance]}</strong><div class="mash-row mash-wrap">${chords.map((shortcut) => `<ui-kbd appearance="${appearance}" shortcut="${shortcut}"></ui-kbd>`).join("")}</div></div>`,
      )
      .join(""),
    "The same chord can be quiet, outlined, or inline. Plus and minus are keys as well as punctuation.",
  ),
  {
    ...sample(
      "Live command binding",
      `<div class="mash-row mash-wrap"><ui-select id="binding-choice" label="Shortcut" value="Primary+Enter"><ui-option value="Primary+Enter">Primary + Enter</ui-option><ui-option value="Primary+Shift+K">Primary + Shift + K</ui-option></ui-select><ui-button id="run-command">Run command</ui-button><ui-kbd id="binding-hint" shortcut="Primary+Enter" command="demo.run" appearance="outline"></ui-kbd></div><ui-gesture-binding id="command-binding" for="run-command" gesture="key" command="demo.run" shortcut="Primary+Enter"></ui-gesture-binding><output id="binding-result" aria-live="polite">Focus Run command and press the displayed shortcut.</output>`,
      "The owner changes the binding and its hint together. A hint advertises a command; the binding executes it.",
    ),
    script: `const target = document.querySelector("#run-command");
const binding = document.querySelector("#command-binding");
const hint = document.querySelector("#binding-hint");
let count = 0;
const run = () => { document.querySelector("#binding-result").textContent = "Command ran " + ++count + (count === 1 ? " time" : " times"); };
target.addEventListener("click", run);
target.addEventListener("mash-command", event => { if (event.detail.phase === "ended") run(); });
document.querySelector("#binding-choice").addEventListener("ui-select-change", event => {
  binding.shortcut = hint.shortcut = event.detail.value;
  target.focus();
});`,
  },
  sample(
    "Shortcut reference",
    `<dl class="mash-description-list">${[
      ["Command palette", "Primary+Shift+P"],
      ["Save changes", "Primary+S"],
      ["Undo", "Primary+Z"],
      ["Redo", "Primary+Shift+Z"],
      ["Next section", "Alt+ArrowRight"],
      ["Previous section", "Alt+ArrowLeft"],
      ["Zoom in", "Primary++"],
      ["Zoom out", "Primary+-"],
    ]
      .map(
        ([label, shortcut]) =>
          `<dt>${label}</dt><dd><ui-kbd shortcut="${shortcut}" appearance="outline"></ui-kbd></dd>`,
      )
      .join("")}</dl>`,
    "Keep shortcut help aligned with the active application's bindings and platform.",
  ),
];
