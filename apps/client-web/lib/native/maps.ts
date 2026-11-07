import {CapacitorHttp} from '@capacitor/core';
import {NativeRun,isAndroid} from './bridge';
import {readWorld,saveWorld} from '../geodata/world-archive';
import {loadNeighborhood,type NeighborhoodWorld} from '../geodata/service';
import {neighborhood} from '../geodata/osm';

/** Native HTTP downloads geographic data. Successful areas are saved for offline replay. */
export async function loadNativeNeighborhood(x:number,y:number,signal:AbortSignal):Promise<NeighborhoodWorld>{
  const area=neighborhood(x,y);
  const android=isAndroid();
  const cached=android?await NativeRun.getMap({key:area.key}).catch(()=>({world:undefined})):{world:await readWorld(area.key)};
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  if(cached.world)return cached.world;
  const nativeFetch:typeof fetch=async(input,init)=>{
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    if(typeof init?.body!=='string')throw new Error('Map request must use an encoded query.');
    const response=await CapacitorHttp.request({url,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Keepleft-Mobile/1.0'},data:init.body,responseType:'text',connectTimeout:15000,readTimeout:30000});
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    const body=typeof response.data==='string'?response.data:JSON.stringify(response.data);
    if(body.length>8*1024*1024)throw new Error('Map area too large.');
    return new Response(body,{status:response.status});
  };
  const world=await loadNeighborhood(x,y,nativeFetch);
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  if(android)await NativeRun.putMap({world}).catch(()=>{});
  else await saveWorld(world).catch(()=>{});
  return world;
}
