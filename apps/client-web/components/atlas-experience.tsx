'use client';
import { Button } from '@/components/ui/button';
import { Pause, Play, RotateCcw, RotateCw, Square, LocateFixed, Download, Plus, Minus, ChevronUp, ChevronDown, ChevronLeft, SlidersHorizontal, ArrowUpLeft, X, Share2, BookOpen, House, Navigation2, MapPin, Clock3, Gauge, Orbit, Mountain, Footprints, Bike, PersonStanding, Sun, Moon, OctagonX } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {ActivityLibrary,downloadRoute} from './activity-library';
import {CameraPopover,cameraChoices} from './camera-popover';
import {DeveloperDiagnostics} from './developer-diagnostics';
import type { Map as MapLibreMap,GeoJSONSource } from 'maplibre-gl';
import { ActivityRuntime, initialSnapshot } from '@/lib/tracking/activity';
import { type CameraMode, type Diagnostics,type StreamingWorldLayer } from '@/lib/renderer/world';
import manifest from '@/public/fixtures/madhyamaheshwar/manifest.json';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {baseCamera,trackingAdjustment,selectedCameraAdjustment,neutralCamera,CameraGestureGuard,type CameraControls} from '@/lib/renderer/camera';
import {useNeighborhood} from '@/lib/geodata/use-neighborhood';
import {mapStyle} from '@/lib/geodata/map-style';
import {ReplayRuntime} from '@/lib/tracking/replay';
import {demoReplayRecord} from '@/lib/tracking/demo-replay';
import type {SavedActivity} from '@/lib/tracking/storage';
import {ReplayControls} from './replay-controls';
import {ActivityRecovery} from './activity-recovery';
import {worldCoverage} from '@/lib/geodata/osm';
import {namedPlaces} from '@/lib/geodata/labels';
import {roadContext} from '@/lib/geodata/roads';
import {displayPlace} from '@/lib/geodata/display-place';
import type {ActivityType} from '@/lib/tracking/location';
const StoryStudio=lazy(()=>import('./story-studio').then(module=>({default:module.StoryStudio})));
import {createActivityRuntime} from '@/lib/native/platform';
import {dragAngle} from '@/lib/renderer/touch-angle';
import {useDockMotion} from '@/hooks/use-dock-motion';
import {fixtureShowcase} from '@/lib/geodata/fixture-showcase';
import {useWorldTheme} from '@/hooks/use-world-theme';
import {parseWorldTheme} from '@/lib/renderer/world-theme';
import {renderPixelRatio} from '@/lib/renderer/quality-budget';
import {sameWorld} from '@/lib/geodata/same-world';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {isAndroid} from '@/lib/native/bridge';
export { ActivityRuntime } from '@/lib/tracking/activity';

function formatDuration(ms:number) {
  const seconds=Math.floor(ms/1000);
  return `${Math.floor(seconds/60)}:${(seconds%60).toString().padStart(2,'0')}`;
}
export function AtlasExperience({onHome,initialActivity}: {onHome?:()=>void;initialActivity?:SavedActivity} = {}) {
  const host=useRef<HTMLDivElement>(null);
  const renderedWorld=useRef<import('@/lib/geodata/osm').WorldData|null>(null);
  const dock=useRef<HTMLDivElement>(null);
  const initialReplayOpened=useRef(false);
  useDockMotion(dock);
  const runtime=useRef<ActivityRuntime>(null!);
  if(!runtime.current)runtime.current=createActivityRuntime();
  const [angleDrag,setAngleDrag]=useState(false);
  const angleDragRef=useRef(false);
  const [replay,setReplay]=useState<ReplayRuntime|null>(null);
  const [replayActivity,setReplayActivity]=useState<SavedActivity|null>(null);
  const replayRef=useRef<ReplayRuntime|null>(null);replayRef.current=replay;
  const activeRuntime=replay||runtime.current;
  const [activityType,setActivityType]=useState<ActivityType>(runtime.current.activityType);
  const [activityPrompt,setActivityPrompt]=useState(false);
  const {world:nearbyWorld,status:mapStatus,retryMap}=useNeighborhood(activeRuntime,replay?.activityType||activityType,replayActivity?.samples);
  const worldRef=useRef(nearbyWorld);worldRef.current=nearbyWorld;
  const coverage=useMemo(()=>nearbyWorld&&!nearbyWorld.placeholder?worldCoverage(nearbyWorld.data):null,[nearbyWorld]);
  const mapRef=useRef<MapLibreMap | null>(null);
  const worldLayerRef=useRef<StreamingWorldLayer|null>(null);
  const controls=useRef<CameraControls>({mode:'orbit',reducedMotion:false,revision:0,gesturing:false,selected:false,adjustment:neutralCamera(),quality:'balanced'});
  const [quality,setQuality]=useState<CameraControls['quality']>('balanced');
  const [worldTheme,setWorldTheme]=useWorldTheme();
  useEffect(()=>{controls.current.worldTheme=worldTheme;mapRef.current?.triggerRepaint();},[worldTheme]);
  const [mode,setMode]=useState<CameraMode>('orbit');
  const [snapshot,setSnapshot]=useState(initialSnapshot);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const [mapRevision,reloadMap]=useState(0);
  const [optionsOpen,setOptionsOpen]=useState(false);
  const [settingsPage,setSettingsPage]=useState<'main'|'camera'|'lighting'|'graphics'|'activities'|'recovery'|'developer'>('main');
  const devTools=import.meta.env.VITE_ENABLE_DEV_TOOLS==='true';
  const settings=useRef<HTMLElement>(null);
  const settingsTrigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!optionsOpen)return;
    settings.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();if(settingsPage==='main')setOptionsOpen(false);else setSettingsPage('main');}};
    window.addEventListener('keydown',close);
    return()=>{window.removeEventListener('keydown',close);settingsTrigger.current?.focus();};
  },[optionsOpen,settingsPage]);
  const [toolsOpen,setToolsOpen]=useState(false);
  const [gestureHint,setGestureHint]=useState(false);
  useEffect(()=>{try{setGestureHint(window.localStorage.getItem('keepleft-gestures-seen')!=='1');}catch{}},[]);
  const [dockCollapsed,setDockCollapsed]=useState(false);
  const [alignRoads,setAlignRoads]=useState(true);
  const [storyDraft,setStoryDraft]=useState<SavedActivity|null>(null);
  const [storyLoading,setStoryLoading]=useState(false);
  const [locationExplained,setLocationExplained]=useState(()=>{try{return localStorage.getItem('keepleft-location-explained')==='1';}catch{return false;}});
  const [showLocationExplain,setShowLocationExplain]=useState(false);
  useEffect(()=>{controls.current.suspended=!!storyDraft;if(!storyDraft)mapRef.current?.triggerRepaint();},[storyDraft]);
  const [diagnostics,setDiagnostics]=useState<Diagnostics | null>(null);
  const [retained,setRetained]=useState(false);
  const [replayError,setReplayError]=useState('');
  const [recoveryConflict,setRecoveryConflict]=useState(false);
  const [confirmFinish,setConfirmFinish]=useState(false);
  const confirmTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const onRecoveryConflict=useCallback(()=>setRecoveryConflict(true),[]);
  const onSaved=useCallback(()=>{runtime.current.markSaved();setRetained(true);},[]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{
      if(runtime.current.nativeRecording)return;
      const capture=runtime.current.getSnapshot();
      if(runtime.current.source==='gps'&&(capture.status==='recording'||capture.status==='paused'||(capture.status==='complete'&&!retained))){
        event.preventDefault();event.returnValue='';
      }
    };
    window.addEventListener('beforeunload',warn);
    return ()=>window.removeEventListener('beforeunload',warn);
  },[retained]);
  useEffect(()=>{
    const unsubscribe=activeRuntime.subscribe(value=>{
      setSnapshot(value);
      if(activeRuntime===runtime.current&&runtime.current.nativeRecording&&(value.status==='recording'||value.status==='paused'))setActivityType(runtime.current.activityType);
    });
    // Capture simulation advances even when the map is paused or its context is lost.
    const timer=window.setInterval(()=>activeRuntime.update(performance.now()),100);
    return ()=>{unsubscribe();window.clearInterval(timer);};
  },[activeRuntime]);
  useEffect(()=>()=>{runtime.current.dispose();replayRef.current?.dispose();},[]);
  useEffect(()=>{
    if(activeRuntime.source!=='demo'&&!replay?.isDemoReplay&&!nearbyWorld)return;
    setError('');setReady(false);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    controls.current.reducedMotion=reduced.matches;
    const onReduced=()=>{controls.current.reducedMotion=reduced.matches;};
    reduced.addEventListener('change',onReduced);
    const abort=new AbortController();
    let map:MapLibreMap | undefined;
    void Promise.all([
      import('maplibre-gl'),
      import('@/lib/renderer/world'),
      activeRuntime.source!=='demo'&&!replay?.isDemoReplay?Promise.resolve(worldRef.current!.data):fetch('/fixtures/madhyamaheshwar/world.geojson',{signal:abort.signal}).then(r=>{
        if(!r.ok) throw new Error('The local geographic fixture could not be loaded.');
        return r.json();
      }),
    ]).then(([{Map,setWorkerUrl},world,data])=>{
      if(abort.signal.aborted || !host.current) return;
      const fixture=world.validateWorld(data);
      const origin=nearbyWorld?.origin||manifest.origin;
      controls.current.showcaseCenter=nearbyWorld?undefined:fixtureShowcase(fixture);
      // MapLibre 6 needs an explicit, bundled worker entry under Vite.
      setWorkerUrl(mapWorkerUrl);
      map=new Map({
        container:host.current,center:origin,zoom:nearbyWorld?16:14.65,pitch:nearbyWorld?58:67,bearing:-25,
        minZoom:13.5,maxZoom:24,maxPitch:80,...(activeRuntime.source==='demo'||replay?.isDemoReplay?{maxBounds:[[79.19,30.60],[79.25,30.67]] as [[number,number],[number,number]]}:{}),
        canvasContextAttributes:{antialias:true},attributionControl:{compact:true},
        pixelRatio:renderPixelRatio(controls.current.quality,window.devicePixelRatio||1,isAndroid()),
        style:mapStyle(window.location.origin,nearbyWorld,fixture),
      });
      mapRef.current=map;
      // Disabling MapLibre dragPan otherwise restores browser pan-x/pan-y,
      // cancelling our one-finger angle gesture after the touch slop threshold.
      map.getCanvas().style.touchAction='none';
      controls.current.gesturing=false;
      map.touchZoomRotate.enableRotation();
      map.touchPitch.enable();
      if(angleDragRef.current)map.dragPan.disable();
      map.on('error',()=>setError('A local map tile could not load. Refresh to retry.'));
      map.on('style.load',()=>{
        if(!map || abort.signal.aborted) return;
        try {
          void import('maplibre-gl').then(({MercatorCoordinate})=>{
            if(!map || abort.signal.aborted) return;
            const current=worldRef.current?.data||fixture;
            const layer=world.createWorldLayer(activeRuntime,MercatorCoordinate,world.validateWorld(current),controls.current,setDiagnostics,origin);
            worldLayerRef.current=layer;
            renderedWorld.current=nearbyWorld?.data||fixture;
            map.addLayer(layer,'place-names');
            setReady(true);
          }).catch(()=>setError('The 3D renderer could not start. Check WebGL support and refresh.'));
        } catch { setError('The 3D renderer could not start. Check WebGL support and refresh.'); }
      });
      const gesture=new CameraGestureGuard(controls.current,()=>{
        if(!map)return;
        const point={...(controls.current.presentationPosition||activeRuntime.getMotion()||origin),heading:controls.current.presentationHeading??0};
        controls.current.adjustment=trackingAdjustment(controls.current.mode,baseCamera(controls.current.mode,point,origin,map.getCanvas().clientWidth,map.getCanvas().clientHeight),
          {center:map.getCenter(),zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing()});
        controls.current.manualFraming=true;controls.current.resumeAt=performance.now()+900;
      });
      const touches=new globalThis.Map<number,{x:number;y:number}>();
      map.getCanvas().addEventListener('pointerdown',event=>{touches.set(event.pointerId,{x:event.clientX,y:event.clientY});controls.current.angleGesture=angleDragRef.current&&touches.size===1;},{signal:abort.signal});
      map.getCanvas().addEventListener('pointermove',event=>{
        const prior=touches.get(event.pointerId);
        if(prior&&touches.size===1&&angleDragRef.current&&map){
          gesture.begin();map.jumpTo(dragAngle(map.getBearing(),map.getPitch(),event.clientX-prior.x,event.clientY-prior.y));
        }
        if(prior)touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      },{signal:abort.signal});
      const manual=(event:{originalEvent?:unknown})=>{
        if(!event.originalEvent) return;
        gesture.begin();
      };
      map.on('movestart',manual);
      const remember=()=>{
        if(map)gesture.settle(map.isMoving());
      };
      map.on('moveend',remember);
      // Suspend automation before MapLibre's first drag frame, including touch rotation.
      map.getCanvas().addEventListener('pointerdown',event=>{
        gesture.pointerDown(event.pointerId);
      },{capture:true,signal:abort.signal});
      const release=(event:PointerEvent)=>{
        touches.delete(event.pointerId);
        controls.current.angleGesture=angleDragRef.current&&touches.size===1;
        gesture.pointerUp(event.pointerId);
        requestAnimationFrame(()=>{if(!abort.signal.aborted)remember();});
      };
      window.addEventListener('pointerup',release,{signal:abort.signal});
      window.addEventListener('pointercancel',release,{signal:abort.signal});
      window.addEventListener('blur',()=>{touches.clear();controls.current.angleGesture=false;gesture.clearPointers();remember();},{signal:abort.signal});
      map.getCanvas().addEventListener('webglcontextlost',()=>{if(!abort.signal.aborted)setError('Graphics paused. Your activity clock continues.');});
      map.getCanvas().addEventListener('webglcontextrestored',()=>{if(!abort.signal.aborted)setError('');});
    }).catch(e=>{
      if(!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load local world.');
    });
    return ()=>{
      abort.abort();map?.remove();mapRef.current=null;worldLayerRef.current=null;renderedWorld.current=null;
      reduced.removeEventListener('change',onReduced);
    };
  },[!!nearbyWorld,activeRuntime,mapRevision]);
  useEffect(()=>{
    if(!ready||!nearbyWorld||nearbyWorld.placeholder)return;
    const map=mapRef.current,layer=worldLayerRef.current;if(!map||!layer)return;
    if(renderedWorld.current&&sameWorld(renderedWorld.current,nearbyWorld.data))return;
    const previous=renderedWorld.current;
    renderedWorld.current=nearbyWorld.data;
    const changed=(kind:'ground'|'road'|'labels')=>!previous||!sameWorld(
      {type:'FeatureCollection',features:previous.features.filter(f=>kind==='road'?f.properties.kind==='road':kind==='ground'?['green','water'].includes(f.properties.kind):!!f.properties.name)},
      {type:'FeatureCollection',features:nearbyWorld.data.features.filter(f=>kind==='road'?f.properties.kind==='road':kind==='ground'?['green','water'].includes(f.properties.kind):!!f.properties.name)},
    );
    const atlas=map.getSource('atlas') as GeoJSONSource|undefined;
    const labels=map.getSource('named-places') as GeoJSONSource|undefined;
    const roads=map.getSource('world-roads') as GeoJSONSource|undefined;
    if(atlas?.type==='geojson'&&changed('ground'))void atlas.setData(nearbyWorld.data as GeoJSON.FeatureCollection).catch(()=>{});
    if(labels&&changed('labels'))void labels.setData(namedPlaces(nearbyWorld.data)).catch(()=>{});
    if(roads&&changed('road'))void roads.setData(roadContext(nearbyWorld.data)).catch(()=>{});
    layer.replaceWorld(nearbyWorld.data);
  },[nearbyWorld,ready]);
  const camera=(value:CameraMode,explicit=false,reset=false)=>{
    if(value==='chase')value='follow'; // Third person is disabled for the V1 reliability release.
    if(!explicit&&controls.current.selected)return;
    const map=mapRef.current,origin=nearbyWorld?.origin||manifest.origin;
    const point={...(controls.current.presentationPosition||activeRuntime.getMotion()||origin),heading:controls.current.presentationHeading??0};
    const adjustment=explicit&&!reset&&map?selectedCameraAdjustment(value,
      baseCamera(value,point,origin,map.getCanvas().clientWidth,map.getCanvas().clientHeight),
      {center:map.getCenter(),zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing()},
    ):neutralCamera();
    controls.current.mode=value;controls.current.selected=explicit||controls.current.selected;
    controls.current.manualFraming=false;controls.current.resumeAt=0;controls.current.angleGesture=false;
    const angle=value==='follow';angleDragRef.current=angle;setAngleDrag(angle);
    if(map){if(angle)map.dragPan.disable();else map.dragPan.enable();}
    controls.current.adjustment=adjustment;controls.current.revision++;setMode(value);
  };
  const adjustView=(change:{zoom?:number;bearing?:number;pitch?:number})=>{
    const map=mapRef.current;if(!map)return;
    controls.current.gesturing=true;
    map.easeTo({zoom:Math.max(13.5,Math.min(24,map.getZoom()+(change.zoom||0))),
      bearing:map.getBearing()+(change.bearing||0),pitch:Math.max(0,Math.min(80,map.getPitch()+(change.pitch||0))),duration:180});
  };
  const gps=activeRuntime.source==='gps';
  const capture=runtime.current.getSnapshot();
  const active=capture.status==='recording'||capture.status==='paused';
  const canReplay=!active&&(runtime.current.source!=='gps'||capture.status!=='complete'||retained);
  const health=runtime.current.getLocationHealth();
  const openReplay=(activity:SavedActivity)=>{
    if(!canReplay)return;
    try{const next=new ReplayRuntime(activity);runtime.current.stopLocationPreview();replay?.dispose();setReplay(next);setReplayActivity(activity);setOptionsOpen(false);setSettingsPage('main');setReplayError('');camera('follow',true,true);}
    catch{setReplayError('This recording has no usable route to replay.');}
  };
  const closeReplay=()=>{replay?.dispose();setReplay(null);setReplayActivity(null);setReplayError('');camera('free',true,true);};
  useEffect(()=>{
    if(!initialActivity||!ready||initialReplayOpened.current||!canReplay)return;
    initialReplayOpened.current=true;
    openReplay(initialActivity);
  },[initialActivity,ready,canReplay]);
  const openStory=(activity:SavedActivity)=>{
    if(active||storyLoading)return;setStoryLoading(true);setReplayError('');replay?.pause();
    try{
      const validation=new ReplayRuntime(activity);validation.dispose();
      // Route stickers use recorded samples only, with no map loading or location upload.
      setStoryDraft(activity);
    }catch(error){setReplayError(error instanceof Error?error.message:'This story could not be opened. Your run is safe.');}
    finally{setStoryLoading(false);}
  };
  const locate=()=>{
    if(!locationExplained){setShowLocationExplain(true);return;}
    runtime.current.enableLocation();camera('follow');
  };
  const confirmLocation=()=>{
    setShowLocationExplain(false);setLocationExplained(true);
    try{localStorage.setItem('keepleft-location-explained','1');}catch{/* Session only. */}
    runtime.current.enableLocation();camera('follow');
  };
  const exportRoute=()=>{
    downloadRoute(runtime.current.exportGeoJSON());setRetained(true);
  };
  const primary=()=>{
    if(snapshot.status==='recording') runtime.current.pause();
    else if(snapshot.status==='paused') runtime.current.resume();
    else setActivityPrompt(true);
  };
  const beginActivity=(value:ActivityType)=>{
    runtime.current.setActivityType(value);setActivityType(value);setActivityPrompt(false);setRetained(false);runtime.current.start();setDockCollapsed(true);camera('follow',true,true);
  };
  const currentRecord=()=>gps?runtime.current.completedActivity():demoReplayRecord(snapshot);
  // A replay summary describes the whole saved run; the scrubber owns playback time.
  const metrics=replayActivity?.snapshot||snapshot;
  const pace=metrics.status==='complete'&&metrics.distanceM>=100&&metrics.elapsedMs>0&&metrics.elapsedMs/(metrics.distanceM/1000)<=3600000?formatDuration(metrics.elapsedMs/(metrics.distanceM/1000)):metrics.speedMps>.25?formatDuration(1000000/metrics.speedMps):'—';
  const cycle=(replay?.activityType||runtime.current.activityType)==='cycle';
  const speedKph=metrics.status==='complete'?(metrics.elapsedMs>0?metrics.distanceM/(metrics.elapsedMs/1000)*3.6:0):metrics.speedMps*3.6;
  return <main className={`atlas-shell kl-shell${replay?' atlas-replaying':''}`} data-complete={!replay&&snapshot.status==='complete'} data-location-pending={gps&&!nearbyWorld&&!replay}>
    <div ref={host} className="atlas-map" aria-label={nearbyWorld?'Map around the activity':'Madmaheshwar demo map'} />
    <div className="atlas-vignette" aria-hidden="true" />
    <header className={`atlas-topbar${replay?' kl-replay-topbar':''}`}>
      {replay&&replayActivity?<>
        <Button variant="outline" aria-label="Back from replay" onClick={closeReplay}><ChevronLeft/></Button>
        <div className="kl-replay-identity"><strong>{displayPlace(replayActivity.placeName,'Your saved run')}</strong><small>{replay.isDemoReplay?'Demo run · simulated route':new Date(replayActivity.startedAtMs).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}</small></div>
        <Button variant="outline" aria-label="Share this run" disabled={storyLoading} onClick={()=>openStory(replayActivity)}><Share2/></Button>
      </>:<>
      <div className="atlas-brand"><span className="atlas-mark"><ArrowUpLeft size={24}/></span><div><strong>KeepLeft</strong><small>{nearbyWorld?(nearbyWorld.placeName?displayPlace(nearbyWorld.placeName):replay?.placeName?displayPlace(replay.placeName):nearbyWorld.placeholder?'Loading your neighborhood…':'Your neighborhood'):gps?'Finding your starting point…':'Madmaheshwar, Uttarakhand'}</small></div></div>
      <div className="kl-top-actions">
        <Button variant="outline" aria-label={active?'Stop your run before returning home':'Home'} title={active?'Stop your run before returning home':'Home'} disabled={active||(gps&&capture.status==='complete'&&!retained)} onClick={()=>onHome?onHome():window.location.assign('/')}><House/></Button>
        <Button ref={settingsTrigger} variant="outline" aria-label="Activities and settings" aria-expanded={optionsOpen} aria-controls="run-settings" onClick={()=>{setSettingsPage('main');setOptionsOpen(value=>!value);}}><BookOpen/></Button>
      </div>
      </>}
    </header>
    <div className="kl-view-bar">
      <CameraPopover mode={mode} hideChase={cycle} onSelect={value=>camera(value,true)}/>
      {!replay&&<div className="kl-live-lighting" role="group" aria-label="World lighting"><button type="button" aria-pressed={worldTheme==='day'} onClick={()=>setWorldTheme('day')}><Sun/><span>Day</span></button><button type="button" aria-pressed={worldTheme==='night'} onClick={()=>setWorldTheme('night')}><Moon/><span>Night</span></button></div>}
      <Button variant="outline" className="kl-desktop-camera-tools" aria-label="Adjust camera" aria-expanded={toolsOpen} onClick={()=>setToolsOpen(value=>!value)}><SlidersHorizontal/></Button>
      <Button variant="outline" aria-label="Reset view" onClick={()=>camera(mode,true,true)}><LocateFixed/></Button>
    </div>
    {gestureHint&&!optionsOpen&&!replay&&<output className="kl-gesture-hint">Drag to look around · Pinch to zoom · Two fingers to tilt<button type="button" aria-label="Dismiss gesture hint" onClick={()=>{setGestureHint(false);try{window.localStorage.setItem('keepleft-gestures-seen','1');}catch{}}}><X size={16}/></button></output>}
    <button className="kl-compass" aria-label="Point map north" onClick={()=>{const map=mapRef.current;if(map)adjustView({bearing:-map.getBearing()});}}><Navigation2 style={{transform:`rotate(${-(diagnostics?.camera.bearing||0)}deg)`}}/><span>N</span></button>
    {replay&&<nav className="kl-replay-views" aria-label="Replay camera views"><button aria-pressed={mode==='follow'} onClick={()=>camera('follow',true)}><LocateFixed/>Follow</button><button aria-pressed={mode==='orbit'} onClick={()=>camera('orbit',true)}><Orbit/>Orbit</button><button aria-pressed={mode==='free'} onClick={()=>camera('free',true,true)}><Mountain/>Overview</button><button ref={settingsTrigger} className="kl-replay-more" aria-label="More camera views and settings" aria-expanded={optionsOpen} aria-controls="run-settings" onClick={()=>{setSettingsPage('main');setOptionsOpen(value=>!value);}}><SlidersHorizontal/></button></nav>}
    <nav className="keepleft-map-tools kl-desktop-camera-tools" aria-label="Adjust map view" hidden={!toolsOpen}>
      <Button variant="outline" className="keepleft-angle-toggle" aria-label="Drag to change angle" aria-pressed={angleDrag} onClick={()=>{const next=!angleDrag;angleDragRef.current=next;setAngleDrag(next);if(next)mapRef.current?.dragPan.disable();else mapRef.current?.dragPan.enable();}}>{angleDrag?'Angle':'Move'}</Button>
      <Button variant="outline" aria-label="Zoom in" onClick={()=>adjustView({zoom:.5})}><Plus/></Button>
      <Button variant="outline" aria-label="Zoom out" onClick={()=>adjustView({zoom:-.5})}><Minus/></Button>
      <Button variant="outline" aria-label="Rotate left" onClick={()=>adjustView({bearing:-20})}><RotateCcw/></Button>
      <Button variant="outline" aria-label="Rotate right" onClick={()=>adjustView({bearing:20})}><RotateCw/></Button>
      <Button variant="outline" aria-label="Tilt up" onClick={()=>adjustView({pitch:10})}><ChevronUp/></Button>
      <Button variant="outline" aria-label="Tilt down" onClick={()=>adjustView({pitch:-10})}><ChevronDown/></Button>
    </nav>
    <aside ref={settings} className="atlas-location-panel" id="run-settings" data-open={optionsOpen} aria-hidden={!optionsOpen} inert={!optionsOpen}>
      <div className="keepleft-panel-heading">
        {settingsPage!=='main'&&<Button variant="ghost" aria-label="Back to settings" onClick={()=>setSettingsPage('main')}><ChevronLeft/></Button>}
        <h2>{settingsPage==='main'?'Activity settings':settingsPage==='camera'?'Camera':settingsPage==='lighting'?'World lighting':settingsPage==='graphics'?'Graphics':settingsPage==='activities'?'Saved activities':settingsPage==='recovery'?'Activity recovery':'Developer'}</h2>
        <Button variant="ghost" aria-label="Close settings" onClick={()=>{setOptionsOpen(false);setSettingsPage('main');}}><X/></Button>
      </div>
      <div hidden={!optionsOpen}>
      {settingsPage==='main'&&<>
        <output className="kl-settings-status">{replay?'Replay · GPS off':gps?health.label:'Demo world'}</output>
        {!replay&&!active&&!runtime.current.nativeRecording&&<section className="kl-settings-section"><h3>Activity</h3><fieldset className="kl-settings-segment"><legend className="sr-only">Activity type</legend>{(['walk','run','cycle'] as ActivityType[]).map(value=><button type="button" key={value} aria-pressed={activityType===value} onClick={()=>{runtime.current.setActivityType(value);setActivityType(value);if(value==='cycle'&&mode==='chase')camera('follow',true,true);}}>{value}</button>)}</fieldset></section>}
        <section className="kl-settings-section"><h3>View</h3>
          <button className="kl-settings-row" type="button" onClick={()=>setSettingsPage('camera')}><span>Camera</span><strong>{cameraChoices.find(choice=>choice.mode===mode)?.label}</strong><ChevronLeft/></button>
          <button className="kl-settings-row" type="button" onClick={()=>setSettingsPage('lighting')}><span>Lighting</span><strong>{worldTheme==='day'?'Day':'Night'}</strong><ChevronLeft/></button>
          <button className="kl-settings-row" type="button" onClick={()=>setSettingsPage('graphics')}><span>Graphics</span><strong>{quality==='battery'?'Battery saver':quality==='balanced'?'Balanced':'High'}</strong><ChevronLeft/></button>
        </section>
        <section className="kl-settings-section"><h3>Tracking</h3><label className="kl-settings-row kl-settings-toggle"><span>Align display to roads<small>Saved distance never changes</small></span><input type="checkbox" checked={alignRoads} onChange={e=>{controls.current.alignRoads=e.target.checked;setAlignRoads(e.target.checked);}}/></label></section>
        <section className="kl-settings-section"><h3>Your activities</h3>
          {!runtime.current.nativeRecording&&<button className="kl-settings-row" type="button" onClick={()=>setSettingsPage('recovery')}><span>Activity recovery</span><ChevronLeft/></button>}
          <button className="kl-settings-row" type="button" onClick={()=>setSettingsPage('activities')}><span>Saved activities</span><ChevronLeft/></button>
        </section>
        <section className="kl-settings-section"><h3>About</h3>
          <a className="kl-settings-row" href="/about"><span>About &amp; Licenses</span><ChevronLeft/></a>
          <a className="kl-settings-row" href="/privacy"><span>Privacy Policy</span><ChevronLeft/></a>
        </section>
        <div className="atlas-location-actions">{gps&&!replay&&!active&&snapshot.status!=='complete'&&<Button variant="outline" onClick={locate} disabled={runtime.current.busy}><LocateFixed/>Retry GPS</Button>}
          {gps&&!active&&<Button variant="outline" disabled={runtime.current.busy||(snapshot.status==='complete'&&!retained)} onClick={()=>{runtime.current.useDemo();camera('orbit');}}>Demo world</Button>}
          {(gps||replay)&&mapStatus.includes('unavailable')&&<Button variant="outline" onClick={retryMap}>Retry nearby map</Button>}
        </div>
        {replayError&&<p role="alert">{replayError}</p>}
        {devTools&&<button className="kl-settings-row" type="button" onClick={()=>setSettingsPage('developer')}><span>Developer diagnostics</span><ChevronLeft/></button>}
      </>}
      {settingsPage==='camera'&&<div className="kl-settings-options">{cameraChoices.filter(choice=>!cycle||choice.mode!=='chase').map(choice=><button type="button" key={choice.mode} aria-pressed={mode===choice.mode} onClick={()=>{camera(choice.mode,true);setSettingsPage('main');}}><span>{choice.label}<small>{choice.description}</small></span><i/></button>)}</div>}
      {settingsPage==='lighting'&&<div className="kl-settings-options">{(['day','night'] as const).map(value=><button type="button" key={value} aria-pressed={worldTheme===value} onClick={()=>setWorldTheme(parseWorldTheme(value))}><span>{value==='day'?'Day':'Night'}<small>{value==='day'?'Noir daylight':'Warm windows after dark'}</small></span><i/></button>)}</div>}
      {settingsPage==='graphics'&&<div className="kl-settings-options">{(['battery','balanced','high'] as CameraControls['quality'][]).map(value=><button type="button" key={value} aria-pressed={quality===value} onClick={()=>{controls.current.quality=value;setQuality(value);mapRef.current?.setPixelRatio(renderPixelRatio(value,window.devicePixelRatio||1,isAndroid()));}}><span>{value==='battery'?'Battery saver':value==='balanced'?'Balanced':'High detail'}<small>{value==='battery'?'Longer battery life':value==='balanced'?'Recommended':'More trees and facade detail'}</small></span><i/></button>)}</div>}
      {!runtime.current.nativeRecording&&<div hidden={settingsPage!=='recovery'}><ActivityRecovery runtime={runtime.current} canRecover={!replay&&canReplay} onConflict={onRecoveryConflict} onRecovered={()=>{setRetained(false);setRecoveryConflict(false);camera('follow');}}/>{recoveryConflict&&<Button variant="outline" onClick={()=>downloadRoute(runtime.current.exportGeoJSON())}>Export backup</Button>}</div>}
      <div hidden={settingsPage!=='activities'}><ActivityLibrary runtime={runtime.current} status={capture.status} onSaved={onSaved} onReplay={openReplay} canReplay={canReplay}/></div>
      {devTools&&settingsPage==='developer'&&<DeveloperDiagnostics runtime={runtime.current} scene={diagnostics} coverage={coverage} mapStatus={mapStatus}/>}
      </div>
    </aside>
    <div className="kl-dock" ref={dock} data-collapsed={dockCollapsed} data-ready={snapshot.status==='ready'}><div className="kl-dock-content">
    {(replay||snapshot.status!=='ready')&&<div className="kl-dock-heading"><span>{dockCollapsed?`${(snapshot.distanceM/1000).toFixed(2)} km · ${formatDuration(snapshot.elapsedMs)}${replay?' · Replay':''}`:'Activity details'}</span><Button variant="ghost" aria-label={dockCollapsed?'Expand activity details':'Collapse activity details'} aria-expanded={!dockCollapsed} aria-controls="activity-stats" onClick={()=>setDockCollapsed(value=>!value)}>{dockCollapsed?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</Button></div>}
    {!replay&&snapshot.status==='ready'&&<div className="kl-ready"><div><span className="kl-eyebrow">{gps?`Outdoor ${activityType}`:'Demo world'}</span><h1>{gps?(runtime.current.locationState==='ready'?'Ready when you are.':'Find your starting point.'):'Ready when you are.'}</h1></div>{(!gps||['idle','denied','timeout','unavailable'].includes(runtime.current.locationState))&&<Button variant="outline" disabled={runtime.current.busy} onClick={locate}><LocateFixed/>{gps?'Find me':'Use my location'}</Button>}</div>}
    {gps&&!replay&&snapshot.status!=='complete'&&<div className="kl-signal" role="status" aria-live="polite" data-quality={health.quality}><i/>{runtime.current.locationState==='idle'?'Enable location to get started':runtime.current.locationState==='denied'?'Location permission denied. Open device settings to allow location access.':health.label}</div>}
    {runtime.current.actionError&&<p className="kl-error" role="alert">{runtime.current.actionError}</p>}
    {replayError&&<p className="kl-error" role="alert">{replayError}</p>}
    {replay&&!dockCollapsed&&<h1 className="kl-replay-title">Same roads. A clearer you.</h1>}
    <section className="atlas-metrics" id="activity-stats" aria-label={replay?'Activity summary':'Live activity metrics'} aria-live="polite" hidden={dockCollapsed}>
      <div className="atlas-status"><i data-state={snapshot.status}/>{replay?(snapshot.status==='recording'?`Replay · ${replay.rate}×`:snapshot.status==='complete'?'Replay complete':'Replay paused'):gps?(snapshot.status==='recording'?'Recording GPS':snapshot.status==='paused'?'Recording paused':snapshot.status==='complete'?'GPS activity complete':'Device GPS mode'):(snapshot.status==='ready'?'Ready for a demo run':snapshot.status==='recording'?'Demo run · 12× playback':snapshot.status==='paused'?'Demo paused':'Demo complete')}</div>
      <div className="atlas-metric-grid">
        <article><span><MapPin/>Distance</span><strong>{(metrics.distanceM/1000).toFixed(2)}</strong><small>km</small></article>
        <article><span><Clock3/>{replay?'Duration':'Time'}</span><strong>{formatDuration(metrics.elapsedMs)}</strong><small>{replay?'Total':gps?'Active':'Demo'}</small></article>
        <article><span><Gauge/>{cycle||replay&&metrics.status!=='complete'?(metrics.status==='complete'?'Avg speed':'Speed'):(metrics.status==='complete'?'Avg pace':'Pace')}</span><strong>{cycle||replay&&metrics.status!=='complete'?speedKph.toFixed(1):pace==='—'?'--:--':pace}</strong><small>{cycle||replay&&metrics.status!=='complete'?'km/h':'/ km'}</small></article>
      </div>
    </section>
    {replay?<ReplayControls replay={replay} snapshot={snapshot} onClose={closeReplay} compact={dockCollapsed}/>:<section className="atlas-controls" aria-label="Activity controls">
      {snapshot.status==='complete'
        ? <><Button className="atlas-primary-control" disabled={!canReplay||storyLoading} onClick={()=>{const record=currentRecord();if(record)openStory(record);}}><Share2/>{storyLoading?'Preparing story…':'Create social post'}</Button><Button variant="outline" disabled={!canReplay} onClick={()=>{const record=currentRecord();if(record)openReplay(record);}}><Play/>{gps?'Replay run':'Replay demo'}</Button><Button variant="ghost" disabled={gps&&!retained} onClick={()=>{if(gps)locate();else runtime.current.reset();camera('orbit');}}><RotateCcw/>{gps?'New run':'Reset demo'}</Button>{gps&&!retained&&<Button variant="outline" onClick={exportRoute}><Download/>Save backup</Button>}</>
        : <><Button className="atlas-primary-control" disabled={runtime.current.busy||recoveryConflict||(snapshot.status==='paused'&&runtime.current.locationState==='locating')||(snapshot.status==='ready'&&(gps?runtime.current.locationState!=='ready':!ready))} onClick={primary}>{snapshot.status==='recording'?<Pause/>:<Play/>}{snapshot.status==='recording'?'Pause':snapshot.status==='paused'?'Resume':gps?'Start recording':'Start demo run'}</Button>
        {snapshot.status!=='ready'&&<Button className="atlas-stop-control" data-confirm={confirmFinish||undefined} disabled={runtime.current.busy} aria-label={confirmFinish?'Tap again to finish your activity':'Finish activity'} onClick={()=>{if(confirmFinish){if(confirmTimer.current)clearTimeout(confirmTimer.current);confirmTimer.current=null;setConfirmFinish(false);runtime.current.stop();camera('orbit');}else{setConfirmFinish(true);confirmTimer.current=setTimeout(()=>{setConfirmFinish(false);confirmTimer.current=null;},3000);}}}><OctagonX/><span>{confirmFinish?'Tap to confirm':'Finish'}</span></Button>}</>}
    </section>}
    {replay&&replayActivity&&!dockCollapsed&&<Button className="kl-social-post" variant="outline" disabled={storyLoading} onClick={()=>openStory(replayActivity)}><Share2/>{storyLoading?'Preparing story…':'Create social post'}</Button>}
    {!dockCollapsed&&<p className="kl-dock-motto">{replay?'KeepLeft':'Same roads. A clearer you.'}</p>}
    </div>
    </div>
    {(!ready||error)&&<div className="atlas-loading" role={error?'alert':'status'}>{error||'Preparing the map…'}{error&&<Button variant="outline" onClick={()=>reloadMap(value=>value+1)}>Reload map</Button>}</div>}
    {storyDraft&&<Suspense fallback={<div className="atlas-loading" role="status">Opening your story…</div>}><StoryStudio activity={storyDraft} onClose={()=>setStoryDraft(null)}/></Suspense>}
    <Dialog open={activityPrompt} onOpenChange={setActivityPrompt}><DialogContent className="kl-activity-prompt">
      <DialogHeader><DialogTitle>How are you moving?</DialogTitle><DialogDescription>Your choice tunes GPS filtering, speed, and the replay camera.</DialogDescription></DialogHeader>
      <div className="kl-activity-choices">
        <button type="button" onClick={()=>beginActivity('walk')}><PersonStanding/><span><strong>Walk</strong><small>Steady location filtering</small></span></button>
        <button type="button" onClick={()=>beginActivity('run')}><Footprints/><span><strong>Run</strong><small>Pace and follow replay</small></span></button>
        <button type="button" onClick={()=>beginActivity('cycle')}><Bike/><span><strong>Cycle</strong><small>Speed in km/h · wider follow view</small></span></button>
      </div></DialogContent>
    </Dialog>
    <Dialog open={showLocationExplain} onOpenChange={setShowLocationExplain}><DialogContent className="kl-activity-prompt">
      <DialogHeader><DialogTitle>Your location stays on this device</DialogTitle><DialogDescription>Keepleft uses precise GPS to record your route. Your coordinates are stored locally and never sent to a server. Recording continues when your screen is locked so your full route is captured.</DialogDescription></DialogHeader>
      <div className="kl-activity-choices">
        <button type="button" onClick={confirmLocation}><LocateFixed/><span><strong>Allow location access</strong><small>Required to record a route</small></span></button>
        <button type="button" onClick={()=>setShowLocationExplain(false)}><X/><span><strong>Not now</strong><small>You can enable location later</small></span></button>
      </div></DialogContent>
    </Dialog>
  </main>;
}
