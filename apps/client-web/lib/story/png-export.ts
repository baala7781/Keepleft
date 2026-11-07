import type {StoryMetric,StoryScene} from './scene';
import {isAndroid} from '../native/bridge';
import {NativeStory,type StoryExport} from './export';

export async function exportRoutePng(scene:StoryScene,metrics:StoryMetric[]=['distance','time','pace']):Promise<StoryExport>{
  scene.drawOverlay(12,metrics);
  const blob=await new Promise<Blob>((resolve,reject)=>scene.overlay.toBlob(value=>value?resolve(value):reject(new Error('Could not create the transparent PNG.')),'image/png'));
  if(!isAndroid())return {blob,extension:'png'};
  const png=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==='string'?resolve(reader.result.split(',')[1]):reject(new Error('Could not prepare the PNG.'));reader.onerror=()=>reject(new Error('Could not prepare the PNG.'));reader.readAsDataURL(blob);});
  const {id}=await NativeStory.saveImage({png});return {id,blob,extension:'png'};
}

export async function copyRoutePng(result:StoryExport):Promise<void>{
  if(result.id&&isAndroid()){await NativeStory.copyImage({id:result.id});return;}
  const blob=result.blob;if(!blob)throw new Error('Create the PNG again before copying.');
  if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw new Error('Image copy is not supported on this device. Use Share or Download instead.');
  await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
}
