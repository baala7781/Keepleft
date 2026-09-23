import fs from 'node:fs/promises';
import {build} from 'esbuild';
const result=await build({stdin:{contents:`export {RoutePresentation} from './lib/renderer/route-presentation.ts';export {buildingForms} from './lib/renderer/buildings.ts';export {LocalENU} from '../../packages/geo/index.ts';export {route} from './lib/tracking/activity.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'node22'});
const api=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const data=JSON.parse(await fs.readFile('public/fixtures/hussain-sagar/world.geojson','utf8')),manifest=JSON.parse(await fs.readFile('public/fixtures/hussain-sagar/manifest.json','utf8'));
const frame=new api.LocalENU(manifest.origin),forms=api.buildingForms(data,frame),start=performance.now(),presentation=new api.RoutePresentation(data,frame,forms),buildMs=performance.now()-start;
const a=frame.project(api.route[0]),b=frame.project(api.route[1]),input=[];
for(let i=0;i<4096;i++){const t=i/4095;const p=frame.unproject({x:a.x+(b.x-a.x)*t+Math.sin(i/10)*2,y:a.y+(b.y-a.y)*t,z:0});input.push({lng:p.lng,lat:p.lat,breakBefore:i===0});}
const firstAt=performance.now();presentation.trail(input);const firstMs=performance.now()-firstAt;
const costs=[];for(let i=0;i<100;i++){const p=input.at(-1);p.lat+=1e-10;const at=performance.now();presentation.trail(input);presentation.position(p);costs.push(performance.now()-at);}
costs.sort((a,b)=>a-b);console.log(JSON.stringify({synthetic:true,inputPoints:input.length,worldFeatures:data.features.length,buildingForms:forms.length,buildMs,initialRouteMs:firstMs,movingTipMedianMs:costs[50],movingTipP95Ms:costs[95]}));
