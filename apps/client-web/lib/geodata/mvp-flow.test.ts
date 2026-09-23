import {afterEach,it,expect,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {GET} from '../../app/api/world/route';
import {ActivityRuntime} from '../tracking/activity';
import {SyntheticLocationProvider} from '../tracking/location';
import {IndexedDBActivityStore} from '../tracking/storage';
import {neighborhoodFor,type WorldData} from './osm';
import {mapStyle} from './map-style';
import {buildBuildings} from '../renderer/world';
import {LocalENU} from '../../../../packages/geo';
import type {NeighborhoodWorld} from './service';
import {ReplayRuntime} from '../tracking/replay';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('acquires a neighborhood, records independently of map replacement, and reopens the saved GPS activity',async()=>{
  let elapsed=0;const epoch=1700000000000;
  vi.spyOn(Date,'now').mockImplementation(()=>epoch+elapsed);
  vi.spyOn(performance,'now').mockImplementation(()=>elapsed);
  const fix={lng:-.12,lat:51.5,accuracyM:5,timestampMs:epoch};
  const area=neighborhoodFor(fix);
  const geometry=[{lon:fix.lng,lat:fix.lat},{lon:fix.lng+.0001,lat:fix.lat},{lon:fix.lng+.0001,lat:fix.lat+.0001},{lon:fix.lng,lat:fix.lat}];
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({elements:[
    {type:'way',id:1,tags:{building:'apartments','building:levels':'4'},geometry},
    {type:'way',id:2,tags:{leisure:'garden'},geometry},
    {type:'area',id:3,tags:{boundary:'administrative',admin_level:'8',name:'Test locality'}},
  ]})));
  const provider=new SyntheticLocationProvider(),runtime=new ActivityRuntime();
  runtime.enableLocation(provider);provider.emit(fix);runtime.start();
  expect(runtime.getSnapshot().status).toBe('recording');expect(runtime.getMotion()).toBeDefined();
  const response=await GET(new Request(`http://localhost/api/world?x=${area.x}&y=${area.y}`));
  expect(response.status).toBe(200);
  const world=await response.json() as NeighborhoodWorld;
  expect(world.placeName).toBe('Test locality');runtime.setPlaceName(world.placeName!);
  runtime.setMapCoverage(world.bounds);expect(runtime.getMotion()).toBeDefined();
  expect(mapStyle('http://localhost',world,world.data).sources.atlas.type).toBe('geojson');
  const mesh=buildBuildings(world.data as WorldData,new LocalENU(world.origin));
  expect(mesh.attributes.position.count).toBeGreaterThan(0);mesh.dispose();
  elapsed=5000;provider.emit({...fix,timestampMs:epoch+elapsed,lat:fix.lat+.0001});runtime.pause();
  const before=runtime.getSnapshot().distanceM;
  // Map disposal/reconstruction and camera coverage never reset activity clocks or samples.
  runtime.setMapCoverage(null);runtime.setMapCoverage(world.bounds);
  elapsed=15000;provider.emit({...fix,timestampMs:epoch+elapsed,lat:fix.lat+.0005});runtime.resume();
  elapsed=20000;provider.emit({...fix,timestampMs:epoch+elapsed,lat:fix.lat+.0006});
  expect(runtime.getSnapshot().distanceM).toBe(before);
  elapsed=25000;provider.emit({...fix,timestampMs:epoch+elapsed,lat:fix.lat+.0007});runtime.stop();
  const db=new IDBFactory(),record=runtime.completedActivity()!;
  await new IndexedDBActivityStore(db).save(record);
  const reopened=await new IndexedDBActivityStore(db).get(record.id);
  expect(reopened?.snapshot.elapsedMs).toBe(15000);expect(reopened?.snapshot.distanceM).toBeGreaterThan(20);
  expect(reopened?.samples.filter(p=>p.breakBefore)).toHaveLength(2);
  expect(reopened?.placeName).toBe('Test locality');
  const replay=new ReplayRuntime(reopened!);expect(replay.legacyTiming).toBe(false);
  replay.seek(2500);expect(replay.getMotion()!.lat).toBeCloseTo(fix.lat+.00005,6);
  replay.seek(replay.durationMs);expect(replay.getSnapshot().distanceM).toBeCloseTo(reopened!.snapshot.distanceM);
  expect(reopened!.samples).toEqual(record.samples);
  expect(runtime.exportGeoJSON().features).toHaveLength(2);runtime.dispose();
});
it('rejects malformed map requests before contacting an external service',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  for(const query of ['x=-1&y=2','x=99999&y=2','x=1.5&y=2','x=1;out;&y=2','y=2']){
    expect((await GET(new Request(`http://localhost/api/world?${query}`))).status).toBe(400);
  }
  expect(fetcher).not.toHaveBeenCalled();
});
