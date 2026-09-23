// Exercise the production compositor and GIF encoder with a synthetic route, not personal GPS.
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
const canvasModule=process.argv[2],out=process.argv[3];
if(!canvasModule||!out)throw Error('Pass a Canvas-compatible module path and output directory.');
const {createCanvas,loadImage}=await import(canvasModule);
globalThis.document={createElement(name){if(name!=='canvas')throw Error('Unexpected element');return createCanvas(720,1280);}};
const result=await build({stdin:{contents:`export {createStoryScene} from './lib/story/scene.ts'; export {exportSticker} from './lib/story/sticker-export.ts'; export {demoReplayRecord} from './lib/tracking/demo-replay.ts'; export {lengths} from './lib/tracking/activity.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'node22'});
const api=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const distance=api.lengths.reduce((a,b)=>a+b,0),activity=api.demoReplayRecord({status:'complete',distanceM:distance,elapsedMs:distance/3.2*1000,progress:1,speedMps:0});
const scene=await api.createStoryScene(activity),controller=new AbortController();
await fs.mkdir(out,{recursive:true});
const gif=await api.exportSticker(scene,controller.signal,()=>{});
await fs.writeFile(path.join(out,'synthetic-route-sticker.gif'),new Uint8Array(await gif.blob.arrayBuffer()));
const photo=await loadImage('/private/tmp/keepleft-assets/export-test.png');
scene.draw(6,{photo,caption:'Synthetic export test',placement:{x:360,y:650,size:580}});
await fs.writeFile(path.join(out,'synthetic-photo-frame.png'),scene.canvas.toBuffer('image/png'));
scene.drawSticker(0);await fs.writeFile(path.join(out,'sticker-first-frame.png'),scene.sticker.toBuffer('image/png'));
scene.drawSticker(6);await fs.writeFile(path.join(out,'sticker-mid-frame.png'),scene.sticker.toBuffer('image/png'));
// Moved/resized acceptance image exercises the same compositor used for export.
scene.draw(6,{photo,caption:'Synthetic export test',placement:{x:200,y:870,size:300}});
await fs.writeFile(path.join(out,'synthetic-photo-repositioned.png'),scene.canvas.toBuffer('image/png'));
const started=Date.now();for(let i=0;i<360;i++)scene.draw(i/30,{photo,caption:'Synthetic export test',placement:{x:360,y:650,size:580}});
scene.dispose();console.log(JSON.stringify({gifBytes:gif.blob.size,dimensions:[480,480],durationSeconds:12,frameCount:180,compositorFramesPerSecond:Math.round(360000/(Date.now()-started)),synthetic:true}));
