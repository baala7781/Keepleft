import {useEffect, type RefObject} from 'react';

/** Animate measured layout changes without rerendering or involving the map loop. */
export function useDockMotion(ref: RefObject<HTMLDivElement|null>) {
  useEffect(() => {
    const dock=ref.current, content=dock?.firstElementChild;
    if(!dock||!content||typeof ResizeObserver==='undefined')return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const border=dock.getBoundingClientRect().height-content.getBoundingClientRect().height;
    let previous=content.getBoundingClientRect().height+border;
    const shell=dock.parentElement;
    const reserve=(height:number)=>shell?.style.setProperty('--activity-dock-height',`${height}px`);
    reserve(previous);
    let animation:Animation|undefined;
    const observer=new ResizeObserver(()=>{
      const next=content.getBoundingClientRect().height+border;
      reserve(next);
      if(Math.abs(previous-next)<1)return;
      const from=animation?dock.getBoundingClientRect().height:previous;
      animation?.cancel();
      if(!reduced.matches&&typeof dock.animate==='function'){
        // Sample a critically damped spring once. The browser owns playback.
        const keyframes=Array.from({length:25},(_,i)=>{
          const t=i/24, response=1-(1+8*t)*Math.exp(-8*t);
          const settled=response/(1-9*Math.exp(-8));
          return {height:(from+(next-from)*settled)+'px',offset:t};
        });
        animation=dock.animate(keyframes,{duration:320,easing:'linear'});
        animation.onfinish=()=>{animation=undefined;};
      }
      previous=next;
    });
    observer.observe(content);
    const stop=()=>{if(reduced.matches)animation?.cancel();};
    reduced.addEventListener('change',stop);
    return()=>{observer.disconnect();animation?.cancel();shell?.style.removeProperty('--activity-dock-height');reduced.removeEventListener('change',stop);};
  },[ref]);
}
