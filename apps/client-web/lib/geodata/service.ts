import {neighborhood,normalizeOSM,overpassQuery,type OSMResponse,type WorldData} from './osm';
import {localityName,localityQuery} from './place';
export type NeighborhoodWorld=ReturnType<typeof neighborhood>&{data:WorldData;fetchedAt:string;source:'OpenStreetMap';placeName?:string;placeholder?:boolean};
const cache=new Map<string,{world:NeighborhoodWorld;expires:number}>();
const pending=new Map<string,Promise<NeighborhoodWorld>>();
export class MapUnavailable extends Error {}

export async function readMapResponse(response:Response):Promise<OSMResponse> {
  if(!response.ok||!response.body)throw new MapUnavailable('Map service is temporarily unavailable.');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[],limit=8*1024*1024;
  let bytes=0;
  try{
    while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;
      if(bytes>limit){await reader.cancel();throw new MapUnavailable('This area is too detailed for the MVP map.');}
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const merged=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(merged));
}

/** Small public-data cache. No GPS samples, activity IDs or client identifiers are retained. */
export async function loadNeighborhood(x:number,y:number,fetcher:typeof fetch=fetch):Promise<NeighborhoodWorld> {
  const area=neighborhood(x,y),hit=cache.get(area.key);
  if(hit&&hit.expires>Date.now())return hit.world;
  if(pending.has(area.key))return pending.get(area.key)!;
  if(pending.size>=2)throw new MapUnavailable('Map service is busy. Retry shortly.');
  const job=(async()=>{
    let data:WorldData|undefined,placeName:string|undefined;
    for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter']){
      try{
        const response=await fetcher(endpoint,{
          method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Keepleft-MVP/1.0'},
          body:new URLSearchParams({data:overpassQuery(area.bounds)+localityQuery(area.origin)}).toString(),signal:AbortSignal.timeout(30000),
        });
        const raw=await readMapResponse(response);data=normalizeOSM(raw);placeName=localityName(raw);break;
      }catch{/* A second independent public mirror handles temporary upstream outages. */}
    }
    if(!data)throw new MapUnavailable('Nearby map service unavailable. Recording still works; retry when online.');
    if(!data.features.length)throw new MapUnavailable('No mapped features were found nearby. Recording still works.');
    const world:NeighborhoodWorld={...area,data,placeName,source:'OpenStreetMap',fetchedAt:new Date().toISOString()};
    cache.delete(area.key);cache.set(area.key,{world,expires:Date.now()+15*60*1000});
    while(cache.size>2)cache.delete(cache.keys().next().value!);
    return world;
  })();
  pending.set(area.key,job);
  try{return await job;}finally{pending.delete(area.key);}
}
