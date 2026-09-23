import {afterEach,describe,it,expect,vi} from 'vitest';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {ActivityRuntime} from './activity';
import {SyntheticLocationProvider} from './location';
import {IndexedDBActivityStore,MemoryActivityStore,type ActivityStore} from './storage';
import {RecoveryConflict,validateDraft,type ActivityDraft} from './recovery';
import {CheckpointWriter} from './checkpoint-writer';
import {ReplayRuntime} from './replay';

const makeDraft=():ActivityDraft=>({version:1,owner:'tab-a',revision:1,savedAtMs:6000,activity:{
  version:1,id:'run',source:'gps',startedAtMs:1000,endedAtMs:0,
  snapshot:{status:'recording',distanceM:11,elapsedMs:5000,speedMps:2.2,progress:0},
  samples:[{lng:0,lat:0,accuracyM:5,timestampMs:1000,activeElapsedMs:0,breakBefore:true},
    {lng:0,lat:.0001,accuracyM:5,timestampMs:6000,activeElapsedMs:5000,breakBefore:false}],
}});
afterEach(()=>vi.restoreAllMocks());
for(const [name,factory] of [
  ['memory',()=>new MemoryActivityStore()],['IndexedDB',()=>new IndexedDBActivityStore(new IDBFactory())],
] as [string,()=>ActivityStore][])describe(`${name} recovery contract`,()=>{
  it('keeps drafts separate, immutable, and ignores out-of-order checkpoints',async()=>{
    const store=factory(),draft=makeDraft();await store.checkpoint(draft);
    draft.revision=2;draft.activity.snapshot.elapsedMs=6000;await store.checkpoint(draft);await store.checkpoint(makeDraft());
    draft.activity.samples[0].lat=1;
    const pending=await store.drafts();expect(pending[0].revision).toBe(2);expect(pending[0].activity.samples[0].lat).toBe(0);
    expect(await store.list()).toEqual([]);
  });
  it('claims atomically and rejects stale writers, including after completion',async()=>{
    const store=factory(),draft=makeDraft();await store.checkpoint(draft);
    const claimed=await store.claim(draft,'tab-b');
    await expect(store.claim(draft,'tab-c')).rejects.toBeInstanceOf(RecoveryConflict);
    await expect(store.checkpoint({...draft,revision:100})).rejects.toBeInstanceOf(RecoveryConflict);
    await expect(store.save(draft.activity,'tab-a')).rejects.toBeInstanceOf(RecoveryConflict);
    await store.save({...claimed.activity,snapshot:{...claimed.activity.snapshot,status:'complete'}},'tab-b');
    expect(await store.drafts()).toEqual([]);expect(await store.list()).toHaveLength(1);
    await expect(store.save(draft.activity,'tab-a')).rejects.toBeInstanceOf(RecoveryConflict);
    await expect(store.checkpoint({...draft,revision:101})).rejects.toBeInstanceOf(RecoveryConflict);
    await store.checkpoint({...claimed,revision:10});expect(await store.drafts()).toEqual([]);
  });
});

it('migrates a version-one database without losing completed activities',async()=>{
  const factory=new IDBFactory(),record={...makeDraft().activity,snapshot:{...makeDraft().activity.snapshot,status:'complete' as const}};
  await new Promise<void>((resolve,reject)=>{
    const request=factory.open('atlas-activities',1);
    request.onupgradeneeded=()=>{request.result.createObjectStore('activities',{keyPath:'id'}).put(record);request.result.createObjectStore('summaries',{keyPath:'id'}).put({...record,sampleCount:2});};
    request.onerror=()=>reject(request.error);request.onsuccess=()=>{request.result.close();resolve();};
  });
  const store=new IndexedDBActivityStore(factory);expect(await store.get('run')).toEqual(record);
  const draft=makeDraft();draft.activity.id='second';await store.checkpoint(draft);
  expect((await new IndexedDBActivityStore(factory).drafts())[0]).toEqual(draft);
});

it('retains the recovery copy when final saving rolls back',async()=>{
  const store=new IndexedDBActivityStore(new IDBFactory()),draft=makeDraft();await store.checkpoint(draft);
  const original=IDBObjectStore.prototype.put;
  const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,...args:Parameters<typeof original>){
    if(this.name==='summaries')throw new DOMException('Storage full','QuotaExceededError');return original.apply(this,args);
  });
  await expect(store.save(draft.activity,draft.owner)).rejects.toThrow();spy.mockRestore();
  expect(await store.get('run')).toBeUndefined();expect(await store.drafts()).toEqual([draft]);
});

it('restores paused without GPS, excludes downtime, resumes across a gap, saves and replays',async()=>{
  let now=0;const epoch=1700000000000;
  vi.spyOn(Date,'now').mockImplementation(()=>epoch+now);vi.spyOn(performance,'now').mockImplementation(()=>now);
  const provider=new SyntheticLocationProvider(),first=new ActivityRuntime(),db=new IDBFactory(),store=new IndexedDBActivityStore(db);
  const point=(lat:number)=>({lat,lng:0,accuracyM:5,timestampMs:epoch+now});
  first.enableLocation(provider);provider.emit(point(0));first.start();now=5000;provider.emit(point(.0001));
  const draft=first.checkpoint()!;await store.checkpoint(draft);first.dispose();
  now=3600000;
  const reopened=new IndexedDBActivityStore(db),recovered=new ActivityRuntime();
  const claimed=await reopened.claim((await reopened.drafts())[0],recovered.sessionId);recovered.restore(claimed);
  expect(recovered.getSnapshot()).toMatchObject({status:'paused',elapsedMs:5000,speedMps:0});
  expect(recovered.locationState).toBe('idle');expect(recovered.checkpoint()!.activity.id).toBe(draft.activity.id);
  const fresh=new SyntheticLocationProvider();recovered.resume(now,fresh);
  expect(recovered.getSnapshot().status).toBe('paused');
  fresh.emit({...point(1),accuracyM:100});expect(recovered.getSnapshot().status).toBe('paused');
  now+=1000;fresh.emit(point(1));expect(recovered.getSnapshot().status).toBe('recording');
  now+=5000;fresh.emit(point(1.0001));expect(recovered.getSnapshot().distanceM).toBeCloseTo(draft.activity.snapshot.distanceM);
  now+=5000;fresh.emit(point(1.0002));recovered.stop();
  const final=recovered.completedActivity()!;expect(final.snapshot.elapsedMs).toBe(15000);
  expect(final.samples.filter(p=>p.breakBefore)).toHaveLength(2);expect(final.snapshot.distanceM).toBeGreaterThan(20);
  await reopened.save(final,recovered.sessionId);expect(await reopened.drafts()).toEqual([]);
  const replay=new ReplayRuntime((await reopened.get(final.id))!);replay.seek(replay.durationMs);
  expect(replay.getSnapshot().distanceM).toBe(final.snapshot.distanceM);recovered.dispose();
});

it('can finish a recovered partial run without requesting location',()=>{
  const runtime=new ActivityRuntime(),draft=makeDraft();runtime.restore({...draft,owner:runtime.sessionId});
  runtime.stop();expect(runtime.completedActivity()?.snapshot).toMatchObject({status:'complete',elapsedMs:5000,distanceM:11});
});

it('keeps a stopped but unsaved run complete on recovery',()=>{
  const runtime=new ActivityRuntime(),draft=makeDraft();draft.activity.snapshot.status='complete';draft.activity.endedAtMs=6000;
  runtime.restore({...draft,owner:runtime.sessionId});
  expect(runtime.completedActivity()?.endedAtMs).toBe(6000);expect(runtime.locationState).toBe('idle');
});

it('keeps recovery paused when GPS permission is denied and permits finishing',()=>{
  const runtime=new ActivityRuntime();runtime.restore({...makeDraft(),owner:runtime.sessionId});
  runtime.resume(10000,{start:(_fix,state)=>state('denied'),stop:()=>{}});
  runtime.update(50000);expect(runtime.getSnapshot()).toMatchObject({status:'paused',elapsedMs:5000});
  expect(runtime.locationMessage).toContain('stays paused');runtime.stop();expect(runtime.completedActivity()).toBeDefined();
});

it('does not recreate a recovery copy after the completed run is saved and deleted',async()=>{
  const runtime=new ActivityRuntime(),store=new MemoryActivityStore();runtime.restore({...makeDraft(),owner:runtime.sessionId});
  const writer=new CheckpointWriter(runtime,store,()=>{});await writer.flush();runtime.stop();
  await store.save(runtime.completedActivity()!,runtime.sessionId);runtime.markSaved();await store.remove('run');
  await writer.flush();expect(runtime.checkpoint()).toBeUndefined();expect(await store.drafts()).toEqual([]);
});

it('rejects malformed recovery data without changing the runtime',()=>{
  const runtime=new ActivityRuntime(),draft=makeDraft();draft.activity.samples[1].activeElapsedMs=6000;
  expect(()=>validateDraft(draft)).toThrow('cannot be opened');
  expect(()=>runtime.restore({...draft,owner:runtime.sessionId})).toThrow();expect(runtime.getSnapshot().status).toBe('ready');
});

it('coalesces slow checkpoint writes and retries storage failures without losing live state',async()=>{
  const runtime=new ActivityRuntime(),draft=makeDraft();runtime.restore({...draft,owner:runtime.sessionId});
  const store=new MemoryActivityStore(),report=vi.fn();
  let release!:()=>void;
  const write=vi.spyOn(store,'checkpoint').mockImplementationOnce(()=>new Promise<void>(resolve=>{release=resolve;}));
  const writer=new CheckpointWriter(runtime,store,report);
  const pending=writer.flush();void writer.flush();void writer.flush();expect(write).toHaveBeenCalledTimes(1);
  release();await pending;expect(write).toHaveBeenCalledTimes(2);
  write.mockRejectedValueOnce(new Error('Storage full'));await writer.flush();expect(report.mock.lastCall?.[0]).toContain('failed');
  await writer.flush();expect(report.mock.lastCall?.[0]).toContain('saved');expect(runtime.getSnapshot().distanceM).toBe(11);
});

it('stops writing and pauses the old tab on an ownership conflict',async()=>{
  const runtime=new ActivityRuntime(),draft=makeDraft(),store=new MemoryActivityStore(),report=vi.fn();
  runtime.restore({...draft,owner:runtime.sessionId});
  await store.checkpoint(draft);
  const writer=new CheckpointWriter(runtime,store,report);await writer.flush();
  expect(report.mock.lastCall?.[1]).toBe(true);expect(runtime.getSnapshot().status).toBe('paused');
  const count=report.mock.calls.length;await writer.flush();expect(report).toHaveBeenCalledTimes(count);
});
