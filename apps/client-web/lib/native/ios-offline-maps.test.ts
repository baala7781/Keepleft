import {it,expect,vi,afterEach} from 'vitest';
import {loadIOSOfflineNeighborhood} from './ios-offline-maps';
import {neighborhoodFor} from '../geodata/osm';
import {readWorld} from '../geodata/world-archive';
vi.mock('../geodata/world-archive',()=>({readWorld:vi.fn()}));
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
it('never contacts a map service when the local area is missing',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);vi.mocked(readWorld).mockResolvedValue(undefined);
  const area=neighborhoodFor({lng:0,lat:0});
  await expect(loadIOSOfflineNeighborhood(area.x,area.y,new AbortController().signal)).rejects.toThrow('No offline map');
  expect(fetch).not.toHaveBeenCalled();
});
it('uses a previously stored neighborhood without a network request',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const area=neighborhoodFor({lng:0,lat:0});
  const world={...area,data:{type:'FeatureCollection' as const,features:[]},source:'OpenStreetMap' as const,fetchedAt:''};
  vi.mocked(readWorld).mockResolvedValue(world);
  expect(await loadIOSOfflineNeighborhood(area.x,area.y,new AbortController().signal)).toBe(world);expect(fetch).not.toHaveBeenCalled();
});
