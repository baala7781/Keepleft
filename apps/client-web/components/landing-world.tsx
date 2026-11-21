'use client';
import {useEffect,useRef,type RefObject} from 'react';
import type {Map as MapLibreMap} from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import manifest from '@/public/fixtures/hussain-sagar/manifest.json';
import {mapStyle} from '@/lib/geodata/map-style';
import {neutralCamera,type CameraControls} from '@/lib/renderer/camera';
import {renderPixelRatio} from '@/lib/renderer/quality-budget';
import {ReplayRuntime} from '@/lib/tracking/replay';
import {assemblyAt,cameraKeys,demoActivity,routeAt,sampleKeys,windowWeight} from '@/lib/landing/story-camera';

export type WorldFrame={elapsedMs:number;distanceM:number;durationMs:number;progress:number};
export type WorldView='aerial'|'street';
export type LandingWorldApi={focus(place:{lng:number;lat:number}|null):void;view(kind:WorldView):void;zoom(delta:number):void;reset():void};
type Props={
  story:RefObject<number>;
  apiRef:RefObject<LandingWorldApi|null>;
  onFrame?:(frame:WorldFrame)=>void;onStatus?:(status:'ready'|'failed')=>void;
  onHover?:(label:{name:string;x:number;y:number}|null)=>void;
};

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

/**
 * The landing page's single WebGL world: the app's own MapLibre + Three.js
 * layer over the bundled Hussain Sagar OSM fixture and a public demo route.
 * Scroll position (a ref) drives camera, replay progress and assembly in one
 * rAF loop; React never re-renders per frame.
 */
export function LandingWorld({story,apiRef,onFrame,onStatus,onHover}:Props){
  const host=useRef<HTMLDivElement>(null);
  const callbacks=useRef({onFrame,onStatus,onHover});
  useEffect(()=>{callbacks.current={onFrame,onStatus,onHover};});
  useEffect(()=>{
    const element=host.current;if(!element)return;
    const abort=new AbortController();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse=window.matchMedia('(pointer: coarse)').matches;
    const quality:CameraControls['quality']=coarse||(navigator.hardwareConcurrency||8)<=4?'balanced':'high';
    const runtime=new ReplayRuntime(demoActivity(manifest.route as [number,number][]));
    let map:MapLibreMap|undefined,ready=false,raf=0;
    // User exploration is an offset from the story camera, so scrolling eases back to the story.
    const adj={lng:0,lat:0,zoom:0,pitch:0,bearing:0};
    let focus:{lng:number;lat:number}|null=null,focusWeight=0;
    const parallax={x:0,y:0,tx:0,ty:0};
    const pointers=new Map<number,{x:number;y:number}>();let pinch=0,dragging=false,lastInput=0;
    apiRef.current={
      focus(place){focus=place;lastInput=performance.now();},
      view(kind){Object.assign(adj,kind==='aerial'?{zoom:-.7,pitch:-30}:{zoom:1.35,pitch:14});lastInput=performance.now();},
      zoom(delta){adj.zoom=clamp(adj.zoom+delta,-2,2.6);lastInput=performance.now();},
      reset(){Object.assign(adj,{lng:0,lat:0,zoom:0,pitch:0,bearing:0});focus=null;},
    };
    const controls:CameraControls={mode:'free',reducedMotion:reduced,revision:0,gesturing:true,selected:false,adjustment:neutralCamera(),
      quality,staticScene:true,alignRoads:true,worldTheme:'night',hideAthlete:true,assembly:assemblyAt(story.current??0)};

    const onPointerDown=(e:PointerEvent)=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});element.setPointerCapture(e.pointerId);
      dragging=true;pinch=0;callbacks.current.onHover?.(null);
    };
    const onPointerMove=(e:PointerEvent)=>{
      const previous=pointers.get(e.pointerId);
      if(!previous){if(e.pointerType==='mouse')hover(e);return;}
      const dx=e.clientX-previous.x,dy=e.clientY-previous.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});lastInput=performance.now();
      if(pointers.size===1){adj.bearing-=dx*.28;adj.pitch=clamp(adj.pitch-dy*.18,-50,22);return;}
      const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);
      if(pinch)adj.zoom=clamp(adj.zoom+Math.log2(distance/pinch),-2,2.6);pinch=distance;
    };
    const onPointerUp=(e:PointerEvent)=>{pointers.delete(e.pointerId);pinch=0;if(!pointers.size)dragging=false;};
    // Plain wheel scrolls the page (the story). Trackpad pinch / ctrl+wheel zooms the world.
    const onWheel=(e:WheelEvent)=>{if(!e.ctrlKey)return;e.preventDefault();adj.zoom=clamp(adj.zoom-e.deltaY*.012,-2,2.6);lastInput=performance.now();};
    const onWindowPointer=(e:PointerEvent)=>{if(e.pointerType!=='mouse')return;parallax.tx=e.clientX/window.innerWidth*2-1;parallax.ty=e.clientY/window.innerHeight*2-1;};
    let hoverAt=0;
    const hover=(e:PointerEvent)=>{
      const now=performance.now();if(!map||!ready||now-hoverAt<60)return;hoverAt=now;
      const box=element.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top;
      const hit=map.queryRenderedFeatures([x,y],{layers:['water','parks']}).find(f=>typeof f.properties?.name==='string'&&f.properties.name.trim());
      callbacks.current.onHover?.(hit?{name:String(hit.properties.name),x:e.clientX,y:e.clientY}:null);
    };
    const onLeave=()=>callbacks.current.onHover?.(null);
    element.addEventListener('pointerdown',onPointerDown);element.addEventListener('pointermove',onPointerMove);
    element.addEventListener('pointerup',onPointerUp);element.addEventListener('pointercancel',onPointerUp);
    element.addEventListener('pointerleave',onLeave);element.addEventListener('wheel',onWheel,{passive:false});
    if(!coarse&&!reduced)window.addEventListener('pointermove',onWindowPointer,{passive:true});

    let shown=story.current??0,last=0,lastSeek=-1,lastLabels:boolean|undefined,lastCamera='',lastAssembly='';
    const tick=(now:number)=>{
      raf=requestAnimationFrame(tick);
      if(!map||!ready)return;
      const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
      const target=story.current??0,previous=shown;
      shown=reduced?target:shown+(target-shown)*(1-Math.exp(-dt*7));
      if(Math.abs(target-shown)<1e-4)shown=target;
      const ds=Math.abs(shown-previous);let dirty=false;
      const seek=routeAt(shown)*runtime.durationMs;
      if(Math.abs(seek-lastSeek)>.5){runtime.seek(seek);lastSeek=seek;dirty=true;}
      const assembly=assemblyAt(shown),assemblyKey=`${assembly.buildings.toFixed(3)}:${assembly.trees.toFixed(3)}`;
      if(assemblyKey!==lastAssembly){controls.assembly=assembly;lastAssembly=assemblyKey;dirty=true;}
      const pose=sampleKeys(cameraKeys,shown);
      let lng=pose.lng,lat=pose.lat;
      if(pose.follow>0){const lead=runtime.getMotion(true);if(lead){lng+=(lead.lng-lng)*pose.follow;lat+=(lead.lat-lat)*pose.follow;}}
      const inExplore=windowWeight(shown,3,4,.15),free=inExplore>.5;
      // Leaving the explore window (or scrolling) hands the camera back to the story.
      if(!dragging&&!free){const k=Math.exp(-(ds*7+(now-lastInput>2500?dt*.6:0)));adj.lng*=k;adj.lat*=k;adj.zoom*=k;adj.pitch*=k;adj.bearing*=k;if(ds>.02)focus=null;}
      focusWeight+=((focus&&free?1:0)-focusWeight)*(reduced?1:1-Math.exp(-dt*3));
      if(focus&&focusWeight>.001){lng+=(focus.lng-lng)*focusWeight;lat+=(focus.lat-lat)*focusWeight;}
      parallax.x+=(parallax.tx-parallax.x)*(1-Math.exp(-dt*3));parallax.y+=(parallax.ty-parallax.y)*(1-Math.exp(-dt*3));
      const idle=reduced?0:Math.sin(now/1000*.09)*7*(windowWeight(shown,0,.9,.2)+windowWeight(shown,5.1,6,.2));
      // Keep the focus point clear of the text: right of the column on desktop, above the panel on phones.
      const narrow=window.innerWidth<=820;
      const padding=narrow?{top:0,right:0,left:0,bottom:Math.round(window.innerHeight*.4)}:{top:0,bottom:0,right:0,left:Math.round(window.innerWidth*.32*windowWeight(shown,.85,4.95,.35))};
      const camera={padding,center:[lng+adj.lng,lat+adj.lat] as [number,number],zoom:clamp(pose.zoom+adj.zoom+focusWeight*.55,14,19.5),
        pitch:clamp(pose.pitch+adj.pitch-parallax.y*1.6,0,82),bearing:pose.bearing+adj.bearing+idle+parallax.x*2.4};
      const key=`${padding.left}:${padding.bottom}:${camera.center[0].toFixed(7)}:${camera.center[1].toFixed(7)}:${camera.zoom.toFixed(4)}:${camera.pitch.toFixed(3)}:${camera.bearing.toFixed(3)}`;
      if(key!==lastCamera){map.jumpTo(camera);lastCamera=key;dirty=true;}
      const labels=inExplore>.5;
      if(labels!==lastLabels){map.setLayoutProperty('place-names','visibility',labels?'visible':'none');lastLabels=labels;}
      if(dirty){
        map.triggerRepaint();
        const snapshot=runtime.getSnapshot();
        callbacks.current.onFrame?.({elapsedMs:snapshot.elapsedMs,distanceM:snapshot.distanceM,durationMs:runtime.durationMs,progress:snapshot.progress});
      }
    };

    void (async()=>{
      try{
        const [{Map,MercatorCoordinate,setWorkerUrl},world,raw]=await Promise.all([
          import('maplibre-gl'),import('@/lib/renderer/world'),
          fetch('/fixtures/hussain-sagar/world.geojson',{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('world');return r.json();})]);
        if(abort.signal.aborted)return;
        const data=world.validateWorld(raw);
        setWorkerUrl(mapWorkerUrl);
        const start=sampleKeys(cameraKeys,story.current??0);
        map=new Map({container:element,center:[start.lng,start.lat],zoom:start.zoom,pitch:start.pitch,bearing:start.bearing,
          interactive:false,maxPitch:85,pixelRatio:renderPixelRatio(quality,window.devicePixelRatio,false),
          canvasContextAttributes:{antialias:true},attributionControl:{compact:true},
          style:mapStyle(window.location.origin,null,data)});
        map.once('load',()=>{
          if(abort.signal.aborted||!map)return;
          try{map.setSky({'sky-color':'#17161d','horizon-color':'#3b2a33','fog-color':'#121317','sky-horizon-blend':.55,'horizon-fog-blend':.7,'fog-ground-blend':.55,'atmosphere-blend':0});}catch{/* Sky is decorative. */}
          map.setLayoutProperty('place-names','visibility','none');lastLabels=false;
          map.addLayer(world.createWorldLayer(runtime,MercatorCoordinate,data,controls,()=>{},manifest.origin),'place-names');
          ready=true;map.triggerRepaint();
          map.once('idle',()=>{if(!abort.signal.aborted)callbacks.current.onStatus?.('ready');});
        });
        map.on('error',()=>{/* Tile or style errors are non-fatal for the bundled world. */});
        raf=requestAnimationFrame(tick);
      }catch{if(!abort.signal.aborted)callbacks.current.onStatus?.('failed');}
    })();
    return()=>{
      abort.abort();cancelAnimationFrame(raf);apiRef.current=null;
      element.removeEventListener('pointerdown',onPointerDown);element.removeEventListener('pointermove',onPointerMove);
      element.removeEventListener('pointerup',onPointerUp);element.removeEventListener('pointercancel',onPointerUp);
      element.removeEventListener('pointerleave',onLeave);element.removeEventListener('wheel',onWheel);
      window.removeEventListener('pointermove',onWindowPointer);
      map?.remove();runtime.dispose();
    };
  // One world for the page's lifetime; every input arrives through a stable ref.
  },[apiRef,story]);
  return <div ref={host} className="yl-world" aria-label="Interactive 3D miniature of Hussain Sagar, Hyderabad, built from OpenStreetMap data"/>;
}
