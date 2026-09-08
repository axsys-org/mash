import type { FileUploadChangeDetail, UIFileUpload } from "@mash/ui";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

const rejectionCopy = (detail: FileUploadChangeDetail): string => {
  const labels = new Set(detail.rejected.map(({ reason }) => reason));
  if (labels.has("max-size")) return "One or more files exceed the size limit.";
  if (labels.has("max-files")) return "The selection exceeds the file limit.";
  return "One or more file types are not accepted.";
};

const resetDemo = (upload: UIFileUpload): void => {
  upload.clear();
  const demo = upload.closest<HTMLElement>("[data-catalog-file-upload-demo]");
  const output = upload.querySelector<HTMLOutputElement>("[data-catalog-file-upload-output]");
  const queue = demo?.querySelector<HTMLElement>("[data-catalog-file-upload-queue]");
  const badge = demo?.querySelector<HTMLElement>("[data-catalog-file-upload-count]");
  if (output) output.textContent = "No files selected";
  if (badge) badge.textContent = "Empty";
  if (queue) queue.replaceChildren();
};

document.addEventListener("ui-file-upload-change", (event) => {
  if (!(event instanceof CustomEvent)) return;
  const upload = event.target;
  if (!(upload instanceof HTMLElement) || !upload.matches("[data-catalog-file-upload]")) return;

  const detail = event.detail as FileUploadChangeDetail;
  const demo = upload.closest<HTMLElement>("[data-catalog-file-upload-demo]");
  const output = upload.querySelector<HTMLOutputElement>("[data-catalog-file-upload-output]");
  const queue = demo?.querySelector<HTMLElement>("[data-catalog-file-upload-queue]");
  const badge = demo?.querySelector<HTMLElement>("[data-catalog-file-upload-count]");

  if (output) {
    output.textContent =
      detail.rejected.length > 0
        ? rejectionCopy(detail)
        : detail.files.length === 1
          ? detail.files[0]!.name
          : `${detail.files.length} files selected`;
  }
  if (badge) badge.textContent = detail.files.length > 0 ? String(detail.files.length) : "Empty";
  if (!queue) return;

  queue.replaceChildren(
    ...detail.files.map((file) => {
      const item = document.createElement("li");
      item.className = "example-file-upload-queue-item";
      const name = document.createElement("strong");
      name.textContent = file.name;
      const metadata = document.createElement("span");
      metadata.textContent = `${file.type || "Unknown type"} · ${formatBytes(file.size)}`;
      item.append(name, metadata);
      return item;
    }),
  );
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const action = target.closest<HTMLElement>("[data-catalog-file-upload-clear]");
  if (!action) return;
  const demo = action.closest<HTMLElement>("[data-catalog-file-upload-demo]");
  const upload = demo?.querySelector<UIFileUpload>("ui-file-upload[data-catalog-file-upload]");
  if (upload) resetDemo(upload);
});
