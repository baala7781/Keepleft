import manifest from '../../public/fixtures/madhyamaheshwar/manifest.json';
import { LocalENU } from '../../../../packages/geo';
import { GPSFilter, WebLocationProvider, MAX_TRACKING_ACCURACY_M, MAX_MAP_ACCURACY_M, MAX_FIX_AGE_MS, distanceBetween, locationQuality, rawLocationSample, type AcceptedFix, type ActivityType, type LocationProvider, type LocationState, type RawFix, type RawLocationSample, type GPSRejectionCode } from './location';
import { routeGeoJSON, type SavedActivity } from './storage';
import {contains,type Bounds} from '../geodata/osm';
import {validateDraft,type ActivityDraft} from './recovery';
import {DisplaySpeed} from './display-speed';
import {HybridSpeed} from './hybrid-speed';
import {activityProfiles} from './tracking-config';

export type ActivityStatus = 'ready' | 'recording' | 'paused' | 'complete';
export type ActivitySnapshot = { status: ActivityStatus; elapsedMs: number; distanceM: number; speedMps: number; progress: number };
export const initialSnapshot: ActivitySnapshot = { status: 'ready', elapsedMs: 0, distanceM: 0, speedMps: 0, progress: 0 };
export const frame = new LocalENU(manifest.origin);
export const route = manifest.route.map(([lng, lat]) => ({ lng, lat }));
export const routePoints = route.map(p => frame.project(p));
export const lengths = routePoints.map((p, i) => i ? Math.hypot(p.x - routePoints[i-1].x, p.y - routePoints[i-1].y) : 0);
export const totalDistanceM = lengths.reduce((a,b) => a+b,0);
export const durationMs = totalDistanceM / 3.2 * 1000;
export const playbackRate = 12;

export function sampleRoute(progress: number) {
  const distance = Math.max(0, Math.min(1, progress)) * totalDistanceM;
  let travelled = 0;
  for (let i=1; i<route.length; i++) {
    if (travelled + lengths[i] >= distance || i === route.length-1) {
      const t = lengths[i] ? Math.min(1, (distance-travelled)/lengths[i]) : 0;
      return { lng: route[i-1].lng + (route[i].lng-route[i-1].lng)*t, lat: route[i-1].lat + (route[i].lat-route[i-1].lat)*t, segment:i, heading:Math.atan2(routePoints[i].x-routePoints[i-1].x, -(routePoints[i].y-routePoints[i-1].y)) };
    }
    travelled += lengths[i];
  }
  return { ...route[0], segment:1, heading:0 };
}

/** Clock-driven simulation. UI and renderer independently read immutable snapshots. */
export class ActivityRuntime {
  readonly nativeRecording:boolean=false;
  busy=false;
  actionError='';
  protected displaySpeed=new DisplaySpeed(activityProfiles.run.speedWindowMs);
  readonly sessionId=crypto.randomUUID();
  private checkpointRevision=0;
  private needsRecoveryFix=false;
  private saved=false;
  markSaved(){this.saved=true;}
  needsCheckpoint(id:string){return !this.saved&&this.activityId===id;}
  source:'demo'|'gps'='demo';
  activityType:ActivityType='run';
  setActivityType(value:ActivityType){
    if(this.snapshot.status==='recording'||this.snapshot.status==='paused')return;
    this.activityType=value;this.filter=new GPSFilter(value);this.previewFilter=new GPSFilter(value);
    this.speedEstimator=new HybridSpeed(activityProfiles[value]);this.displaySpeed=new DisplaySpeed(activityProfiles[value].speedWindowMs);
  }
  locationState:LocationState='idle';
  locationMessage='';
  currentFix?:RawFix;
  private mapFix?:RawFix;
  private filter=new GPSFilter();
  private previewFilter=new GPSFilter();
  private speedEstimator=new HybridSpeed(activityProfiles.run);
  private reportedAccuracy?:number;
  private reportedAt=-Infinity;
  private reportedTimestamp=0;
  private provider?:LocationProvider;
  private samples:AcceptedFix[]=[];
  private rawSamples:RawLocationSample[]=[];
  private sampleDecisions:{timestampMs:number;accepted:boolean;reason:string;code?:GPSRejectionCode}[]=[];
  private latestDerivedSpeed=0;
  private lastAcceptedWall=0;
  private latestReceipt=0;
  private activityId='';
  private activityStartedAt=0;
  private activityEndedAt=0;
  private currentPlaceName='';
  private activityPlaceName='';
  trailRevision=0;
  private mapCoverage:Bounds|null=null;
  setMapCoverage(bounds:Bounds|null) {this.mapCoverage=bounds;}
  setPlaceName(name:string) {this.currentPlaceName=name;if(!this.activityPlaceName&&this.snapshot.status==='recording')this.activityPlaceName=name;}
  getMapPosition() {return this.source==='gps'?this.mapFix:undefined;}
  getLocationHealth() {
    const accuracyM=this.reportedAccuracy,ageSeconds=accuracyM===undefined?undefined:Math.max(0,(performance.now()-this.reportedAt)/1000);
    return {accuracyM,ageSeconds,...locationQuality(accuracyM,ageSeconds,this.locationState==='ready')};
  }
  getGpsDiagnostics(){
    const raw=this.rawSamples,decisions=this.sampleDecisions,accuracies=raw.map(p=>p.accuracy).filter(n=>Number.isFinite(n)&&n>0).sort((a,b)=>a-b);
    const middle=Math.floor(accuracies.length/2),reasons:Record<string,number>={};
    decisions.forEach(event=>{if(!event.accepted){const key=event.code||event.reason;reasons[key]=(reasons[key]||0)+1;}});
    let rawDistanceM=0;
    for(let i=1;i<raw.length;i++){
      const a=raw[i-1],b=raw[i];
      if([a.latitude,a.longitude,b.latitude,b.longitude].every(Number.isFinite)&&b.timestamp>a.timestamp)
        rawDistanceM+=distanceBetween({lat:a.latitude,lng:a.longitude,timestampMs:a.timestamp,accuracyM:a.accuracy},
          {lat:b.latitude,lng:b.longitude,timestampMs:b.timestamp,accuracyM:b.accuracy});
    }
    const percentile=(fraction:number)=>accuracies.length?accuracies[Math.min(accuracies.length-1,Math.floor((accuracies.length-1)*fraction))]:null;
    return {rawFixes:raw.length,acceptedFixes:this.samples.length,rejectedFixes:decisions.filter(event=>!event.accepted).length,
      medianAccuracyM:accuracies.length?(accuracies.length%2?accuracies[middle]:(accuracies[middle-1]+accuracies[middle])/2):null,
      p90AccuracyM:percentile(.9),
      rawDistanceM,acceptedDistanceM:this.snapshot.distanceM,reportedSpeedMps:raw.at(-1)?.speed??null,
      derivedSpeedMps:this.latestDerivedSpeed,smoothedSpeedMps:this.getSnapshot().speedMps,
      sampleIntervalMs:raw.length>1?raw.at(-1)!.timestamp-raw.at(-2)!.timestamp:null,
      lastReason:decisions.at(-1)?.code||decisions.at(-1)?.reason||'none',reasons,quality:this.getLocationHealth().quality};
  }
  stopLocationPreview() {if(this.snapshot.status==='recording'||this.snapshot.status==='paused')return;this.provider?.stop();this.locationState='idle';if(this.snapshot.status==='ready')this.locationMessage='GPS preview stopped. Retry GPS for a fresh position.';}
  enableLocation(provider:LocationProvider=new WebLocationProvider()) {
    if(this.snapshot.status==='recording'||this.snapshot.status==='paused')return;
    this.provider?.stop();
    this.source='gps';this.reset();this.currentFix=undefined;this.mapFix=undefined;
    this.currentPlaceName='';this.activityPlaceName='';
    this.locationMessage='Requesting location permission…';
    this.provider=provider;
    provider.start(f=>this.receiveFix(f),state=>{
      this.locationState=state;
      this.locationMessage=state==='denied'?'Location permission denied. Enable it in your browser and retry.':state==='timeout'?'Location timed out. Move outdoors or retry.':state==='unavailable'?'Location is unavailable on this device.':state==='locating'?'Finding an accurate GPS fix…':'';
      this.publish();
    });
  }
  useDemo() {
    if(this.snapshot.status==='recording'||this.snapshot.status==='paused')return;
    this.provider?.stop();this.provider=undefined;this.source='demo';this.locationState='idle';this.reset();
  }
  dispose() {this.provider?.stop();this.listeners.clear();}
  private receiveFix(f:RawFix) {
    const now=Date.now();
    const recording=this.source==='gps'&&this.snapshot.status==='recording';
    if(recording&&this.rawSamples.length>=100000){this.stop();this.locationMessage='Recording limit reached. Save or export this activity.';return;}
    if(recording)this.rawSamples.push(rawLocationSample(f));
    const decision=(reason:string,accepted=false,code?:GPSRejectionCode)=>{if(recording)this.sampleDecisions.push({timestampMs:f.timestampMs,accepted,reason,...(code?{code}:{})});};
    if(![f.lng,f.lat,f.timestampMs,f.accuracyM].every(Number.isFinite)||Math.abs(f.lng)>180||Math.abs(f.lat)>90||f.accuracyM<=0){decision('invalid_or_stale',false,'INVALID_COORDINATE');return;}
    if(f.timestampMs>now+5000){decision('invalid_or_stale',false,'TIMESTAMP_ERROR');return;}
    if(now-f.timestampMs>MAX_FIX_AGE_MS){decision('invalid_or_stale',false,'STALE');return;}
    if(f.timestampMs<=this.reportedTimestamp){decision('duplicate',false,f.timestampMs===this.reportedTimestamp?'DUPLICATE':'TIMESTAMP_ERROR');return;}
    this.reportedTimestamp=f.timestampMs;this.reportedAccuracy=f.accuracyM;
    this.reportedAt=performance.now()-Math.max(0,now-f.timestampMs);
    // Nearby geography only needs an approximate area. Do not make its loading
    // depend on the much stricter threshold used for distance accumulation.
    if(f.accuracyM<=MAX_MAP_ACCURACY_M)this.mapFix={...f};
    if(f.accuracyM>MAX_TRACKING_ACCURACY_M) {
      decision('low_accuracy',false,'LOW_ACCURACY');
      this.locationState='locating';this.snapshot={...this.snapshot,speedMps:0};
      if(this.snapshot.status==='recording'){this.filter.resetSegment();this.speedEstimator.reset();}
      this.locationMessage='Approximate location found. Loading its map; distance waits for accuracy within 50 m.';this.publish();return;
    }
    if(this.snapshot.status!=='recording') {
      const preview=this.previewFilter.ingest(f,now);
      if(!preview.accepted&&preview.reason!=='stationary'){this.locationState='locating';this.locationMessage='Unreliable GPS position ignored.';this.publish();return;}
      if(preview.accepted)this.currentFix={...f};
      this.latestReceipt=performance.now();this.locationState='ready';
    } else {
      const receivedAt=performance.now(),measuredAt=receivedAt-Math.max(0,now-f.timestampMs);
      if(measuredAt<this.startedAt){decision('before_start',false,'STALE');return;} // Delayed fix from before start/resume.
      const result=this.filter.ingest(f,now);
      decision(result.reason,result.accepted,result.code);
      if(result.accepted&&result.fix) {
        if(this.samples.length>=100000) {this.stop();this.locationMessage='Recording limit reached. Export this activity before starting another.';return;}
        const measuredActive=this.accumulatedMs+Math.max(0,measuredAt-this.startedAt);
        this.samples.push({...result.fix,activeElapsedMs:Math.max(this.samples.at(-1)?.activeElapsedMs||0,measuredActive)});this.trailRevision++;
        this.currentFix={...f};this.latestReceipt=performance.now();this.locationState='ready';
        const prior=this.samples.at(-2);
        this.latestDerivedSpeed=prior&&!result.fix.breakBefore?result.distanceM/Math.max(.001,(f.timestampMs-prior.timestampMs)/1000):0;
        const speed=this.speedEstimator.update(result.distanceM,prior?(f.timestampMs-prior.timestampMs)/1000:0,
          f.speedMps,f.accuracyM,result.fix.breakBefore);
        this.snapshot={...this.snapshot,distanceM:this.snapshot.distanceM+result.distanceM,speedMps:speed};
        this.lastAcceptedWall=performance.now();
      } else if(result.reason==='stationary') {
        // The reported accuracy may improve while stopped, but the actor must
        // remain on the last accepted route position.
        this.latestReceipt=performance.now();this.locationState='ready';this.snapshot={...this.snapshot,speedMps:0};
      } else {this.locationState='locating';this.locationMessage=result.reason==='jump'?'Unreliable GPS jump ignored.':'Waiting for a usable GPS fix.';this.publish();return;}
    }
    this.locationMessage=locationQuality(f.accuracyM,0,true).label;
    this.publish();
  }
  getMotion() {
    if(this.source==='demo')return sampleRoute(this.snapshot.progress);
    const a=this.samples.at(-2),b=this.samples.at(-1);
    const fix=b||this.currentFix;if(!fix||this.mapCoverage&&!contains(this.mapCoverage,fix))return;
    const heading=a&&b&&!b.breakBefore?Math.atan2((b.lng-a.lng)*Math.cos(b.lat*Math.PI/180),-(b.lat-a.lat)):0;
    return {...fix,heading,breakBefore:!!b?.breakBefore&&b.timestampMs===fix.timestampMs,segment:1};
  }
  getTrail() {
    if(this.source==='gps')return this.samples.slice(-4096).map(sample=>({...sample,sampleKey:sample.timestampMs}));
    const sample=sampleRoute(this.snapshot.progress);
    return [...route.slice(0,sample.segment),sample].map((p,i)=>({...p,breakBefore:i===0}));
  }
  exportGeoJSON() {
    return routeGeoJSON(this.samples,this.snapshot);
  }
  completedActivity():SavedActivity|undefined {
    if(this.source!=='gps'||this.snapshot.status!=='complete'||!this.activityId)return;
    return {version:1,id:this.activityId,startedAtMs:this.activityStartedAt,endedAtMs:this.activityEndedAt,source:'gps',activityType:this.activityType,placeName:this.activityPlaceName||undefined,
      snapshot:this.getSnapshot(),samples:this.samples.map(sample=>({...sample})),rawSamples:this.rawSamples.map(sample=>({...sample})),sampleDecisions:this.sampleDecisions.map(event=>({...event}))};
  }
  checkpoint(now=performance.now()):ActivityDraft|undefined {
    if(this.source!=='gps'||!this.activityId||this.snapshot.status==='ready'||this.saved)return;
    const elapsedMs=this.snapshot.status==='recording'?this.accumulatedMs+Math.max(0,now-this.startedAt):this.snapshot.elapsedMs;
    return {version:1,owner:this.sessionId,revision:++this.checkpointRevision,savedAtMs:Date.now(),activity:{
      version:1,id:this.activityId,source:'gps',activityType:this.activityType,startedAtMs:this.activityStartedAt,endedAtMs:this.activityEndedAt,
      placeName:this.activityPlaceName||undefined,snapshot:{...this.snapshot,elapsedMs},samples:this.samples.map(p=>({...p})),
      rawSamples:this.rawSamples.map(p=>({...p})),sampleDecisions:this.sampleDecisions.map(event=>({...event})),
    }};
  }
  restore(draft:ActivityDraft) {
    if(this.snapshot.status==='recording'||this.snapshot.status==='paused')throw new Error('Stop the current run before recovering another.');
    validateDraft(draft);
    if(draft.owner!==this.sessionId)throw new Error('Claim this run before restoring it.');
    const a=structuredClone(draft.activity);
    this.provider?.stop();this.provider=undefined;this.source='gps';
    this.saved=false;
    this.activityId=a.id;this.activityStartedAt=a.startedAtMs;this.activityEndedAt=a.endedAtMs;
    this.activityPlaceName=a.placeName||'';this.currentPlaceName=this.activityPlaceName;
    this.checkpointRevision=draft.revision;this.samples=a.samples;this.rawSamples=a.rawSamples||[];this.sampleDecisions=a.sampleDecisions||[];this.trailRevision++;
    this.activityType=a.activityType||'run';this.filter=new GPSFilter(this.activityType);this.speedEstimator=new HybridSpeed(activityProfiles[this.activityType]);
    this.displaySpeed=new DisplaySpeed(activityProfiles[this.activityType].speedWindowMs);this.latestDerivedSpeed=0;
    this.currentFix=this.samples.at(-1);this.latestReceipt=-Infinity;
    this.accumulatedMs=a.snapshot.elapsedMs;this.startedAt=0;this.needsRecoveryFix=true;
    this.snapshot={...a.snapshot,status:a.snapshot.status==='complete'?'complete':'paused',speedMps:0};
    this.locationState='idle';this.locationMessage='Run recovered. GPS is off. Resume requests a fresh location; downtime is excluded.';
    this.publish();
  }
  private snapshot = { ...initialSnapshot };
  private startedAt = 0;
  private accumulatedMs = 0;
  private listeners = new Set<(s: ActivitySnapshot) => void>();
  subscribe(listener: (s: ActivitySnapshot) => void) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => { this.listeners.delete(listener); };
  }
  start(now = performance.now()) {
    if (this.snapshot.status !== 'ready' && this.snapshot.status !== 'complete') return;
    if(this.source==='gps') {
      if(this.locationState!=='ready'||!this.currentFix||performance.now()-this.latestReceipt>MAX_FIX_AGE_MS||Date.now()-this.currentFix.timestampMs>MAX_FIX_AGE_MS) return;
      this.samples=[];this.rawSamples=[];this.sampleDecisions=[];this.latestDerivedSpeed=0;this.filter=new GPSFilter(this.activityType);
      this.speedEstimator.reset();this.trailRevision++;
      this.activityId=crypto.randomUUID();this.activityStartedAt=Date.now();this.activityEndedAt=0;
      this.activityPlaceName=this.currentPlaceName;
    }
    this.accumulatedMs = 0;
    this.saved=false;
    this.startedAt = now;
    this.snapshot = { ...initialSnapshot, status:'recording' };
    this.update(now);
    if(this.source==='gps'&&this.currentFix)this.receiveFixForStart();
  }
  private receiveFixForStart() {
    const fix=this.currentFix!;
    const result=this.filter.ingest(fix);
    if(result.fix){this.samples.push({...result.fix,activeElapsedMs:0});this.rawSamples.push(rawLocationSample(fix));
      this.sampleDecisions.push({timestampMs:fix.timestampMs,accepted:true,reason:'origin'});this.trailRevision++;this.lastAcceptedWall=performance.now();}
  }
  pause(now = performance.now()) {
    if (this.snapshot.status !== 'recording') return;
    this.update(now);
    if (this.snapshot.progress === 1) return;
    this.accumulatedMs = this.snapshot.elapsedMs;
    this.snapshot = { ...this.snapshot, status:'paused', speedMps:0 };
    this.publish();
  }
  resume(now = performance.now(),provider:LocationProvider=new WebLocationProvider()) {
    if (this.snapshot.status !== 'paused') return;
    if(this.source==='gps'&&this.needsRecoveryFix){
      this.provider?.stop();this.provider=provider;
      this.locationMessage='Finding a fresh GPS fix before resuming…';
      provider.start(f=>{
        if(this.snapshot.status!=='paused'&&this.snapshot.status!=='recording')return;
        this.receiveFix(f);
        if(!this.needsRecoveryFix||this.snapshot.status!=='paused'||this.currentFix?.timestampMs!==f.timestampMs||this.locationState!=='ready')return;
        this.needsRecoveryFix=false;this.resume(performance.now());
      },state=>{
        this.locationState=state;
        if(state==='denied'||state==='unavailable'||state==='timeout')this.locationMessage='Could not resume GPS. Your run stays paused; retry Resume or stop and save it.';
        this.publish();
      });
      return;
    }
    this.startedAt = now;
    if(this.source==='gps'){this.filter.resetSegment();this.speedEstimator.reset();}
    this.snapshot = { ...this.snapshot, status:'recording', speedMps:this.source==='gps'?0:3.2 };
    this.publish();
  }
  stop(now = performance.now()) {
    if (this.snapshot.status !== 'recording' && this.snapshot.status !== 'paused') return;
    this.update(now);
    this.accumulatedMs = this.snapshot.elapsedMs;
    this.snapshot = { ...this.snapshot, status:'complete', speedMps:0 };
    if(this.source==='gps'){this.provider?.stop();this.activityEndedAt=Date.now();this.locationState='idle';this.locationMessage='Activity stopped. Keep a route export as a backup.';}
    this.publish();
  }
  reset() {
    this.accumulatedMs = 0;
    this.activityId='';
    this.saved=false;
    this.needsRecoveryFix=false;
    this.previewFilter=new GPSFilter(this.activityType);this.mapFix=undefined;this.reportedAccuracy=undefined;this.reportedAt=-Infinity;this.reportedTimestamp=0;
    this.samples=[];this.rawSamples=[];this.sampleDecisions=[];this.latestDerivedSpeed=0;this.filter=new GPSFilter(this.activityType);
    this.speedEstimator.reset();this.trailRevision++;
    this.snapshot = { ...initialSnapshot };
    this.publish();
  }
  update(now: number) {
    if(this.source==='gps') {
      if(this.snapshot.status==='recording')this.snapshot={...this.snapshot,elapsedMs:this.accumulatedMs+Math.max(0,now-this.startedAt),speedMps:now-this.lastAcceptedWall>5000?0:this.snapshot.speedMps};
      if(this.locationState==='ready'&&now-this.latestReceipt>MAX_FIX_AGE_MS) {this.locationState='timeout';this.locationMessage='GPS signal lost. Recording time continues; distance waits for a new fix.';}
      this.publish();return this.getSnapshot();
    }
    if (this.snapshot.status === 'recording') {
      const elapsedMs = Math.min(durationMs, this.accumulatedMs + Math.max(0,now-this.startedAt)*playbackRate);
      const progress = elapsedMs / durationMs;
      this.snapshot = { status:progress === 1 ? 'complete' : 'recording', elapsedMs, progress, distanceM:totalDistanceM*progress, speedMps:progress === 1 ? 0 : 3.2 };
    }
    this.publish();
    return this.getSnapshot();
  }
  getSnapshot() { return { ...this.snapshot,speedMps:this.source==='gps'?this.displaySpeed.read(this.snapshot,this.locationState==='ready'):this.snapshot.speedMps }; }
  private publish() { for (const listener of this.listeners) listener(this.getSnapshot()); }
}
