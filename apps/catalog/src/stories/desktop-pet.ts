import { DragController, leftTopDragPositioner, type DragEventDetail } from "@mash/ui/drag";
import "./desktop-pet.css";

const storageKey = "mash-desktop-pet-v1";

/** One companion shared by all workspaces, independent of the window layout. */
export function mountDesktopPet(shell: HTMLElement, stage: HTMLElement): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = true;
  let paused = reducedMotion.matches;
  let position = { x: 0.92, y: 0.94 };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (saved && typeof saved === "object") {
      if (typeof saved.visible === "boolean") visible = saved.visible;
      if (typeof saved.paused === "boolean") paused = saved.paused || reducedMotion.matches;
      if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        position = { x: Math.max(0, Math.min(1, saved.x)), y: Math.max(0, Math.min(1, saved.y)) };
      }
    }
  } catch {
    /* A companion is still available when browser storage is unavailable. */
  }

  const pet = document.createElement("div");
  pet.className = "desktop-pet";
  pet.innerHTML = `<button class="desktop-pet-body" type="button" aria-label="Pet your desktop companion" aria-describedby="desktop-pet-hint"><img src="/assets/desktop-pet.gif" alt="" draggable="false" width="281" height="392"><canvas width="281" height="392" hidden></canvas></button><span class="desktop-pet-heart" aria-hidden="true">♥</span><div class="desktop-pet-controls"><button type="button" class="desktop-pet-pause">Pause pet</button><button type="button" class="desktop-pet-hide" aria-label="Hide desktop pet" title="Hide pet · bring it back in Desktop settings">×</button></div><span id="desktop-pet-hint" class="desktop-pet-hint">Drag to move, or use arrow keys while focused. Click to pet.</span>`;
  stage.append(pet);
  const body = pet.querySelector<HTMLButtonElement>(".desktop-pet-body")!;
  const image = pet.querySelector<HTMLImageElement>("img")!;
  const still = pet.querySelector<HTMLCanvasElement>("canvas")!;
  const pauseButton = pet.querySelector<HTMLButtonElement>(".desktop-pet-pause")!;
  const setting = document.createElement("div");
  setting.className = "desktop-setting desktop-pet-setting";
  setting.innerHTML = `<div><h3>Desktop pet</h3><p>A little company across your workspaces.</p></div><div class="desktop-segments"><button type="button" class="desktop-pet-toggle"></button></div>`;
  shell.querySelector(".desktop-settings .desktop-setting-note")!.before(setting);
  const toggle = setting.querySelector<HTMLButtonElement>(".desktop-pet-toggle")!;
  const persist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...position, visible, paused }));
    } catch {
      /* Dragging and visibility work without persistence. */
    }
  };
  const sync = () => {
    pet.hidden = !visible;
    toggle.textContent = visible ? "Hide pet" : "Show pet";
    toggle.setAttribute("aria-pressed", String(visible));
    pauseButton.textContent = paused ? "Resume pet" : "Pause pet";
    pauseButton.setAttribute("aria-pressed", String(paused));
    // Canvas displays a still frame; CSS alone cannot pause an animated GIF.
    if (image.complete && image.naturalWidth) {
      still.getContext("2d")?.clearRect(0, 0, still.width, still.height);
      still.getContext("2d")?.drawImage(image, 0, 0, still.width, still.height);
    }
    image.hidden = paused;
    still.hidden = !paused;
  };
  const drag = new DragController(pet, {
    handle: body,
    threshold: 5,
    containment: stage,
    positioner: leftTopDragPositioner,
  });
  const available = () => ({
    x: Math.max(0, stage.clientWidth - pet.offsetWidth),
    y: Math.max(0, stage.clientHeight - pet.offsetHeight),
  });
  const place = () => {
    if (!visible || drag.dragging) return;
    const bounds = available();
    drag.position = { x: position.x * bounds.x, y: position.y * bounds.y };
  };
  const remember = () => {
    const bounds = available();
    position = {
      x: bounds.x ? drag.position.x / bounds.x : position.x,
      y: bounds.y ? drag.position.y / bounds.y : position.y,
    };
    persist();
  };
  pet.addEventListener(
    "ui-drag-start",
    () => {
      shell.dataset.petDragging = "true";
      pet.dataset.dragging = "true";
    },
    { signal },
  );
  pet.addEventListener(
    "ui-drag-end",
    (event: CustomEvent<DragEventDetail>) => {
      delete shell.dataset.petDragging;
      delete pet.dataset.dragging;
      if (!event.detail.cancelled) remember();
      place();
    },
    { signal },
  );
  body.addEventListener(
    "keydown",
    (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 32 : 12;
      const bounds = available();
      drag.position = {
        x: Math.max(0, Math.min(bounds.x, drag.position.x + direction[0] * step)),
        y: Math.max(0, Math.min(bounds.y, drag.position.y + direction[1] * step)),
      };
      remember();
    },
    { signal },
  );
  let affection: Animation | undefined;
  body.addEventListener(
    "click",
    () => {
      affection?.cancel();
      affection = pet.querySelector(".desktop-pet-heart")!.animate(
        reducedMotion.matches
          ? [{ opacity: 1 }, { opacity: 1 }, { opacity: 0 }]
          : [
              { opacity: 0, transform: "translateY(0) scale(.7)" },
              { opacity: 1, transform: "translateY(-8px) scale(1)", offset: 0.25 },
              { opacity: 0, transform: "translateY(-30px) scale(1)" },
            ],
        { duration: 1100, easing: "ease-out" },
      );
    },
    { signal },
  );
  pauseButton.addEventListener(
    "click",
    () => {
      paused = !paused;
      sync();
      persist();
    },
    { signal },
  );
  const setVisible = (next: boolean) => {
    visible = next;
    sync();
    place();
    persist();
  };
  pet.querySelector(".desktop-pet-hide")!.addEventListener(
    "click",
    () => {
      setVisible(false);
      shell.querySelector<HTMLButtonElement>('[data-action="settings"]')?.focus();
    },
    { signal },
  );
  toggle.addEventListener("click", () => setVisible(!visible), { signal });
  image.addEventListener("load", sync, { signal });
  reducedMotion.addEventListener(
    "change",
    () => {
      if (reducedMotion.matches) {
        paused = true;
        sync();
        persist();
      }
    },
    { signal },
  );
  const observer = new ResizeObserver(place);
  observer.observe(stage);
  observer.observe(pet);
  sync();
  place();
  return () => {
    controller.abort();
    observer.disconnect();
    drag.destroy();
    affection?.cancel();
    delete shell.dataset.petDragging;
    pet.remove();
    setting.remove();
  };
}
