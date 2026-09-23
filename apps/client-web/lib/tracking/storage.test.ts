import {describe,it,expect,vi} from 'vitest';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {IndexedDBActivityStore,MemoryActivityStore,routeGeoJSON,type SavedActivity,type ActivityStore} from './storage';
import type {ActivityDraft} from './recovery';

const activity=(id='test-activity',startedAtMs=1000):SavedActivity=>({version:1,id,startedAtMs,endedAtMs:6000,
  snapshot:{status:'complete',distanceM:11,elapsedMs:5000,speedMps:0,progress:0},
  samples:[{lng:78.478,lat:17.421,accuracyM:5,timestampMs:1000,breakBefore:true},
    {lng:78.478,lat:17.4211,accuracyM:5,timestampMs:6000,breakBefore:false}]});

for(const [name,factory] of [
  ['memory',()=>new MemoryActivityStore()],
  ['IndexedDB',()=>new IndexedDBActivityStore(new IDBFactory())],
] as [string,()=>ActivityStore][])describe(`${name} activity storage contract`,()=>{
  it('saves immutable records with lightweight summaries in newest-first order',async()=>{
    const store=factory(),original=activity();await store.save(original);
    original.samples[0].lat=0;
    const first=await store.get(original.id);expect(first!.samples[0].lat).toBe(17.421);
    first!.snapshot.distanceM=100;
    expect((await store.get(original.id))!.snapshot.distanceM).toBe(11);
    await store.save(activity('newer',2000));
    const all=await store.list();expect(all.map(a=>a.id)).toEqual(['newer','test-activity']);
    expect(all[0].sampleCount).toBe(2);expect(all[0]).not.toHaveProperty('samples');
  });
  it('is idempotent and removes both the route and summary',async()=>{
    const store=factory();await store.save(activity());await store.save(activity());
    expect(await store.list()).toHaveLength(1);
    await store.remove('test-activity');expect(await store.get('test-activity')).toBeUndefined();
    expect(await store.list()).toHaveLength(0);
  });
  it('stores raw diagnostics with the activity but excludes them from history and deletes them with the run',async()=>{
    const store=factory(),record=activity();record.rawSamples=[{timestamp:1000,latitude:17.421,longitude:78.478,
      accuracy:5,altitude:null,altitudeAccuracy:null,speed:null,heading:null}];
    record.sampleDecisions=[{timestampMs:1000,accepted:true,reason:'origin'}];
    await store.save(record);
    expect((await store.get(record.id))?.rawSamples).toEqual(record.rawSamples);
    expect((await store.list())[0]).not.toHaveProperty('rawSamples');
    expect((await store.list())[0]).not.toHaveProperty('sampleDecisions');
    await store.remove(record.id);expect(await store.get(record.id)).toBeUndefined();
  });
});
describe('local database durability and exports',()=>{
  const draft=():ActivityDraft=>({version:1,owner:'old-session',revision:1,savedAtMs:6000,activity:{...activity(),source:'gps',endedAtMs:0,
    snapshot:{status:'paused',distanceM:11,elapsedMs:5000,speedMps:0,progress:0},
    samples:activity().samples.map((sample,index)=>({...sample,activeElapsedMs:index?5000:0}))}});
  it('ends and saves a claimed recovery draft without resurrecting it',async()=>{
    const store=new IndexedDBActivityStore(new IDBFactory());await store.checkpoint(draft());
    const claimed=await store.claim(draft(),'new-session');
    await store.save({...claimed.activity,endedAtMs:claimed.savedAtMs,
      snapshot:{...claimed.activity.snapshot,status:'complete',speedMps:0}},'new-session');
    expect(await store.drafts()).toEqual([]);
    expect((await store.get('test-activity'))?.snapshot.status).toBe('complete');
  });
  it('discards only the claimed recovery draft',async()=>{
    const store=new IndexedDBActivityStore(new IDBFactory());await store.checkpoint(draft());
    await expect(store.discardDraft('test-activity','wrong-session')).rejects.toThrow();
    expect(await store.drafts()).toHaveLength(1);
    const claimed=await store.claim(draft(),'new-session');
    await store.discardDraft(claimed.activity.id,'new-session');
    expect(await store.drafts()).toEqual([]);expect(await store.get('test-activity')).toBeUndefined();
  });
  it('reopens completed activities through a new adapter',async()=>{
    const factory=new IDBFactory();await new IndexedDBActivityStore(factory).save(activity());
    const reopened=new IndexedDBActivityStore(factory);
    expect(await reopened.get('test-activity')).toEqual(activity());
  });
  it('reports unavailable storage instead of claiming a save succeeded',async()=>{
    const store=new IndexedDBActivityStore(undefined);
    await expect(store.save(activity())).rejects.toThrow('unavailable');
  });
  it('rolls back the route when the summary write fails',async()=>{
    const store=new IndexedDBActivityStore(new IDBFactory());
    const original=IDBObjectStore.prototype.put;
    const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args:Parameters<typeof original>){
      if(this.name==='summaries')throw new DOMException('Storage full','QuotaExceededError');
      return original.apply(this,args);
    });
    try{await expect(store.save(activity())).rejects.toThrow('Storage full');}finally{spy.mockRestore();}
    expect(await store.get('test-activity')).toBeUndefined();expect(await store.list()).toEqual([]);
  });
  it('preserves singleton and paused segments without inventing connecting distance',()=>{
    const a=activity();a.samples[1].breakBefore=true;
    const json=routeGeoJSON(a.samples,a.snapshot);
    expect(json.features.map(f=>f.geometry.type)).toEqual(['Point','Point']);
    expect(json.features[0].properties.timestamps).toEqual([1000]);
    expect(json.properties.distanceM).toBe(11);
  });
});
