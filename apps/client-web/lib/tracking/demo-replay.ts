import {route,lengths,sampleRoute,type ActivitySnapshot} from './activity';
import type {SavedActivity} from './storage';
import type {AcceptedFix} from './location';

/** A clearly labeled preview, never added to the GPS activity library. */
export function demoReplayRecord(snapshot:ActivitySnapshot):SavedActivity {
  const samples:AcceptedFix[]=[];let distance=0;
  const start=Date.now();
  for(let i=0;i<route.length;i++){
    distance+=lengths[i];const activeElapsedMs=distance/3.2*1000;
    if(activeElapsedMs>snapshot.elapsedMs)break;
    samples.push({...route[i],accuracyM:1,timestampMs:start+activeElapsedMs,activeElapsedMs,breakBefore:i===0});
  }
  const tip=sampleRoute(snapshot.progress);
  if(snapshot.elapsedMs>(samples.at(-1)?.activeElapsedMs||0))samples.push({...tip,accuracyM:1,timestampMs:start+snapshot.elapsedMs,activeElapsedMs:snapshot.elapsedMs,breakBefore:false});
  return {version:1,id:'demo-preview',source:'demo',placeName:'Madmaheshwar · Uttarakhand',startedAtMs:start,endedAtMs:start+snapshot.elapsedMs,samples,snapshot:{...snapshot,status:'complete',speedMps:0}};
}
