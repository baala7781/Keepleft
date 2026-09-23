import {encodeGif} from './gif-encoding';
import type {StoryScene} from './scene';
import {isAndroid} from '../native/bridge';
import {NativeStory,type StoryExport} from './export';
export {stickerIndices,stickerPalette} from './gif-palette';
export async function exportSticker(scene:StoryScene,signal:AbortSignal,progress:(p:number)=>void):Promise<StoryExport>{
  const ctx=scene.sticker.getContext('2d')!;
  const blob=await encodeGif(i=>{scene.drawSticker(i/15);return ctx.getImageData(0,0,480,480).data;},signal,progress);
  if(isAndroid()){
    const gif=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
    signal.throwIfAborted();const {id}=await NativeStory.saveSticker({gif});return {id,blob,extension:'gif'};
  }return {blob,extension:'gif'};
}
