import {isAndroid,NativeRun} from '../native/bridge';
import {STORY_FPS,STORY_SECONDS} from './timeline';
import type {StoryOptions,StoryScene} from './scene';
import {STORY_PRESETS} from './presets';

export interface StoryBridge {
  beginStory(options?:{width:number;height:number}):Promise<{id:string}>;
  storyFrame(options:{id:string;index:number;jpeg:string}):Promise<void>;
  finishStory(options:{id:string}):Promise<void>;
  cancelStory(options:{id:string}):Promise<void>;
  shareStory(options:{id:string}):Promise<void>;
  saveSticker(options:{gif:string}):Promise<{id:string}>;
}
export const NativeStory=NativeRun as unknown as StoryBridge;
export type StoryExport={id?:string;blob?:Blob;extension:'mp4'|'webm'|'gif'};
export async function exportNativeStory(scene:StoryScene,options:StoryOptions,signal:AbortSignal,progress:(p:number)=>void,bridge:StoryBridge=NativeStory):Promise<StoryExport>{
  signal.throwIfAborted();const {width,height}=STORY_PRESETS[options.preset??'story'];
  const {id}=await bridge.beginStory({width,height});
  try{
    for(let i=0;i<STORY_SECONDS*STORY_FPS;i++){
      signal.throwIfAborted();scene.draw(i/STORY_FPS,options);
      // One frame in flight: avoids retaining hundreds of full-resolution bitmaps.
      const jpeg=await jpegFrame(scene.canvas,signal);signal.throwIfAborted();
      await bridge.storyFrame({id,index:i,jpeg});progress((i+1)/(STORY_SECONDS*STORY_FPS));
    }
    signal.throwIfAborted();await bridge.finishStory({id});return {id,extension:'mp4'};
  }catch(error){await bridge.cancelStory({id}).catch(()=>{});throw error;}
}
async function jpegFrame(canvas:HTMLCanvasElement,signal:AbortSignal):Promise<string>{
  // Browser JPEG encoding can run asynchronously; don't block each UI frame
  // with a full-resolution synchronous toDataURL compression.
  if(!canvas.toBlob)return canvas.toDataURL('image/jpeg',.93).split(',')[1];
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not encode this frame.')),'image/jpeg',.93));
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const reader=new FileReader(),abort=()=>{reader.abort();reject(new DOMException('Cancelled','AbortError'));};
    signal.addEventListener('abort',abort,{once:true});
    reader.onload=()=>{signal.removeEventListener('abort',abort);resolve(String(reader.result).split(',')[1]);};
    reader.onerror=()=>{signal.removeEventListener('abort',abort);reject(new Error('Could not read the encoded frame.'));};
    reader.onabort=()=>signal.removeEventListener('abort',abort);reader.readAsDataURL(blob);
  });
}
export async function exportStory(scene:StoryScene,options:StoryOptions,signal:AbortSignal,progress:(p:number)=>void):Promise<StoryExport>{
  if(isAndroid())return exportNativeStory(scene,options,signal,progress);
  if(!globalThis.MediaRecorder||!scene.canvas.captureStream)throw new Error('Video export is unavailable in this browser. Use the Android app or a recent Chrome browser.');
  const mime=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw new Error('No supported video encoder is available in this browser.');
  signal.throwIfAborted();scene.draw(0,options);
  const stream=scene.canvas.captureStream(STORY_FPS),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000}),chunks:BlobPart[]=[];
  let raf=0,start=0;
  try{return await new Promise<StoryExport>((resolve,reject)=>{
    const stop=()=>{cancelAnimationFrame(raf);if(recorder.state!=='inactive')recorder.stop();};
    const abort=()=>{stop();reject(new DOMException('Cancelled','AbortError'));};signal.addEventListener('abort',abort,{once:true});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>{signal.removeEventListener('abort',abort);stop();reject(new Error('The browser could not finish the video.'));};
    recorder.onstop=()=>{signal.removeEventListener('abort',abort);if(!signal.aborted)resolve({blob:new Blob(chunks,{type:mime.split(';')[0]}),extension:mime.startsWith('video/mp4')?'mp4':'webm'});};
    const tick=(now:number)=>{if(!start)start=now;const seconds=Math.min(STORY_SECONDS,(now-start)/1000);scene.draw(seconds,options);progress(seconds/STORY_SECONDS);if(seconds>=STORY_SECONDS)stop();else raf=requestAnimationFrame(tick);};
    recorder.start(500);raf=requestAnimationFrame(tick);
  });}finally{cancelAnimationFrame(raf);stream.getTracks().forEach(t=>t.stop());if(recorder.state!=='inactive')recorder.stop();}
}
