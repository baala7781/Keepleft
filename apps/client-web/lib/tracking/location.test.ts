import { afterEach,describe,expect,it,vi } from 'vitest';
import { GPSFilter, SyntheticLocationProvider, WebLocationProvider, inFixture, locationQuality, type RawFix } from './location';
import { ActivityRuntime } from './activity';
const epoch=1700000000000;
const fix=(timestampMs=epoch,lat=17.421,accuracyM=5):RawFix=>({lat,lng:78.478,timestampMs,accuracyM});
afterEach(()=>vi.restoreAllMocks());
describe('GPS filtering',()=>{
  it('accepts plausible cycling movement without weakening walk and run jump limits',()=>{
    const start=fix(epoch,17.421,4),fast=fix(epoch+3000,17.42154,4);
    const walk=new GPSFilter('walk'),run=new GPSFilter('run'),cycle=new GPSFilter('cycle');
    for(const filter of [walk,run,cycle])filter.ingest(start,epoch);
    expect(walk.ingest(fast,epoch+3000)).toMatchObject({reason:'jump',code:'IMPOSSIBLE_SPEED'});
    expect(run.ingest(fast,epoch+3000)).toMatchObject({reason:'jump',code:'IMPOSSIBLE_SPEED'});
    expect(cycle.ingest(fast,epoch+3000).distanceM).toBeGreaterThan(55);
    expect(cycle.ingest(fix(epoch+4000,17.422,4),epoch+4000).reason).toBe('jump');
  });
  it('rejects a one-off excursion but keeps a genuine return along the same path',()=>{
    const f=new GPSFilter();f.ingest(fix(epoch,17,4),epoch);f.ingest(fix(epoch+4000,17.00005,4),epoch+4000);
    expect(f.ingest(fix(epoch+7000,17.00036,20),epoch+7000)).toMatchObject({reason:'jump',code:'IMPOSSIBLE_ACCELERATION'});
    const next=f.ingest(fix(epoch+10000,17.0001,4),epoch+10000);expect(next.accepted).toBe(true);expect(next.distanceM).toBeLessThan(6);
    expect(f.ingest(fix(epoch+15000,17.00005,4),epoch+15000).accepted).toBe(true);
  });
  it('requires confirmation for relocation and does not join it to the previous path',()=>{
    const f=new GPSFilter();f.ingest(fix(epoch,17,4),epoch);
    expect(f.ingest(fix(epoch+3000,17.0003,4),epoch+3000).accepted).toBe(false);
    const next=f.ingest(fix(epoch+4000,17.00031,4),epoch+4000);expect(next.reason).toBe('reacquired');expect(next.distanceM).toBe(0);expect(next.fix?.breakBefore).toBe(true);
  });
  it('accepts usable fixes through 50 metres and rejects genuinely poor or stale fixes',()=>{
    const filter=new GPSFilter();
    expect(filter.ingest(fix(epoch,17.421,51),epoch).reason).toBe('accuracy');
    expect(filter.ingest(fix(epoch-31000),epoch).reason).toBe('stale');
    expect(filter.ingest(fix(epoch,17.421,40),epoch).accepted).toBe(true);
  });
  it('does not count an improving GPS lock as physical movement',()=>{
    const filter=new GPSFilter();filter.ingest(fix(epoch,17.421,25),epoch);
    const refined=filter.ingest(fix(epoch+1000,17.4211,5),epoch+1000);
    expect(refined.reason).toBe('refinement');expect(refined.distanceM).toBe(0);expect(refined.fix?.breakBefore).toBe(true);
    expect(filter.ingest(fix(epoch+6000,17.4212,5),epoch+6000).distanceM).toBeGreaterThan(10);
  });
  it('distinguishes strong, fair, weak and stale accuracy reports',()=>{
    expect(locationQuality(5,1,true).quality).toBe('good');
    expect(locationQuality(20,1,true).quality).toBe('good');
    expect(locationQuality(40,1,true).quality).toBe('poor');
    expect(locationQuality(55,1,false).quality).toBe('lost');
    expect(locationQuality(5,31,true).quality).toBe('lost');
  });
  it('rejects invalid, poor, stale and duplicate fixes',()=>{
    const f=new GPSFilter();
    expect(f.ingest({...fix(),lat:NaN},epoch).reason).toBe('invalid');
    expect(f.ingest(fix(epoch,17.421,80),epoch).reason).toBe('accuracy');
    expect(f.ingest(fix(epoch-40000),epoch).reason).toBe('stale');
    expect(f.ingest(fix(),epoch).accepted).toBe(true);
    expect(f.ingest(fix(),epoch).reason).toBe('duplicate');
  });
  it('counts real movement but ignores stationary jitter and huge jumps',()=>{
    const f=new GPSFilter();f.ingest(fix(),epoch);
    expect(f.ingest(fix(epoch+1000,17.421001),epoch+1000)).toMatchObject({reason:'stationary',code:'JITTER'});
    expect(f.ingest(fix(epoch+2000,18.421),epoch+2000).reason).toBe('jump');
    const moved=f.ingest(fix(epoch+5000,17.4211),epoch+5000);
    expect(moved.accepted).toBe(true);expect(moved.distanceM).toBeGreaterThan(10);
  });
  it('does not bridge signal gaps or paused segments',()=>{
    const f=new GPSFilter();f.ingest(fix(),epoch);
    const gap=f.ingest(fix(epoch+60000,17.425),epoch+60000);
    expect(gap.distanceM).toBe(0);expect(gap.fix?.breakBefore).toBe(true);
    f.resetSegment();
    expect(f.ingest(fix(epoch+65000,17.427),epoch+65000).distanceM).toBe(0);
  });
  it('identifies limited fixture coverage explicitly',()=>{
    expect(inFixture(fix())).toBe(true);
    expect(inFixture({lat:51.5,lng:0})).toBe(false);
  });
});
describe('device activity independent of rendering',()=>{
  it('timestamps batched browser fixes when measured and rejects pre-resume fixes',()=>{
    let wall=0;vi.spyOn(Date,'now').mockImplementation(()=>epoch+wall);vi.spyOn(performance,'now').mockImplementation(()=>wall);
    const provider=new SyntheticLocationProvider(),r=new ActivityRuntime();r.enableLocation(provider);provider.emit(fix());r.start();
    wall=3010;provider.emit(fix(epoch+2000,17.42104));
    wall=3030;provider.emit(fix(epoch+3000,17.42108));
    r.pause();wall=8000;r.resume();
    wall=8100;provider.emit(fix(epoch+7000,17.4212));
    wall=10000;provider.emit(fix(epoch+9500,17.4212));r.stop();
    const record=r.completedActivity()!;
    expect(record.samples.map(p=>p.activeElapsedMs)).toEqual([0,2000,3000,4530]);
    expect(record.samples.at(-1)!.breakBefore).toBe(true);r.dispose();
  });
  it('blocks a weak start and shows degraded accuracy instead of the last good number',()=>{
    let wall=0;vi.spyOn(Date,'now').mockImplementation(()=>epoch+wall);vi.spyOn(performance,'now').mockImplementation(()=>wall);
    const provider=new SyntheticLocationProvider(),r=new ActivityRuntime();r.enableLocation(provider);provider.emit(fix());
    wall=1000;provider.emit(fix(epoch+wall,17.421,60));r.start();
    expect(r.getSnapshot().status).toBe('ready');expect(r.getLocationHealth()).toMatchObject({accuracyM:60,quality:'lost'});
    wall=2000;provider.emit(fix(epoch+wall));r.start();expect(r.getSnapshot().status).toBe('recording');
    wall=3000;provider.emit(fix(epoch+wall,17.422,80));
    wall=5000;provider.emit(fix(epoch+wall,17.422));expect(r.getSnapshot().distanceM).toBe(0);
    wall=10000;provider.emit(fix(epoch+wall,17.4221));expect(r.getSnapshot().distanceM).toBeGreaterThan(10);r.dispose();
  });
  it('uses a coarse fresh fix to load the local map without treating it as trackable motion',()=>{
    vi.spyOn(Date,'now').mockReturnValue(epoch);vi.spyOn(performance,'now').mockReturnValue(0);
    const provider=new SyntheticLocationProvider(),r=new ActivityRuntime();r.enableLocation(provider);
    provider.emit(fix(epoch,17.421,67));
    expect(r.getMapPosition()).toMatchObject({lat:17.421,accuracyM:67});
    expect(r.getMotion()).toBeUndefined();r.start();expect(r.getSnapshot().status).toBe('ready');r.dispose();
  });
  it('rejects extremely coarse fixes from both the map and recording',()=>{
    vi.spyOn(Date,'now').mockReturnValue(epoch);vi.spyOn(performance,'now').mockReturnValue(0);
    const provider=new SyntheticLocationProvider(),r=new ActivityRuntime();r.enableLocation(provider);
    provider.emit(fix(epoch,17.421,1500));
    expect(r.getMapPosition()).toBeUndefined();expect(r.getMotion()).toBeUndefined();r.dispose();
  });
  it('starts and records conservatively with the 40 metre fix that previously regressed',()=>{
    let wall=0;vi.spyOn(Date,'now').mockImplementation(()=>epoch+wall);vi.spyOn(performance,'now').mockImplementation(()=>wall);
    const provider=new SyntheticLocationProvider(),r=new ActivityRuntime();r.enableLocation(provider);provider.emit(fix(epoch,17.421,40));r.start();
    expect(r.getSnapshot().status).toBe('recording');expect(r.getLocationHealth().quality).toBe('poor');
    wall=5000;provider.emit(fix(epoch+wall,17.4211,40));expect(r.getSnapshot().distanceM).toBe(0);
    wall=10000;provider.emit(fix(epoch+wall,17.4213,40));expect(r.getSnapshot().distanceM).toBeGreaterThan(20);r.dispose();
  });
  it('refreshes stationary accuracy and prevents old coordinates from starting a run',()=>{
    let wall=0;vi.spyOn(Date,'now').mockImplementation(()=>epoch+wall);vi.spyOn(performance,'now').mockImplementation(()=>wall);
    const provider=new SyntheticLocationProvider(),r=new ActivityRuntime();r.enableLocation(provider);provider.emit(fix());r.start();
    wall=1000;provider.emit(fix(epoch+wall,17.421001,6));
    expect(r.getLocationHealth().accuracyM).toBe(6);expect(r.getSnapshot().distanceM).toBe(0);
    r.stop();wall=12000;r.start();expect(r.getSnapshot().status).toBe('complete');r.dispose();
  });
  it('holds the runner through stationary and poor fixes while retaining a local raw trace',()=>{
    let wall=0;vi.spyOn(Date,'now').mockImplementation(()=>epoch+wall);vi.spyOn(performance,'now').mockImplementation(()=>wall);
    const provider=new SyntheticLocationProvider(),r=new ActivityRuntime();r.enableLocation(provider);
    provider.emit(fix());r.start();const origin=r.getMotion()!;
    wall=1000;provider.emit(fix(epoch+wall,17.42101,5));
    expect(r.getMotion()!.lat).toBe(origin.lat);
    wall=2000;provider.emit(fix(epoch+wall,17.43,120));
    expect(r.getMotion()!.lat).toBe(origin.lat);
    expect(r.getSnapshot().distanceM).toBe(0);
    r.stop();const saved=r.completedActivity()!;
    expect(saved.samples).toHaveLength(1);
    expect(saved.rawSamples).toHaveLength(3);
    expect(saved.sampleDecisions?.map(event=>event.reason)).toEqual(['origin','stationary','low_accuracy']);
    expect(saved.rawSamples?.[0]).toMatchObject({timestamp:epoch,latitude:17.421,longitude:78.478,accuracy:5,
      altitude:null,altitudeAccuracy:null,speed:null,heading:null});
    expect(r.getGpsDiagnostics()).toMatchObject({rawFixes:3,acceptedFixes:1,rejectedFixes:2,
      acceptedDistanceM:0,reasons:{JITTER:1,LOW_ACCURACY:1}});
    expect(r.exportGeoJSON().features).toHaveLength(1);r.dispose();
  });
  it('records, pauses, resumes, stops the watcher and exports segmented paths',()=>{
    let wall=0;
    vi.spyOn(Date,'now').mockImplementation(()=>epoch+wall);
    vi.spyOn(performance,'now').mockImplementation(()=>wall);
    const provider=new SyntheticLocationProvider(),r=new ActivityRuntime();
    r.enableLocation(provider);provider.emit(fix());expect(r.locationState).toBe('ready');
    r.start();
    wall=5000;provider.emit(fix(epoch+wall,17.4211));r.update(wall);
    expect(r.getSnapshot().distanceM).toBeGreaterThan(10);
    r.pause();const distance=r.getSnapshot().distanceM;
    wall=15000;provider.emit(fix(epoch+wall,17.422));r.resume();
    wall=20000;provider.emit(fix(epoch+wall,17.4221));
    expect(r.getSnapshot().distanceM).toBe(distance);
    wall=25000;provider.emit(fix(epoch+wall,17.4222));r.stop();
    expect(r.getSnapshot().elapsedMs).toBe(15000);
    expect(r.exportGeoJSON().features.length).toBe(2);
    const saved=r.getSnapshot().distanceM;
    wall=30000;provider.emit(fix(epoch+wall,17.4223));
    expect(r.getSnapshot().distanceM).toBe(saved);
    expect(r.getSnapshot().status).toBe('complete');
    const record=r.completedActivity()!;
    expect(record.samples.length).toBe(4);
    expect(record.id).toBe(r.completedActivity()!.id);
    record.samples[0].lat=0;
    expect(r.completedActivity()!.samples[0].lat).toBe(17.421);
  });
  it('can record outside coverage but does not display a false Hyderabad position',()=>{
    vi.spyOn(Date,'now').mockReturnValue(epoch);
    const p=new SyntheticLocationProvider(),r=new ActivityRuntime();
    r.enableLocation(p);r.setMapCoverage([78.455,17.4,78.505,17.447]);p.emit({...fix(),lat:51.5,lng:0});
    expect(r.getMotion()).toBeUndefined();
    r.start();expect(r.getSnapshot().status).toBe('recording');
    r.dispose();
  });
});
describe('browser provider lifecycle',()=>{
  it('requests only on start and ignores callbacks after stop',()=>{
    let callback:PositionCallback|undefined;
    const clearWatch=vi.fn(),watchPosition=vi.fn((cb:PositionCallback)=>{callback=cb;return 5;});
    const provider=new WebLocationProvider({watchPosition,clearWatch} as unknown as Geolocation);
    const onFix=vi.fn(),onState=vi.fn();
    expect(watchPosition).not.toHaveBeenCalled();
    provider.start(onFix,onState);expect(onState).toHaveBeenCalledWith('locating');
    expect(watchPosition.mock.calls[0]).toHaveLength(3);
    expect((watchPosition.mock.calls[0] as unknown[])[2]).toEqual({enableHighAccuracy:true,maximumAge:0,timeout:15000});
    provider.stop();expect(clearWatch).toHaveBeenCalledWith(5);
    callback!({timestamp:epoch,coords:{latitude:17,longitude:78,accuracy:5}} as GeolocationPosition);
    expect(onFix).not.toHaveBeenCalled();
  });
});
