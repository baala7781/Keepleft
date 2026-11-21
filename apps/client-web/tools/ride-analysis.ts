/**
 * Pure maths for inspecting a recorded ride. No I/O, no network, no coordinates
 * stored here. The private runner in tools/private/ feeds it real data locally.
 */
import {distanceBetween} from '../lib/tracking/location';

export type XY={x:number;y:number};
export type TimedFix={lng:number;lat:number;timestampMs:number;accuracyM?:number};

const percentile=(sorted:number[],fraction:number)=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*fraction))]:0;

export type TrackStats={
  fixes:number;distanceM:number;spanMs:number;averageSpeedMps:number;
  speedP50Mps:number;speedP95Mps:number;speedMaxMps:number;
  intervalP50Ms:number;intervalMaxMs:number;
  gaps:{index:number;seconds:number}[];
};

/** Distance and speed exactly as the app measures them (haversine between consecutive fixes). */
export function trackStats(fixes:readonly TimedFix[],gapSeconds=4):TrackStats{
  const speeds:number[]=[],intervals:number[]=[],gaps:{index:number;seconds:number}[]=[];
  let distanceM=0;
  for(let i=1;i<fixes.length;i++){
    const a=fixes[i-1],b=fixes[i],seconds=(b.timestampMs-a.timestampMs)/1000;
    if(!(seconds>0))continue;
    const step=distanceBetween({...a,accuracyM:a.accuracyM??0},{...b,accuracyM:b.accuracyM??0});
    distanceM+=step;speeds.push(step/seconds);intervals.push(seconds*1000);
    if(seconds>gapSeconds)gaps.push({index:i,seconds});
  }
  speeds.sort((a,b)=>a-b);intervals.sort((a,b)=>a-b);
  const spanMs=fixes.length>1?fixes[fixes.length-1].timestampMs-fixes[0].timestampMs:0;
  return {fixes:fixes.length,distanceM,spanMs,averageSpeedMps:spanMs>0?distanceM/(spanMs/1000):0,
    speedP50Mps:percentile(speeds,.5),speedP95Mps:percentile(speeds,.95),speedMaxMps:speeds.at(-1)??0,
    intervalP50Ms:percentile(intervals,.5),intervalMaxMs:intervals.at(-1)??0,gaps};
}

/** Unsigned turn angle in degrees at `b` between a→b and b→c. Returns 0 when a segment is too short to define a heading. */
export function turnAngleDeg(a:XY,b:XY,c:XY,minSegmentM=.3){
  const x1=b.x-a.x,y1=b.y-a.y,x2=c.x-b.x,y2=c.y-b.y;
  if(Math.hypot(x1,y1)<minSegmentM||Math.hypot(x2,y2)<minSegmentM)return 0;
  return Math.abs(Math.atan2(x1*y2-y1*x2,x1*x2+y1*y2))*180/Math.PI;
}

/** Indexes of vertices where the path turns by at least `angleDeg`. */
export function sharpTurns(path:readonly XY[],angleDeg=45,minSegmentM=.3){
  const out:number[]=[];
  for(let i=1;i<path.length-1;i++)if(turnAngleDeg(path[i-1],path[i],path[i+1],minSegmentM)>=angleDeg)out.push(i);
  return out;
}

/** Number of times the sign of the turn flips between consecutive sharp turns: a zigzag, not a corner. */
export function zigzags(path:readonly XY[],angleDeg=30,minSegmentM=.3){
  let flips=0,last=0;
  for(let i=1;i<path.length-1;i++){
    const a=path[i-1],b=path[i],c=path[i+1];
    if(Math.hypot(b.x-a.x,b.y-a.y)<minSegmentM||Math.hypot(c.x-b.x,c.y-b.y)<minSegmentM)continue;
    const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
    if(turnAngleDeg(a,b,c,minSegmentM)<angleDeg)continue;
    const sign=Math.sign(cross);
    if(last&&sign&&sign!==last)flips++;
    if(sign)last=sign;
  }
  return flips;
}

export function pathLength(path:readonly XY[]){
  let total=0;for(let i=1;i<path.length;i++)total+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);return total;
}

export function distanceToSegment(p:XY,a:XY,b:XY){
  const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
  const t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;
  return Math.hypot(p.x-(a.x+dx*t),p.y-(a.y+dy*t));
}

export function distanceToPolyline(p:XY,line:readonly XY[]){
  if(line.length===1)return Math.hypot(p.x-line[0].x,p.y-line[0].y);
  let best=Infinity;for(let i=1;i<line.length;i++)best=Math.min(best,distanceToSegment(p,line[i-1],line[i]));return best;
}

/** Even-odd containment against a polygon with optional holes: true when the point is solid. */
export function insidePolygon(p:XY,polygon:readonly (readonly (readonly number[])[])[]){
  const inRing=(ring:readonly (readonly number[])[])=>{
    let hit=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  };
  return inRing(polygon[0])&&!polygon.slice(1).some(inRing);
}

export type DeviationStats={meanM:number;p95M:number;maxM:number;maxIndex:number};
/** How far a displayed path strays from the recorded polyline. Display-only; recorded data is never altered. */
export function deviationFromRaw(shown:readonly XY[],raw:readonly XY[]):DeviationStats{
  if(!shown.length||!raw.length)return {meanM:0,p95M:0,maxM:0,maxIndex:-1};
  const values=shown.map(p=>distanceToPolyline(p,raw)),sorted=[...values].sort((a,b)=>a-b);
  let maxIndex=0;values.forEach((v,i)=>{if(v>values[maxIndex])maxIndex=i;});
  return {meanM:values.reduce((s,v)=>s+v,0)/values.length,p95M:percentile(sorted,.95),maxM:values[maxIndex],maxIndex};
}

/** Compare the app's reported totals with what the fixes actually support. */
export function durationReport(saved:{distanceM:number;durationMs:number},stats:TrackStats,lastActiveElapsedMs?:number){
  const unexplainedMs=lastActiveElapsedMs===undefined?saved.durationMs-stats.spanMs:saved.durationMs-lastActiveElapsedMs;
  const pace=(distanceM:number,ms:number)=>distanceM>0?ms/1000/(distanceM/1000):0;
  return {distanceErrorM:saved.distanceM-stats.distanceM,
    unexplainedMs,paceSavedSecPerKm:pace(saved.distanceM,saved.durationMs),paceFromFixesSecPerKm:pace(stats.distanceM,stats.spanMs)};
}
