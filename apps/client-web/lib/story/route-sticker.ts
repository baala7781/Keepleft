import {LocalENU} from '../../../../packages/geo';
import type {SavedActivity} from '../tracking/storage';
import {ReplayRuntime} from '../tracking/replay';
export const STICKER_SIZE=480;
export class RouteSticker {
  readonly replay:ReplayRuntime;
  readonly points:{x:number;y:number;time:number;breakBefore:boolean}[];
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
  }
  private screen(p:{x:number;y:number}){return {x:240+(p.x-this.cx)*this.scale,y:240-(p.y-this.cy)*this.scale};}
  at(seconds:number){const fraction=Math.max(0,Math.min(1,(seconds-1.5)/9)),time=fraction*this.replay.durationMs;this.replay.seek(time,0);const p=this.replay.getMotion()!;return {...this.screen(this.frame.project(p)),time,gap:p.gap,fraction};}
  dispose(){this.replay.dispose();}
}
/** Portable graphic of the recorded path. It neither snaps nor repairs GPS samples. */
export function drawRouteSticker(ctx:CanvasRenderingContext2D,route:RouteSticker,seconds:number,clear=true){
  const tip=route.at(seconds),points=route.points;if(clear)ctx.clearRect(0,0,480,480);ctx.lineCap='round';ctx.lineJoin='round';
  const path=(completed:boolean)=>{ctx.beginPath();let previous:typeof points[number]|undefined;for(const p of points){if(completed&&p.time>tip.time)break;if(!previous||p.breakBefore)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);previous=p;}if(completed&&previous&&!tip.gap)ctx.lineTo(tip.x,tip.y);};
  path(false);ctx.strokeStyle='rgba(227,59,99,0.2)';ctx.lineWidth=3;ctx.stroke();
  path(true);ctx.strokeStyle='rgba(227,59,99,0.25)';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='#e33b63';ctx.lineWidth=4.5;ctx.stroke();
  const first=points[0];ctx.beginPath();ctx.arc(first.x,first.y,3.5,0,Math.PI*2);ctx.fillStyle='#e33b63';ctx.fill();ctx.beginPath();ctx.arc(first.x,first.y,1.5,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();
  // A small, luminous glowing beacon with no black outline
  ctx.save();ctx.translate(tip.x,tip.y);
  ctx.fillStyle='rgba(227,59,99,0.28)';ctx.beginPath();ctx.arc(0,0,5.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e33b63';ctx.beginPath();ctx.arc(0,0,3.0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(0,0,1.2,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
