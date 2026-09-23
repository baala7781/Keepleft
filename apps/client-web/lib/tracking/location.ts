import {activityProfiles,gpsQualityThresholds,webLocationOptions,type ActivityProfile} from './tracking-config';

export type RawFix = { lng:number; lat:number; timestampMs:number; accuracyM:number; altitudeM?:number|null;
  altitudeAccuracyM?:number|null; speedMps?:number|null; headingDeg?:number|null };
export type RawLocationSample={timestamp:number;latitude:number;longitude:number;accuracy:number;altitude:number|null;
  altitudeAccuracy:number|null;speed:number|null;heading:number|null};
export const rawLocationSample=(fix:RawFix):RawLocationSample=>({timestamp:fix.timestampMs,latitude:fix.lat,longitude:fix.lng,
  accuracy:fix.accuracyM,altitude:fix.altitudeM??null,altitudeAccuracy:fix.altitudeAccuracyM??null,
  speed:fix.speedMps??null,heading:fix.headingDeg??null});
export type LocationState = 'idle'|'locating'|'ready'|'denied'|'unavailable'|'timeout';
export interface LocationProvider {
  start(onFix:(fix:RawFix)=>void,onState:(state:LocationState)=>void):void;
  stop():void;
}
/** Only adapter that knows browser geolocation. Never prompts until start is invoked. */
export class WebLocationProvider implements LocationProvider {
  private watch:number|null=null;
  private generation=0;
  constructor(private geolocation:Geolocation|undefined = typeof navigator==='undefined'?undefined:navigator.geolocation,
    private options:PositionOptions=webLocationOptions) {}
  start(onFix:(fix:RawFix)=>void,onState:(state:LocationState)=>void) {
    this.stop();
    const generation=this.generation;
    if(!this.geolocation) { onState('unavailable');return; }
    onState('locating');
    try {
      this.watch=this.geolocation.watchPosition(position=>{
        if(generation!==this.generation)return;
        const c=position.coords;
        onFix({lng:c.longitude,lat:c.latitude,timestampMs:position.timestamp,accuracyM:c.accuracy,altitudeM:c.altitude,
          altitudeAccuracyM:c.altitudeAccuracy,speedMps:c.speed,headingDeg:c.heading});
      },error=>{
        if(generation!==this.generation)return;
        onState(error.code===1?'denied':error.code===3?'timeout':'unavailable');
      },this.options);
    } catch { onState('unavailable'); }
  }
  stop() { this.generation++;if(this.watch!==null)this.geolocation?.clearWatch(this.watch);this.watch=null; }
}
export class SyntheticLocationProvider implements LocationProvider {
  private listener?: (fix:RawFix)=>void;
  start(onFix:(fix:RawFix)=>void,onState:(state:LocationState)=>void) {this.listener=onFix;onState('locating');}
  emit(fix:RawFix) {this.listener?.(fix);}
  stop() {this.listener=undefined;}
}
export function distanceBetween(a:RawFix,b:RawFix) {
  const r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;
  return 6371008.8*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function inFixture(f:Pick<RawFix,'lng'|'lat'>) {
  return f.lng>=78.463&&f.lng<=78.49&&f.lat>=17.408&&f.lat<=17.437;
}
export type AcceptedFix = RawFix & {breakBefore:boolean;activeElapsedMs?:number};
export type ActivityType='walk'|'run'|'cycle';
export const GOOD_TRACKING_ACCURACY_M=gpsQualityThresholds.goodM;
export const MAX_TRACKING_ACCURACY_M=gpsQualityThresholds.recordableM;
export const MAX_MAP_ACCURACY_M=gpsQualityThresholds.mapAreaM;
export const MAX_FIX_AGE_MS=gpsQualityThresholds.staleMs;
export type GPSQuality='acquiring'|'good'|'fair'|'poor'|'lost';
export type GPSRejectionCode='LOW_ACCURACY'|'DUPLICATE'|'STALE'|'IMPOSSIBLE_SPEED'|'IMPOSSIBLE_ACCELERATION'|'JITTER'|'TIMESTAMP_ERROR'|'INVALID_COORDINATE';
export function locationQuality(accuracyM:number|undefined,ageSeconds:number|undefined,usable:boolean) {
  if(accuracyM===undefined)return {quality:'acquiring' as GPSQuality,label:'Searching for GPS'};
  if(ageSeconds===undefined||ageSeconds>MAX_FIX_AGE_MS/1000)return {quality:'lost' as GPSQuality,label:'GPS signal lost · distance paused'};
  if(!usable||accuracyM>MAX_TRACKING_ACCURACY_M)return {quality:'lost' as GPSQuality,label:'Weak GPS · distance paused'};
  if(accuracyM>gpsQualityThresholds.fairM)return {quality:'poor' as GPSQuality,label:'Weak GPS · tracking cautiously'};
  if(accuracyM>gpsQualityThresholds.goodM)return {quality:'fair' as GPSQuality,label:'GPS fair'};
  return {quality:'good' as GPSQuality,label:'GPS ready'};
}
/** Activity-aware filter: accuracy, timestamps, stationary jitter and jumps. */
export class GPSFilter {
  private profile:ActivityProfile;
  constructor(activityType:ActivityType='run'){this.profile=activityProfiles[activityType];}
  private anchor?:RawFix;
  private lastTimestamp=0;
  private discontinuity=true;
  private speedEstimate=0;
  private pending?:RawFix;
  resetSegment() {this.anchor=undefined;this.discontinuity=true;this.speedEstimate=0;this.pending=undefined;}
  ingest(f:RawFix,now=Date.now()):{accepted:boolean;reason:string;distanceM:number;fix?:AcceptedFix;code?:GPSRejectionCode} {
    const reject=(reason:string,code:GPSRejectionCode)=>({accepted:false,reason,distanceM:0,code});
    if(![f.lng,f.lat,f.timestampMs,f.accuracyM].every(Number.isFinite)||Math.abs(f.lng)>180||Math.abs(f.lat)>90||f.accuracyM<=0)return reject('invalid','INVALID_COORDINATE');
    if(f.timestampMs<=this.lastTimestamp)return reject('duplicate',f.timestampMs===this.lastTimestamp?'DUPLICATE':'TIMESTAMP_ERROR');
    if(f.timestampMs>now+5000||now-f.timestampMs>MAX_FIX_AGE_MS)return reject('stale',f.timestampMs>now+5000?'TIMESTAMP_ERROR':'STALE');
    if(f.accuracyM>MAX_TRACKING_ACCURACY_M)return reject('accuracy','LOW_ACCURACY');
    const prior=this.anchor,delta=prior?(f.timestampMs-prior.timestampMs)/1000:0;
    const gap=!!prior&&delta>20;
    const distance=prior?distanceBetween(prior,f):0;
    // A substantially better lock inside the old uncertainty radius is not a run.
    if(prior&&!gap&&prior.accuracyM>=f.accuracyM*2&&distance<=prior.accuracyM){
      this.anchor={...f};this.lastTimestamp=f.timestampMs;this.discontinuity=false;this.pending=undefined;this.speedEstimate=0;
      return {accepted:true,reason:'refinement',distanceM:0,fix:{...f,breakBefore:true}};
    }
    const maximumSpeed=this.profile.maxSpeedMps;
    if(prior&&!gap&&distance/Math.max(delta,0.001)>maximumSpeed)return reject('jump','IMPOSSIBLE_SPEED');
    // A single fast excursion must not draw a false out-and-back. Require a second
    // consistent position before accepting relocation, and never bridge that gap.
    const accelerationFloor=this.profile.spikeSpeedMps;
    if(prior&&!gap&&distance>10&&distance/Math.max(delta,.001)>Math.max(accelerationFloor,this.speedEstimate*2.5+1)){
      const candidate=this.pending;this.pending={...f};this.lastTimestamp=f.timestampMs;
      if(candidate&&f.timestampMs-candidate.timestampMs<=5000&&distanceBetween(candidate,f)<=Math.max(5,Math.min(12,f.accuracyM))){
        this.anchor={...f};this.pending=undefined;this.speedEstimate=0;this.discontinuity=false;
        return {accepted:true,reason:'reacquired',distanceM:0,fix:{...f,breakBefore:true}};
      }
      return reject('jump','IMPOSSIBLE_ACCELERATION');
    }
    this.pending=undefined;
    this.lastTimestamp=f.timestampMs;
    if(prior&&!gap&&distance<Math.max(this.profile.jitterFloorM,
      Math.min(this.profile.jitterCeilingM,Math.max(prior.accuracyM,f.accuracyM)*this.profile.jitterAccuracyFactor)))return reject('stationary','JITTER');
    const breakBefore=this.discontinuity||gap;
    this.speedEstimate=breakBefore?0:this.speedEstimate?this.speedEstimate*.75+distance/Math.max(delta,.001)*.25:distance/Math.max(delta,.001);
    this.anchor={...f};this.discontinuity=false;
    return {accepted:true,reason:gap?'gap':'accepted',distanceM:breakBefore?0:distance,fix:{...f,breakBefore}};
  }
}
