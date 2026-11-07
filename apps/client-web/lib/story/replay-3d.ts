import {isAndroid} from '../native/bridge';
import type {SavedActivity} from '../tracking/storage';
import {ReplayRuntime} from '../tracking/replay';
import type {MotionSource,MotionPoint} from '../tracking/motion-source';
import type {ActivitySnapshot} from '../tracking/activity';
import type {Bounds} from '../geodata/osm';
import {activityStats,formatActivityTime} from '../tracking/activity-stats';
import {displayPlace} from '../geodata/display-place';
import {STORY_PRESETS,type StoryPreset} from './presets';
import type {StoryBridge,StoryExport} from './export';
import {NativeStory} from './export';

export const REPLAY_3D_SPEEDS=[2,3,8,10,20] as const;
export type Replay3DSpeed=typeof REPLAY_3D_SPEEDS[number];
export type StoryMetric='distance'|'time'|'pace'|'date'|'location';

export interface Replay3DOptions {
  speed: Replay3DSpeed;
  cameraMode?: 'follow'|'orbit'|'overview';
  metrics?: StoryMetric[];
  preset?: StoryPreset;
  hideEnds?: boolean;
  forceNative?: boolean;
}

export class StoryReplayRuntime implements MotionSource {
  readonly source='replay' as const;
  private readonly inner:ReplayRuntime;
  private currentSpeed:number;
  private isPlaying=true;
  private currentElapsedMs=0;
  private lastUpdateMs=0;

  constructor(activity:SavedActivity,initialSpeed:number=8){
    this.inner=new ReplayRuntime(activity);
    this.currentSpeed=initialSpeed;
    this.lastUpdateMs=typeof performance!=='undefined'?performance.now():0;
  }

  get durationMs():number{
    return this.inner.durationMs;
  }

  get isDemoReplay():boolean{
    return this.inner.isDemoReplay;
  }

  get activityType(){
    return this.inner.activityType;
  }

  get roadAlignmentRecommended():boolean{
    return this.inner.roadAlignmentRecommended;
  }

  private tick(now=typeof performance!=='undefined'?performance.now():0){
    if(!this.isPlaying||this.inner.durationMs<=0)return;
    if(this.lastUpdateMs>0){
      const deltaMs=Math.min(250,Math.max(0,now-this.lastUpdateMs));
      this.currentElapsedMs+=deltaMs*this.currentSpeed;
      if(this.currentElapsedMs>=this.inner.durationMs){
        this.currentElapsedMs=0;
      }
      this.inner.seek(this.currentElapsedMs,now);
    }
    this.lastUpdateMs=now;
  }

  getSnapshot():ActivitySnapshot{
    this.tick();
    return this.inner.getSnapshot();
  }

  getMotion(presentation=false):MotionPoint|undefined{
    this.tick();
    return this.inner.getMotion(presentation);
  }

  getMapPosition():{lng:number;lat:number}|undefined{
    return this.inner.getMapPosition();
  }

  getTrail(presentation=false){
    return this.inner.getTrail(presentation);
  }

  setMapCoverage(bounds:Bounds|null){
    this.inner.setMapCoverage(bounds);
  }

  subscribe(listener:(snapshot:ActivitySnapshot)=>void){
    return this.inner.subscribe(listener);
  }

  play(now=typeof performance!=='undefined'?performance.now():0){
    this.isPlaying=true;
    this.lastUpdateMs=now;
  }

  pause(now=typeof performance!=='undefined'?performance.now():0){
    this.isPlaying=false;
    this.lastUpdateMs=now;
  }

  seek(timeMs:number,now=typeof performance!=='undefined'?performance.now():0){
    this.currentElapsedMs=Math.max(0,Math.min(this.inner.durationMs,timeMs));
    this.lastUpdateMs=now;
    this.inner.seek(this.currentElapsedMs,now);
  }

  setSpeed(speed:number,now=typeof performance!=='undefined'?performance.now():0){
    this.currentSpeed=speed;
    this.lastUpdateMs=now;
  }

  update(now=typeof performance!=='undefined'?performance.now():0):ActivitySnapshot{
    this.tick(now);
    return this.inner.update(now);
  }

  dispose(){
    this.isPlaying=false;
    this.inner.dispose();
  }
}

export function estimateReplayVideoDuration(durationMs:number,speed:Replay3DSpeed):number{
  if(!Number.isFinite(durationMs)||durationMs<=0)return 10;
  const rawSeconds=Math.round((durationMs/1000)/speed);
  // Bounded between 2s and 180s (3 mins) so speeds 2x..20x are distinct and accurate
  return Math.max(2,Math.min(180,rawSeconds));
}

export function formatVideoDuration(seconds:number):string{
  if(seconds<60)return `${seconds}s`;
  const mins=Math.floor(seconds/60);
  const secs=seconds%60;
  return secs>0?`${mins}m ${secs}s`:`${mins}m`;
}

export function draw3DTelemetryOverlay(
  target:CanvasRenderingContext2D,
  width:number,
  height:number,
  activity:SavedActivity,
  currentElapsedMs:number,
  totalDurationMs:number,
  options:Replay3DOptions,
){
  const progress=totalDurationMs>0?Math.min(1,Math.max(0,currentElapsedMs/totalDurationMs)):1;
  const stats=activityStats(activity);
  const currentDistanceKm=stats.distanceKm*progress;
  const speed=options.speed;
  const shown=new Set(options.metrics??['distance','time','pace']);
  const compact=options.preset!=='story';

  // Cinematic top and bottom vignettes
  target.save();
  const topFade=target.createLinearGradient(0,0,0,compact?110:140);
  topFade.addColorStop(0,'rgba(11,12,14,.85)');
  topFade.addColorStop(.7,'rgba(11,12,14,.4)');
  topFade.addColorStop(1,'rgba(11,12,14,0)');
  target.fillStyle=topFade;
  target.fillRect(0,0,width,compact?110:140);

  const bottomFade=target.createLinearGradient(0,height-(compact?150:180),0,height);
  bottomFade.addColorStop(0,'rgba(11,12,14,0)');
  bottomFade.addColorStop(.3,'rgba(11,12,14,.5)');
  bottomFade.addColorStop(1,'rgba(11,12,14,.92)');
  target.fillStyle=bottomFade;
  target.fillRect(0,height-(compact?150:180),width,compact?150:180);

  // Top header: Brand logotype + Replay speed pill
  target.textBaseline='top';
  target.fillStyle='#ffffff';
  target.font=compact?'700 20px Arial':'700 24px Arial';
  target.shadowColor='rgba(0,0,0,.85)';
  target.shadowBlur=8;
  target.shadowOffsetY=1;
  target.fillText('↖  YourLeft',28,24);

  target.font=compact?'500 12px Arial':'500 14px Arial';
  target.fillStyle='rgba(255,255,255,.7)';
  target.fillText(activity.source==='demo'?'DEMO · 3D REPLAY':'3D REPLAY MOMENT',28,compact?48:54);

  // Speed Badge Pill (top right)
  const speedText=`${speed}× SPEED`;
  target.font='700 12px Arial';
  const badgeWidth=target.measureText(speedText).width+20;
  const badgeX=width-badgeWidth-28,badgeY=24;

  target.fillStyle='rgba(227,59,99,.25)';
  target.beginPath();
  target.roundRect(badgeX,badgeY,badgeWidth,26,13);
  target.fill();
  target.strokeStyle='#e33b63';
  target.lineWidth=1.5;
  target.stroke();

  target.fillStyle='#ffffff';
  target.fillText(speedText,badgeX+10,badgeY+6);

  // Bottom HUD: Active Telemetry Metrics
  const metricItems=[
    shown.has('distance')?{label:'Distance',value:`${currentDistanceKm.toFixed(2)} km`}:null,
    shown.has('time')?{label:'Time',value:formatActivityTime(currentElapsedMs)}:null,
    shown.has('pace')?{label:activity.activityType==='cycle'?'Avg speed':'Pace',value:activity.activityType==='cycle'?`${stats.averageSpeedKph.toFixed(1)} km/h`:stats.averagePace}:null,
    shown.has('location')?{label:'Place',value:displayPlace(activity.placeName,'3D Route')}:null,
  ].filter((item):item is {label:string;value:string}=>!!item);

  if(metricItems.length){
    const colCount=Math.min(4,metricItems.length);
    const colWidth=(width-56)/colCount;
    const hudY=height-(compact?85:105);

    // Rose accent indicator above metrics
    target.fillStyle='#e33b63';
    target.fillRect(28,hudY-12,36,3);

    metricItems.forEach((item,idx)=>{
      const col=idx%colCount;
      const x=28+col*colWidth;

      if(col>0){
        target.fillStyle='rgba(255,255,255,.2)';
        target.fillRect(x-12,hudY,1,compact?36:44);
      }

      target.fillStyle='rgba(255,255,255,.65)';
      target.font=compact?'500 11px Arial':'500 13px Arial';
      target.fillText(item.label,x,hudY);

      target.fillStyle='#ffffff';
      target.font=compact?'700 17px Arial':'700 22px Arial';
      target.fillText(item.value,x,hudY+(compact?16:20));
    });
  }

  // Privacy Cloak Indicator
  if(options.hideEnds){
    target.font='500 11px Arial';
    target.fillStyle='rgba(243,161,181,.8)';
    target.fillText('🛡 Start & end masked (200m)',28,height-(compact?26:32));
  }

  // Progress Bar along very bottom
  const barY=height-4;
  target.fillStyle='rgba(255,255,255,.15)';
  target.fillRect(0,barY,width,4);

  const fillWidth=width*progress;
  const barGrad=target.createLinearGradient(0,0,fillWidth,0);
  barGrad.addColorStop(0,'#e33b63');
  barGrad.addColorStop(1,'#f3a1b5');
  target.fillStyle=barGrad;
  target.fillRect(0,barY,fillWidth,4);

  target.restore();
}

export async function exportNative3DVideo(
  compositeCanvas:HTMLCanvasElement,
  mapCanvas:HTMLCanvasElement,
  replay:ReplayRuntime|StoryReplayRuntime,
  activity:SavedActivity,
  options:Replay3DOptions,
  signal:AbortSignal,
  onProgress:(progress:number)=>void,
  bridge:StoryBridge=NativeStory,
):Promise<StoryExport>{
  signal.throwIfAborted();
  const preset=options.preset??'story';
  const {width,height}=STORY_PRESETS[preset];
  compositeCanvas.width=width;
  compositeCanvas.height=height;

  const ctx=compositeCanvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Could not initialize video composite context.');

  const totalDurationMs=replay.durationMs;
  const videoDurationSec=estimateReplayVideoDuration(totalDurationMs,options.speed);
  const fps=24;
  // Cap at 360 frames for native bridge compatibility
  const totalFrames=Math.min(360,Math.round(videoDurationSec*fps));

  const {id}=await bridge.beginStory({width,height});
  try{
    for(let i=0;i<totalFrames;i++){
      signal.throwIfAborted();
      const progress=i/(totalFrames-1||1);
      const currentElapsedMs=progress*totalDurationMs;
      replay.seek(currentElapsedMs);

      renderCompositeFrame(ctx,width,height,mapCanvas,activity,currentElapsedMs,totalDurationMs,options);
      const jpeg=await canvasToJpeg(compositeCanvas,signal);
      signal.throwIfAborted();
      await bridge.storyFrame({id,index:i,jpeg});
      onProgress((i+1)/totalFrames);
    }
    signal.throwIfAborted();
    await bridge.finishStory({id});
    return {id,extension:'mp4'};
  }catch(error){
    await bridge.cancelStory({id}).catch(()=>{});
    throw error;
  }
}

export async function exportBrowser3DVideo(
  compositeCanvas:HTMLCanvasElement,
  mapCanvas:HTMLCanvasElement,
  replay:ReplayRuntime|StoryReplayRuntime,
  activity:SavedActivity,
  options:Replay3DOptions,
  signal:AbortSignal,
  onProgress:(progress:number)=>void,
  triggerRepaint?:()=>void,
):Promise<StoryExport>{
  signal.throwIfAborted();
  const preset=options.preset??'story';
  const {width,height}=STORY_PRESETS[preset];
  compositeCanvas.width=width;
  compositeCanvas.height=height;

  const ctx=compositeCanvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Could not initialize video composite context.');

  const totalDurationMs=replay.durationMs;
  const videoDurationSec=estimateReplayVideoDuration(totalDurationMs,options.speed);
  const fps=24;
  const totalFrames=Math.round(videoDurationSec*fps);

  if(!globalThis.MediaRecorder||!compositeCanvas.captureStream){
    throw new Error('Video recording is unavailable in this browser. Use Chrome or the Android app.');
  }

  const mime=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw new Error('No supported video encoder found in this browser.');

  // Render initial frame
  replay.seek(0);
  triggerRepaint?.();
  renderCompositeFrame(ctx,width,height,mapCanvas,activity,0,totalDurationMs,options);

  const stream=compositeCanvas.captureStream(fps);
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000});
  const chunks:BlobPart[]=[];
  let frameIndex=0;
  let raf=0;

  try{
    return await new Promise<StoryExport>((resolve,reject)=>{
      const stop=()=>{
        globalThis.cancelAnimationFrame?.(raf);
        if(recorder.state!=='inactive')recorder.stop();
      };
      const abort=()=>{
        stop();
        reject(new DOMException('Cancelled','AbortError'));
      };
      signal.addEventListener('abort',abort,{once:true});

      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>{
        signal.removeEventListener('abort',abort);
        stop();
        reject(new Error('The browser video encoder encountered an error.'));
      };
      recorder.onstop=()=>{
        signal.removeEventListener('abort',abort);
        if(!signal.aborted){
          resolve({
            blob:new Blob(chunks,{type:mime.split(';')[0]}),
            extension:mime.startsWith('video/mp4')?'mp4':'webm',
          });
        }
      };

      const step=()=>{
        if(signal.aborted){abort();return;}
        frameIndex++;
        const progress=Math.min(1,frameIndex/totalFrames);
        const currentElapsedMs=progress*totalDurationMs;
        replay.seek(currentElapsedMs);
        triggerRepaint?.();

        renderCompositeFrame(ctx,width,height,mapCanvas,activity,currentElapsedMs,totalDurationMs,options);
        onProgress(progress);

        if(frameIndex>=totalFrames){
          stop();
        }else{
          raf=requestAnimationFrame(step);
        }
      };

      recorder.start(400);
      raf=requestAnimationFrame(step);
    });
  }finally{
    globalThis.cancelAnimationFrame?.(raf);
    stream.getTracks().forEach(t=>t.stop());
    if(recorder.state!=='inactive')recorder.stop();
  }
}

async function blobToBase64(blob:Blob):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      if(typeof reader.result!=='string'){reject(new Error('Failed reading video'));return;}
      resolve(reader.result.split(',')[1]);
    };
    reader.onerror=()=>reject(new Error('Failed reading video'));
    reader.readAsDataURL(blob);
  });
}

export async function export3DVideo(
  compositeCanvas:HTMLCanvasElement,
  mapCanvas:HTMLCanvasElement,
  replay:ReplayRuntime|StoryReplayRuntime,
  activity:SavedActivity,
  options:Replay3DOptions,
  signal:AbortSignal,
  onProgress:(progress:number)=>void,
  bridge:StoryBridge=NativeStory,
  triggerRepaint?:()=>void,
):Promise<StoryExport>{
  if(options.forceNative||!globalThis.MediaRecorder||!compositeCanvas.captureStream){
    return exportNative3DVideo(compositeCanvas,mapCanvas,replay,activity,options,signal,onProgress,bridge);
  }
  const result=await exportBrowser3DVideo(compositeCanvas,mapCanvas,replay,activity,options,signal,onProgress,triggerRepaint);
  if(isAndroid()&&result.blob&&bridge.saveVideo){
    try{
      const base64=await blobToBase64(result.blob);
      const saved=await bridge.saveVideo({video:base64,extension:result.extension});
      return {id:saved.id,blob:result.blob,extension:result.extension};
    }catch{
      return result;
    }
  }
  return result;
}

function renderCompositeFrame(
  ctx:CanvasRenderingContext2D,
  width:number,
  height:number,
  mapCanvas:HTMLCanvasElement,
  activity:SavedActivity,
  currentElapsedMs:number,
  totalDurationMs:number,
  options:Replay3DOptions,
){
  ctx.fillStyle='#0b0c0e';
  ctx.fillRect(0,0,width,height);

  // Draw 3D WebGL Map Canvas with aspect-ratio cover
  if(mapCanvas&&mapCanvas.width>0&&mapCanvas.height>0){
    const scale=Math.max(width/mapCanvas.width,height/mapCanvas.height);
    const destW=mapCanvas.width*scale;
    const destH=mapCanvas.height*scale;
    const destX=(width-destW)/2;
    const destY=(height-destH)/2;
    try{
      ctx.drawImage(mapCanvas,destX,destY,destW,destH);
    }catch{
      // If WebGL context is lost or protected, draw fallback background.
    }
  }

  // Draw full HUD details overlay
  draw3DTelemetryOverlay(ctx,width,height,activity,currentElapsedMs,totalDurationMs,options);
}

async function canvasToJpeg(canvas:HTMLCanvasElement,signal:AbortSignal):Promise<string>{
  if(!canvas.toBlob)return canvas.toDataURL('image/jpeg',.92).split(',')[1];
  const blob=await new Promise<Blob>((resolve,reject)=>
    canvas.toBlob(v=>v?resolve(v):reject(new Error('Could not encode frame')),'image/jpeg',.92)
  );
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    const abort=()=>{reader.abort();reject(new DOMException('Cancelled','AbortError'));};
    signal.addEventListener('abort',abort,{once:true});
    reader.onload=()=>{
      signal.removeEventListener('abort',abort);
      if(typeof reader.result!=='string'){reject(new Error('Failed reading frame'));return;}
      resolve(reader.result.split(',')[1]);
    };
    reader.onerror=()=>{signal.removeEventListener('abort',abort);reject(new Error('Failed reading frame'));};
    reader.readAsDataURL(blob);
  });
}
