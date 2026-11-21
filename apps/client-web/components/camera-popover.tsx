'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,Video} from 'lucide-react';
import type {CameraMode} from '@/lib/renderer/world';

/** One name per camera everywhere: run screen, replay rail, settings and Create post. */
export const cameraChoices:{mode:CameraMode;label:string;description:string}[]=[
  {mode:'follow',label:'Follow',description:'Stays behind you as you move'},
  {mode:'orbit',label:'Orbit',description:'Slowly circles your position'},
  {mode:'free',label:'Overview',description:'Free camera that stays where you leave it'},
];

export function CameraPopover({mode,onSelect,hideChase=false}:{mode:CameraMode;onSelect:(mode:CameraMode)=>void;hideChase?:boolean}){
  const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  const choices=hideChase?cameraChoices.filter(choice=>choice.mode!=='chase'):cameraChoices;
  const current=choices.find(choice=>choice.mode===mode)||choices[0];
  return <div className="kl-camera-popover" ref={root}>
    <button ref={trigger} className="kl-camera-trigger" type="button" aria-label={`Camera view: ${current.label}`}
      aria-expanded={open} aria-controls="kl-camera-choices" onClick={()=>setOpen(value=>!value)}><Video size={18}/><span>{current.label}</span><ChevronDown size={16}/></button>
    {open&&<fieldset className="kl-camera-choices" id="kl-camera-choices">
      <legend className="kl-settings-eyebrow">Camera views</legend>
      {choices.map(choice=><button type="button" key={choice.mode} aria-pressed={mode===choice.mode}
        onClick={()=>{onSelect(choice.mode);setOpen(false);trigger.current?.focus();}}><span>{choice.label}<small>{choice.description}</small></span><i aria-hidden="true"/></button>)}
    </fieldset>}
  </div>;
}
