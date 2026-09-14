/** Format copyable HTML without loading a code editor or changing mixed text. */
export function formatMarkup(source: string): string {
  const template = document.createElement("template");
  template.innerHTML = source;
  const voidElements = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);
  const print = (node: Node, depth: number): string => {
    const indent = "  ".repeat(depth);
    if (!(node instanceof Element))
      return node.textContent?.trim() ? indent + node.textContent.trim() : "";
    const html = node.outerHTML;
    const opening = html.slice(0, html.indexOf(">") + 1);
    if (voidElements.has(node.localName)) return indent + opening;
    if (
      !node.children.length ||
      ["pre", "script", "style", "textarea"].includes(node.localName) ||
      [...node.childNodes].some(
        (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
      )
    ) {
      return indent + html;
    }
    const children = [...node.childNodes].map((child) => print(child, depth + 1)).filter(Boolean);
    return [indent + opening, ...children, indent + `</${node.localName}>`].join("\n");
  };
  return [...template.content.childNodes]
    .map((node) => print(node, 0))
    .filter(Boolean)
    .join("\n");
}
