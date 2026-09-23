import {afterEach,describe,it,expect,vi} from 'vitest';
import {ReplayRuntime} from './replay';
import {distanceBetween,type AcceptedFix} from './location';
import type {SavedActivity} from './storage';

let clock=0;
const makeRecord=():SavedActivity=>{
  const samples:AcceptedFix[]=[
    {lng:0,lat:0,timestampMs:100000,activeElapsedMs:0,accuracyM:5,breakBefore:true},
    {lng:0,lat:.0001,timestampMs:110000,activeElapsedMs:10000,accuracyM:5,breakBefore:false},
    {lng:0,lat:.001,timestampMs:150000,activeElapsedMs:20000,accuracyM:5,breakBefore:true},
    {lng:0,lat:.0011,timestampMs:160000,activeElapsedMs:30000,accuracyM:5,breakBefore:false},
  ];
  return {version:1,id:'test',source:'gps',placeName:'Test locality',startedAtMs:100000,endedAtMs:170000,samples,
    snapshot:{status:'complete',elapsedMs:40000,progress:0,speedMps:0,distanceM:distanceBetween(samples[0],samples[1])+distanceBetween(samples[2],samples[3])}};
};
const create=()=>{clock=0;vi.spyOn(performance,'now').mockImplementation(()=>clock);return new ReplayRuntime(makeRecord());};
const advance=(runtime:ReplayRuntime,to:number)=>{while(clock<to){clock=Math.min(to,clock+100);runtime.update(clock);}};
afterEach(()=>vi.restoreAllMocks());

describe('deterministic recorded-run replay',()=>{
  it('shows the same recent speed after seeking and excludes gaps from the averaging window',()=>{
    const r=create();r.play();r.seek(5000);const speed=r.getSnapshot().speedMps;
    expect(speed).toBeGreaterThan(1);r.seek(25000);expect(r.getSnapshot().speedMps).toBeCloseTo(speed);
    r.seek(5000);expect(r.getSnapshot().speedMps).toBe(speed);
    r.seek(15000);expect(r.getSnapshot().speedMps).toBe(0);
  });
  it('interpolates recorded movement and supports repeatable backward and forward seeking',()=>{
    const r=create();r.seek(5000);const first=r.getMotion()!;
    expect(first.lat).toBeCloseTo(.00005,8);
    expect(r.getSnapshot().distanceM).toBeGreaterThan(5);
    r.seek(25000);expect(r.getMotion()!.lat).toBeCloseTo(.00105,8);
    r.seek(5000);expect(r.getMotion()).toEqual(first);
    expect(r.getSnapshot().status).toBe('paused');
  });
  it('holds during gaps, never bridges paused sections, and retains the final stopped time',()=>{
    const r=create();r.seek(15000);
    expect(r.inGap).toBe(true);expect(r.getMotion()!.lat).toBe(.0001);
    expect(r.getTrail()).toHaveLength(2);
    r.play();expect(r.getSnapshot().speedMps).toBe(0);
    r.seek(25000);expect(r.getTrail().map(p=>p.breakBefore)).toEqual([true,false,true,false]);
    r.seek(39000);expect(r.getMotion()!.lat).toBe(.0011);
    r.seek(40000);expect(r.getSnapshot().status).toBe('complete');
    expect(r.getSnapshot().distanceM).toBeCloseTo(makeRecord().snapshot.distanceM);
  });
  it('bridges a nearby short recorder reconnect for display without changing the raw gap',()=>{
    const record=makeRecord();record.samples[2]={...record.samples[2],lng:0,lat:.000105,timestampMs:124000,activeElapsedMs:24000};
    record.samples[3]={...record.samples[3],timestampMs:125000,activeElapsedMs:25000};record.snapshot.elapsedMs=35000;
    const r=new ReplayRuntime(record);r.seek(22600);
    expect(r.inGap).toBe(true);
    expect(r.getMotion(false)!.lat).toBeCloseTo(.0001,7);
    expect(r.getMotion(true)!.lat).toBeGreaterThan(.0001);
    expect(r.getTrail(false).at(-1)!.breakBefore).toBe(false);
    expect(r.getTrail(true).at(-1)!.breakBefore).toBe(false);
  });
  it('changes speed without jumps and excludes time spent paused',()=>{
    const r=create();r.play();advance(r,5000);expect(r.getSnapshot().elapsedMs).toBe(5000);
    r.setSpeed(4);advance(r,7000);expect(r.getSnapshot().elapsedMs).toBe(13000);
    r.pause();clock=17000;expect(r.getSnapshot().elapsedMs).toBe(13000);
    r.play();advance(r,18000);expect(r.getSnapshot().elapsedMs).toBe(17000);
    r.setSpeed(99);expect(r.rate).toBe(4);
    advance(r,50000);expect(r.getSnapshot().status).toBe('complete');
    r.play();expect(r.getSnapshot().elapsedMs).toBe(0);
  });
  it('bounds visual catch-up after a blocked frame instead of teleporting',()=>{
    const r=create();r.play();r.setSpeed(4);clock=2000;
    expect(r.getSnapshot().elapsedMs).toBe(1000);
    expect(r.getMotion()!.lat).toBeCloseTo(.00001,8);
  });
  it('isolates replay from its saved record and from map coverage changes',()=>{
    const source=makeRecord(),original=structuredClone(source),r=new ReplayRuntime(source);
    r.seek(25000);r.setMapCoverage([10,10,11,11]);expect(r.getMotion()).toBeUndefined();
    expect(r.getMapPosition().lat).toBeCloseTo(.00105,8);
    r.setMapCoverage(null);expect(r.getMotion()).toBeDefined();
    expect(source).toEqual(original);source.samples[2].lat=5;
    expect(r.getMotion()!.lat).toBeCloseTo(.00105,8);
  });
  it('supports older records with a disclosed approximate timeline',()=>{
    const record=makeRecord();record.samples.forEach(p=>delete p.activeElapsedMs);
    const r=new ReplayRuntime(record);expect(r.legacyTiming).toBe(true);expect(r.getMotion()!.lat).toBe(0);
    r.seek(r.durationMs);expect(r.getMotion()!.lat).toBe(.0011);
  });
  it('rejects broken records rather than placing a false runner',()=>{
    const record=makeRecord();record.samples[1].timestampMs=record.samples[0].timestampMs;
    expect(()=>new ReplayRuntime(record)).toThrow('invalid');
    expect(()=>new ReplayRuntime({...makeRecord(),samples:[]})).toThrow('no recorded locations');
    record.samples[1].timestampMs=110000;record.samples[1].activeElapsedMs=-1;
    expect(()=>new ReplayRuntime(record)).toThrow('invalid timing');
  });
  it('crosses the dateline on the short arc',()=>{
    const record=makeRecord();record.samples=record.samples.slice(0,2);
    record.samples[0].lng=179.999;record.samples[1].lng=-179.999;
    const r=new ReplayRuntime(record);r.seek(5000);expect(Math.abs(r.getMotion()!.lng)).toBeCloseTo(180,4);
  });
  it('bounds the visible route buffer for long runs',()=>{
    const record=makeRecord();record.samples=Array.from({length:5000},(_,i)=>({lng:0,lat:i*.000001,timestampMs:100000+i*1000,activeElapsedMs:i*1000,accuracyM:5,breakBefore:i%1000===0}));
    record.snapshot.elapsedMs=5000000;const r=new ReplayRuntime(record);r.seek(4999500);
    expect(r.getTrail().length).toBeLessThanOrEqual(4096);expect(r.getTrail()[0].breakBefore).toBe(true);
  });
  it('smooths only the cycling presentation, preserving saved GPS and replay distance',()=>{
    const record=makeRecord();record.activityType='cycle';
    record.samples=Array.from({length:5},(_,i)=>({lng:i*.0001,lat:i%2?.00003:0,
      timestampMs:100000+i*10000,activeElapsedMs:i*10000,accuracyM:5,breakBefore:i===0}));
    record.snapshot.distanceM=record.samples.slice(1).reduce((sum,p,i)=>sum+distanceBetween(record.samples[i],p),0);
    const saved=structuredClone(record),r=new ReplayRuntime(record);r.seek(40000);
    expect(r.getTrail(false)[1].lat).toBe(.00003);
    expect(r.getTrail(true)[1].lat).toBeLessThan(.00003);
    expect(r.getSnapshot().distanceM).toBe(record.snapshot.distanceM);
    expect(record).toEqual(saved);
  });
  it('avoids road alignment for legacy fast activities mislabeled as runs',()=>{
    const record=makeRecord();delete record.activityType;record.snapshot.distanceM=9000;record.snapshot.elapsedMs=1800000;
    expect(new ReplayRuntime(record).roadAlignmentRecommended).toBe(false);
    record.snapshot.distanceM=5000;expect(new ReplayRuntime(record).roadAlignmentRecommended).toBe(true);
  });
});
