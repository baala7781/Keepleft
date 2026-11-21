import {LocalENU} from '../../../../packages/geo';
import type {SavedActivity} from '../tracking/storage';
import {ReplayRuntime} from '../tracking/replay';
export const STICKER_SIZE=480;
const ROUTE='#e33b63';
/** Display-only: points closer than this (sticker px) are not drawn, so GPS jitter cannot draw a sawtooth. */
const MIN_STEP=2;
type StickerPoint={x:number;y:number;time:number;breakBefore:boolean};
/** `shadow` suits full-colour canvases; the GIF keeps crisp 1-bit edges. `weight` scales stroke widths. */
export type StickerStyle={shadow?:boolean;weight?:number};
export class RouteSticker {
  readonly replay:ReplayRuntime;
  readonly points:StickerPoint[];
  /** The drawn path: recorded points minus near-duplicates. Recorded data is untouched. */
  readonly path:StickerPoint[];
  /** Route extent in sticker pixels. */
  readonly bounds:{left:number;top:number;width:number;height:number};
  readonly aspectRatio:number;
  private frame:LocalENU;
  private scale:number;
  private cx:number;
  private cy:number;
  constructor(activity:SavedActivity){
    this.replay=new ReplayRuntime(activity);
    const rawSamples=activity.samples||[];
    const continuousSamples=rawSamples.filter((p,i,arr)=>{
      const isIsolated=(i===0||p.breakBefore)&&(i===arr.length-1||arr[i+1].breakBefore);
      return !isIsolated;
    });
    const samples=continuousSamples.length>=2?continuousSamples:rawSamples;
    this.frame=new LocalENU(samples[0]||{lng:0,lat:0});
    const positions=samples.map(p=>this.frame.project(p));let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of positions){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
    const dx=Math.max(1,maxX-minX),dy=Math.max(1,maxY-minY);
    this.aspectRatio=dx/dy;
    this.cx=(minX+maxX)/2;this.cy=(minY+maxY)/2;this.scale=380/Math.max(dx,dy);
    const times=this.replay.sampleTimes;
    this.points=positions.map((p,i)=>({...this.screen(p),breakBefore:i===0||samples[i].breakBefore,
      time:times[i]||0}));
    const path:StickerPoint[]=[];
    for(const p of this.points){const last=path.at(-1);if(last&&!p.breakBefore&&Math.hypot(p.x-last.x,p.y-last.y)<MIN_STEP)continue;path.push(p);}
    const end=this.points.at(-1);if(end&&path.at(-1)!==end)path.push(end);
    this.path=path;
    let left=240,top=240,right=240,bottom=240;
    if(this.points.length){left=top=Infinity;right=bottom=-Infinity;for(const p of this.points){left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);}}
    this.bounds={left,top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
  }
  private screen(p:{x:number;y:number}){return {x:240+(p.x-this.cx)*this.scale,y:240-(p.y-this.cy)*this.scale};}
  at(seconds:number){const fraction=Math.max(0,Math.min(1,(seconds-1.5)/9)),time=fraction*this.replay.durationMs;this.replay.seek(time,0);const p=this.replay.getMotion()!;return {...this.screen(this.frame.project(p)),time,gap:p.gap,fraction};}
  dispose(){this.replay.dispose();}
}
/** Smooth curve through each recorded run: corners are rounded through segment midpoints, gaps stay open. */
function trace(ctx:CanvasRenderingContext2D,points:readonly StickerPoint[],until?:{x:number;y:number;time:number;gap?:boolean}){
  ctx.beginPath();let run:{x:number;y:number}[]=[];
  const flush=()=>{
    if(!run.length)return;const first=run[0],last=run[run.length-1];ctx.moveTo(first.x,first.y);
    for(let i=1;i<run.length-1;i++){const p=run[i],q=run[i+1];ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}
    if(run.length>1)ctx.lineTo(last.x,last.y);else ctx.lineTo(first.x+.01,first.y);
    run=[];
  };
  for(const p of points){if(until&&p.time>until.time)break;if(p.breakBefore)flush();run.push(p);}
  if(until&&!until.gap&&run.length)run.push(until);
  flush();
}
/** Portable graphic of the recorded path. It neither snaps nor repairs GPS samples. */
export function drawRouteSticker(ctx:CanvasRenderingContext2D,route:RouteSticker,seconds:number,clear=true,style:StickerStyle={}){
  const tip=route.at(seconds),w=style.weight??1;if(clear)ctx.clearRect(0,0,STICKER_SIZE,STICKER_SIZE);
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  // The part still to come is a quiet guide; the completed part has a white casing so it reads on any photo.
  trace(ctx,route.path);ctx.strokeStyle='rgba(255,255,255,.62)';ctx.lineWidth=3*w;ctx.stroke();
  trace(ctx,route.path,tip);
  if(style.shadow){ctx.save();ctx.shadowColor='rgba(0,0,0,.42)';ctx.shadowBlur=10*w;ctx.shadowOffsetY=2*w;}
  ctx.strokeStyle='#ffffff';ctx.lineWidth=11*w;ctx.stroke();
  if(style.shadow)ctx.restore();
  ctx.strokeStyle=ROUTE;ctx.lineWidth=6.5*w;ctx.stroke();
  const dot=(x:number,y:number,r:number,color:string)=>{ctx.beginPath();ctx.arc(x,y,r*w,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
  const start=route.path[0];if(start){dot(start.x,start.y,6.5,ROUTE);dot(start.x,start.y,3.6,'#ffffff');}
  if(style.shadow){ctx.save();ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=8*w;}
  dot(tip.x,tip.y,9,'#ffffff');
  if(style.shadow)ctx.restore();
  dot(tip.x,tip.y,6,ROUTE);
  ctx.restore();
}
