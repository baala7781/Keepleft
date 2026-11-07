import {describe,it,expect,vi} from 'vitest';
import type {WatchPositionCallback,Position} from '@capacitor/geolocation';
import {IOSLocationProvider} from './ios-location';

const granted={location:'granted',coarseLocation:'granted'} as const;
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
function bridge(){return {checkPermissions:vi.fn().mockResolvedValue(granted),requestPermissions:vi.fn().mockResolvedValue(granted),
  watchPosition:vi.fn().mockResolvedValue('watch'),clearWatch:vi.fn().mockResolvedValue(undefined)};}
describe('iOS foreground location',()=>{
  it('delivers native GPS fixes and ignores callbacks after disposal',async()=>{
    const api=bridge(),fix=vi.fn(),state=vi.fn();let callback!:WatchPositionCallback;
    api.watchPosition.mockImplementation(async(_options,cb)=>{callback=cb;return 'watch';});
    const provider=new IOSLocationProvider(api);provider.start(fix,state);await flush();
    const position={timestamp:1234,coords:{longitude:0,latitude:0,accuracy:5,altitude:12,altitudeAccuracy:2,speed:1,heading:90}} as Position;
    callback(position);expect(fix).toHaveBeenCalledWith({lng:0,lat:0,timestampMs:1234,accuracyM:5,altitudeM:12,altitudeAccuracyM:2,speedMps:1,headingDeg:90});
    provider.stop();callback(position);expect(fix).toHaveBeenCalledTimes(1);expect(api.clearWatch).toHaveBeenCalledWith({id:'watch'});
  });
  it('does not start a watch when permission is denied',async()=>{
    const api=bridge();api.checkPermissions.mockResolvedValue({location:'denied',coarseLocation:'denied'});
    const state=vi.fn(),provider=new IOSLocationProvider(api);provider.start(vi.fn(),state);await flush();
    expect(state).toHaveBeenLastCalledWith('denied');expect(api.watchPosition).not.toHaveBeenCalled();provider.stop();
  });
  it('clears a watch whose id arrives after stop',async()=>{
    const api=bridge();let finish!:(id:string)=>void;
    api.watchPosition.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
    const provider=new IOSLocationProvider(api);provider.start(vi.fn(),vi.fn());await flush();provider.stop();finish('late');await flush();
    expect(api.clearWatch).toHaveBeenCalledWith({id:'late'});
  });
  it('does not request permission after cancellation',async()=>{
    const api=bridge();api.checkPermissions.mockResolvedValue({location:'prompt',coarseLocation:'prompt'});
    const provider=new IOSLocationProvider(api);provider.start(vi.fn(),vi.fn());provider.stop();await flush();
    expect(api.requestPermissions).not.toHaveBeenCalled();expect(api.watchPosition).not.toHaveBeenCalled();
  });
});
