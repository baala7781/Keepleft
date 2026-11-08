'use client';
import {useEffect,useId,useRef,type PointerEvent,type KeyboardEvent} from 'react';
import {keyboardPlacement,movePlacement,previewDelta,resizePlacement,STORY_HEIGHT,STORY_WIDTH,type RoutePlacement} from '@/lib/story/placement';
import {presetPlacementRect,STORY_PRESETS,type StoryPreset} from '@/lib/story/presets';

type DragMode='move'|'resize-br'|'rotate';
type Gesture={id:number;mode:DragMode;x:number;y:number;start:RoutePlacement;bounds:DOMRect;center:{x:number;y:number}};
type Pinch={ids:[number,number];startDist:number;startAngle:number;start:RoutePlacement;bounds:DOMRect;pointers:Map<number,{x:number;y:number}>};
const pointerDist=(p:Pinch)=>{const a=p.pointers.get(p.ids[0]),b=p.pointers.get(p.ids[1]);return a&&b?Math.hypot(a.x-b.x,a.y-b.y):p.startDist;};
const pointerAngle=(p:Pinch)=>{const a=p.pointers.get(p.ids[0]),b=p.pointers.get(p.ids[1]);return a&&b?Math.atan2(b.y-a.y,b.x-a.x):p.startAngle;};

export function StoryPlacementControls({value,onChange,preset='story',aspectRatio=1}:{value:RoutePlacement;onChange:(value:RoutePlacement)=>void;preset?:StoryPreset;aspectRatio?:number}){
  const host=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|undefined>(undefined),pinch=useRef<Pinch|undefined>(undefined),help=useId();
  const valueRef=useRef(value);useEffect(()=>{valueRef.current=value;},[value]);
  const rect=presetPlacementRect(value,preset,aspectRatio),height=STORY_PRESETS[preset].height,scale=height/STORY_HEIGHT;

  const begin=(event:PointerEvent<HTMLElement>,mode:DragMode='move')=>{
    // If a second pointer arrives during an interaction, upgrade to pinch-to-resize/rotate
    if(gesture.current&&!pinch.current&&event.pointerId!==gesture.current.id&&host.current){
      const g=gesture.current;
      const pointers=new Map<number,{x:number;y:number}>();
      pointers.set(g.id,{x:g.x,y:g.y});pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      const a=pointers.get(g.id)!,b=pointers.get(event.pointerId)!;
      const startDist=Math.hypot(a.x-b.x,a.y-b.y);
      const startAngle=Math.atan2(b.y-a.y,b.x-a.x);
      if(startDist>10){pinch.current={ids:[g.id,event.pointerId],startDist,startAngle,start:{...valueRef.current},bounds:g.bounds,pointers};gesture.current=undefined;}
      event.currentTarget.setPointerCapture(event.pointerId);return;
    }
    if(event.button!==0||gesture.current||!host.current)return;
    event.preventDefault();event.stopPropagation();
    const bounds=host.current.getBoundingClientRect();
    const centerScreenX=bounds.left+(rect.left+rect.width/2)*(bounds.width/STORY_WIDTH);
    const centerScreenY=bounds.top+(rect.top+rect.height/2)*(bounds.height/height);
    gesture.current={id:event.pointerId,mode,x:event.clientX,y:event.clientY,start:{...value},bounds,center:{x:centerScreenX,y:centerScreenY}};
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move=(event:PointerEvent<HTMLElement>)=>{
    // Handle pinch gesture (resize & free rotate)
    if(pinch.current){
      pinch.current.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      const currentDist=pointerDist(pinch.current);
      const scaleFactor=(currentDist/pinch.current.startDist-1)*pinch.current.start.size;
      const currentAngle=pointerAngle(pinch.current);
      const angleDelta=(currentAngle-pinch.current.startAngle)*180/Math.PI;
      const resized=resizePlacement(pinch.current.start,scaleFactor);
      onChange(rotatePlacement(resized,angleDelta));return;
    }
    const g=gesture.current;if(!g||event.pointerId!==g.id)return;
    if(g.mode==='rotate'){
      const currentAngle=Math.atan2(event.clientY-g.center.y,event.clientX-g.center.x);
      const startAngle=Math.atan2(g.y-g.center.y,g.x-g.center.x);
      const deltaDeg=(currentAngle-startAngle)*180/Math.PI;
      onChange(rotatePlacement(g.start,deltaDeg));
      return;
    }
    if(g.mode==='resize-br'){
      const startDist=Math.hypot(g.x-g.center.x,g.y-g.center.y);
      const currentDist=Math.hypot(event.clientX-g.center.x,event.clientY-g.center.y);
      const delta=(currentDist-startDist)*2*(STORY_WIDTH/g.bounds.width)/scale;
      onChange(resizePlacement(g.start,delta));
      return;
    }
    const delta=previewDelta(event.clientX-g.x,event.clientY-g.y,g.bounds);
    delta.x/=scale;
    onChange(movePlacement(g.start,delta.x,delta.y));
  };

  const end=(event:PointerEvent<HTMLElement>,cancel=false)=>{
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

  const key=(event:KeyboardEvent<HTMLElement>)=>{
    const next=keyboardPlacement(value,event.key,false,event.shiftKey);
    if(next){event.preventDefault();onChange(next);}
  };

  const sharedHandlers={
    onPointerMove:move,
    onPointerUp:(e:PointerEvent<HTMLElement>)=>end(e),
    onPointerCancel:(e:PointerEvent<HTMLElement>)=>end(e,true),
    onLostPointerCapture:()=>{gesture.current=undefined;pinch.current=undefined;}
  };

  return <div ref={host} className="kl-route-placement">
    <span id={help} className="sr-only">Drag to position the route. Drag corner to resize. Pinch with two fingers to resize. Keyboard: arrow keys adjust, Shift moves faster, Home resets.</span>
    <div
      tabIndex={0}
      role="region"
      className="kl-route-move"
      aria-label="Route sticker frame. Drag to move, grab corner to resize, top stalk to rotate"
      aria-describedby={help}
      style={{
        left:`${rect.left/STORY_WIDTH*100}%`,
        top:`${rect.top/height*100}%`,
        width:`${rect.width/STORY_WIDTH*100}%`,
        height:`${rect.height/height*100}%`,
        transform: value.rotation ? `rotate(${value.rotation}deg)` : undefined,
        transformOrigin: 'center center'
      }}
      onPointerDown={(e)=>begin(e,'move')}
      {...sharedHandlers}
      onKeyDown={key}
    >
      {/* Top Rotation Stalk & Handle */}
      <div className="kl-placement-rotate-stalk" aria-hidden="true"/>
      <button
        type="button"
        className="kl-placement-rotate-handle"
        aria-label="Rotate route freely"
        title="Drag to rotate route freely"
        onPointerDown={(e)=>begin(e,'rotate')}
        {...sharedHandlers}
      />

      {/* Visual Anchor Corners */}
      <span className="kl-placement-corner kl-corner-tl" aria-hidden="true"/>
      <span className="kl-placement-corner kl-corner-tr" aria-hidden="true"/>
      <span className="kl-placement-corner kl-corner-bl" aria-hidden="true"/>

      {/* Interactive Bottom-Right Resize Handle */}
      <button
        type="button"
        className="kl-placement-corner kl-corner-br kl-resize-handle"
        aria-label="Resize route sticker"
        title="Drag to resize route"
        onPointerDown={(e)=>begin(e,'resize-br')}
        {...sharedHandlers}
      />
    </div>
  </div>;
}
