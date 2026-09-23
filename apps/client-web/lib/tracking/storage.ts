import type { ActivitySnapshot } from './activity';
import type { AcceptedFix,ActivityType,RawLocationSample,GPSRejectionCode } from './location';
import {RecoveryConflict,validateDraft,type ActivityDraft} from './recovery';

export type SavedActivity = {
  version:1; id:string; startedAtMs:number; endedAtMs:number;
  snapshot:ActivitySnapshot; samples:AcceptedFix[];
  rawSamples?:RawLocationSample[];
  sampleDecisions?:{timestampMs:number;accepted:boolean;reason:string;code?:GPSRejectionCode}[];
  placeName?:string;source?:'gps'|'demo';
  activityType?:ActivityType;
  writerOwner?:string;
};
export type ActivitySummary = Omit<SavedActivity,'samples'|'rawSamples'|'sampleDecisions'> & {sampleCount:number};
export interface ActivityStore {
  save(activity:SavedActivity,owner?:string):Promise<void>;
  list():Promise<ActivitySummary[]>;
  get(id:string):Promise<SavedActivity|undefined>;
  remove(id:string):Promise<void>;
  checkpoint(draft:ActivityDraft):Promise<void>;
  drafts():Promise<ActivityDraft[]>;
  claim(draft:ActivityDraft,owner:string):Promise<ActivityDraft>;
}
const summary = ({samples,rawSamples:_rawSamples,sampleDecisions:_sampleDecisions,...activity}:SavedActivity):ActivitySummary => ({...activity,sampleCount:samples.length});

export function routeGeoJSON(samples:AcceptedFix[],snapshot:ActivitySnapshot) {
  const segments:AcceptedFix[][]=[];
  for(const sample of samples){
    if(sample.breakBefore||!segments.length)segments.push([]);
    segments.at(-1)!.push(sample);
  }
  return {type:'FeatureCollection',properties:{source:'device-gps',distanceM:snapshot.distanceM,durationMs:snapshot.elapsedMs},
    features:segments.map(segment=>({type:'Feature',properties:{timestamps:segment.map(p=>p.timestampMs),accuracyM:segment.map(p=>p.accuracyM),activeElapsedMs:segment.map(p=>p.activeElapsedMs??null)},
      geometry:segment.length===1?{type:'Point',coordinates:[segment[0].lng,segment[0].lat]}:{type:'LineString',coordinates:segment.map(p=>[p.lng,p.lat])}}))};
}

/** Each operation resolves only after the transaction commits, not on request success. */
export class IndexedDBActivityStore implements ActivityStore {
  constructor(private factory:IDBFactory|undefined=globalThis.indexedDB,private name='atlas-activities') {}
  private async database():Promise<IDBDatabase> {
    if(!this.factory)throw new Error('Local activity storage is unavailable.');
    return new Promise((resolve,reject)=>{
      const request=this.factory!.open(this.name,2);
      let rejected=false;
      request.onupgradeneeded=()=>{
        for(const name of ['activities','summaries'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'});
        if(!request.result.objectStoreNames.contains('drafts'))request.result.createObjectStore('drafts',{keyPath:'activity.id'});
      };
      request.onblocked=()=>{rejected=true;reject(new Error('Close other Keepleft tabs and retry.'));};
      request.onerror=()=>reject(new Error('Local activity storage could not open.'));
      request.onsuccess=()=>{
        if(rejected){request.result.close();return;}
        request.result.onversionchange=()=>request.result.close();
        resolve(request.result);
      };
    });
  }
  private async transaction<T>(mode:IDBTransactionMode,run:(tx:IDBTransaction,set:(value:T)=>void,fail:(error:Error)=>void)=>void):Promise<T> {
    const db=await this.database();
    return new Promise<T>((resolve,reject)=>{
      let result:T;
      let failure:Error|undefined;
      const tx=db.transaction(['activities','summaries','drafts'],mode);
      tx.oncomplete=()=>{db.close();resolve(result);};
      tx.onabort=()=>{db.close();reject(failure||new Error('Activity storage failed. Export your route and retry.'));};
      const fail=(error:Error)=>{failure=error;tx.abort();};
      try{run(tx,value=>{result=value;},fail);}catch(error){fail(error instanceof Error?error:new Error('Activity storage failed.'));}
    });
  }
  save(activity:SavedActivity,owner?:string) {
    const copy=structuredClone({...activity,...(owner?{writerOwner:owner}:{})});
    return this.transaction<void>('readwrite',(tx,_set,fail)=>{
      const request=tx.objectStore('drafts').get(copy.id);
      request.onsuccess=()=>{
        if(request.result&&request.result.owner!==owner){fail(new RecoveryConflict());return;}
        const completed=tx.objectStore('activities').get(copy.id);
        completed.onsuccess=()=>{
          if(completed.result?.writerOwner&&completed.result.writerOwner!==owner){fail(new RecoveryConflict());return;}
          try{
            tx.objectStore('activities').put(copy);
            tx.objectStore('summaries').put(summary(copy));
            tx.objectStore('drafts').delete(copy.id);
          }catch(error){fail(error instanceof Error?error:new Error('Activity storage failed.'));}
        };
      };
    });
  }
  checkpoint(draft:ActivityDraft) {
    validateDraft(draft);const copy=structuredClone(draft);
    return this.transaction<void>('readwrite',(tx,_set,fail)=>{
      const complete=tx.objectStore('activities').get(copy.activity.id);
      complete.onsuccess=()=>{
        // A late queued checkpoint must never resurrect a completed recording.
        if(complete.result){if(complete.result.writerOwner&&complete.result.writerOwner!==copy.owner)fail(new RecoveryConflict());return;}
        const request=tx.objectStore('drafts').get(copy.activity.id);
        request.onsuccess=()=>{
          const previous=request.result as ActivityDraft|undefined;
          if(previous&&previous.owner!==copy.owner){fail(new RecoveryConflict());return;}
          if(previous&&previous.revision>=copy.revision)return;
          try{tx.objectStore('drafts').put(copy);}catch{fail(new Error('Could not save recovery progress.'));}
        };
      };
    });
  }
  drafts() {
    return this.transaction<ActivityDraft[]>('readonly',(tx,set)=>{
      const request=tx.objectStore('drafts').getAll();
      request.onsuccess=()=>set((request.result as ActivityDraft[]).sort((a,b)=>b.savedAtMs-a.savedAtMs));
    });
  }
  claim(draft:ActivityDraft,owner:string) {
    validateDraft(draft);
    return this.transaction<ActivityDraft>('readwrite',(tx,set,fail)=>{
      const request=tx.objectStore('drafts').get(draft.activity.id);
      request.onsuccess=()=>{
        const previous=request.result as ActivityDraft|undefined;
        if(!previous||previous.owner!==draft.owner||previous.revision!==draft.revision){fail(new RecoveryConflict());return;}
        const next={...previous,owner,revision:previous.revision+1};
        try{tx.objectStore('drafts').put(next);set(next);}catch{fail(new Error('Could not recover this run.'));}
      };
    });
  }
  discardDraft(id:string,owner:string){
    return this.transaction<void>('readwrite',(tx,_set,fail)=>{
      const request=tx.objectStore('drafts').get(id);
      request.onsuccess=()=>{
        const existing=request.result as ActivityDraft|undefined;
        if(!existing)return;
        if(existing.owner!==owner){fail(new RecoveryConflict());return;}
        tx.objectStore('drafts').delete(id);
      };
    });
  }
  list() {
    return this.transaction<ActivitySummary[]>('readonly',(tx,set)=>{
      const request=tx.objectStore('summaries').getAll();
      request.onsuccess=()=>set((request.result as ActivitySummary[]).sort((a,b)=>b.startedAtMs-a.startedAtMs));
    });
  }
  get(id:string) {
    return this.transaction<SavedActivity|undefined>('readonly',(tx,set)=>{
      const request=tx.objectStore('activities').get(id);
      request.onsuccess=()=>set(request.result);
    });
  }
  remove(id:string) {
    return this.transaction<void>('readwrite',tx=>{
      tx.objectStore('activities').delete(id);tx.objectStore('summaries').delete(id);
    });
  }
}

/** Synthetic adapter: callers cannot mutate stored records through shared references. */
export class MemoryActivityStore implements ActivityStore {
  private records=new Map<string,SavedActivity>();
  private pending=new Map<string,ActivityDraft>();
  async save(activity:SavedActivity,owner?:string){
    const draft=this.pending.get(activity.id);if(draft&&draft.owner!==owner)throw new RecoveryConflict();
    const completed=this.records.get(activity.id);if(completed?.writerOwner&&completed.writerOwner!==owner)throw new RecoveryConflict();
    this.records.set(activity.id,structuredClone({...activity,...(owner?{writerOwner:owner}:{})}));this.pending.delete(activity.id);
  }
  async checkpoint(draft:ActivityDraft){
    validateDraft(draft);const completed=this.records.get(draft.activity.id);
    if(completed){if(completed.writerOwner&&completed.writerOwner!==draft.owner)throw new RecoveryConflict();return;}
    const previous=this.pending.get(draft.activity.id);
    if(previous&&previous.owner!==draft.owner)throw new RecoveryConflict();
    if(previous&&previous.revision>=draft.revision)return;
    this.pending.set(draft.activity.id,structuredClone(draft));
  }
  async drafts(){return [...this.pending.values()].sort((a,b)=>b.savedAtMs-a.savedAtMs).map(a=>structuredClone(a));}
  async claim(draft:ActivityDraft,owner:string){
    validateDraft(draft);const previous=this.pending.get(draft.activity.id);
    if(!previous||previous.owner!==draft.owner||previous.revision!==draft.revision)throw new RecoveryConflict();
    const next={...previous,owner,revision:previous.revision+1};this.pending.set(draft.activity.id,structuredClone(next));return structuredClone(next);
  }
  async list(){return [...this.records.values()].map(summary).sort((a,b)=>b.startedAtMs-a.startedAtMs).map(a=>structuredClone(a));}
  async get(id:string){const a=this.records.get(id);return a?structuredClone(a):undefined;}
  async remove(id:string){this.records.delete(id);}
}
