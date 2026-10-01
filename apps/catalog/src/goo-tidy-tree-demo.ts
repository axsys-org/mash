import "@mash/ui/goo-tidy-tree";

const tree = document.querySelector(
  "goo-tidy-tree#demo",
) as import("@mash/ui/goo-tidy-tree").GooTidyTree;
const status = document.querySelector<HTMLOutputElement>("#status")!;
document.querySelector("#fit")!.addEventListener("click", () => tree.fit());
document.querySelector("#center")!.addEventListener("click", () => tree.center("/app/srs/cards"));
document.querySelector("#direction")!.addEventListener("change", (event) => {
  tree.setAttribute("direction", (event.target as HTMLSelectElement).value);
});
document.querySelector("#inspect")!.addEventListener("click", () => {
  status.value =
    "Inspect clicked. This listener belongs to the caller, and the draft input is still intact.";
});
document.querySelector("#toggle")!.addEventListener("click", () => {
  const existing = tree.querySelector('[subject="/app/new"]');
  if (existing) existing.remove();
  else {
    const node = document.createElement("goo-tree-node");
    node.setAttribute("subject", "/app/new");
    node.setAttribute("parent", "/app");
    const article = document.createElement("article");
    article.textContent = "Dynamically added by the caller";
    node.append(article);
    tree.append(node);
  }
});
let large = false;
document.querySelector("#resize")!.addEventListener("click", () => {
  large = !large;
  document.querySelector("#resizable-content")!.textContent = large
    ? "Three cards ready. This longer summary is ordinary flowing HTML. ResizeObserver measures its new dimensions and the surrounding nodes move automatically to make room. No node descriptor or explicit invalidation is needed."
    : "Three cards ready.";
});

// Enough visible membership to exercise the camera without hiding app state inside it.
for (let i = 1; i <= 8; i++) {
  const node = document.createElement("goo-tree-node");
  node.setAttribute("subject", `/app/docs/${i}`);
  node.setAttribute("parent", "/app/docs");
  const article = document.createElement("article");
  article.textContent = `Document ${i}${i % 3 === 0 ? " — a longer, variable-width title" : ""}`;
  node.append(article);
  tree.append(node);
}
