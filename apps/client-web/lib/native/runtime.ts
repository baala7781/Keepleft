import {ActivityRuntime,initialSnapshot,type ActivitySnapshot} from '../tracking/activity';
import {locationQuality,type AcceptedFix,type LocationProvider,type ActivityType} from '../tracking/location';
import {routeGeoJSON,type SavedActivity} from '../tracking/storage';
import {contains,type Bounds} from '../geodata/osm';
import {NativeRun,type NativeBridge,type NativeRunState} from './bridge';

/** Android owns the clock, filtering and durable capture. This is a foreground UI mirror. */
export class AndroidActivityRuntime extends ActivityRuntime {
  override readonly nativeRecording=true;
  private nativeState?:NativeRunState;
  private nativeSamples:AcceptedFix[]=[];
  private nativeActivity?:SavedActivity;
  private observers=new Set<(s:ActivitySnapshot)=>void>();
  private polling=false;
  private nextPoll=0;
  private disposed=false;
  private nativeBounds?:Bounds;
  private requestedPlace='';
  private prepared=false;
  constructor(private bridge:NativeBridge=NativeRun){super();}
  private accept(state:NativeRunState){
    const same=state.activity?.id===this.nativeActivity?.id;
    // State polls contain deltas; action responses always contain the whole route.
    this.nativeSamples=same&&state.sampleCount===this.nativeSamples.length+state.samples.length?[...this.nativeSamples,...state.samples]:state.samples;
    this.nativeState=state;
    this.nativeActivity=state.activity?{...state.activity,samples:this.nativeSamples}:undefined;
    if(state.activity&&(!same||state.activity.snapshot.status==='recording'||state.activity.snapshot.status==='paused')&&this.activityType!==(state.activity.activityType||'run'))super.setActivityType(state.activity.activityType||'run');
    this.source=state.source;this.currentFix=state.fix;this.locationState=state.locationState;this.locationMessage=state.message;
    this.trailRevision++;this.notify();
  }
  private notify(){for(const listener of this.observers)listener(this.getSnapshot());}
  private async refresh(){
    if(this.polling||this.busy||this.disposed)return;
    this.polling=true;let prepare=false;
    try{const state=await this.bridge.state({id:this.nativeActivity?.id,after:this.nativeSamples.length});if(!this.disposed){this.accept(state);if(!this.prepared){this.prepared=true;prepare=!state.activity;}}}
    catch{this.locationMessage='Could not refresh recording status. Reopen the app to reconnect.';this.notify();}
    finally{this.polling=false;}
    if(prepare&&!this.disposed)void this.action('prepare');
  }
  private async action(action:Parameters<NativeBridge['command']>[0]['action'],value?:string){
    // A user's explicit choice always wins over automatic startup preparation.
    if(action!=='prepare')this.prepared=true;
    if(this.busy||this.disposed)return;this.busy=true;this.actionError='';this.notify();
    // Do not race a stale poll response against a state-changing command.
    while(this.polling)await new Promise(resolve=>setTimeout(resolve,10));
    try{const state=await this.bridge.command({action,value});if(!this.disposed){this.accept(state);if(action==='demo')super.useDemo();}}
    catch(error){this.actionError=error instanceof Error?error.message:'Android could not complete this action.';}
    finally{this.busy=false;this.nextPoll=performance.now()+1000;this.notify();}
  }
  override enableLocation(_provider?:LocationProvider){this.requestedPlace='';void this.action('preview');}
  override setActivityType(value:ActivityType){const status=this.getSnapshot().status;if(status==='recording'||status==='paused')return;super.setActivityType(value);}
  override start(){if(this.source==='demo'){super.start();return;}void this.action('start',this.activityType);}
  override pause(){if(this.source==='demo'){super.pause();return;}void this.action('pause');}
  override resume(){if(this.source==='demo'){super.resume();return;}void this.action('resume');}
  override stop(){if(this.source==='demo'){super.stop();return;}void this.action('stop');}
  override useDemo(){void this.action('demo');}
  override stopLocationPreview(){if(this.source==='gps')void this.action('stopPreview');}
  override setPlaceName(name:string){if(this.source==='gps'&&name!==this.requestedPlace&&!this.busy){this.requestedPlace=name;void this.action('place',name);}}
  override setMapCoverage(bounds:Bounds|null){this.nativeBounds=bounds||undefined;super.setMapCoverage(bounds);}
  override getMapPosition(){return this.source==='gps'?this.nativeState?.mapFix:undefined;}
  override getLocationHealth(){
    const fix=this.nativeState?.mapFix,accuracyM=fix?.accuracyM,ageSeconds=fix?Math.max(0,(Date.now()-fix.timestampMs)/1000):undefined;
    return {accuracyM,ageSeconds,...locationQuality(accuracyM,ageSeconds,this.locationState==='ready')};
  }
  override getSnapshot(){
    if(this.source==='demo')return super.getSnapshot();
    const snapshot=this.nativeActivity?.snapshot||initialSnapshot;
    return {...snapshot,speedMps:this.displaySpeed.read(snapshot,this.locationState==='ready'&&!!this.currentFix&&Date.now()-this.currentFix.timestampMs<10000)};
  }
  override getMotion(){
    if(this.source==='demo')return super.getMotion();
    const a=this.nativeSamples.at(-2),b=this.nativeSamples.at(-1);
    // Rejected stationary fixes remain useful for GPS health, not athlete motion.
    const fix=this.nativeActivity&&b?b:this.currentFix;if(!fix||(this.nativeBounds&&!contains(this.nativeBounds,fix)))return;
    const heading=a&&b&&!b.breakBefore?Math.atan2((b.lng-a.lng)*Math.cos(b.lat*Math.PI/180),-(b.lat-a.lat)):0;
    return {...fix,heading,breakBefore:!!b?.breakBefore&&b.timestampMs===fix.timestampMs,segment:1};
  }
  override getTrail(){return this.source==='demo'?super.getTrail():this.nativeSamples.slice(-4096).map(sample=>({...sample,sampleKey:sample.timestampMs}));}
  override completedActivity(){return this.source==='gps'&&this.nativeActivity?.snapshot.status==='complete'?structuredClone(this.nativeActivity):undefined;}
  override exportGeoJSON(){return routeGeoJSON(this.nativeSamples,this.getSnapshot());}
  override checkpoint(){return undefined;}
  override subscribe(listener:(s:ActivitySnapshot)=>void){
    this.observers.add(listener);const unsubscribe=super.subscribe(listener);void this.refresh();
    return ()=>{this.observers.delete(listener);unsubscribe();};
  }
  override update(now:number){
    if(now>=this.nextPoll){this.nextPoll=now+1000;void this.refresh();}
    if(this.source==='demo')return super.update(now);return this.getSnapshot();
  }
  override dispose(){this.disposed=true;this.observers.clear();super.dispose();}
}
