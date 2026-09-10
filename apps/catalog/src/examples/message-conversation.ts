import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";
import { composerMarkup, composerScript } from "./composer.js";

const conversationScript = String.raw`
const form=document.querySelector(".mash-composer"), composer=form.composer;
const transcript=document.querySelector("#conversation");
const result=document.querySelector("#conversation-status");
let timer, generation=0;
const urls=new Set();
const iconAction=(name,icon,callback)=>{
  const tooltip=document.createElement("ui-tooltip");tooltip.label=name;
  const button=document.createElement("ui-button");button.slot="trigger";button.type="button";button.variant="ghost";button.size="compact";button.setAttribute("aria-label",name);
  const glyph=document.createElement("ui-icon");glyph.name=icon;glyph.label="";button.append(glyph);button.addEventListener("click",callback);tooltip.append(button);return tooltip;
};
function appendMessage(text,from,files=[]){
  const motion=document.createElement("ui-motion");motion.motion="slide-block";
  const message=document.createElement("ui-message");message.className="mash-chat-message";message.alignment=from==="user"?"end":"start";message.inset="none";
  const bubble=document.createElement("ui-bubble");bubble.variant=from==="user"?"secondary":"ghost";bubble.alignment=from==="user"?"end":"start";
  const body=document.createElement("span");body.className="mash-chat-text";body.textContent=text;bubble.append(body);
  if(files.length){const attachments=document.createElement("div");attachments.className="mash-chat-files";for(const file of files){
    const tile=document.createElement("ui-attachment");tile.size="small";
    const name=document.createElement("span");name.slot="title";name.textContent=file.name;
    const media=document.createElement(file.type.startsWith("image/")?"img":"ui-icon");media.slot="media";
    if(media.tagName==="IMG"){media.src=URL.createObjectURL(file);urls.add(media.src);media.alt="";}else{media.name="object.document";media.label="";}
    tile.append(media,name);attachments.append(tile);
  }message.append(attachments);}
  if(text || from==="assistant")message.append(bubble);
  const footer=document.createElement("div");footer.slot="footer";footer.className="mash-chat-meta";
  if(from==="user"){const time=document.createElement("time");time.dateTime=new Date().toISOString();time.textContent=new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});footer.append(time);}
  footer.append(iconAction("Copy message","action.duplicate",async()=>{try{await navigator.clipboard.writeText(body.textContent || files.map(file=>file.name).join(", "));result.textContent="Message copied.";}catch{result.textContent="Select the message text to copy.";}}));
  if(from==="user")footer.append(iconAction("Edit message","action.edit",()=>{
    if(composer.value || composer.files.length){result.textContent="Send or clear the current draft before editing an earlier message.";return;}
    composer.value=body.textContent;composer.files=files;form.querySelector("ui-textarea").focus();result.textContent="Editing a copy. The original stays in the transcript.";
  }));
  else footer.append(iconAction("Regenerate response","action.refresh",()=>{if(composer.status==="streaming"){result.textContent="Stop the current response first.";return;}stream(body);}));
  message.append(footer);motion.append(message);transcript.append(motion);motion.play("entering");transcript.scrollToLatest();return body;
}
function stream(body){
  clearInterval(timer);composer.status="streaming";generation++;
  const responses=["Start with one clear outcome. Keep the draft small enough to review, then use the open questions to decide what comes next.\n\nI would group the work into three steps: clarify the goal, make a first pass, and review it together.","Here is another approach: write down the decision you need to make, list the smallest useful next steps, and leave room for feedback.\n\nA focused first draft is easier to improve than a complete plan built on assumptions."];
  const words=responses[(generation-1)%responses.length].split(" ");let index=0;body.textContent="";
  result.textContent="Writing a local sample response…";
  timer=setInterval(()=>{body.textContent+=(index?" ":"")+words[index++];if(index===words.length){clearInterval(timer);result.textContent="Response complete.";composer.status="idle";}},65);
}
form.addEventListener("composer-send",event=>{const message=event.detail;appendMessage(message.text,"user",message.files);composer.suggestions=[];stream(appendMessage("","assistant"));});
form.addEventListener("composer-stop",()=>{clearInterval(timer);result.textContent="Response stopped.";composer.status="idle";});
composer.suggestions=["Help me plan a small first step","Summarize the open questions"];
appendMessage("Can you help me turn these notes into a clear next step?","user");
appendMessage("Of course. Share a draft or attach the notes. We can start with the goal, then work through the decisions together.","assistant");
addEventListener("pagehide",()=>{clearInterval(timer);urls.forEach(url=>URL.revokeObjectURL(url));},{once:true});
`;

export const conversationExamples: CatalogExample[] = [
  {
    ...sample(
      "Message input and conversation",
      `<div class="mash-chat" data-mash-size="default"><ui-message-scroller id="conversation" label="Conversation"></ui-message-scroller>${composerMarkup()}<output id="conversation-status" class="mash-composer-result" aria-live="polite">Send a message to try a local streamed response.</output></div>`,
      "A working local conversation: send, stop, queue, edit, copy, regenerate, and attach files. Message motion, tooltips, and scroll following use the existing components.",
    ),
    script: composerScript + conversationScript,
  },
];
