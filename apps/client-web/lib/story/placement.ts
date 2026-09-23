export const STORY_WIDTH=720,STORY_HEIGHT=1280;
export type RoutePlacement={x:number;y:number;size:number};
export const DEFAULT_PLACEMENT:Readonly<RoutePlacement>={x:360,y:650,size:580};
const MARGIN=16,MIN_SIZE=160;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

/** Coordinates belong to the exported photo, independent of CSS preview size or DPR. */
export function constrainPlacement(value:RoutePlacement):RoutePlacement{
  const size=clamp(Number.isFinite(value.size)?value.size:DEFAULT_PLACEMENT.size,MIN_SIZE,STORY_WIDTH-2*MARGIN);
  return {size,x:clamp(Number.isFinite(value.x)?value.x:DEFAULT_PLACEMENT.x,size/2+MARGIN,STORY_WIDTH-size/2-MARGIN),
    y:clamp(Number.isFinite(value.y)?value.y:DEFAULT_PLACEMENT.y,size/2+MARGIN,STORY_HEIGHT-size/2-MARGIN)};
}
export function placementRect(value:RoutePlacement){
  const p=constrainPlacement(value);return {left:p.x-p.size/2,top:p.y-p.size/2,width:p.size,height:p.size};
}
export function movePlacement(start:RoutePlacement,dx:number,dy:number):RoutePlacement{
  return constrainPlacement({...start,x:start.x+dx,y:start.y+dy});
}
/** Resize from the lower-right handle while keeping the opposite corner still. */
export function resizePlacement(start:RoutePlacement,delta:number):RoutePlacement{
  const r=placementRect(start),max=Math.min(STORY_WIDTH-MARGIN-r.left,STORY_HEIGHT-MARGIN-r.top);
  const size=clamp(r.width+delta,MIN_SIZE,max);return {x:r.left+size/2,y:r.top+size/2,size};
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
