'use client';
import {useEffect,useRef,useState} from 'react';
import {ImagePlus,Play,Pause,Share2,X,ArrowLeft,RotateCcw} from 'lucide-react';
import {Button} from './ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './ui/dialog';
import type {SavedActivity} from '@/lib/tracking/storage';
import {createStoryScene,type StoryScene,type StoryOptions,type StoryMetric} from '@/lib/story/scene';
import {exportStory,NativeStory,type StoryExport} from '@/lib/story/export';
import {exportSticker} from '@/lib/story/sticker-export';
import {isAndroid} from '@/lib/native/bridge';
import {DEFAULT_PLACEMENT,type RoutePlacement} from '@/lib/story/placement';
import {StoryPlacementControls} from './story-placement-controls';
import {STORY_PRESETS,type StoryPreset} from '@/lib/story/presets';

export function StoryStudio({activity,onClose}:{activity:SavedActivity;onClose:()=>void}){
  const host=useRef<HTMLDivElement>(null),scene=useRef<StoryScene|undefined>(undefined),photo=useRef<ImageBitmap|undefined>(undefined);
  const options=useRef<StoryOptions>({caption:'Every step, part of my story.',placement:{...DEFAULT_PLACEMENT},metrics:['distance','time']});
  const [ready,setReady]=useState(false),[hasPhoto,setHasPhoto]=useState(false),[caption,setCaption]=useState(options.current.caption),[placement,setPlacement]=useState<RoutePlacement>({...DEFAULT_PLACEMENT});
  const [format,setFormat]=useState<'photo'|'sticker'>('photo'),[metrics,setMetrics]=useState<StoryMetric[]>(['distance','time']);
  const [preset,setPreset]=useState<StoryPreset>('story');
  const [playing,setPlaying]=useState(true),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState(''),[result,setResult]=useState<StoryExport|null>(null);
  const [videoUrl,setVideoUrl]=useState('');
  const abort=useRef<AbortController|null>(null),playRef=useRef(false),busyRef=useRef(false),photoGeneration=useRef(0),file=useRef<HTMLInputElement>(null);
  playRef.current=playing;busyRef.current=busy;options.current={photo:photo.current,caption,placement,metrics,preset};
  useEffect(()=>{
    let removed=false,raf=0,elapsed=0,last=0;
    void createStoryScene(activity).then(value=>{
      if(removed){value.dispose();return;}scene.current=value;host.current?.appendChild(value.canvas);host.current?.appendChild(value.sticker);setReady(true);
      const tick=(now:number)=>{if(last&&playRef.current&&!busyRef.current)elapsed=(elapsed+Math.min(.1,(now-last)/1000))%12;last=now;if(!busyRef.current)value.draw(elapsed,options.current);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
    }).catch(()=>{if(!removed)setError('The recorded route could not load. Close this screen and try again.');});
    return ()=>{removed=true;photoGeneration.current++;abort.current?.abort();cancelAnimationFrame(raf);scene.current?.dispose();scene.current=undefined;photo.current?.close();};
  },[activity]);
  useEffect(()=>{const hidden=()=>{if(document.hidden){setPlaying(false);abort.current?.abort();}};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},[]);
  useEffect(()=>{if(!result?.blob){setVideoUrl('');return;}const url=URL.createObjectURL(result.blob);setVideoUrl(url);return()=>URL.revokeObjectURL(url);},[result]);
  const choosePhoto=async(value:File|undefined)=>{
    if(!value)return;const generation=++photoGeneration.current;setError('');setResult(null);
    if(value.size>25*1024*1024||!['image/jpeg','image/png','image/webp'].includes(value.type)){setError('Choose a JPG, PNG or WebP photo smaller than 25 MB.');return;}
    try{const bitmap=await createImageBitmap(value,{resizeWidth:1440,resizeQuality:'high'});if(generation!==photoGeneration.current){bitmap.close();return;}photo.current?.close();photo.current=bitmap;options.current.photo=bitmap;setHasPhoto(true);}
    catch{setError('This photo could not be opened. Try a different image.');}
  };
  const makeVideo=async(format:'video'|'gif'='video')=>{
    if(!scene.current||busy||(format==='video'&&!hasPhoto))return;
    const controller=new AbortController();abort.current=controller;busyRef.current=true;setBusy(true);setPlaying(false);setProgress(0);setError('');setResult(null);
    try{setResult(format==='gif'?await exportSticker(scene.current,controller.signal,setProgress):await exportStory(scene.current,options.current,controller.signal,setProgress));}
    catch(e){setError(e instanceof Error&&e.name==='AbortError'?'Export cancelled. Your run and photo are unchanged.':e instanceof Error?e.message:'Could not export the video.');}
    finally{busyRef.current=false;setBusy(false);abort.current=null;}
  };
  const share=async()=>{
    if(!result)return;setError('');
    try{if(result.id)await NativeStory.shareStory({id:result.id});else if(result.blob){const url=URL.createObjectURL(result.blob),a=document.createElement('a');a.href=url;a.download=`keepleft-story.${result.extension}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}}
    catch{setError('Could not open sharing. Try again.');}
  };
  const placeRoute=(value:RoutePlacement)=>{options.current={...options.current,placement:value};setPlacement(value);setResult(null);};
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="kl-studio" showCloseButton={false}>
    <header className="kl-studio-top"><div><DialogTitle>Share your run</DialogTitle><DialogDescription>Choose how your route moves beyond the map.</DialogDescription></div><Button variant="ghost" aria-label="Close share studio" disabled={busy} onClick={onClose}><X/></Button></header>
    <div className="kl-studio-body"><div className={`kl-story-preview${format==='sticker'||result?.extension==='gif'?' kl-gif-preview':''}`} data-format={format} data-preset={preset} aria-label="Live share preview"><div ref={host} hidden={!!videoUrl}>{!ready&&<span>{error?'Preview unavailable':'Drawing your route…'}</span>}</div>{ready&&format==='photo'&&hasPhoto&&!busy&&!result&&<StoryPlacementControls value={placement} preset={preset} onChange={placeRoute}/>} {videoUrl&&(result?.extension==='gif'?<img src={videoUrl} alt="Exported transparent animated route sticker"/>:<video controls playsInline preload="metadata" src={videoUrl} aria-label="Exported story video"/>)}</div>
    <section className="kl-story-editor" aria-label="Share settings">
      <p className="kl-eyebrow">LIVE PREVIEW · ROUTE IN MOTION</p>
      <div className="kl-share-formats" role="group" aria-label="Share format"><button type="button" aria-pressed={format==='photo'} disabled={busy} onClick={()=>{setFormat('photo');setResult(null);}}>Photo Story</button><button type="button" aria-pressed={format==='sticker'} disabled={busy} onClick={()=>{setFormat('sticker');setResult(null);}}>Route Sticker</button><button type="button" disabled title="World Clip is planned for a later release">World Clip <small>Later</small></button></div>
      {format==='photo'?<>
        <p className="kl-share-copy">Blend your moving route with a photo. Place it where it belongs, then export a short video.</p>
        <fieldset className="kl-share-presets"><legend>Video shape</legend>{(Object.keys(STORY_PRESETS) as StoryPreset[]).map(value=><button key={value} type="button" aria-pressed={preset===value} disabled={busy||(isAndroid()&&value!=='story')} title={isAndroid()&&value!=='story'?'Available in the web version':undefined} onClick={()=>{setPreset(value);setResult(null);}}>{STORY_PRESETS[value].label}<small>{STORY_PRESETS[value].ratio}</small></button>)}</fieldset>
        <input ref={file} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void choosePhoto(e.target.files?.[0])}/>
        <Button variant="outline" disabled={busy} onClick={()=>file.current?.click()}><ImagePlus/>{hasPhoto?'Change photo':'Choose your photo'}</Button>
        <label>Caption<input value={caption} maxLength={50} disabled={busy} onChange={e=>{setCaption(e.target.value);setResult(null);}}/></label>
        <fieldset className="kl-share-metrics"><legend>Show on story</legend>{(['distance','time','pace','date','location'] as StoryMetric[]).map(value=><label key={value}><input type="checkbox" checked={metrics.includes(value)} disabled={busy} onChange={event=>{setMetrics(current=>event.target.checked?[...current,value]:current.filter(item=>item!==value));setResult(null);}}/>{value==='pace'&&activity.activityType==='cycle'?'speed':value}</label>)}</fieldset>
        {hasPhoto&&<div className="kl-placement-help"><p>Drag the route on your photo. Pull its corner to resize.</p><Button variant="ghost" disabled={busy} onClick={()=>placeRoute({...DEFAULT_PLACEMENT})}><RotateCcw size={14}/>Reset placement</Button></div>}
      </>:<p className="kl-share-copy">A transparent moving route for apps that support animated image overlays.</p>}
      <Button variant="outline" disabled={!ready||busy} onClick={()=>setPlaying(value=>!value)}>{playing?<Pause/>:<Play/>}{playing?'Pause preview':'Play preview'}</Button>
      <small>Created on this device. Review before sharing: even an unnamed route can reveal a familiar location.</small>
      {error&&<p className="kl-error" role="alert">{error}</p>}
      {busy?<div className="kl-export-progress" role="status"><progress max="1" value={progress}/><span>Creating your animation · {Math.round(progress*100)}%</span><small>Keep Keepleft open until export finishes.</small><Button variant="outline" onClick={()=>abort.current?.abort()}>Cancel export</Button></div>:result?<><p role="status">Your {result.extension.toUpperCase()} is ready.</p>{videoUrl&&!isAndroid()?<a className="kl-download" href={videoUrl} download={`keepleft-${result.extension==='gif'?'route-sticker':'story'}.${result.extension}`}><Share2 size={16}/>{result.extension==='gif'?'Download Route Sticker':'Download Photo Story'}</a>:<Button className="kl-action" onClick={()=>void share()}><Share2/>{result.extension==='gif'?'Share Route Sticker':'Share Photo Story'}</Button>}<Button variant="ghost" onClick={()=>setResult(null)}><ArrowLeft/>Back to editing</Button></>:<Button className="kl-action" disabled={!ready||(format==='photo'&&!hasPhoto)} onClick={()=>void makeVideo(format==='sticker'?'gif':'video')}><Share2/>{format==='sticker'?'Export Route Sticker':'Export Photo Story'}</Button>}
      <details className="kl-share-advanced"><summary>Export details</summary><p>Photo Story: {STORY_PRESETS[preset].ratio} video{isAndroid()?' (other shapes are available in the web version)':''}. Route Sticker: transparent looping GIF; support depends on the app where you paste it.</p></details>
    </section></div>
  </DialogContent></Dialog>;
}
