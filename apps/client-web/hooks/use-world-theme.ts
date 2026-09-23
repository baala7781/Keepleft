'use client';
import {useEffect,useState} from 'react';
import {parseWorldTheme,type WorldTheme} from '@/lib/renderer/world-theme';
const key='keepleft-world-lighting';
const event='keepleft-world-lighting-change';
export function useWorldTheme(){
  const [theme,setTheme]=useState<WorldTheme>('day');
  useEffect(()=>{
    const sync=(value:string|null)=>setTheme(parseWorldTheme(value));
    const local=(e:Event)=>sync((e as CustomEvent<string>).detail);
    const storage=(e:StorageEvent)=>{if(e.key===key)sync(e.newValue);};
    try{sync(localStorage.getItem(key));}catch{/* Rendering still works without preference storage. */}
    window.addEventListener(event,local);window.addEventListener('storage',storage);
    return()=>{window.removeEventListener(event,local);window.removeEventListener('storage',storage);};
  },[]);
  const change=(value:WorldTheme)=>{setTheme(value);try{localStorage.setItem(key,value);window.dispatchEvent(new CustomEvent(event,{detail:value}));}catch{/* Session-only preference. */}};
  return [theme,change] as const;
}
