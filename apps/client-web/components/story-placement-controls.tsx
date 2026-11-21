'use client';
import {useEffect,useId,useRef,type PointerEvent,type KeyboardEvent} from 'react';
import {keyboardPlacement,movePlacement,previewDelta,rotatePlacement,scalePlacement,snapRotation,STORY_HEIGHT,STORY_WIDTH,type RoutePlacement} from '@/lib/story/placement';
import {presetPlacementRect,STORY_PRESETS,type StoryPreset} from '@/lib/story/presets';

type XY={x:number;y:number};
/** One gesture at a time. Each starts from a snapshot so rounding never accumulates. */
type Gesture=
  |{kind:'move';id:number;from:XY;start:RoutePlacement;bounds:DOMRect}
  |{kind:'pinch';ids:[number,number];dist:number;angle:number;start:RoutePlacement}
  |{kind:'handle';id:number;center:XY;dist:number;angle:number;start:RoutePlacement};
const angleOf=(a:XY,b:XY)=>Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
const distOf=(a:XY,b:XY)=>Math.max(1,Math.hypot(b.x-a.x,b.y-a.y));

/** Photo-mode sticker frame: drag to move, pinch or corner handle to scale and rotate. */
export function StoryPlacementControls({value,onChange,preset='story',aspectRatio=1}:{value:RoutePlacement;onChange:(value:RoutePlacement)=>void;preset?:StoryPreset;aspectRatio?:number}){
  const host=useRef<HTMLDivElement>(null),frame=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|undefined>(undefined),pointers=useRef(new Map<number,XY>()),help=useId();
  const valueRef=useRef(value);useEffect(()=>{valueRef.current=value;},[value]);
  const rect=presetPlacementRect(value,preset,aspectRatio),height=STORY_PRESETS[preset].height,scale=height/STORY_HEIGHT;

  const centre=():XY=>{const r=frame.current!.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};};
  const startMove=(id:number)=>{const p=pointers.current.get(id);if(p&&host.current)gesture.current={kind:'move',id,from:p,start:{...valueRef.current},bounds:host.current.getBoundingClientRect()};};
  const startPinch=()=>{
    const [a,b]=[...pointers.current.entries()];if(!a||!b)return;
    gesture.current={kind:'pinch',ids:[a[0],b[0]],dist:distOf(a[1],b[1]),angle:angleOf(a[1],b[1]),start:{...valueRef.current}};
  };
  const transform=(start:RoutePlacement,ratio:number,turn:number)=>{
    const scaled=scalePlacement(start,start.size*ratio),turned=rotatePlacement(scaled,turn);
    return {...turned,rotation:snapRotation(turned.rotation??0)};
  };

  const down=(event:PointerEvent<HTMLElement>,handle=false)=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    event.preventDefault();event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(handle){
      const c=centre(),p={x:event.clientX,y:event.clientY};
      gesture.current={kind:'handle',id:event.pointerId,center:c,dist:distOf(c,p),angle:angleOf(c,p),start:{...valueRef.current}};
    }else if(pointers.current.size>=2)startPinch();
    else startMove(event.pointerId);
  };
  const move=(event:PointerEvent<HTMLElement>)=>{
    if(!pointers.current.has(event.pointerId))return;
    event.stopPropagation(); // A handle drag must not also run on the frame beneath it.
    const p={x:event.clientX,y:event.clientY};pointers.current.set(event.pointerId,p);
    const g=gesture.current;if(!g)return;
    if(g.kind==='move'&&g.id===event.pointerId){
      const d=previewDelta(p.x-g.from.x,p.y-g.from.y,g.bounds);onChange(movePlacement(g.start,d.x/scale,d.y));
    }else if(g.kind==='pinch'){
      const a=pointers.current.get(g.ids[0]),b=pointers.current.get(g.ids[1]);if(!a||!b)return;
      onChange(transform(g.start,distOf(a,b)/g.dist,angleOf(a,b)-g.angle));
    }else if(g.kind==='handle'&&g.id===event.pointerId){
      onChange(transform(g.start,distOf(g.center,p)/g.dist,angleOf(g.center,p)-g.angle));
    }
  };
  const up=(event:PointerEvent<HTMLElement>,cancel=false)=>{
    if(!pointers.current.delete(event.pointerId))return;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    const g=gesture.current;
    if(cancel&&g){onChange(g.start);gesture.current=undefined;pointers.current.clear();return;}
    // Lifting one finger of a pinch continues as a drag with the remaining finger.
    if(g?.kind==='pinch'){const rest=[...pointers.current.keys()][0];gesture.current=undefined;if(rest!==undefined)startMove(rest);return;}
    if(!pointers.current.size)gesture.current=undefined;
  };
  const key=(event:KeyboardEvent<HTMLElement>)=>{
    let next=keyboardPlacement(value,event.key,event.altKey,event.shiftKey);
    if(event.key==='['||event.key===']')next=rotatePlacement(value,(event.key===']'?1:-1)*(event.shiftKey?15:5));
    if(next){event.preventDefault();onChange(next);}
  };
  const handlers={onPointerMove:move,onPointerUp:(e:PointerEvent<HTMLElement>)=>up(e),onPointerCancel:(e:PointerEvent<HTMLElement>)=>up(e,true)};

  return <div ref={host} className="kl-route-placement">
    <span id={help} className="sr-only">Drag to move the route. Pinch with two fingers, or drag the corner handle, to resize and rotate. Keyboard: arrow keys move, Alt with arrows resizes, square brackets rotate, Home resets.</span>
    <div ref={frame} tabIndex={0} role="group" className="kl-route-move" aria-label="Route sticker" aria-describedby={help}
      style={{left:`${rect.left/STORY_WIDTH*100}%`,top:`${rect.top/height*100}%`,width:`${rect.width/STORY_WIDTH*100}%`,height:`${rect.height/height*100}%`,
        transform:value.rotation?`rotate(${value.rotation}deg)`:undefined}}
      onPointerDown={e=>down(e)} {...handlers} onKeyDown={key}>
      <span className="kl-placement-corner kl-corner-tl" aria-hidden="true"/>
      <span className="kl-placement-corner kl-corner-tr" aria-hidden="true"/>
      <span className="kl-placement-corner kl-corner-bl" aria-hidden="true"/>
      <span className="kl-placement-handle" aria-hidden="true" onPointerDown={e=>down(e,true)} {...handlers}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg></span>
    </div>
  </div>;
}
