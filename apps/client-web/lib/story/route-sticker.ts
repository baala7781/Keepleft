import {LocalENU} from '../../../../packages/geo';
import type {SavedActivity} from '../tracking/storage';
import {ReplayRuntime} from '../tracking/replay';
export const STICKER_SIZE=480;
export class RouteSticker {
  readonly replay:ReplayRuntime;
  readonly points:{x:number;y:number;time:number;breakBefore:boolean}[];
  private frame:LocalENU;
  private scale:number;
  private cx:number;
  private cy:number;
  constructor(activity:SavedActivity){
    this.replay=new ReplayRuntime(activity);this.frame=new LocalENU(activity.samples[0]);
    const positions=activity.samples.map(p=>this.frame.project(p));let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of positions){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
    this.cx=(minX+maxX)/2;this.cy=(minY+maxY)/2;this.scale=380/Math.max(1,maxX-minX,maxY-minY);
    const times=this.replay.sampleTimes;
    this.points=positions.map((p,i)=>({...this.screen(p),breakBefore:i===0||activity.samples[i].breakBefore,
      time:times[i]}));
  }
  private screen(p:{x:number;y:number}){return {x:240+(p.x-this.cx)*this.scale,y:240-(p.y-this.cy)*this.scale};}
  at(seconds:number){const fraction=Math.max(0,Math.min(1,(seconds-1.5)/9)),time=fraction*this.replay.durationMs;this.replay.seek(time,0);const p=this.replay.getMotion()!;return {...this.screen(this.frame.project(p)),time,gap:p.gap,fraction};}
  dispose(){this.replay.dispose();}
}
/** Portable graphic of the recorded path. It neither snaps nor repairs GPS samples. */
export function drawRouteSticker(ctx:CanvasRenderingContext2D,route:RouteSticker,seconds:number){
  const tip=route.at(seconds),points=route.points;ctx.clearRect(0,0,480,480);ctx.lineCap='round';ctx.lineJoin='round';
  const path=(completed:boolean)=>{ctx.beginPath();let previous:typeof points[number]|undefined;for(const p of points){if(completed&&p.time>tip.time)break;if(!previous||p.breakBefore)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);previous=p;}if(completed&&previous&&!tip.gap)ctx.lineTo(tip.x,tip.y);};
  path(false);ctx.strokeStyle='#ffffff';ctx.lineWidth=8;ctx.stroke();ctx.strokeStyle='#a0bdec';ctx.lineWidth=4;ctx.stroke();
  path(true);ctx.strokeStyle='#ffffff';ctx.lineWidth=12;ctx.stroke();ctx.strokeStyle='#f33b53';ctx.lineWidth=7;ctx.stroke();
  const first=points[0];ctx.beginPath();ctx.arc(first.x,first.y,5,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();ctx.strokeStyle='#f33b53';ctx.lineWidth=2;ctx.stroke();
  // Small runner symbol; no human with a misleading geographic scale.
  ctx.save();ctx.translate(tip.x,tip.y);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f33b53';ctx.beginPath();ctx.arc(0,0,12.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(2,-7,2.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(1,-3);ctx.lineTo(-2,2);ctx.lineTo(3,5);ctx.lineTo(5,9);ctx.moveTo(-2,2);ctx.lineTo(-6,7);ctx.moveTo(0,-2);ctx.lineTo(5,0);ctx.lineTo(7,-3);ctx.moveTo(0,-2);ctx.lineTo(-4,-4);ctx.lineTo(-7,-1);ctx.stroke();ctx.restore();
}
