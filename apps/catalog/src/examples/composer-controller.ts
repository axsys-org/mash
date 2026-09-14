/** Portable setup imports the same public controller used by applications. */
export const composerController = String.raw`
const { bindMessageComposer } = await import("@mash/ui/message-composer");
for (const form of document.querySelectorAll(".mash-composer")) {
  const delay = Number(form.dataset.sendDelay) || 0;
  form.composer = bindMessageComposer(form, {
    signal: typeof signal === "undefined" ? undefined : signal,
    // Only this example simulates delivery. Real owners connect their own transport.
    onSend: delay ? (message, signal) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (form.hasAttribute("data-fail-next")) { form.removeAttribute("data-fail-next"); reject(new Error("Example delivery failed")); }
        else resolve();
      }, delay);
      signal.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
    }) : undefined,
  });
  if (form.dataset.context) form.composer.files = form.dataset.context.split(",").map(name => new File(["Example context"], name));
  form.querySelector(".mash-composer-mode")?.addEventListener("ui-select-change", event => {
    form.querySelector("ui-textarea").placeholder = { ask: "Ask anything, or describe a task…", plan: "What would you like to plan?", write: "What would you like to write?" }[event.detail.value];
  });
}
`;
