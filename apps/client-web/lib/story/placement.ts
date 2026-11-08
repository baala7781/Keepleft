export const STORY_WIDTH=720,STORY_HEIGHT=1280;
export type RoutePlacement={x:number;y:number;size:number;rotation?:number};
export const DEFAULT_PLACEMENT:Readonly<RoutePlacement>={x:360,y:650,size:580};
const MARGIN=16,MIN_SIZE=160;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

/** Coordinates belong to the exported photo, independent of CSS preview size or DPR. */
export function constrainPlacement(value:RoutePlacement):RoutePlacement{
  const size=clamp(Number.isFinite(value.size)?value.size:DEFAULT_PLACEMENT.size,MIN_SIZE,STORY_WIDTH-2*MARGIN);
  const rotation=Number.isFinite(value.rotation)?((value.rotation! % 360 + 540) % 360) - 180:undefined;
  return {x:clamp(Number.isFinite(value.x)?value.x:DEFAULT_PLACEMENT.x,size/2+MARGIN,STORY_WIDTH-size/2-MARGIN),
    y:clamp(Number.isFinite(value.y)?value.y:DEFAULT_PLACEMENT.y,size/2+MARGIN,STORY_HEIGHT-size/2-MARGIN),
    size,
    ...(rotation!==undefined?{rotation}:{})};
}
export function placementRect(value:RoutePlacement,aspectRatio=1){
  const p=constrainPlacement(value);
  const ar=Math.max(0.1,Math.min(10,aspectRatio||1));
  const w=ar>=1?p.size:p.size*ar;
  const h=ar>=1?p.size/ar:p.size;
  return {left:p.x-w/2,top:p.y-h/2,width:w,height:h};
}
export function movePlacement(start:RoutePlacement,dx:number,dy:number):RoutePlacement{
  return constrainPlacement({...start,x:start.x+dx,y:start.y+dy});
}
/** Resize from the lower-right handle while keeping the opposite corner still. */
export function resizePlacement(start:RoutePlacement,delta:number):RoutePlacement{
  const r=placementRect(start),max=Math.min(STORY_WIDTH-MARGIN-r.left,STORY_HEIGHT-MARGIN-r.top);
  const size=clamp(r.width+delta,MIN_SIZE,max);return {...start,x:r.left+size/2,y:r.top+size/2,size};
}
export function rotatePlacement(start:RoutePlacement,angleDelta:number):RoutePlacement{
  const current=start.rotation??0;
  let next=(current+angleDelta)%360;
  if(next>180)next-=360;
  if(next<-180)next+=360;
  return {...start,rotation:Math.round(next)};
}
export function previewDelta(dx:number,dy:number,bounds:{width:number;height:number}){
  return {x:bounds.width>0?dx*STORY_WIDTH/bounds.width:0,y:bounds.height>0?dy*STORY_HEIGHT/bounds.height:0};
}
export function keyboardPlacement(p:RoutePlacement,key:string,resize=false,shift=false):RoutePlacement|undefined{
  if(key==='Home')return {...DEFAULT_PLACEMENT};
  const step=shift?40:10;
  if(resize){if(['ArrowUp','ArrowRight'].includes(key))return resizePlacement(p,step);if(['ArrowDown','ArrowLeft'].includes(key))return resizePlacement(p,-step);}
  else {if(key==='ArrowLeft')return movePlacement(p,-step,0);if(key==='ArrowRight')return movePlacement(p,step,0);if(key==='ArrowUp')return movePlacement(p,0,-step);if(key==='ArrowDown')return movePlacement(p,0,step);}
}
