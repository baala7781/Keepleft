'use client';
/* oxlint-disable next/no-img-element -- Export previews use short-lived blob URLs, which Next Image cannot optimize. */
import {useEffect,useMemo,useRef,useState} from 'react';
import {ImagePlus,Image,Play,Pause,Share2,X,ArrowLeft,RotateCcw,Copy,Download,Video} from 'lucide-react';
import {Button} from './ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './ui/dialog';
import type {SavedActivity} from '@/lib/tracking/storage';
import {createStoryScene,type StoryScene,type StoryOptions,type StoryMetric} from '@/lib/story/scene';
import {exportStory,NativeStory,type StoryExport} from '@/lib/story/export';
import {exportSticker} from '@/lib/story/sticker-export';
import {isAndroid,isIOS,NativeRun} from '@/lib/native/bridge';
import {constrainPlacement,DEFAULT_PLACEMENT,type RoutePlacement} from '@/lib/story/placement';
import {StoryPlacementControls} from './story-placement-controls';
import {STORY_PRESETS,type StoryPreset} from '@/lib/story/presets';
import {copyRoutePng,exportRoutePng} from '@/lib/story/png-export';
import {hideRouteEnds} from '@/lib/story/privacy';
import {REPLAY_3D_SPEEDS,type Replay3DSpeed,export3DVideo,estimateReplayVideoDuration,formatVideoDuration,StoryReplayRuntime} from '@/lib/story/replay-3d';
import {neutralCamera,type CameraControls} from '@/lib/renderer/camera';
import {mapStyle} from '@/lib/geodata/map-style';
import {neighborhoodFor} from '@/lib/geodata/osm';
import {readWorld,saveWorld} from '@/lib/geodata/world-archive';
import type {NeighborhoodWorld} from '@/lib/geodata/service';
import type {StreamingWorldLayer,WorldData} from '@/lib/renderer/world';
import type {Map as MapLibreMap} from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import manifest from '@/public/fixtures/madhyamaheshwar/manifest.json';

const DEFAULT_CAPTION='Every step, part of my story.';

export function StoryStudio({activity,onClose}:{activity:SavedActivity;onClose:()=>void}){
  const host=useRef<HTMLDivElement>(null),scene=useRef<StoryScene|undefined>(undefined),photo=useRef<ImageBitmap|undefined>(undefined);
  const mapHost=useRef<HTMLDivElement>(null),mapInstance=useRef<MapLibreMap|null>(null),worldLayerRef=useRef<StreamingWorldLayer|null>(null);
  const replay3d=useRef<StoryReplayRuntime|null>(null),controls3d=useRef<CameraControls|null>(null);

  const options=useRef<StoryOptions>({caption:DEFAULT_CAPTION,placement:{...DEFAULT_PLACEMENT},metrics:['distance','time','pace']});
  const [ready,setReady]=useState(false),[hasPhoto,setHasPhoto]=useState(false),[caption,setCaption]=useState(DEFAULT_CAPTION),[placement,setPlacement]=useState<RoutePlacement>({...DEFAULT_PLACEMENT});
  const [format,setFormat]=useState<'video3d'|'photo'|'png'|'sticker'>('video3d'),[metrics,setMetrics]=useState<StoryMetric[]>(['distance','time','pace']);
  const formatRef=useRef(format);
  useEffect(()=>{formatRef.current=format;},[format]);

  const [speed,setSpeed]=useState<Replay3DSpeed>(8);
  const [cameraMode,setCameraMode]=useState<'follow'|'orbit'|'overview'>('follow');
  const speedRef=useRef(speed),cameraModeRef=useRef(cameraMode);
  useEffect(()=>{speedRef.current=speed;},[speed]);
  useEffect(()=>{cameraModeRef.current=cameraMode;},[cameraMode]);
  const [mapReady,setMapReady]=useState(false);

  const [hideEnds,setHideEnds]=useState(true);
  const privateRoute=useMemo(()=>hideEnds?hideRouteEnds(activity.samples):{samples:activity.samples,applied:false,hiddenM:0},[activity.samples,hideEnds]);
  const shareActivity=useMemo(()=>({...activity,samples:privateRoute.samples}),[activity,privateRoute.samples]);
  const [preset,setPreset]=useState<StoryPreset>('story');
  const [playing,setPlaying]=useState(true),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState(''),[result,setResult]=useState<StoryExport|null>(null);
  const [copied,setCopied]=useState(false);
  const abort=useRef<AbortController|null>(null),playRef=useRef(false),busyRef=useRef(false),photoGeneration=useRef(0),file=useRef<HTMLInputElement>(null);

  useEffect(()=>{playRef.current=playing;},[playing]);
  useEffect(()=>{busyRef.current=busy;},[busy]);
  useEffect(()=>{options.current={photo:photo.current,caption,placement,metrics,preset};},[caption,placement,metrics,preset,hasPhoto]);

  // 2D Scene setup (for PNG, Photo Story, GIF Sticker)
  useEffect(()=>{
    let removed=false,raf=0,elapsed=0,last=0,created:StoryScene|undefined;
    void createStoryScene(shareActivity).then(value=>{
      if(removed){value.dispose();return;}
      created=value;scene.current=value;
      host.current?.appendChild(value.canvas);
      host.current?.appendChild(value.sticker);
      host.current?.appendChild(value.overlay);
      setReady(true);
      const tick=(now:number)=>{
        if(last&&playRef.current&&!busyRef.current)elapsed=(elapsed+Math.min(.1,(now-last)/1000))%12;
        last=now;
        if(!busyRef.current&&formatRef.current!=='video3d'){
          if(formatRef.current==='png')value.drawOverlay(elapsed,options.current.metrics);
          else if(formatRef.current==='sticker')value.drawSticker(elapsed);
          else value.draw(elapsed,options.current);
        }
        raf=requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
    }).catch(()=>{if(!removed)setError('The recorded route could not load. Close this screen and try again.');});
    return ()=>{
      removed=true;
      abort.current?.abort();
      cancelAnimationFrame(raf);
      created?.dispose();
      if(scene.current===created)scene.current=undefined;
    };
  },[shareActivity]);

  // 3D Miniature World Map Setup (for 3D Moment Video)
  useEffect(()=>{
    if(format!=='video3d'||!mapHost.current||mapInstance.current)return;
    const abortController=new AbortController();
    let map:MapLibreMap|undefined;
    let source:StoryReplayRuntime|undefined;
    setMapReady(false);

    void (async()=>{
      try{
        source=new StoryReplayRuntime(shareActivity,speedRef.current);
        replay3d.current=source;
        if(playRef.current)source.play();

        const [{Map,MercatorCoordinate,setWorkerUrl},world]=await Promise.all([
          import('maplibre-gl'),
          import('@/lib/renderer/world'),
        ]);

        const position=source.getMapPosition()||(shareActivity.samples.length?{lng:shareActivity.samples[0].lng,lat:shareActivity.samples[0].lat}:undefined)||manifest.origin;
        const isDemo=shareActivity.source==='demo';
        const area=neighborhoodFor(position);

        let nearby:NeighborhoodWorld|null=null;
        if(!isDemo){
          // Instantly check local cache: Android SQLite or Web IndexedDB
          const cached=isAndroid()
            ?await NativeRun.getMap({key:area.key}).then(r=>r.world).catch(()=>null)
            :await readWorld(area.key).catch(()=>null);
          if(cached){
            nearby=cached;
          }
        }

        // Center origin directly on runner's coordinates (never manifest.origin for real activities)
        const origin=nearby?.origin||(isDemo?manifest.origin:area.origin);
        const point=source.getMotion()||position||origin;

        const initialData:WorldData=isDemo
          ?world.validateWorld(
              nearby?.data||
              (await fetch('/fixtures/madhyamaheshwar/world.geojson',{signal:abortController.signal}).then(r=>{
                if(!r.ok)throw new Error();
                return r.json();
              }))
            )
          :(nearby?.data?world.validateWorld(nearby.data):{type:'FeatureCollection',features:[]});

        if(abortController.signal.aborted||!mapHost.current)return;
        setWorkerUrl(mapWorkerUrl);

        const initialCamera=cameraModeRef.current;
        const controls:CameraControls={
          mode:initialCamera==='overview'?'free':initialCamera,
          reducedMotion:false,
          revision:0,
          gesturing:false,
          selected:false,
          adjustment:neutralCamera(),
          quality:'balanced',
          staticScene:false,
          alignRoads:true,
          worldTheme:'night',
        };
        controls3d.current=controls;

        map=new Map({
          container:mapHost.current,
          center:point,
          zoom:initialCamera==='overview'?14:16,
          pitch:initialCamera==='overview'?30:58,
          bearing:-25,
          interactive:false,
          pixelRatio:Math.min(window.devicePixelRatio||1,1.5),
          canvasContextAttributes:{antialias:true,preserveDrawingBuffer:true},
          attributionControl:{compact:true},
          style:mapStyle(window.location.origin,nearby,initialData),
        });
        mapInstance.current=map;

        map.once('style.load',()=>{
          if(abortController.signal.aborted||!map||!source)return;
          map.setLayoutProperty('place-names','visibility','none');
          const layer=world.createWorldLayer(source,MercatorCoordinate,initialData,controls,()=>{},origin);
          worldLayerRef.current=layer;
          map.addLayer(layer,'place-names');
          requestAnimationFrame(()=>{map?.resize();});
          setMapReady(true);
        });

        // Non-blocking background fetch for 3D buildings if not cached
        if(!nearby&&!isDemo){
          void (async()=>{
            try{
              const fetched:NeighborhoodWorld=isAndroid()||isIOS()
                ?await import('@/lib/native/maps').then(m=>m.loadNativeNeighborhood(area.x,area.y,abortController.signal))
                :await fetch('/api/world?x='+area.x+'&y='+area.y,{signal:abortController.signal}).then(async r=>{
                    if(!r.ok)throw new Error();
                    return r.json() as Promise<NeighborhoodWorld>;
                  });
              if(fetched&&!abortController.signal.aborted){
                const validated=world.validateWorld(fetched.data);
                worldLayerRef.current?.replaceWorld(validated);
                if(!isAndroid())void saveWorld(fetched).catch(()=>{});
              }
            }catch{
              // Gracefully keep baseline 3D world (route ribbon + runner model)
            }
          })();
        }
      }catch{
        if(!abortController.signal.aborted)setError('3D miniature world could not load. You can still export 2D route stickers.');
      }
    })();

    return ()=>{
      abortController.abort();
      mapInstance.current=null;
      worldLayerRef.current=null;
      controls3d.current=null;
      replay3d.current=null;
      map?.remove();
      source?.dispose();
      setMapReady(false);
    };
  },[format,shareActivity]);

  // Sync Camera Mode to 3D Map
  useEffect(()=>{
    if(!controls3d.current)return;
    controls3d.current.mode=cameraMode==='overview'?'free':cameraMode;
    controls3d.current.revision++;
    mapInstance.current?.triggerRepaint();
  },[cameraMode]);

  // Sync Speed to 3D Replay
  useEffect(()=>{
    replay3d.current?.setSpeed(speed);
  },[speed]);

  // Sync Play/Pause
  useEffect(()=>{
    if(!replay3d.current)return;
    if(playing)replay3d.current.play();
    else replay3d.current.pause();
  },[playing]);

  useEffect(()=>()=>{photoGeneration.current++;photo.current?.close();},[]);
  useEffect(()=>{
    const hidden=()=>{if(document.hidden){setPlaying(false);abort.current?.abort();}};
    document.addEventListener('visibilitychange',hidden);
    return()=>document.removeEventListener('visibilitychange',hidden);
  },[]);

  // Video URL from result blob
  const videoUrl=useMemo(()=>{
    if(!result?.blob)return '';
    return URL.createObjectURL(result.blob);
  },[result]);

  useEffect(()=>{
    return ()=>{
      if(videoUrl)URL.revokeObjectURL(videoUrl);
    };
  },[videoUrl]);

  const choosePhoto=async(value:File|undefined)=>{
    if(!value)return;const generation=++photoGeneration.current;setError('');setResult(null);
    if(value.size>25*1024*1024||!['image/jpeg','image/png','image/webp'].includes(value.type)){setError('Choose a JPG, PNG or WebP photo smaller than 25 MB.');return;}
    try{const bitmap=await createImageBitmap(value,{resizeWidth:1440,resizeQuality:'high'});if(generation!==photoGeneration.current){bitmap.close();return;}photo.current?.close();photo.current=bitmap;options.current.photo=bitmap;setHasPhoto(true);}
    catch{setError('This photo could not be opened. Try a different image.');}
  };

  const makeExport=async(kind:'video'|'gif'|'png'|'video3d')=>{
    if(busy||(kind==='video'&&!hasPhoto))return;
    const controller=new AbortController();
    abort.current=controller;
    busyRef.current=true;
    setBusy(true);
    setPlaying(false);
    setProgress(0);
    setError('');
    setResult(null);
    try{
      if(kind==='png'){
        if(!scene.current)return;
        setResult(await exportRoutePng(scene.current,metrics));
        setProgress(1);
      }else if(kind==='gif'){
        if(!scene.current)return;
        setResult(await exportSticker(scene.current,controller.signal,setProgress));
      }else if(kind==='video'){
        if(!scene.current)return;
        setResult(await exportStory(scene.current,options.current,controller.signal,setProgress));
      }else if(kind==='video3d'){
        const mapCanvas=mapInstance.current?.getCanvas();
        if(!mapCanvas||!replay3d.current){
          throw new Error('The 3D world is still loading. Please wait a moment and tap export again.');
        }
        const compositeCanvas=document.createElement('canvas');
        setResult(await export3DVideo(
          compositeCanvas,
          mapCanvas,
          replay3d.current,
          shareActivity,
          {speed,cameraMode,metrics,preset,hideEnds},
          controller.signal,
          setProgress,
          NativeStory,
          ()=>mapInstance.current?.triggerRepaint()
        ));
      }
    }catch(e){
      setError(e instanceof Error&&e.name==='AbortError'?'Export cancelled. Your run and photo are unchanged.':e instanceof Error?e.message:'Could not export the video.');
    }finally{
      busyRef.current=false;
      setBusy(false);
      abort.current=null;
    }
  };

  const download=()=>{
    if(!result?.blob)return;
    try{
      const filename=`yourleft-${result.extension==='png'?'route-overlay':result.extension==='gif'?'route-sticker':format==='video3d'?'3d-moment':'story'}.${result.extension}`;
      const url=URL.createObjectURL(result.blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch{
      setError('Could not download file.');
    }
  };

  const share=async()=>{
    if(!result)return;
    setError('');
    try{
      if(result.id)await NativeStory.shareStory({id:result.id});
      else if(result.blob){
        const filename=`yourleft-${result.extension==='png'?'route-overlay':result.extension==='gif'?'route-sticker':format==='video3d'?'3d-moment':'story'}.${result.extension}`;
        const file=new File([result.blob],filename,{type:result.blob.type});
        if(navigator.share&&navigator.canShare?.({files:[file]})){
          await navigator.share({files:[file],title:'YourLeft 3D Moment'});
          return;
        }
        download();
      }
    }catch(e){
      if(e instanceof Error&&e.name==='AbortError')return;
      setError('Could not open sharing. Try downloading instead.');
    }
  };

  const copyPng=async()=>{
    if(result?.extension!=='png')return;
    setError('');
    try{
      await copyRoutePng(result);
      setCopied(true);
    }catch(e){
      setError(e instanceof Error?e.message:'Could not copy this PNG. Use Share or Download instead.');
    }
  };

  const placeRoute=(value:RoutePlacement)=>{
    options.current={...options.current,placement:value};
    setPlacement(value);
    setResult(null);
    setCopied(false);
  };

  const videoSec=estimateReplayVideoDuration(shareActivity.snapshot.elapsedMs,speed);

  return (
    <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}>
      <DialogContent className="kl-studio" showCloseButton={false}>
        <header className="kl-studio-top">
          <div>
            <DialogTitle>Share your run</DialogTitle>
            <DialogDescription>Export your real-world 3D replay or route stickers.</DialogDescription>
          </div>
          <Button variant="ghost" aria-label="Close share studio" disabled={busy} onClick={onClose}><X/></Button>
        </header>

        <div className="kl-studio-body">
          {/* Live Preview Container */}
          <div
            className={`kl-story-preview${format==='png'||format==='sticker'||result?.extension==='gif'||result?.extension==='png'?' kl-gif-preview':''}`}
            data-format={format}
            data-preset={preset}
            aria-label="Live share preview"
          >
            {/* 3D Map View Host */}
            {format==='video3d'&&(
              <>
                <div ref={mapHost} className="kl-3d-map-host" hidden={!!videoUrl}/>
                {!mapReady&&!videoUrl&&(
                  <output className="kl-3d-loading-overlay" aria-label="Loading 3D world">
                    <div className="kl-3d-spinner"/>
                    <div className="kl-3d-loading-text">
                      <strong>Generating 3D miniature world</strong>
                      <span>Building terrain, elevation & 3D structures…</span>
                    </div>
                  </output>
                )}
              </>
            )}

            {/* 2D Canvas Host */}
            <div ref={host} hidden={format==='video3d'||!!videoUrl}>
              {!ready&&<span>{error?'Preview unavailable':'Drawing your route…'}</span>}
            </div>

            {/* Photo placement drag handles (Photo mode only) */}
            {ready&&format==='photo'&&hasPhoto&&!busy&&!result&&(
              <StoryPlacementControls value={placement} preset={preset} onChange={placeRoute}/>
            )}

            {/* Exported Result View */}
            {videoUrl&&(
              result?.extension==='gif'||result?.extension==='png'?(
                <img src={videoUrl} alt={result.extension==='png'?'Transparent route overlay':'Exported route sticker'}/>
              ):(
                <video controls autoPlay muted loop playsInline preload="metadata" src={videoUrl} aria-label="Exported 3D story video"/>
              )
            )}
          </div>

          {/* Share Settings & Formats */}
          <section className="kl-story-editor" aria-label="Share settings">
            {/* Format Picker */}
            <fieldset className="kl-share-formats">
              <legend className="sr-only">Share format</legend>

              <button
                type="button"
                aria-pressed={format==='video3d'}
                disabled={busy}
                onClick={()=>{setFormat('video3d');setResult(null);setCopied(false);}}
              >
                <Video aria-hidden="true"/>
                3D Moment
                <small>Real 3D video</small>
              </button>

              <button
                type="button"
                aria-pressed={format==='png'}
                disabled={busy}
                onClick={()=>{setFormat('png');setResult(null);setCopied(false);}}
              >
                <Image aria-hidden="true"/>
                Copy PNG
                <small>Transparent</small>
              </button>

              <button
                type="button"
                aria-pressed={format==='photo'}
                disabled={busy}
                onClick={()=>{setFormat('photo');setResult(null);setCopied(false);}}
              >
                <ImagePlus aria-hidden="true"/>
                Photo Story
                <small>On your photo</small>
              </button>

              <button
                type="button"
                aria-pressed={format==='sticker'}
                disabled={busy}
                onClick={()=>{setFormat('sticker');setResult(null);setCopied(false);}}
              >
                <Play aria-hidden="true"/>
                Animated GIF
                <small>Route sticker</small>
              </button>
            </fieldset>

            {/* Format-Specific Controls */}
            {format==='video3d'?(
              <>
                <p className="kl-share-copy">
                  Export the entire 3D moment in the real world as video, complete with terrain, buildings, and full workout telemetry.
                </p>

                {/* 3D Replay Speed Selector: 2x, 3x, 8x, 10x, 20x */}
                <fieldset className="kl-share-presets">
                  <legend>Replay speed</legend>
                  {REPLAY_3D_SPEEDS.map(speedVal=>(
                    <button
                      key={speedVal}
                      type="button"
                      aria-pressed={speed===speedVal}
                      disabled={busy}
                      onClick={()=>{setSpeed(speedVal);setResult(null);}}
                    >
                      {speedVal}×
                      <small>{formatVideoDuration(estimateReplayVideoDuration(shareActivity.snapshot.elapsedMs,speedVal))}</small>
                    </button>
                  ))}
                </fieldset>

                {/* 3D Camera Mode Selector */}
                <fieldset className="kl-share-presets">
                  <legend>Camera view</legend>
                  {(['follow','orbit','overview'] as const).map(mode=>(
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={cameraMode===mode}
                      disabled={busy}
                      onClick={()=>{setCameraMode(mode);setResult(null);}}
                    >
                      {mode==='follow'?'Follow':mode==='orbit'?'360° Orbit':'Overview'}
                    </button>
                  ))}
                </fieldset>

                {/* Video Shape Presets */}
                <fieldset className="kl-share-presets">
                  <legend>Video shape</legend>
                  {(Object.keys(STORY_PRESETS) as StoryPreset[]).map(value=>(
                    <button
                      key={value}
                      type="button"
                      aria-pressed={preset===value}
                      disabled={busy}
                      onClick={()=>{setPreset(value);setResult(null);}}
                    >
                      {STORY_PRESETS[value].label}
                      <small>{STORY_PRESETS[value].ratio}</small>
                    </button>
                  ))}
                </fieldset>
              </>
            ):format==='photo'?(
              <>
                <p className="kl-share-copy">Blend your moving route with a photo. Place it where it belongs, then export a short video.</p>
                <fieldset className="kl-share-presets">
                  <legend>Video shape</legend>
                  {(Object.keys(STORY_PRESETS) as StoryPreset[]).map(value=>(
                    <button
                      key={value}
                      type="button"
                      aria-pressed={preset===value}
                      disabled={busy||(isAndroid()&&value!=='story')}
                      title={isAndroid()&&value!=='story'?'Available in the web version':undefined}
                      onClick={()=>{setPreset(value);setResult(null);}}
                    >
                      {STORY_PRESETS[value].label}
                      <small>{STORY_PRESETS[value].ratio}</small>
                    </button>
                  ))}
                </fieldset>
                <input ref={file} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void choosePhoto(e.target.files?.[0])}/>
                <Button variant="outline" disabled={busy} onClick={()=>file.current?.click()}>
                  <ImagePlus/>{hasPhoto?'Change photo':'Choose your photo'}
                </Button>
                <label>Caption<input value={caption} maxLength={50} disabled={busy} onChange={e=>{setCaption(e.target.value);setResult(null);}}/></label>
                {hasPhoto&&(
                  <>
                    <label className="kl-route-size">
                      Route size
                      <input type="range" min="160" max="700" step="10" value={placement.size} disabled={busy} onChange={event=>placeRoute(constrainPlacement({...placement,size:Number(event.target.value)}))}/>
                    </label>
                    <div className="kl-placement-help">
                      <p>Drag the route itself to place it. Pinch or use Route size to enlarge it.</p>
                      <Button variant="ghost" disabled={busy} onClick={()=>placeRoute({...DEFAULT_PLACEMENT})}><RotateCcw size={14}/>Reset</Button>
                    </div>
                  </>
                )}
              </>
            ):format==='png'?(
              <p className="kl-share-copy">A transparent route and stat strip. Copy it, then paste it directly over any photo or social post.</p>
            ):(
              <p className="kl-share-copy">A transparent moving route for apps that support animated image overlays.</p>
            )}

            {/* Metrics Checklist */}
            {format!=='sticker'&&(
              <fieldset className="kl-share-metrics">
                <legend>Show with route</legend>
                {(['distance','time','pace','date','location'] as StoryMetric[]).map(value=>(
                  <label key={value}>
                    <input
                      type="checkbox"
                      checked={metrics.includes(value)}
                      disabled={busy}
                      onChange={event=>{
                        setMetrics(current=>event.target.checked?[...current,value]:current.filter(item=>item!==value));
                        setResult(null);
                        setCopied(false);
                      }}
                    />
                    {value==='pace'&&activity.activityType==='cycle'?'speed':value}
                  </label>
                ))}
              </fieldset>
            )}

            {/* Privacy Cloak */}
            <label className="kl-route-privacy">
              <input
                aria-label="Hide the first and last 200 metres from the shared route"
                type="checkbox"
                checked={hideEnds}
                disabled={busy}
                onChange={event=>{setHideEnds(event.target.checked);setResult(null);setCopied(false);}}
              />
              <span>
                <strong>Hide the start and finish</strong>
                <small>{hideEnds?(privateRoute.applied?'First and last 200 m are removed from the shared route.':'This route is too short to mask safely; review it before sharing.'):'The complete route will be visible.'}</small>
              </span>
            </label>

            {/* Play / Pause Preview Button */}
            <Button variant="outline" disabled={busy||(format==='video3d'&&!mapReady)} onClick={()=>setPlaying(value=>!value)}>
              {playing?<Pause/>:<Play/>}{playing?'Pause preview':'Play preview'}
            </Button>

            <small>Created on this device. Review before sharing: even an unnamed route can reveal a familiar location.</small>
            {error&&<p className="kl-error" role="alert">{error}</p>}

            {/* Action & Progress */}
            {busy?(
              <output className="kl-export-progress">
                <progress max="1" value={progress}/>
                <span>{format==='video3d'?'Exporting 3D Replay Video':format==='png'?'Preparing transparent PNG':'Creating your animation'} · {Math.round(progress*100)}%</span>
                <small>Keep YourLeft open until export finishes.</small>
                {format!=='png'&&<Button variant="outline" onClick={()=>abort.current?.abort()}>Cancel export</Button>}
              </output>
            ):result?(
              <>
                <output>{copied?'Transparent PNG copied. Paste it into your photo or social app.':`Your ${result.extension.toUpperCase()} is ready.`}</output>
                {result.extension==='png'&&(
                  <Button className="kl-action" onClick={()=>void copyPng()}><Copy/>{copied?'Copied':'Copy transparent PNG'}</Button>
                )}
                {result.blob&&(
                  <Button
                    className={result.extension==='png'?'':'kl-action'}
                    variant={result.extension==='png'?'outline':'default'}
                    onClick={download}
                  >
                    <Download/>
                    {result.extension==='png'?'Download PNG':result.extension==='gif'?'Download GIF':format==='video3d'?'Download 3D Video':'Download Story Video'}
                  </Button>
                )}
                <Button variant="outline" onClick={()=>void share()}>
                  <Share2/>
                  {result.id?'Share with Apps':'Share'}
                </Button>
                <Button variant="ghost" onClick={()=>{setResult(null);setCopied(false);}}>
                  <ArrowLeft/>Back to editing
                </Button>
              </>
            ):(
              <Button
                className="kl-action"
                disabled={busy||(format==='photo'&&!hasPhoto)||(format==='video3d'&&!mapReady)}
                onClick={()=>void makeExport(format==='video3d'?'video3d':format==='png'?'png':format==='sticker'?'gif':'video')}
              >
                {format==='png'?<Copy/>:<Share2/>}
                {format==='video3d'?'Export 3D Replay Video':format==='png'?'Prepare transparent PNG':format==='sticker'?'Export animated GIF':'Export Photo Story'}
              </Button>
            )}

            <details className="kl-share-advanced">
              <summary>Export details</summary>
              <p>
                3D Moment exports a {STORY_PRESETS[preset].ratio} video of your run through the real-world miniature diorama.
                Estimated video length: ~{formatVideoDuration(videoSec)} at {speed}× speed.
                Transparent PNG copies instantly with no background.
              </p>
            </details>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
