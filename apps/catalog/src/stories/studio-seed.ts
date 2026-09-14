import { defaultPreferences, type StudioSnapshot } from "./studio-model.js";

const files: Record<string, string> = {
  "README.md": `# A small place to build\n\nThis workspace runs entirely in your browser.\n\n- Open a file in the explorer. Edit, split, reorder, and reopen it.\n- Save creates a local baseline; Changes compares your draft against it.\n- Search works across every text file. Replace all is undoable.\n- Run demo.js to execute real JavaScript in an isolated worker.\n- Preview index.html to see the HTML and CSS project.\n- Export project downloads every file and your layout as JSON.\n\nYour drafts persist on this device. Export a copy to take them elsewhere.\n`,
  "index.html": `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Field Notes</title>\n  <link rel="stylesheet" href="src/style.css">\n</head>\n<body>\n  <main class="card">\n    <span class="eyebrow">A little progress, every day</span>\n    <h1>Make room for\nsomething good.</h1>\n    <p>A quiet corner for ideas that deserve your attention.</p>\n    <div class="tasks">\n      <label><input type="checkbox" checked> Sketch a new direction</label>\n      <label><input type="checkbox"> Make a small prototype</label>\n      <label><input type="checkbox"> Share it with someone</label>\n    </div>\n    <button id="add-note">Add a thought <span>↗</span></button>\n    <output id="note"></output>\n    <footer>FIELD NOTES <span>01 / A fresh start</span></footer>\n  </main>\n  <script src="src/page.js"></script>\n</body>\n</html>`,
  "src/style.css": `:root { color-scheme: light; font-family: system-ui, sans-serif; }\n* { box-sizing: border-box; }\nbody { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #e6e9df; color: #243b32; padding: 32px; }\n.card { width: min(100%, 440px); padding: 40px; border: 1px solid #bdc8b8; background: #f5f7ee; border-radius: 24px; box-shadow: 0 20px 80px #34483515; }\n.eyebrow { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }\nh1 { white-space: pre-line; font-size: clamp(28px, 5vw, 44px); line-height: 1.04; letter-spacing: -.04em; margin: 24px 0 16px; font-weight: 550; }\np { color: #68796a; font-size: 13px; line-height: 1.7; }\n.tasks { display: grid; gap: 12px; padding: 24px 0; font-size: 12px; }\nlabel { display: flex; align-items: center; gap: 9px; }\ninput { accent-color: #3b654e; }\nbutton { display: flex; justify-content: space-between; width: 100%; border: 0; border-radius: 8px; padding: 12px 14px; background: #335443; color: white; cursor: pointer; font: inherit; font-size: 12px; }\nbutton:hover { background: #244231; }\noutput { display: block; margin-top: 12px; font-size: 12px; }\nfooter { display: flex; justify-content: space-between; margin-top: 36px; color: #68796a; font-size: 9px; letter-spacing: .08em; }`,
  "src/page.js": `const thoughts = [\n  "Start small. Keep going.",\n  "The next useful thing is enough.",\n  "Good ideas need a little room."\n];\nlet next = 0;\ndocument.querySelector("#add-note").addEventListener("click", () => {\n  document.querySelector("#note").textContent = thoughts[next++ % thoughts.length];\n});`,
  "demo.js": `// Run this file. Output comes from a real isolated JavaScript worker.\nconst projects = [\n  { name: "Navigation", completed: 8, total: 10 },\n  { name: "Typography", completed: 6, total: 6 },\n  { name: "Interactions", completed: 4, total: 8 }\n];\n\nconsole.log("Project review");\nconsole.table(projects.map(project => ({\n  ...project,\n  progress: Math.round(project.completed / project.total * 100) + "%"\n})));\n\nconst completed = projects.reduce((sum, project) => sum + project.completed, 0);\nconsole.log(completed + " tasks completed.");\nawait new Promise(resolve => setTimeout(resolve, 300));\nconsole.info("Ready for the next iteration.");`,
};
export function seedStudio(): StudioSnapshot {
  const entries = Object.entries(files).map(([path, content], index) => ({
    id: "file-" + index,
    path,
    kind: "file" as const,
    content,
    saved: content,
  }));
  return {
    version: 1,
    entries: [
      { id: "folder-src", path: "src", kind: "folder", content: "", saved: "" },
      ...entries,
    ],
    deleted: [],
    active: "file-1",
    open: ["file-1", "file-2", "file-4"],
    preferences: { ...defaultPreferences },
  };
}
