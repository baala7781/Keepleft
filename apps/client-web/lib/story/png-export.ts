import type {StoryMetric,StoryScene} from './scene';
import {isAndroid} from '../native/bridge';
import {NativeStory,type StoryExport} from './export';

/**
 * Trims transparent border pixels so the exported PNG is tightly cut to the route
 * and metrics rather than an unwieldy giant square canvas.
 */
export function cropTransparentCanvas(source: HTMLCanvasElement, padding = 24): HTMLCanvasElement {
  if (!source || typeof source.getContext !== 'function' || !source.width || !source.height) {
    return source;
  }
  try {
    const ctx = source.getContext('2d', { willReadFrequently: true });
    if (!ctx) return source;
    const { width, height } = source;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let hasPixels = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasPixels = true;
        }
      }
    }

    if (!hasPixels) return source;

    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropW = Math.min(width - cropX, maxX - minX + 1 + padding * 2);
    const cropH = Math.min(height - cropY, maxY - minY + 1 + padding * 2);

    const cropped = document.createElement('canvas');
    cropped.width = cropW;
    cropped.height = cropH;
    const croppedCtx = cropped.getContext('2d');
    if (croppedCtx) {
      croppedCtx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      return cropped;
    }
    return source;
  } catch {
    return source;
  }
}

export async function exportRoutePng(scene:StoryScene,metrics:StoryMetric[]=['distance','time','pace']):Promise<StoryExport>{
  scene.drawOverlay(12,metrics);
  const target = cropTransparentCanvas(scene.overlay);
  const blob=await new Promise<Blob>((resolve,reject)=>target.toBlob(value=>value?resolve(value):reject(new Error('Could not create the transparent PNG.')),'image/png'));
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
