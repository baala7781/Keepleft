'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {MotionSource} from '../tracking/motion-source';
import type {ActivityType} from '../tracking/location';
import type {NeighborhoodWorld} from './service';
import {neighborhoodFor} from './osm';
import {WorldCorridor} from './world-corridor';
import {readWorld,saveWorld} from './world-archive';
import {predictedNeighborhoods} from './world-prediction';
import {isAndroid} from '../native/bridge';

const emptyRoute:{lng:number;lat:number}[]=[];
export function useNeighborhood(runtime:MotionSource,activityType:ActivityType='run',routePoints:{lng:number;lat:number}[]=emptyRoute) {
  const [world,setWorld]=useState<NeighborhoodWorld|null>(null);
  const [status,setStatus]=useState('');
  const [retryCount,retry]=useState(0);
  const corridor=useRef(new WorldCorridor());
  const lastPosition=useRef<{lng:number;lat:number}|null>(null);
  useEffect(()=>{
    const pending=new Map<string,AbortController>(),failed=new Map<string,number>();
    let disposed=false,currentKey='',lastPrediction=0,lastPublished='',routeCursor=0;
    const publish=()=>{
      if(disposed)return;
      const next=corridor.current.compose();if(!next)return;
      runtime.setMapCoverage(next.bounds);
      if(next.placeName)runtime.setPlaceName?.(next.placeName);
      const signature=next.key+'/'+corridor.current.version;
      if(signature!==lastPublished){lastPublished=signature;setWorld(next);}
      setStatus('World ready');
    };
    const request=(area:ReturnType<typeof neighborhoodFor>,activate=false)=>{
      if(corridor.current.hasDetail(area.key)||pending.has(area.key)||pending.size>=2||
        Date.now()-(failed.get(area.key)||0)<15000)return;
      const controller=new AbortController();pending.set(area.key,controller);
      void (async()=>{
        const stored=await readWorld(area.key);
        if(stored)return stored;
        const response=isAndroid()?await import('../native/maps').then(module=>module.loadAndroidNeighborhood(area.x,area.y,controller.signal)):
          await fetch(`/api/world?x=${area.x}&y=${area.y}`,{signal:controller.signal}).then(async result=>{
            if(!result.ok)throw new Error('Nearby map unavailable');return result.json() as Promise<NeighborhoodWorld>;
          });
        if(response.key!==area.key||response.data?.type!=='FeatureCollection'||!Array.isArray(response.data.features))throw new Error('Invalid map response');
        void saveWorld(response).catch(()=>{});
        return response;
      })().then(data=>{
        if(disposed||controller.signal.aborted)return;
        if(data.key!==area.key||data.data?.type!=='FeatureCollection'||!Array.isArray(data.data.features))throw new Error('Invalid map response');
        corridor.current.add(data);
        // Prefetching must not replace the visible 3D world while replay is
        // active. The cached area is published atomically when it becomes the
        // current neighborhood.
        if(activate||area.key===currentKey)publish();
      }).catch(error=>{
        if(disposed||error.name==='AbortError')return;
        failed.set(area.key,Date.now());if(area.key===currentKey)setStatus('World data is temporarily unavailable');
      }).finally(()=>{pending.delete(area.key);});
    };
    const routeAreas:ReturnType<typeof neighborhoodFor>[]=[];
    for(const point of routePoints){
      try{const area=neighborhoodFor(point);if(routeAreas.at(-1)?.key!==area.key)routeAreas.push(area);}catch{}
    }
    const unsubscribe=runtime.subscribe(()=>{
      if(runtime.source==='demo'||runtime.isDemoReplay){
        if(!currentKey&&lastPublished==='demo')return;
        for(const controller of pending.values())controller.abort();pending.clear();
        corridor.current=new WorldCorridor();currentKey='';lastPublished='demo';lastPosition.current=null;
        setWorld(null);setStatus('');runtime.setMapCoverage(null);return;
      }
      const fix=runtime.getMapPosition();if(!fix)return;
      let area:ReturnType<typeof neighborhoodFor>;
      try{area=neighborhoodFor(fix);}catch{return;}
      const previous=lastPosition.current;lastPosition.current=fix;
      if(area.key!==currentKey){
        currentKey=corridor.current.visit(fix);
        if(!corridor.current.compose()){
          runtime.setMapCoverage(area.bounds);
          setWorld({...area,data:{type:'FeatureCollection',features:[]},fetchedAt:'',source:'OpenStreetMap',placeholder:true});
        }else publish();
      }
      request(area,true);
      let routeIndex=-1;
      for(let i=routeCursor;i<routeAreas.length;i++)if(routeAreas[i].key===area.key){routeIndex=i;break;}
      if(routeIndex<0)routeIndex=routeAreas.findIndex(candidate=>candidate.key===area.key);
      if(routeIndex>=0)routeCursor=routeIndex;
      if(routeIndex>=0&&routeIndex+1<routeAreas.length)request(routeAreas[routeIndex+1]);
      if(Date.now()-lastPrediction<2500||pending.size>=2)return;
      lastPrediction=Date.now();
      for(const predicted of predictedNeighborhoods(fix,previous,runtime.getMotion()?.heading,runtime.getSnapshot().speedMps,activityType)){
        if(pending.size>=2)break;
        request(predicted);
      }
    });
    return ()=>{disposed=true;for(const controller of pending.values())controller.abort();unsubscribe();};
  },[runtime,retryCount,activityType,routePoints]);
  const retryMap=useCallback(()=>retry(value=>value+1),[]);
  return {world,status,retryMap};
}
