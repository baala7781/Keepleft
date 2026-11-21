import {routeAreas,readCachedArea,fetchArea} from '../story/route-world';
import type {ActivityStore} from '../tracking/storage';

let running=false;

/**
 * Fetches map data for any recent activity areas not yet in local cache.
 * Runs at most one concurrent fetch; silently skips on error so it never
 * blocks the caller. Safe to call repeatedly — deduplicates in-flight runs.
 */
export async function prefetchMissingMaps(store:ActivityStore):Promise<void>{
  if(running||!navigator.onLine)return;
  running=true;
  try{
    const summaries=await store.list().catch(()=>[]);
    // Only the 10 most recent activities — older ones are unlikely to need new maps
    const recent=summaries.slice(0,10);
    for(const summary of recent){
      const activity=await store.get(summary.id).catch(()=>undefined);
      if(!activity?.samples.length)continue;
      const areas=routeAreas(activity.samples);
      for(const area of areas){
        if(!navigator.onLine)return;
        const cached=await readCachedArea(area.key);
        if(cached)continue;
        const signal=AbortSignal.timeout(30000);
        await fetchArea(area,signal).catch(()=>{/* Non-blocking: skip areas that fail */});
      }
    }
  }finally{
    running=false;
  }
}

/**
 * Registers a one-time online event listener that triggers map prefetch.
 * Call once at app startup. Returns a cleanup function.
 */
export function registerMapPrefetch(store:ActivityStore):()=>void{
  const handler=()=>{ void prefetchMissingMaps(store); };
  window.addEventListener('online',handler);
  // Also try immediately in case we're already online
  void prefetchMissingMaps(store);
  return ()=>window.removeEventListener('online',handler);
}
