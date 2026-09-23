'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,LocateFixed} from 'lucide-react';
import type {CameraMode} from '@/lib/renderer/world';

export const cameraChoices:{mode:CameraMode;label:string;description:string}[]=[
  {mode:'orbit',label:'Aerial',description:'Circle the world'},
  {mode:'follow',label:'Follow',description:'Keep the runner in view'},
  {mode:'free',label:'Explore',description:'Leave the camera where you place it'},
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
      aria-expanded={open} aria-controls="kl-camera-choices" onClick={()=>setOpen(value=>!value)}><LocateFixed size={18}/><span>{cameraChoices.find(choice=>choice.mode===mode)?.label}</span><ChevronDown size={16}/></button>
    {open&&<fieldset className="kl-camera-choices" id="kl-camera-choices">
      <legend className="kl-settings-eyebrow">Camera views</legend>
      {choices.map(choice=><button type="button" key={choice.mode} aria-pressed={mode===choice.mode}
        onClick={()=>{onSelect(choice.mode);setOpen(false);trigger.current?.focus();}}><span>{choice.label}<small>{choice.description}</small></span><i aria-hidden="true"/></button>)}
    </fieldset>}
  </div>;
}
