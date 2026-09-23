import {expect,it} from 'vitest';
import {stabilizeReplayTiming} from './replay-timing';
import {ReplayRuntime} from './replay';
import type {AcceptedFix} from './location';
import type {SavedActivity} from './storage';

const points=(times:number[],measured=times):AcceptedFix[]=>times.map((t,i)=>({lng:i*.00001,lat:i%2*.00006,timestampMs:100000+measured[i],activeElapsedMs:t,accuracyM:5,breakBefore:i===0}));
it('repairs delivery compression without changing samples, duration or pause boundaries',()=>{
  const samples=points([0,1977,2000,3977,4000,9000,10977,11000],[0,1100,2000,3100,4000,30000,31100,32000]);
  samples[5].breakBefore=true;
  const original=structuredClone(samples),times=samples.map(p=>p.activeElapsedMs!);
  const result=stabilizeReplayTiming(samples,times);
  expect(result.times).toEqual([0,1100,2000,3100,4000,9000,10100,11000]);
  expect(result.indices).toEqual([0,2,4,5,7]);
  expect(samples).toEqual(original);expect(times).toEqual(original.map(p=>p.activeElapsedMs));
});
it('keeps normally delivered real corners and out-and-back movement',()=>{
  const samples=points([0,1000,2000,3000,4000]);
  expect(stabilizeReplayTiming(samples,samples.map(p=>p.activeElapsedMs!))).toMatchObject({times:[0,1000,2000,3000,4000],presentationTimes:[0,1000,2000,3000,4000],bridgedIndices:[],indices:[0,1,2,3,4],corrected:false});
});
it('does not discard a point for a single isolated batched delivery',()=>{
  const samples=points([0,1977,2000],[0,1100,2000]);
  expect(stabilizeReplayTiming(samples,[0,1977,2000]).indices).toEqual([0,1,2]);
});
it('removes a stale GPS pause between moving fixes while preserving total duration and coordinates',()=>{
  const samples=points([0,1000,15000,16000,17000]);
  samples[2].lng=samples[1].lng+.000005;samples[2].lat=samples[1].lat;
  const original=structuredClone(samples),result=stabilizeReplayTiming(samples,samples.map(p=>p.activeElapsedMs!));
  expect(result.corrected).toBe(true);
  expect(result.times[2]-result.times[1]).toBeLessThanOrEqual(2000);
  expect(result.times.at(-1)).toBe(17000);
  expect(result.times.every((time,i)=>!i||time>=result.times[i-1])).toBe(true);
  expect(samples).toEqual(original);
});
it('preserves an intentional stop when movement does not resume on both sides',()=>{
  const samples=points([0,1000,15000,16000]);
  samples[2].lng=samples[1].lng;samples[2].lat=samples[1].lat;
  samples[3].lng=samples[2].lng;samples[3].lat=samples[2].lat;
  expect(stabilizeReplayTiming(samples,samples.map(p=>p.activeElapsedMs!))).toMatchObject({times:[0,1000,15000,16000],presentationTimes:[0,1000,15000,16000],bridgedIndices:[],corrected:false});
});
it('bridges a short recorder reconnect only in the presentation timeline',()=>{
  const samples=points([0,1000,15000,16000,17000]);
  samples[2].breakBefore=true;samples[2].lng=samples[1].lng+.000005;samples[2].lat=samples[1].lat;
  const result=stabilizeReplayTiming(samples,samples.map(p=>p.activeElapsedMs!));
  expect(result.times).toEqual([0,1000,15000,16000,17000]);
  expect(result.bridgedIndices).toEqual([2]);
  expect(result.presentationTimes[2]-result.presentationTimes[1]).toBe(250);
  expect(result.presentationTimes.at(-1)).toBe(17000);
  expect(samples[2].breakBefore).toBe(true);
});
it('provides optional coalesced playback while keeping raw trail, totals and repeatable seeking',()=>{
  const samples=points([0,1977,2000,3977,4000,5977,6000],[0,1100,2000,3100,4000,5100,6000]);
  const record:SavedActivity={version:1,id:'synthetic-batched',source:'gps',samples,startedAtMs:100000,endedAtMs:106000,snapshot:{status:'complete',elapsedMs:6000,distanceM:40,speedMps:0,progress:1}};
  const original=structuredClone(record),replay=new ReplayRuntime(record);
  expect(replay.stabilizedTiming).toBe(true);replay.seek(6000);
  expect(replay.getTrail()).toHaveLength(7);expect(replay.getTrail(true)).toHaveLength(4);
  expect(replay.getSnapshot().distanceM).toBe(40);
  replay.seek(1500);const first=replay.getMotion(true);
  expect(first!.lat).toBe(0);expect(first!.accuracyM).toBe(5);
  replay.seek(5000);replay.seek(1500);expect(replay.getMotion(true)).toEqual(first);
  expect(record).toEqual(original);
});
