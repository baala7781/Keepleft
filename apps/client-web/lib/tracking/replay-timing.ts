import {distanceBetween,type AcceptedFix} from './location';

/** Repair known delivery artifacts without editing saved samples or totals.
 * Raw segment boundaries remain measurement truth; presentation may bridge only
 * a short, nearby recorder reconnect with confirmed movement on both sides. */
export function stabilizeReplayTiming(samples:AcceptedFix[],originalTimes:number[]){
  const times=[...originalTimes],bursts:number[]=[];
  for(let i=1;i<samples.length;i++){
    const measured=samples[i].timestampMs-samples[i-1].timestampMs,delivered=originalTimes[i]-originalTimes[i-1];
    if(!samples[i].breakBefore&&delivered<=150&&measured>=400&&measured<=5000)bursts.push(i);
  }
  let start=0,dropouts=0;
  const affected=new Set(bursts);
  for(let end=1;end<=samples.length;end++)if(end===samples.length||samples[end].breakBefore){
    const last=end-1,span=samples[last].timestampMs-samples[start].timestampMs,active=originalTimes[last]-originalTimes[start];
    if(span>0&&active>0&&Array.from({length:end-start},(_,i)=>start+i).some(i=>affected.has(i))){
      for(let i=start;i<end;i++)times[i]=originalTimes[start]+(samples[i].timestampMs-samples[start].timestampMs)*active/span;
    }
    // Android can stop delivering fixes for several seconds and then emit a
    // nearly unchanged stale fix before normal movement resumes. Replaying that
    // interval literally creates a deterministic stop/jump at the same place on
    // every device. Compress only this strong dropout signature, then spread the
    // saved time across the other intervals so the activity duration stays exact.
    const intervals=Array.from({length:Math.max(0,end-start-1)},(_,offset)=>start+offset+1);
    const stale=new Map<number,number>();
    for(const i of intervals){
      if(i<=start+1||i+1>=end)continue;
      const dt=times[i]-times[i-1],previousDt=times[i-1]-times[i-2],nextDt=times[i+1]-times[i];
      if(dt<5000||previousDt<=0||nextDt<=0)continue;
      const movement=distanceBetween(samples[i-1],samples[i]);
      const beforeSpeed=distanceBetween(samples[i-2],samples[i-1])/(previousDt/1000);
      const afterSpeed=distanceBetween(samples[i],samples[i+1])/(nextDt/1000);
      const noiseRadius=Math.max(8,samples[i-1].accuracyM,samples[i].accuracyM);
      if(movement<=noiseRadius&&beforeSpeed>=1&&afterSpeed>=1){
        stale.set(i,Math.max(500,Math.min(2000,(previousDt+nextDt)/2)));dropouts++;
      }
    }
    if(stale.size){
      const durations=intervals.map(i=>times[i]-times[i-1]);
      const saved=intervals.reduce((sum,i,j)=>sum+(stale.has(i)?durations[j]-stale.get(i)!:0),0);
      const ordinary=intervals.reduce((sum,i,j)=>sum+(stale.has(i)?0:durations[j]),0);
      let cursor=times[start];
      intervals.forEach((i,j)=>{cursor+=stale.get(i)??durations[j]+(ordinary>0?saved*durations[j]/ordinary:0);times[i]=cursor;});
      times[last]=originalTimes[last];
    }
    start=end;
  }
  // A short recorder reconnect can create a new segment even though its two
  // endpoints are effectively the same place and movement continues on both
  // sides. Keep that measurement boundary in the saved/raw route, but bridge it
  // for presentation so a system reconnect is not shown as a deliberate stop.
  const bridgedIndices:number[]=[];
  for(let i=2;i+1<samples.length;i++){
    if(!samples[i].breakBefore)continue;
    const dt=times[i]-times[i-1],previousDt=times[i-1]-times[i-2],nextDt=times[i+1]-times[i];
    if(dt<2000||dt>30000||previousDt<=0||nextDt<=0)continue;
    const movement=distanceBetween(samples[i-1],samples[i]);
    const beforeSpeed=distanceBetween(samples[i-2],samples[i-1])/(previousDt/1000);
    const afterSpeed=distanceBetween(samples[i],samples[i+1])/(nextDt/1000);
    const noiseRadius=Math.max(12,samples[i-1].accuracyM,samples[i].accuracyM);
    if(movement<=noiseRadius&&beforeSpeed>=1&&afterSpeed>=1)bridgedIndices.push(i);
  }
  const presentationTimes=[...times];
  if(bridgedIndices.length){
    const bridged=new Set(bridgedIndices),durations=times.slice(1).map((time,i)=>time-times[i]);
    const target=250,saved=bridgedIndices.reduce((sum,i)=>sum+Math.max(0,durations[i-1]-target),0);
    const ordinary=durations.reduce((sum,dt,index)=>sum+(!bridged.has(index+1)&&!samples[index+1].breakBefore?dt:0),0);
    let cursor=times[0];
    for(let i=1;i<times.length;i++){
      const dt=durations[i-1];
      cursor+=bridged.has(i)?target:dt+(!samples[i].breakBefore&&ordinary>0?saved*dt/ordinary:0);
      presentationTimes[i]=cursor;
    }
    presentationTimes[presentationTimes.length-1]=times[times.length-1];
  }
  // Repeated paired deliveries are characteristic of the old competing-provider
  // recorder. For the optional display path, retain the newest measured fix of
  // each pair. Do not smooth arbitrary corners, invent coordinates or edit storage.
  const redundant=new Set<number>();
  if(bursts.length>=3)for(const i of bursts)if(!samples[i-1].breakBefore&&distanceBetween(samples[i-1],samples[i])>=3)redundant.add(i-1);
  return {times,presentationTimes,bridgedIndices,indices:samples.map((_,i)=>i).filter(i=>!redundant.has(i)),corrected:bursts.length>0||dropouts>0||bridgedIndices.length>0};
}
