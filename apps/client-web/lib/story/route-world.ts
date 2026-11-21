import {neighborhoodFor,type WorldData} from '../geodata/osm';
import type {NeighborhoodWorld} from '../geodata/service';
import {readWorld,saveWorld} from '../geodata/world-archive';
import {isAndroid,isIOS,NativeRun} from '../native/bridge';

/** Public map data only. The route is reduced to neighborhood keys; no coordinates are sent anywhere new. */
const MAX_AREAS=6,MAX_FEATURES=14000;
type Area=ReturnType<typeof neighborhoodFor>;

/** Unique neighborhoods along the route, in travel order, starting with the first sample. */
export function routeAreas(points:readonly {lng:number;lat:number}[],limit=MAX_AREAS):Area[]{
  const areas:Area[]=[],seen=new Set<string>();
  const step=Math.max(1,Math.floor(points.length/400));
  for(let i=0;i<points.length&&areas.length<limit;i+=step){
    try{const area=neighborhoodFor(points[i]);if(!seen.has(area.key)){seen.add(area.key);areas.push(area);}}catch{/* Ignore invalid fixes. */}
  }
  return areas;
}

/** Android keeps areas in SQLite, web in IndexedDB. A world saved by either must be found on every platform. */
export async function readCachedArea(key:string):Promise<NeighborhoodWorld|undefined>{
  if(isAndroid()){
    const native=await NativeRun.getMap({key}).then(result=>result.world).catch(()=>undefined);
    if(native)return native;
  }
  return readWorld(key).catch(()=>undefined);
}

export async function fetchArea(area:Area,signal:AbortSignal):Promise<NeighborhoodWorld>{
  if(isAndroid()||isIOS()){
    const {loadNativeNeighborhood}=await import('../native/maps');
    return loadNativeNeighborhood(area.x,area.y,signal);
  }
  const world=await fetch(`/api/world?x=${area.x}&y=${area.y}`,{signal})
    .then(async response=>{if(!response.ok)throw new Error('Nearby map unavailable');return response.json() as Promise<NeighborhoodWorld>;})
    .catch(async error=>{
      if(signal.aborted)throw error;
      const {loadNeighborhood}=await import('../geodata/service');
      return loadNeighborhood(area.x,area.y);
    });
  void saveWorld(world).catch(()=>{});
  return world;
}

/** Combines areas into one world. The first area keeps its origin so the 3D frame does not shift. */
export function mergeWorlds(worlds:readonly NeighborhoodWorld[]):NeighborhoodWorld|null{
  if(!worlds.length)return null;
  const features:WorldData['features']=[],seen=new Set<string>();
  for(const world of worlds)for(const feature of world.data.features){
    if(features.length>=MAX_FEATURES)break;
    const id=String(feature.id);if(seen.has(id))continue;
    seen.add(id);features.push(feature);
  }
  const bounds:NeighborhoodWorld['bounds']=[
    Math.min(...worlds.map(world=>world.bounds[0])),Math.min(...worlds.map(world=>world.bounds[1])),
    Math.max(...worlds.map(world=>world.bounds[2])),Math.max(...worlds.map(world=>world.bounds[3])),
  ];
  return {...worlds[0],bounds,data:{type:'FeatureCollection',features},placeholder:false};
}
