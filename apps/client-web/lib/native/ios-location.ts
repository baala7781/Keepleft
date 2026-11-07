import {Geolocation,type GeolocationPlugin} from '@capacitor/geolocation';
import {ActivityRuntime} from '../tracking/activity';
import {type LocationProvider,type LocationState,type RawFix} from '../tracking/location';
import {webLocationOptions} from '../tracking/tracking-config';

type LocationBridge=Pick<GeolocationPlugin,'checkPermissions'|'requestPermissions'|'watchPosition'|'clearWatch'>;
function errorState(error:unknown):LocationState {
  const code=(error as {code?:string}|null)?.code;
  return code==='OS-PLUG-GLOC-0003'||code==='OS-PLUG-GLOC-0008'?'denied':code==='OS-PLUG-GLOC-0010'?'timeout':'unavailable';
}

/** Foreground Core Location adapter. Late permission/watch callbacks cannot restart a stopped session. */
export class IOSLocationProvider implements LocationProvider {
  private generation=0;
  private watch?:string;
  constructor(private bridge:LocationBridge=Geolocation){}
  start(onFix:(fix:RawFix)=>void,onState:(state:LocationState)=>void){
    this.stop();const generation=this.generation;
    onState('locating');
    void (async()=>{
      let permission=await this.bridge.checkPermissions();
      if(generation!==this.generation)return;
      if(permission.location==='prompt'||permission.location==='prompt-with-rationale')permission=await this.bridge.requestPermissions({permissions:['location']});
      if(generation!==this.generation)return;
      if(permission.location!=='granted'){onState('denied');return;}
      const id=await this.bridge.watchPosition(webLocationOptions,(position,error)=>{
        if(generation!==this.generation)return;
        if(error){onState(errorState(error));return;}
        if(!position)return;
        const c=position.coords;
        onFix({lng:c.longitude,lat:c.latitude,timestampMs:position.timestamp,accuracyM:c.accuracy,
          altitudeM:c.altitude,altitudeAccuracyM:c.altitudeAccuracy,speedMps:c.speed,headingDeg:c.heading});
      });
      if(generation!==this.generation){await this.bridge.clearWatch({id});return;}
      this.watch=id;
    })().catch(error=>{if(generation===this.generation)onState(errorState(error));});
  }
  stop(){this.generation++;const id=this.watch;this.watch=undefined;if(id)void this.bridge.clearWatch({id}).catch(()=>{});}
}

export class IOSActivityRuntime extends ActivityRuntime {
  override enableLocation(provider:LocationProvider=new IOSLocationProvider()){super.enableLocation(provider);}
  override resume(now=performance.now(),provider:LocationProvider=new IOSLocationProvider()){super.resume(now,provider);}
}

export async function hasIOSLocationPermission(){return (await Geolocation.checkPermissions()).location==='granted';}
