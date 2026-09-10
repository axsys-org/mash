/** Portable application controller: public Mash controls own editing, dragging and motion. */
export const composerController = String.raw`
for (const form of document.querySelectorAll(".mash-composer")) {
  const draft = form.querySelector("ui-textarea");
  const send = form.querySelector("[data-send]");
  const stop = form.querySelector("[data-stop]");
  const expand = form.querySelector("[data-expand]");
  const attach = form.querySelector("[data-attach]");
  const picker = form.querySelector('input[type="file"]');
  const context = form.querySelector(".mash-composer-context");
  const statusBar = form.querySelector(".mash-composer-status");
  const output = statusBar.querySelector("output");
  const retry = form.querySelector("[data-retry]");
  const mode = form.querySelector(".mash-composer-mode");
  const queueList = form.querySelector(".mash-composer-queue");
  const suggestionsList = form.querySelector(".mash-composer-suggestions");
  const scope = new AbortController();
  const on = (node, type, callback) => node?.addEventListener(type, callback, node === window || node === form || form.contains(node) ? {signal:scope.signal} : undefined);
  const emit = (type, detail) => form.dispatchEvent(new CustomEvent(type, {bubbles:true, detail}));
  let files = [], queue = [], history = [], suggestions = [];
  let responseStatus = "idle", disabled = form.hasAttribute("data-disabled"), pending = null;
  let historyIndex = -1, savedDraft = "", highlighted = -1, timer, dropDepth = 0;
  let pinned = form.hasAttribute("data-expanded");
  const urls = new Set();
  const announce = (text, error = false) => {
    statusBar.hidden = !text; output.textContent = text;
    form.dataset.status = error ? "error" : responseStatus;
    retry.hidden = !error;
  };
  const hasDraft = () => Boolean(draft.value.trim() || files.length);
  const makeButton = (label, icon, action) => {
    const button = document.createElement("ui-button");
    button.type = "button"; button.variant = "ghost"; button.size = "compact";
    button.setAttribute("aria-label", label); button.disabled = disabled;
    const glyph = document.createElement("ui-icon"); glyph.name = icon; glyph.label = "";
    button.append(glyph); on(button, "click", action); return button;
  };
  const sync = () => {
    const busy = Boolean(pending);
    const stopping = responseStatus === "streaming" && !hasDraft();
    send.disabled = disabled || !hasDraft();
    send.hidden = busy || stopping; stop.hidden = !busy && !stopping;
    stop.disabled = disabled;
    stop.setAttribute("aria-label", busy ? "Stop sending" : "Stop response");
    send.setAttribute("aria-label", responseStatus === "streaming" ? "Queue message" : "Send");
    send.querySelector("ui-icon").name = responseStatus === "streaming" ? "action.add" : "navigation.up";
    draft.disabled = disabled; draft.readonly = busy;
    if (attach) attach.disabled = disabled || busy;
    if (mode) mode.disabled = disabled || busy;
    if (expand) expand.disabled = disabled;
    context.inert = disabled || busy;
    for (const area of form.querySelectorAll("[data-actions]")) area.inert = disabled || busy;
    picker.disabled = disabled || busy;
    draft.rows = pinned ? 6 : Math.max(1, Number(form.dataset.minRows) || 1);
    form.toggleAttribute("data-expanded", pinned);
    form.toggleAttribute("data-disabled", disabled);
    form.toggleAttribute("data-sending", busy);
    if (expand) { expand.setAttribute("aria-expanded", String(pinned)); expand.setAttribute("aria-label", pinned ? "Collapse composer" : "Expand composer"); }
    suggestionsList.hidden = disabled || busy || Boolean(draft.value) || !suggestions.length;
    const hint = form.querySelector(".mash-composer-placeholder");
    if (hint) hint.hidden = disabled || Boolean(draft.value);
    // field-sizing is the CSS fast path. This also handles wrapping in engines without it.
    requestAnimationFrame(() => {
      if (!form.isConnected) return;
      const control = draft.control;
      if (!control) return;
      const css = getComputedStyle(control), line = parseFloat(css.lineHeight) || 22;
      const padding = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom);
      const min = (pinned ? 6 : Math.max(1, Number(form.dataset.minRows) || 1)) * line + padding;
      const max = Math.max(min, (Number(form.dataset.maxRows) || 8) * line + padding);
      control.style.height = "auto";
      control.style.height = Math.min(max, Math.max(min, control.scrollHeight)) + "px";
      control.style.overflowY = control.scrollHeight > max + 1 ? "auto" : "hidden";
    });
  };
  const changed = () => { historyIndex = -1; highlighted = -1; renderSuggestions(); sync(); emit("composer-change", {value:draft.value}); };
  const setDraft = text => { draft.value = text; changed(); };
  const focusDraft = () => { draft.focus(); draft.updateComplete.then(() => draft.setSelectionRange(draft.value.length, draft.value.length)); };
  const renderFiles = () => {
    urls.forEach(url => URL.revokeObjectURL(url)); urls.clear();
    context.replaceChildren(); context.hidden = !files.length;
    files.forEach((file, index) => {
      const tile = document.createElement("ui-attachment"); tile.className = "mash-composer-file"; tile.size = "small";
      const name = document.createElement("span"); name.slot = "title"; name.textContent = file.name;
      const description = document.createElement("span"); description.slot = "description";
      description.textContent = file.size < 1024 ? file.size + " B" : Math.ceil(file.size / 1024) + " KB";
      let media;
      if (file.type.startsWith("image/")) { media = document.createElement("img"); media.src = URL.createObjectURL(file); urls.add(media.src); media.alt = ""; }
      else { media = document.createElement("ui-icon"); media.name = "object.document"; media.label = ""; }
      media.slot = "media";
      const remove = makeButton("Remove " + file.name, "action.dismiss", () => { files = files.filter((_, i) => i !== index); renderFiles(); sync(); emit("composer-files-change", {files:[...files]}); focusDraft(); });
      remove.slot = "actions"; tile.append(media, name, description, remove); context.append(tile);
    });
  };
  const addFiles = (candidates, replacing = false) => {
    if (!replacing && (disabled || pending || form.hasAttribute("data-no-attachments"))) return;
    if (replacing) files = [];
    const accepts = picker.accept.toLowerCase().split(",").map(value => value.trim()).filter(Boolean);
    const limit = Number(form.dataset.maxFiles) || Infinity;
    const key = file => file.name + ":" + file.size + ":" + file.lastModified;
    const seen = new Set(files.map(key)); let rejected = 0;
    for (const file of candidates) {
      if (seen.has(key(file))) continue;
      const matches = !accepts.length || accepts.some(type => type.startsWith(".") ? file.name.toLowerCase().endsWith(type) : type.endsWith("/*") ? file.type.toLowerCase().startsWith(type.slice(0,-1)) : file.type.toLowerCase() === type);
      if (!matches || files.length >= limit) { rejected++; continue; }
      files.push(file); seen.add(key(file));
    }
    renderFiles(); sync(); emit("composer-files-change", {files:[...files]});
    announce(rejected ? rejected + " file(s) skipped. Check the allowed types and attachment limit." : "");
  };
  const renderSuggestions = () => {
    suggestionsList.replaceChildren();
    // Each real button is keyboard reachable; arrow navigation keeps focus in the editor.
    suggestions.forEach((text, index) => {
      const button = document.createElement("ui-button"); button.type = "button"; button.variant = "ghost";
      button.className = "mash-composer-suggestion"; button.toggleAttribute("data-highlighted", index === highlighted);
      button.textContent = text;
      const hint = document.createElement("ui-kbd"); hint.appearance = "plain"; hint.textContent = index === highlighted ? "↵" : index === 0 ? "↓" : ""; button.append(hint);
      on(button,"click", () => { setDraft(text); focusDraft(); }); suggestionsList.append(button);
    });
    if (highlighted >= 0) announce("Suggested prompt: " + suggestions[highlighted] + ". Enter to use.");
  };
  const editQueued = id => {
    if (disabled) return;
    const index = queue.findIndex(item => item.id === id); if (index < 0) return;
    const item = queue[index];
    // Preserve a draft already in progress by swapping it into the edited row.
    if (hasDraft()) queue.splice(index, 1, {id:crypto.randomUUID(), text:draft.value, files:[...files], mode:mode?.value});
    else queue.splice(index,1);
    draft.value = item.text; files = [...item.files]; renderFiles(); renderQueue(); changed(); focusDraft();
    emit("composer-queue-change", {queue:[...queue]}); announce("Queued message moved into the draft.");
  };
  const removeQueued = id => {
    if (disabled) return;
    const index = queue.findIndex(item => item.id === id);
    queue = queue.filter(item => item.id !== id); renderQueue(); emit("composer-queue-change", {queue:[...queue]});
    queueList.querySelectorAll("[data-queue-edit]")[Math.min(index, queue.length-1)]?.focus();
    if (!queue.length) focusDraft(); announce("Queued message removed.");
  };
  const reorder = (id, index) => {
    const from = queue.findIndex(item => item.id === id);
    if (disabled || from < 0 || index < 0 || index >= queue.length || from === index) return;
    const [item] = queue.splice(from,1); queue.splice(index,0,item);
    renderQueue(); emit("composer-queue-change", {queue:[...queue]});
    queueList.querySelectorAll("[data-queue-edit]")[index]?.focus(); announce("Moved to position " + (index+1) + " of " + queue.length + ".");
  };
  const renderQueue = () => {
    queueList.replaceChildren(); queueList.hidden = !queue.length;
    queue.forEach((item,index) => {
      const row = document.createElement("ui-draggable"); row.axis = "y"; row.containment = "parent"; row.threshold = 5; row.disabled = disabled;
      row.className = "mash-composer-queued"; row.dataset.id = item.id;
      const handle = document.createElement("span"); handle.slot = "handle"; handle.className = "mash-composer-grip"; handle.setAttribute("aria-hidden","true"); handle.textContent = "⠿";
      const edit = document.createElement("ui-button"); edit.type = "button"; edit.variant = "ghost"; edit.disabled = disabled; edit.dataset.queueEdit = "";
      edit.textContent = item.text || item.files.map(file => file.name).join(", "); edit.setAttribute("aria-label", "Edit queued message " + (index+1) + ": " + edit.textContent);
      edit.setAttribute("aria-description", "Enter edits. Delete removes. Alt and arrow keys reorder.");
      if (item.files.length) { const count = document.createElement("span"); count.className="mash-composer-file-count"; count.textContent = item.files.length + " file" + (item.files.length > 1 ? "s" : ""); edit.append(count); }
      on(edit,"click",()=>editQueued(item.id)); on(edit,"keydown",event => {
        if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); removeQueued(item.id); }
        else if(event.key === "F2") { event.preventDefault(); editQueued(item.id); }
        else if(event.altKey && ["ArrowUp","ArrowDown"].includes(event.key)) { event.preventDefault(); reorder(item.id,index + (event.key === "ArrowUp" ? -1 : 1)); }
      });
      const remove = makeButton("Remove queued message " + (index+1),"action.dismiss",()=>removeQueued(item.id));
      row.append(handle,edit,remove);
      let targetIndex = index, rowRects = [];
      on(row,"ui-drag-start",()=>{ rowRects = [...queueList.children].map(element=>element.getBoundingClientRect()); });
      on(row,"ui-drag-move",event=>{
        const center = rowRects[index].top + rowRects[index].height/2 + event.detail.position.y;
        targetIndex = rowRects.reduce((nearest,rect,i)=>Math.abs(center-(rect.top+rect.height/2)) < Math.abs(center-(rowRects[nearest].top+rowRects[nearest].height/2)) ? i : nearest,index);
        [...queueList.children].forEach((element,i)=>{ if(i===index)return; const distance = rowRects[index].height + parseFloat(getComputedStyle(queueList).rowGap || "0"); element.style.translate = "0 " + (index < targetIndex && i > index && i <= targetIndex ? -distance : index > targetIndex && i < index && i >= targetIndex ? distance : 0) + "px"; });
      });
      on(row,"ui-drag-end",event=>{
        [...queueList.children].forEach(element=>element.style.translate="");
        row.resetPosition(); if(!event.detail.cancelled) reorder(item.id,targetIndex);
      });
      queueList.append(row);
    });
  };
  const dispatchMessage = message => {
    history.push(message.text); historyIndex = -1;
    emit("composer-send", message);
  };
  const finishPending = () => {
    if (!pending) return;
    const message = pending; pending = null; sync();
    if (form.hasAttribute("data-fail-next")) {
      form.removeAttribute("data-fail-next"); draft.value = message.text; files = message.files; renderFiles(); sync();
      announce("Couldn't send. Your draft is safe.",true);
    } else { dispatchMessage(message); announce("Sent"); }
    focusDraft();
  };
  const submit = () => {
    if (disabled || pending || !hasDraft()) return;
    const message = {id:crypto.randomUUID(), text:draft.value.trim(), files:[...files], mode:mode?.value};
    draft.value = ""; files = []; historyIndex = -1; highlighted = -1; renderFiles(); renderSuggestions();
    emit("composer-change", {value:""}); emit("composer-files-change",{files:[]});
    if (responseStatus === "streaming") { queue.push(message); renderQueue(); sync(); emit("composer-queue-change",{queue:[...queue]}); announce("Queued for the next response."); focusDraft(); return; }
    const delay = Number(form.dataset.sendDelay) || 0;
    if(delay) { pending = message; sync(); announce("Sending…"); timer = setTimeout(finishPending,delay); stop.focus(); }
    else { sync(); dispatchMessage(message); focusDraft(); }
  };
  const stopResponse = () => {
    if(disabled) return;
    if(pending) { clearTimeout(timer); draft.value = pending.text; files = pending.files; pending = null; renderFiles(); sync(); announce("Sending stopped. Continue editing."); focusDraft(); }
    else emit("composer-stop",{});
  };
  const openFilePicker = accept => {
    if(disabled || pending || form.hasAttribute("data-no-attachments")) return;
    // A temporary picker can narrow types without changing the form's drop policy.
    if(accept) { const input = document.createElement("input"); input.type="file"; input.multiple=true; input.accept=accept; input.onchange=()=>addFiles(input.files); input.click(); }
    else picker.click();
  };
  const setStatus = value => {
    const previous = responseStatus; responseStatus = value === "streaming" ? "streaming" : "idle"; sync();
    if(previous === "streaming" && responseStatus === "idle" && !disabled && queue.length) {
      const message = queue.shift(); renderQueue(); emit("composer-queue-change",{queue:[...queue]}); dispatchMessage(message);
    }
  };
  const api = {
    get value(){return draft.value;}, set value(value){setDraft(value);},
    get files(){return [...files];}, set files(value){addFiles(value,true);},
    get queue(){return queue.map(item=>({...item,files:[...item.files]}));},
    set queue(value){queue=value.map(item=>({...item,files:[...item.files]}));renderQueue();},
    get history(){return [...history];}, set history(value){history=[...value];historyIndex=-1;},
    get status(){return responseStatus;}, set status(value){setStatus(value);},
    get disabled(){return disabled;}, set disabled(value){disabled=Boolean(value);renderFiles();renderQueue();sync();},
    set suggestions(value){suggestions=[...value];highlighted=-1;renderSuggestions();sync();},
    openFilePicker, send:submit, stop:stopResponse,
    destroy(){scope.abort();clearTimeout(timer);resize.disconnect();urls.forEach(url=>URL.revokeObjectURL(url));context.replaceChildren();queueList.replaceChildren();suggestionsList.replaceChildren();}
  };
  form.composer = api;
  on(form,"submit",event=>{event.preventDefault();submit();});
  on(draft,"input",changed);
  on(draft,"keydown",event=>{
    if(disabled || pending || event.isComposing) return;
    const control = draft.control;
    const hasSelection = control.selectionStart !== control.selectionEnd;
    if(event.key === "Tab" && !event.shiftKey && !draft.value && form.dataset.placeholderSuggestion) {event.preventDefault();setDraft(form.dataset.placeholderSuggestion);focusDraft();return;}
    if(event.key === "Escape" && highlighted >= 0) {event.preventDefault();highlighted=-1;renderSuggestions();announce("");return;}
    if(!draft.value && suggestions.length && !event.altKey && ["ArrowUp","ArrowDown"].includes(event.key) && historyIndex < 0 && (event.key === "ArrowDown" || highlighted >= 0)) {
      event.preventDefault();highlighted=Math.max(-1,Math.min(suggestions.length-1,highlighted+(event.key === "ArrowDown" ? 1 : -1)));renderSuggestions();return;
    }
    if(event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();if(highlighted>=0 && !draft.value) {setDraft(suggestions[highlighted]);focusDraft();} else if(responseStatus === "streaming" && !hasDraft()) stopResponse(); else submit();return;
    }
    if(!hasSelection && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && ["ArrowUp","ArrowDown"].includes(event.key) && history.length) {
      const firstLine = !draft.value.slice(0,control.selectionStart).includes("\n");
      const lastLine = !draft.value.slice(control.selectionEnd).includes("\n");
      if(event.key === "ArrowUp" && firstLine) {
        event.preventDefault();if(historyIndex<0){savedDraft=draft.value;historyIndex=history.length;}historyIndex=Math.max(0,historyIndex-1);draft.value=history[historyIndex];sync();focusDraft();
      } else if(event.key === "ArrowDown" && lastLine && historyIndex>=0) {
        event.preventDefault();historyIndex++;draft.value=historyIndex>=history.length?savedDraft:history[historyIndex];if(historyIndex>=history.length)historyIndex=-1;sync();focusDraft();
      }
    }
  });
  on(expand,"click",()=>{pinned=!pinned;sync();draft.focus();});
  on(attach,"click",()=>openFilePicker());
  on(picker,"change",()=>{addFiles(picker.files);picker.value="";focusDraft();});
  const fileDrag = event => event.dataTransfer?.types.includes("Files");
  on(form,"dragenter",event=>{if(!fileDrag(event))return;event.preventDefault();if(disabled || pending || form.hasAttribute("data-no-attachments"))return;dropDepth++;form.setAttribute("data-file-over","");});
  on(form,"dragleave",event=>{if(!fileDrag(event))return;dropDepth=Math.max(0,dropDepth-1);if(!dropDepth)form.removeAttribute("data-file-over");});
  on(form,"dragover",event=>{if(fileDrag(event)){event.preventDefault();event.dataTransfer.dropEffect=disabled || pending || form.hasAttribute("data-no-attachments")?"none":"copy";}});
  on(form,"drop",event=>{if(!fileDrag(event))return;event.preventDefault();dropDepth=0;form.removeAttribute("data-file-over");addFiles(event.dataTransfer.files);});
  on(form,"click",event=>{if(event.composedPath().some(node=>node instanceof Element && node.matches("button,input,textarea,select,a,ui-button,ui-select,ui-draggable")))return;if(!disabled)focusDraft();});
  on(stop,"click",stopResponse); on(retry,"click",submit);
  on(mode,"ui-select-change",event=>{draft.placeholder={ask:"Ask anything, or describe a task…",plan:"What would you like to plan?",write:"What would you like to write?"}[event.detail.value];});
  const resize = new ResizeObserver(sync); resize.observe(form);
  on(window,"pagehide",()=>api.destroy());
  if(form.dataset.context) addFiles(form.dataset.context.split(",").map(name=>new File(["Example context"],name)));
  if(form.dataset.placeholderSuggestion) {
    draft.placeholder=form.dataset.placeholderSuggestion;
    const hint=document.createElement("ui-kbd");hint.className="mash-composer-placeholder";hint.appearance="plain";hint.textContent="Tab";hint.setAttribute("aria-hidden","true");form.append(hint);
  }
  renderSuggestions();sync();
}
`;
