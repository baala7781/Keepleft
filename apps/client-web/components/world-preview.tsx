'use client';
import {useEffect,useRef,useState} from 'react';
import {ActivityRuntime} from '@/lib/tracking/activity';
import {ReplayRuntime} from '@/lib/tracking/replay';
import type {SavedActivity} from '@/lib/tracking/storage';
import {neutralCamera,type CameraControls} from '@/lib/renderer/camera';
import {mapStyle} from '@/lib/geodata/map-style';
import {neighborhoodFor} from '@/lib/geodata/osm';
import type {NeighborhoodWorld} from '@/lib/geodata/service';
import {isAndroid} from '@/lib/native/bridge';
import manifest from '@/public/fixtures/madhyamaheshwar/manifest.json';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {RoutePortrait} from './route-portrait';
import type {Map as MapLibreMap} from 'maplibre-gl';
import {fixtureShowcase} from '@/lib/geodata/fixture-showcase';
import {useWorldTheme} from '@/hooks/use-world-theme';

/** One demand-rendered WebGL world; poster copies add no additional GPU contexts. */
export function WorldPreview({activity,onPoster}:{activity?:SavedActivity;onPoster?:(url:string)=>void}) {
  const host=useRef<HTMLDivElement>(null),posterCallback=useRef(onPoster);posterCallback.current=onPoster;
  const [status,setStatus]=useState('Loading the miniature…'),[failed,setFailed]=useState(false);
  const [theme]=useWorldTheme();
  const themeRef=useRef(theme);themeRef.current=theme;
  const live=useRef<{map:MapLibreMap;controls:CameraControls}|undefined>(undefined);
  useEffect(()=>{
    if(!live.current)return;
    const {map,controls}=live.current;controls.worldTheme=theme;
    map.once('idle',()=>{try{posterCallback.current?.(map.getCanvas().toDataURL('image/webp',.85));}catch{/* Optional poster. */}});
    map.triggerRepaint();
  },[theme]);
  useEffect(()=>{
    const abort=new AbortController();let map:MapLibreMap|undefined;
    let source:ActivityRuntime|ReplayRuntime;
    setFailed(false);setStatus('Loading the miniature…');
    void (async()=>{
      try{
        source=activity?new ReplayRuntime(activity):new ActivityRuntime();
        if(source instanceof ReplayRuntime)source.seek(source.durationMs);
        const [{Map,MercatorCoordinate,setWorkerUrl},world]=await Promise.all([import('maplibre-gl'),import('@/lib/renderer/world')]);
        let nearby:NeighborhoodWorld|null=null;
        if(activity&&activity.source!=='demo'){
          const position=source.getMapPosition();if(!position)throw new Error();
          const area=neighborhoodFor(position);
          nearby=isAndroid()?await import('@/lib/native/maps').then(m=>m.loadAndroidNeighborhood(area.x,area.y,abort.signal)):await fetch('/api/world?x='+area.x+'&y='+area.y,{signal:abort.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json();});
        }
        const data=world.validateWorld(nearby?.data||await fetch('/fixtures/madhyamaheshwar/world.geojson',{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}));
        if(abort.signal.aborted||!host.current)return;
        setWorkerUrl(mapWorkerUrl);
        const origin=nearby?.origin||manifest.origin;
        const point=activity?(source.getMotion()||origin):fixtureShowcase(data);
        map=new Map({container:host.current,center:point,zoom:15.6,pitch:54,bearing:-28,interactive:false,
          pixelRatio:Math.min(window.devicePixelRatio||1,1.5),
          canvasContextAttributes:{antialias:true,preserveDrawingBuffer:true},attributionControl:{compact:true},
          style:mapStyle(window.location.origin,nearby,data)});
        const controls:CameraControls={mode:'free',reducedMotion:true,revision:0,gesturing:true,selected:false,adjustment:neutralCamera(),quality:'balanced',staticScene:true,alignRoads:true,worldTheme:themeRef.current};
        live.current={map,controls};
        map.once('load',()=>{
          if(abort.signal.aborted||!map)return;
          map.setLayoutProperty('place-names','visibility','none');
          map.addLayer(world.createWorldLayer(source,MercatorCoordinate,data,controls,()=>{},origin),'place-names');
          map.once('idle',()=>{
            if(abort.signal.aborted||!map)return;
            setStatus(activity?'':'Madmaheshwar · demo world');
            try{posterCallback.current?.(map.getCanvas().toDataURL('image/webp',.85));}catch{/* An unavailable poster does not prevent replay. */}
          });
          map.triggerRepaint();
        });
      }catch{
        if(!abort.signal.aborted){setFailed(true);setStatus(activity?'Map unavailable · your recorded route is shown':'Miniature unavailable. Open the world to retry.');}
      }
    })();
    return()=>{abort.abort();live.current=undefined;map?.remove();source?.dispose();};
  },[activity]);
  return <><div ref={host} className="kl-world-preview" aria-label={activity?'Miniature around your saved run':'Madmaheshwar demo miniature'}/>
    {failed&&activity&&<div className="kl-world-preview-fallback"><RoutePortrait samples={activity.samples}/></div>}
    {status&&<span className="kl-world-preview-status" role="status">{status}</span>}
  </>;
}
