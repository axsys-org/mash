import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const rendererControl = `<ui-select id="plot-renderer" label="Renderer" value="svg"><ui-option value="svg">SVG</ui-option><ui-option value="canvas">Canvas</ui-option></ui-select>`;
const common = `const plot=root.querySelector("#custom-plot");
const result=root.querySelector("#custom-result");
function color(index) {
  const probe=document.createElement("span"); probe.hidden=true; root.append(probe); probe.style.color=getComputedStyle(plot).getPropertyValue("--color-chart"+index);
  const context=document.createElement("canvas").getContext("2d"); context.fillStyle=getComputedStyle(probe).color; context.fillRect(0,0,1,1);
  const [r,g,b]=context.getImageData(0,0,1,1).data; probe.remove(); return "rgb("+[r,g,b].join(",")+")";
}
root.querySelector("#plot-renderer").addEventListener("ui-select-change",event=>{ plot.renderer=event.detail.value; }, { signal });
const observer=new MutationObserver(()=>draw()); observer.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme","class","style"]});
signal.addEventListener("abort",()=>observer.disconnect(),{once:true});`;
const table = (headers: string[], rows: Array<Array<string | number>>) =>
  `<details slot="fallback"><summary>View data</summary><table class="mash-data-table"><caption>Illustrative source values</caption><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${value}</td>`).join("")}</tr>`).join("")}</tbody></table></details>`;
const phases = [
  ["Plan", 1, 5],
  ["Build", 4, 15],
  ["Review", 12, 19],
  ["Publish", 18, 22],
] as const;
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const visits = [186, 205, 237, 173, 209, 214];

export const customChartExamples: CatalogExample[] = [
  {
    ...sample(
      "Custom marks · schedule",
      `<div class="mash-row mash-wrap">${rendererControl}<ui-select id="time-window" label="Time window" value="full"><ui-option value="full">Full day</ui-option><ui-option value="work">Working hours</ui-option></ui-select></div><ui-chart id="custom-plot" label="Schedule durations in hours">${table(
        ["Phase", "Start hour", "End hour"],
        phases.map((row) => [...row]),
      )}</ui-chart><output id="custom-result" aria-live="polite">Choose a duration to inspect it.</output>`,
      "Custom rectangles use category bands and a numeric scale. Switching the time window clips marks to the visible plot without changing their source durations.",
    ),
    scoped: true,
    script: `${common}
const phases=${JSON.stringify(phases)};
function draw() {
  const colors=phases.map((_,index)=>color(index+1));
  const working=root.querySelector("#time-window").value==="work";
  plot.option={animationDuration:180,grid:{left:60,right:24,top:24,bottom:40,containLabel:true},xAxis:{type:"value",min:working?8:0,max:working?18:24,interval:working?2:4,name:"Hour"},yAxis:{type:"category",data:phases.map(item=>item[0]),inverse:true},tooltip:{formatter:params=>params.name+": "+(params.value[2]-params.value[1])+" hours"},series:[{name:"Duration",type:"custom",encode:{x:[1,2],y:0,tooltip:[1,2]},data:phases.map((item,index)=>({name:item[0],value:[index,item[1],item[2]]})),renderItem:(params,api)=>{
    const start=api.coord([api.value(1),api.value(0)]), end=api.coord([api.value(2),api.value(0)]);
    const bounds=params.coordSys, height=Math.abs(api.size([0,1])[1])*0.52;
    const left=Math.max(start[0],bounds.x), right=Math.min(end[0],bounds.x+bounds.width);
    if(right<=left) return;
    return {type:"rect",shape:{x:left,y:start[1]-height/2,width:right-left,height,r:4},style:{fill:colors[params.dataIndex]}};
  }}]};
}
root.querySelector("#time-window").addEventListener("ui-select-change",draw, { signal });
plot.addEventListener("ui-chart-select",event=>{ const {name,value}=event.detail; result.textContent=name+": "+(value[2]-value[1])+" hours ("+value[1]+"–"+value[2]+")"; }, { signal }); draw();`,
  },
  {
    ...sample(
      "Pie · variable radius",
      `<div class="mash-row mash-wrap">${rendererControl}<ui-select id="arc-radius" label="Outer radius" value="stepped"><ui-option value="stepped">Stepped radii</ui-option><ui-option value="constant">Equal radii</ui-option></ui-select></div><ui-chart id="custom-plot" label="Monthly visits as variable-radius arcs">${table(
        ["Month", "Visits"],
        months.map((month, index) => [month, visits[index]!]),
      )}</ui-chart><output id="custom-result" aria-live="polite">Choose an arc to inspect its original value.</output>`,
      "Each arc keeps its value-proportional angle while its outer radius can vary. Radius is a decorative treatment; the data table preserves the actual quantities.",
    ),
    scoped: true,
    script: `${common}
const labels=${JSON.stringify(months)}, values=${JSON.stringify(visits)};
function draw() {
  const colors=values.map((_,index)=>color(index%5+1));
  let angle=-Math.PI/2; const total=values.reduce((sum,value)=>sum+value,0);
  const stepped=root.querySelector("#arc-radius").value==="stepped";
  const data=values.map((value,index)=>{const start=angle;angle+=value/total*Math.PI*2;return {name:labels[index],value:[value,start,angle,stepped?1-index*0.045:1]};});
  plot.option={tooltip:{formatter:params=>params.name+": "+params.value[0]+" visits"},series:[{name:"Visits",type:"custom",coordinateSystem:"none",data,renderItem:(params,api)=>{
    const radius=Math.min(api.getWidth(),api.getHeight())*0.39;
    return {type:"sector",shape:{cx:api.getWidth()/2,cy:api.getHeight()/2,r:radius*api.value(3),r0:radius*0.52,startAngle:api.value(1),endAngle:api.value(2)-0.012,clockwise:true},style:{fill:colors[params.dataIndex]}};
  }}]};
}
root.querySelector("#arc-radius").addEventListener("ui-select-change",draw, { signal });
plot.addEventListener("ui-chart-select",event=>{ result.textContent=event.detail.name+": "+event.detail.value[0]+" visits"; }, { signal }); draw();`,
  },
];
