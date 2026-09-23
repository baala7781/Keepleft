import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {stabilizeReplayTiming} from './replay-timing';
import {distanceBetween,type AcceptedFix} from './location';

// Opt-in local diagnostic. Never commit the input, location names or coordinates.
it.skipIf(!process.env.KEEPLEFT_PRIVATE_RUN)('checks a private recording without emitting coordinates',()=>{
  const data=JSON.parse(readFileSync(process.env.KEEPLEFT_PRIVATE_RUN!,'utf8'));
  const samples:AcceptedFix[]=data.features.flatMap((f:{geometry:{type:string;coordinates:number[]|number[][]};properties:{timestamps:number[];activeElapsedMs:number[];accuracyM:number[]}})=>{
    const coords=f.geometry.type==='Point'?[f.geometry.coordinates as number[]]:f.geometry.coordinates as number[][];
    return coords.map(([lng,lat],i)=>({lng,lat,timestampMs:f.properties.timestamps[i],activeElapsedMs:f.properties.activeElapsedMs[i],accuracyM:f.properties.accuracyM[i],breakBefore:i===0}));
  });
  const original=structuredClone(samples),times=samples.map(p=>p.activeElapsedMs!),result=stabilizeReplayTiming(samples,times);
  const turns=(indices:number[])=>indices.filter((index,j)=>{
    if(j<2)return false;const a=samples[indices[j-2]],b=samples[indices[j-1]],c=samples[index];
    if(b.breakBefore||c.breakBefore)return false;
    const cos=Math.cos(b.lat*Math.PI/180),ux=(b.lng-a.lng)*cos,uy=b.lat-a.lat,vx=(c.lng-b.lng)*cos,vy=c.lat-b.lat;
    return ux*vx+uy*vy<0;
  }).length;
  const maximumSpeed=(t:number[])=>Math.max(...samples.map((p,i)=>i&&!p.breakBefore?distanceBetween(samples[i-1],p)/Math.max(.001,(t[i]-t[i-1])/1000):0));
  expect(samples).toEqual(original);expect(result.times.at(-1)).toBe(times.at(-1));
  expect(result.times.every((t,i)=>!i||t>=result.times[i-1])).toBe(true);
  console.info(JSON.stringify({points:samples.length,displayPoints:result.indices.length,rawSharpTurns:turns(samples.map((_,i)=>i)),displaySharpTurns:turns(result.indices),maxDeliverySpeed:Math.round(maximumSpeed(times)),maxMeasurementSpeed:Math.round(maximumSpeed(result.times))}));
});
