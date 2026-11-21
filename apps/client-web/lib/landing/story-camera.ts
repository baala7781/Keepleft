import type {SavedActivity} from '../tracking/storage';
import type {AcceptedFix} from '../tracking/location';
import {distanceBetween} from '../tracking/location';

/**
 * The landing page is one continuous camera timeline over a single world.
 * `s` is a story position: section i spans [i, i+1). Every value here is a
 * pure function of `s`, so scrolling backwards replays the same frames.
 */
export const SECTIONS=['hero','track','build','explore','replay','close'] as const;
export type Pose={lng:number;lat:number;zoom:number;pitch:number;bearing:number;follow:number};
type Key=Pose&{s:number};

const mid={lng:78.4800,lat:17.4165};
// Bearings are unwrapped so each move takes the intended short turn.
export const cameraKeys:Key[]=[
  {s:.4,  lng:78.4806,lat:17.4172,zoom:15.95,pitch:60,bearing:-38,follow:0},   // hero: route with the lake beyond
  {s:1.25,lng:78.4840,lat:17.4207,zoom:17.05,pitch:63,bearing:-140,follow:.85},// track: close behind the recording
  {s:1.9, lng:78.4790,lat:17.4150,zoom:16.7,pitch:58,bearing:-152,follow:.85},
  {s:2.25,...mid,zoom:16.05,pitch:28,bearing:-20,follow:0},                     // build: near top-down data view
  {s:2.5, ...mid,zoom:16.1,pitch:24,bearing:-18,follow:0},
  {s:2.95,...mid,zoom:16.25,pitch:56,bearing:-6,follow:0},
  {s:3.3, lng:78.4752,lat:17.4168,zoom:16.15,pitch:64,bearing:12,follow:0},    // explore: Buddha statue and the lake
  {s:3.9, lng:78.4742,lat:17.4186,zoom:16.0,pitch:64,bearing:72,follow:0},
  {s:4.22,...mid,zoom:16.0,pitch:50,bearing:-40,follow:.3},                     // replay: aerial
  {s:4.5, ...mid,zoom:17.6,pitch:62,bearing:-150,follow:1},                     // follow
  {s:4.73,...mid,zoom:17.2,pitch:62,bearing:-62,follow:1},                      // orbit
  {s:4.95,...mid,zoom:18.15,pitch:72,bearing:-200,follow:1},                    // cinematic
  {s:5.45,lng:78.4768,lat:17.4206,zoom:15.4,pitch:64,bearing:-340,follow:0},  // close: wide city
];

const smooth=(t:number)=>t*t*(3-2*t);
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));

export function sampleKeys(keys:readonly Key[],s:number):Pose{
  if(s<=keys[0].s)return {...keys[0]};
  const last=keys[keys.length-1];if(s>=last.s)return {...last};
  let i=0;while(keys[i+1].s<s)i++;
  const a=keys[i],b=keys[i+1],t=smooth((s-a.s)/(b.s-a.s)),l=(x:number,y:number)=>x+(y-x)*t;
  return {lng:l(a.lng,b.lng),lat:l(a.lat,b.lat),zoom:l(a.zoom,b.zoom),pitch:l(a.pitch,b.pitch),bearing:l(a.bearing,b.bearing),follow:l(a.follow,b.follow)};
}

/** Piecewise eased value; holds the first/last value outside the points. */
export function ramp(s:number,points:readonly (readonly [number,number])[]):number{
  if(s<=points[0][0])return points[0][1];
  for(let i=1;i<points.length;i++){
    const [s1,v1]=points[i];if(s>s1)continue;
    const [s0,v0]=points[i-1];return s1===s0?v1:v0+(v1-v0)*smooth((s-s0)/(s1-s0));
  }
  return points[points.length-1][1];
}

/** Route drawn so far (0–1). It rewinds before each section that records it again. */
export const routeAt=(s:number)=>ramp(s,[[.5,1],[1.02,.02],[1.95,1],[3.85,1],[4.18,0],[4.24,0],[5.0,1]]);
/** Flatten the world, then raise buildings and trees in order. */
export const assemblyAt=(s:number)=>({
  buildings:ramp(s,[[2.05,1],[2.3,0],[2.45,0],[2.75,1]]),
  trees:ramp(s,[[2.05,1],[2.3,0],[2.7,0],[2.95,1]]),
  water:1,
});
export const BUILD_STEPS=['Route and roads','Building footprints','Building heights','Trees and parks','Your world'] as const;
export function buildStep(s:number){
  if(s<2.35)return 0;if(s<2.5)return 1;if(s<2.72)return 2;if(s<2.92)return 3;return 4;
}
export const REPLAY_VIEWS=[['Aerial',4.1],['Follow',4.5],['Orbit',4.73],['Cinematic',4.93]] as const;
export function replayView(s:number){
  let index=0;REPLAY_VIEWS.forEach(([,at],i)=>{if(s>=at-.12)index=i;});return index;
}
/** Weight of an interactive window: 0 outside, 1 inside, eased edges. */
export const windowWeight=(s:number,from:number,to:number,edge=.12)=>clamp(Math.min((s-from+edge)/edge,(to+edge-s)/edge));

/** Map a document scroll probe to a story position using cached section offsets. */
export function storyPosition(probe:number,tops:readonly number[],heights:readonly number[]){
  if(!tops.length||probe<tops[0])return 0;
  for(let i=0;i<tops.length;i++)if(probe<tops[i]+heights[i])return i+clamp((probe-tops[i])/Math.max(1,heights[i]));
  return tops.length-1e-4;
}

/** A labeled demo replay over public map data. It never enters the user's library. */
export function demoActivity(route:readonly (readonly [number,number])[],speedMps=2.9):SavedActivity{
  const start=Date.UTC(2026,10,1,0,42);let distance=0,elapsed=0;
  const samples:AcceptedFix[]=route.map(([lng,lat],i)=>{
    if(i>0){const d=distanceBetween({lng:route[i-1][0],lat:route[i-1][1],timestampMs:0,accuracyM:1},{lng,lat,timestampMs:0,accuracyM:1});distance+=d;elapsed+=Math.max(1,d/speedMps*1000);}
    return {lng,lat,accuracyM:1,timestampMs:start+elapsed,activeElapsedMs:elapsed,breakBefore:i===0};
  });
  return {version:1,id:'landing-demo',source:'demo',placeName:'Tank Bund Road · Hyderabad',activityType:'run',startedAtMs:start,endedAtMs:start+elapsed,samples,
    snapshot:{status:'complete',elapsedMs:elapsed,distanceM:distance,speedMps:0,progress:1}};
}

export function formatStats(elapsedMs:number,distanceM:number){
  const total=Math.round(elapsedMs/1000),time=`${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;
  const pace=distanceM>=20?elapsedMs/1000/(distanceM/1000):0;
  return {distance:(distanceM/1000).toFixed(2),time,pace:pace?`${Math.floor(pace/60)}'${String(Math.round(pace%60)).padStart(2,'0')}"`:'–'};
}
