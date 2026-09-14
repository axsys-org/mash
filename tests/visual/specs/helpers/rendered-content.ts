/** Executed in the preview: inspect painted content across open shadow roots. */
export function hasRenderedContent(root: HTMLElement): boolean {
  const painted = (element: Element): boolean => {
    if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0;
  };
  const visit = (node: Node): boolean => {
    if (node instanceof Element) {
      if (node.matches("style, script, link, template")) return false;
      if (painted(node)) {
        if (
          node.matches(
            "input, textarea, select, button, img, video, canvas, svg, hr, meter, progress",
          )
        )
          return true;
        // Skeletons, separators and color samples can be useful without text.
        const style = getComputedStyle(node);
        if (
          node !== root &&
          (style.backgroundColor !== "rgba(0, 0, 0, 0)" ||
            style.backgroundImage !== "none" ||
            [
              style.borderTopWidth,
              style.borderRightWidth,
              style.borderBottomWidth,
              style.borderLeftWidth,
            ].some((width) => parseFloat(width) > 0))
        )
          return true;
      }
      if (node.shadowRoot && visit(node.shadowRoot)) return true;
    }
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      const parent = node.parentElement;
      if (parent?.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
        const range = document.createRange();
        range.selectNodeContents(node);
        if ([...range.getClientRects()].some((bounds) => bounds.width > 0 && bounds.height > 0))
          return true;
      }
    }
    return [...node.childNodes].some(visit);
  };
  return visit(root);
}
