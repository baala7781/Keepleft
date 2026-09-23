import type {ActivitySnapshot} from './activity';
import type {SavedActivity} from './storage';
import {distanceBetween,type AcceptedFix,type ActivityType} from './location';
import {contains,type Bounds} from '../geodata/osm';
import type {MotionSource} from './motion-source';
import {stabilizeReplayTiming} from './replay-timing';
import {LocalENU} from '../../../../packages/geo';
import {visualRoute} from './visual-route';

export const replaySpeeds=[.25,.5,1,2,4] as const;
const MAX_REPLAY_CLOCK_STEP_MS=250;
export class ReplayRuntime implements MotionSource {
  readonly source='replay' as const;
  readonly durationMs:number;
  readonly isDemoReplay:boolean;
  readonly placeName?:string;
  readonly activityType:ActivityType;
  readonly roadAlignmentRecommended:boolean;
  readonly legacyTiming:boolean;
  private samples:AcceptedFix[];
  private times:number[]=[];
  private distances:number[]=[];
  private totalDistance:number;
  readonly stabilizedTiming:boolean;
  private displaySamples:AcceptedFix[]=[];
  private displayTimes:number[]=[];
  private displayDistances:number[]=[];
  private coverage:Bounds|null=null;
  private base=0;
  private startedAt=0;
  private playing=false;
  private speed=1;
  private listeners=new Set<(snapshot:ActivitySnapshot)=>void>();
  constructor(activity:SavedActivity){
    if(!activity.samples?.length)throw new Error('This activity has no recorded locations to replay.');
    if(activity.samples.length>100000||!Number.isFinite(activity.snapshot.elapsedMs)||activity.snapshot.elapsedMs<0||!Number.isFinite(activity.snapshot.distanceM)||activity.snapshot.distanceM<0)throw new Error('The saved activity cannot be replayed.');
    this.samples=activity.samples.map(p=>({...p}));
    this.isDemoReplay=activity.source==='demo';this.placeName=activity.placeName;this.activityType=activity.activityType||'run';
    // Older Android builds saved every activity as `run`. A sustained speed that
    // is clearly non-running is enough to avoid harmful road snapping, while the
    // original activity label and recorded metrics stay untouched.
    const averageSpeed=activity.snapshot.elapsedMs>0?activity.snapshot.distanceM/(activity.snapshot.elapsedMs/1000):0;
    this.roadAlignmentRecommended=this.activityType!=='cycle'&&averageSpeed<4.5;
    this.legacyTiming=!this.samples.every(p=>Number.isFinite(p.activeElapsedMs));
    let time=0,distance=0;
    this.samples.forEach((p,i)=>{
      const previous=this.samples[i-1];
      if(![p.lng,p.lat,p.timestampMs,p.accuracyM].every(Number.isFinite)||Math.abs(p.lng)>180||Math.abs(p.lat)>90||(previous&&p.timestampMs<=previous.timestampMs))throw new Error('The saved route contains invalid locations.');
      if(this.legacyTiming){const span=this.samples.at(-1)!.timestampMs-this.samples[0].timestampMs;time=span>0?(p.timestampMs-this.samples[0].timestampMs)/span*activity.snapshot.elapsedMs:0;}
      else {const t=p.activeElapsedMs!;if(t<time||t<0)throw new Error('The saved activity has invalid timing.');time=t;}
      if(previous&&!p.breakBefore)distance+=distanceBetween(previous,p);
      this.times.push(time);this.distances.push(distance);
    });
    this.totalDistance=activity.snapshot.distanceM;
    this.durationMs=Math.max(activity.snapshot.elapsedMs,time);
    const stabilized=this.legacyTiming||this.isDemoReplay?{times:this.times,presentationTimes:this.times,bridgedIndices:[],indices:this.samples.map((_,i)=>i),corrected:false}:stabilizeReplayTiming(this.samples,this.times);
    this.times=stabilized.times;this.stabilizedTiming=stabilized.corrected;
    const bridged=new Set(stabilized.bridgedIndices);
    const display=stabilized.indices.map(i=>bridged.has(i)?{...this.samples[i],breakBefore:false}:this.samples[i]);
    this.displaySamples=this.isDemoReplay?display:visualRoute(display,new LocalENU(display[0]),this.activityType);
    this.displayTimes=stabilized.indices.map(i=>stabilized.presentationTimes[i]);
    this.displayDistances=stabilized.indices.map(i=>this.distances[i]);
  }
  get rate(){return this.speed;}
  get sampleTimes(){return [...this.times];}
  private position(now=performance.now()){
    if(this.playing){
      // A GPU upload or WebView pause must not become a multi-second route and
      // camera teleport on the next frame. Visual playback may finish slightly
      // later under load, while its saved timestamps and metrics remain exact.
      const elapsed=Math.min(MAX_REPLAY_CLOCK_STEP_MS,Math.max(0,now-this.startedAt));
      this.base=Math.min(this.durationMs,this.base+elapsed*this.speed);this.startedAt=now;
    }
    return Math.min(this.durationMs,Math.max(0,this.base));
  }
  private sampleAt(time=this.position(),presentation=false){
    const samples=presentation?this.displaySamples:this.samples,times=presentation?this.displayTimes:this.times,distances=presentation?this.displayDistances:this.distances;
    let lo=0,hi=times.length;
    while(lo<hi){const mid=(lo+hi)>>>1;if(times[mid]<=time)lo=mid+1;else hi=mid;}
    const index=Math.max(0,lo-1),a=samples[index],b=samples[index+1];
    const gap=!!b&&b.breakBefore&&time<times[index+1];
    const duration=b?times[index+1]-times[index]:0;
    const blend=b&&!gap&&duration>0?Math.min(1,Math.max(0,(time-times[index])/duration)):0;
    const delta=b?distances[index+1]-distances[index]:0;
    const scale=this.distances.at(-1)!>0?this.totalDistance/this.distances.at(-1)!:0;
    // Shortest longitude arc avoids drawing across the planet at the dateline.
    const dlng=b?((b.lng-a.lng+540)%360)-180:0;
    const lng=((a.lng+dlng*blend+540)%360)-180,lat=a.lat+(b?b.lat-a.lat:0)*blend;
    const prior=samples[index-1];
    const from=b&&!gap?a:prior&&!a.breakBefore?prior:undefined;
    const to=b&&!gap?b:from?a:undefined;
    const heading=from&&to?Math.atan2((((to.lng-from.lng+540)%360)-180)*Math.cos(lat*Math.PI/180),-(to.lat-from.lat)):0;
    return {index,lng,lat,heading,gap,blend,accuracyM:Math.max(a.accuracyM,b?.accuracyM||0),breakBefore:a.breakBefore&&blend===0,distance:(distances[index]+delta*blend)*scale,
      speed:!gap&&duration>0?delta*scale/(duration/1000):0};
  }
  getSnapshot():ActivitySnapshot {
    const elapsedMs=this.position(),sample=this.sampleAt(elapsedMs),complete=elapsedMs>=this.durationMs;
    const snapshot:ActivitySnapshot={status:complete?'complete':this.playing?'recording':'paused',elapsedMs,progress:this.durationMs?elapsedMs/this.durationMs:1,
      distanceM:complete?this.totalDistance:sample.distance,speedMps:this.playing&&!complete?sample.speed:0};
    // Derive the replay average from its immutable timeline, not playback history.
    let first=sample.index;
    while(first>0&&!this.samples[first].breakBefore&&this.times[first]>elapsedMs-8000)first--;
    const start=Math.max(this.times[first],elapsedMs-8000),span=elapsedMs-start;
    const recentSpeed=snapshot.status==='recording'&&!sample.gap&&span>0?(sample.distance-this.sampleAt(start).distance)/(span/1000):0;
    return {...snapshot,speedMps:this.isDemoReplay?snapshot.speedMps:Math.max(0,recentSpeed)};
  }
  getMotion(presentation=false){const p=this.sampleAt(this.position(),presentation);return !this.coverage||contains(this.coverage,p)?p:undefined;}
  getMapPosition(){const p=this.sampleAt();return {lng:p.lng,lat:p.lat};}
  get inGap(){return this.sampleAt().gap;}
  getTrail(presentation=false){
    const p=this.sampleAt(this.position(),presentation),start=Math.max(0,p.index-4094),samples=presentation?this.displaySamples:this.samples;
    const trail:{lng:number;lat:number;accuracyM:number;sampleKey?:number;breakBefore:boolean}[]=samples.slice(start,p.index+1).map((s,i)=>({lng:s.lng,lat:s.lat,accuracyM:s.accuracyM,sampleKey:s.timestampMs,breakBefore:i===0||s.breakBefore}));
    if(p.blend>0&&!p.gap)trail.push({lng:p.lng,lat:p.lat,accuracyM:p.accuracyM,breakBefore:false});
    return trail;
  }
  setMapCoverage(bounds:Bounds|null){this.coverage=bounds;}
  subscribe(listener:(s:ActivitySnapshot)=>void){this.listeners.add(listener);listener(this.getSnapshot());return ()=>{this.listeners.delete(listener);};}
  private publish(){const s=this.getSnapshot();for(const listener of this.listeners)listener(s);}
  play(now=performance.now()){if(this.position(now)>=this.durationMs)this.base=0;else this.base=this.position(now);this.startedAt=now;this.playing=this.durationMs>0;this.publish();}
  pause(now=performance.now()){this.base=this.position(now);this.startedAt=now;this.playing=false;this.publish();}
  seek(time:number,now=performance.now()){if(!Number.isFinite(time))return;this.base=Math.min(this.durationMs,Math.max(0,time));this.startedAt=now;if(this.base>=this.durationMs)this.playing=false;this.publish();}
  setSpeed(speed:number,now=performance.now()){if(!replaySpeeds.includes(speed as typeof replaySpeeds[number]))return;this.base=this.position(now);this.startedAt=now;this.speed=speed;this.publish();}
  update(now:number){if(this.playing&&this.position(now)>=this.durationMs){this.base=this.durationMs;this.playing=false;}this.publish();return this.getSnapshot();}
  dispose(){this.listeners.clear();this.playing=false;}
}
