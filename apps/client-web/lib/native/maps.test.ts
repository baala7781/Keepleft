import {it,expect,vi,beforeEach} from 'vitest';
import {CapacitorHttp} from '@capacitor/core';
import {loadNativeNeighborhood} from './maps';
import {loadNeighborhood} from '../geodata/service';
import {readWorld,saveWorld} from '../geodata/world-archive';
import {NativeRun} from './bridge';
import {neighborhoodFor} from '../geodata/osm';
vi.mock('@capacitor/core',()=>({CapacitorHttp:{request:vi.fn()}}));
vi.mock('./bridge',()=>({isAndroid:()=>false,NativeRun:{getMap:vi.fn(),putMap:vi.fn()}}));
vi.mock('../geodata/service',()=>({loadNeighborhood:vi.fn()}));
vi.mock('../geodata/world-archive',()=>({readWorld:vi.fn(),saveWorld:vi.fn()}));
const area=neighborhoodFor({lng:0,lat:0});
const world={...area,data:{type:'FeatureCollection' as const,features:[]},source:'OpenStreetMap' as const,fetchedAt:''};
beforeEach(()=>{vi.resetAllMocks();vi.mocked(saveWorld).mockResolvedValue(undefined);});
it('loads iPhone maps through native HTTP and caches them without an Android bridge',async()=>{
  vi.mocked(CapacitorHttp.request).mockResolvedValue({status:200,data:'{"elements":[]}',headers:{},url:''});
  vi.mocked(loadNeighborhood).mockImplementation(async(_x,_y,fetcher)=>{
    const response=await fetcher!('https://overpass-api.de/api/interpreter',{method:'POST',body:'data=synthetic'});
    expect(await response.json()).toEqual({elements:[]});return world;
  });
  expect(await loadNativeNeighborhood(area.x,area.y,new AbortController().signal)).toBe(world);
  expect(CapacitorHttp.request).toHaveBeenCalledWith(expect.objectContaining({url:'https://overpass-api.de/api/interpreter',method:'POST',data:'data=synthetic'}));
  expect(saveWorld).toHaveBeenCalledWith(world);expect(NativeRun.getMap).not.toHaveBeenCalled();expect(NativeRun.putMap).not.toHaveBeenCalled();
});
it('reuses the iPhone cache without making a network request',async()=>{
  vi.mocked(readWorld).mockResolvedValue(world);
  expect(await loadNativeNeighborhood(area.x,area.y,new AbortController().signal)).toBe(world);
  expect(CapacitorHttp.request).not.toHaveBeenCalled();expect(loadNeighborhood).not.toHaveBeenCalled();
});
it('does not publish or cache a cancelled native response',async()=>{
  const abort=new AbortController();
  vi.mocked(loadNeighborhood).mockImplementation(async()=>{abort.abort();return world;});
  await expect(loadNativeNeighborhood(area.x,area.y,abort.signal)).rejects.toMatchObject({name:'AbortError'});
  expect(saveWorld).not.toHaveBeenCalled();
});
