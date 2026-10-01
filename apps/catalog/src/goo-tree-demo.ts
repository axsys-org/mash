import "@mash/ui/goo-tree";
import "@mash/ui/goo-tree/theme.css";
import type { GooTreeLazyLoadDetail } from "@mash/ui/goo-tree";

const goo = document.querySelector("goo-tree")!;
const tree = goo.querySelector("wa-tree")!;
const status = document.querySelector<HTMLOutputElement>("#status")!;
const events = document.querySelector<HTMLOutputElement>("#events")!;
const complete = document.querySelector<HTMLButtonElement>("#complete-lazy")!;
const empty = document.querySelector<HTMLButtonElement>("#empty-lazy")!;
let pending: string | undefined;
const find = (subject: string) =>
  Array.from(tree.querySelectorAll("wa-tree-item")).find(
    (item) => item.getAttribute("subject") === subject,
  );

for (const name of ["goo-tree-toggle", "goo-tree-select", "goo-tree-lazy-load"]) {
  goo.addEventListener(name, (event) => {
    events.value =
      `${name}\n${JSON.stringify((event as CustomEvent).detail)}\n\n${events.value}`.slice(0, 1400);
  });
}
goo.addEventListener("goo-tree-lazy-load", (event) => {
  pending = (event as CustomEvent<GooTreeLazyLoadDetail>).detail.subject;
  status.value = `Goo was asked to materialize ${pending}. Use either completion button.`;
  complete.disabled = empty.disabled = false;
});
document.querySelector("#selection")!.addEventListener("change", (event) => {
  goo.setAttribute("selection", (event.target as HTMLSelectElement).value);
});
document.querySelector("#inspect")!.addEventListener("click", () => {
  status.value = "Inspect action ran. The row was not selected; your draft is still intact.";
});
document.querySelector("#toggle-node")!.addEventListener("click", () => {
  const existing = find("/app/scratch");
  if (existing) existing.remove();
  else {
    const item = document.createElement("wa-tree-item");
    item.setAttribute("subject", "/app/scratch");
    item.textContent = "Scratch — added by Goo";
    find("/app")!.append(item);
  }
});
document.querySelector("#render-selection")!.addEventListener("click", () => {
  goo.setAttribute("selection", "single");
  document.querySelector<HTMLSelectElement>("#selection")!.value = "single";
  for (const item of tree.querySelectorAll("wa-tree-item"))
    item.selected = item.getAttribute("subject") === "/app/srs/cards";
  find("/app/srs")!.expanded = true;
  status.value = "Goo rendered cards selected and opened its parent. Focus was not moved.";
});
function finish(withChildren: boolean): void {
  const parent = pending ? find(pending) : undefined;
  if (!parent) return;
  if (withChildren) {
    for (const [subject, label] of [
      ["/app/library/notes", "Notes"],
      ["/app/library/references", "References"],
    ]) {
      const child = document.createElement("wa-tree-item");
      child.setAttribute("subject", subject!);
      child.textContent = label!;
      parent.append(child);
    }
  }
  parent.removeAttribute("lazy");
  pending = undefined;
  complete.disabled = empty.disabled = true;
  status.value = withChildren
    ? "Goo rendered two children and cleared lazy."
    : "Goo completed an empty folder; branch remains expandable.";
}
complete.addEventListener("click", () => finish(true));
empty.addEventListener("click", () => finish(false));
