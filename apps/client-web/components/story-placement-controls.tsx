'use client';
import {useId,useRef,type PointerEvent,type KeyboardEvent} from 'react';
import {Move,MoveDiagonal2} from 'lucide-react';
import {keyboardPlacement,movePlacement,previewDelta,resizePlacement,STORY_HEIGHT,STORY_WIDTH,type RoutePlacement} from '@/lib/story/placement';
import {presetPlacementRect,STORY_PRESETS,type StoryPreset} from '@/lib/story/presets';

type Gesture={id:number;resize:boolean;x:number;y:number;start:RoutePlacement;bounds:DOMRect};
type Pinch={ids:[number,number];startDist:number;start:RoutePlacement;bounds:DOMRect;pointers:Map<number,{x:number;y:number}>};
const pointerDist=(p:Pinch)=>{const a=p.pointers.get(p.ids[0]),b=p.pointers.get(p.ids[1]);return a&&b?Math.hypot(a.x-b.x,a.y-b.y):p.startDist;};
export function StoryPlacementControls({value,onChange,preset='story'}:{value:RoutePlacement;onChange:(value:RoutePlacement)=>void;preset?:StoryPreset}){
  const host=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|undefined>(undefined),pinch=useRef<Pinch|undefined>(undefined),help=useId();
  const valueRef=useRef(value);valueRef.current=value;
  const rect=presetPlacementRect(value,preset),height=STORY_PRESETS[preset].height,scale=height/STORY_HEIGHT;
  const begin=(event:PointerEvent<HTMLButtonElement>,resize:boolean)=>{
    // If a second pointer arrives during a move, upgrade to pinch-to-resize
    if(gesture.current&&!resize&&!pinch.current&&event.pointerId!==gesture.current.id&&host.current){
      const g=gesture.current;
      const pointers=new Map<number,{x:number;y:number}>();
      pointers.set(g.id,{x:g.x,y:g.y});pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      const startDist=pointerDist({ids:[g.id,event.pointerId],startDist:1,start:g.start,bounds:g.bounds,pointers});
      if(startDist>10){pinch.current={ids:[g.id,event.pointerId],startDist,start:{...valueRef.current},bounds:g.bounds,pointers};gesture.current=undefined;}
      event.currentTarget.setPointerCapture(event.pointerId);return;
    }
    if(event.button!==0||gesture.current||!host.current)return;
    event.preventDefault();event.stopPropagation();event.currentTarget.focus({preventScroll:true});
    gesture.current={id:event.pointerId,resize,x:event.clientX,y:event.clientY,start:{...value},bounds:host.current.getBoundingClientRect()};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move=(event:PointerEvent<HTMLButtonElement>)=>{
    // Handle pinch gesture
    if(pinch.current){
      pinch.current.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      const currentDist=pointerDist(pinch.current);
      const scaleFactor=(currentDist/pinch.current.startDist-1)*pinch.current.start.size;
      onChange(resizePlacement(pinch.current.start,scaleFactor));return;
    }
    const g=gesture.current;if(!g||event.pointerId!==g.id)return;
    const delta=previewDelta(event.clientX-g.x,event.clientY-g.y,g.bounds);
    delta.x/=scale;
    onChange(g.resize?resizePlacement(g.start,(delta.x+delta.y)/2):movePlacement(g.start,delta.x,delta.y));
  };
  const end=(event:PointerEvent<HTMLButtonElement>,cancel=false)=>{
    if(pinch.current&&pinch.current.ids.includes(event.pointerId)){
      if(cancel)onChange(pinch.current.start);
      pinch.current=undefined;gesture.current=undefined;
      if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);return;
    }
    const g=gesture.current;if(!g||g.id!==event.pointerId)return;
    if(cancel)onChange(g.start);else move(event);
    gesture.current=undefined;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const key=(event:KeyboardEvent<HTMLButtonElement>,resize:boolean)=>{
    const next=keyboardPlacement(value,event.key,resize,event.shiftKey);
    if(next){event.preventDefault();onChange(next);}
  };
  const handlers={onPointerMove:move,onPointerUp:(e:PointerEvent<HTMLButtonElement>)=>end(e),onPointerCancel:(e:PointerEvent<HTMLButtonElement>)=>end(e,true),onLostPointerCapture:()=>{gesture.current=undefined;pinch.current=undefined;}};
  return <div ref={host} className="kl-route-placement">
    <span id={help} className="sr-only">Drag to position the route. Pinch to resize. Drag the corner to resize. Keyboard: arrow keys adjust, Shift moves faster, Home resets.</span>
    <button type="button" className="kl-route-move" aria-label="Move route on photo" aria-describedby={help}
      style={{left:`${rect.left/STORY_WIDTH*100}%`,top:`${rect.top/height*100}%`,width:`${rect.width/STORY_WIDTH*100}%`,height:`${rect.height/height*100}%`}}
      onPointerDown={e=>begin(e,false)} onKeyDown={e=>key(e,false)} {...handlers}><span><Move size={13}/>Drag route</span></button>
    <button type="button" className="kl-route-resize" aria-label="Resize route on photo" aria-describedby={help}
      style={{left:`${(rect.left+rect.width)/STORY_WIDTH*100}%`,top:`${(rect.top+rect.height)/height*100}%`}}
      onPointerDown={e=>begin(e,true)} onKeyDown={e=>key(e,true)} {...handlers}><MoveDiagonal2 size={18}/></button>
  </div>;
}
