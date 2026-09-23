import {describe,it,expect} from 'vitest';
import {StoryTimeline} from './timeline';
import type {SavedActivity} from '../tracking/storage';
const activity=(gap=false):SavedActivity=>({version:1,id:'synthetic',source:'gps',startedAtMs:1000,endedAtMs:41000,
  snapshot:{status:'complete',elapsedMs:40000,distanceM:50,speedMps:0,progress:1},
  samples:Array.from({length:9},(_,i)=>({lng:0,lat:i*.00005,timestampMs:1000+i*5000,activeElapsedMs:i*5000,accuracyM:5,breakBefore:i===0||(gap&&i===4)}))});
describe('photo story timeline',()=>{
  it('uses eight real seconds, with still opening and ending frames',()=>{const t=new StoryTimeline(activity());expect(t.endMs-t.startMs).toBe(8000);expect(t.at(0).moving).toBe(false);expect(t.at(4).elapsedMs-t.at(3).elapsedMs).toBe(1000);expect(t.at(12).moving).toBe(false);expect(t.at(12).elapsedMs).toBe(t.endMs);});
  it('is seek-safe and never joins a gap',()=>{const t=new StoryTimeline(activity(true));const p=t.at(6);t.at(11);expect(t.at(6)).toEqual(p);expect(t.at(6).gap).toBe(false);expect(t.startMs).toBeGreaterThanOrEqual(20000);});
  it('rejects invalid route data before rendering',()=>{const bad=activity();bad.samples[3].lat=NaN;expect(()=>new StoryTimeline(bad)).toThrow();});
  it('handles a single point without inventing motion',()=>{const a=activity();a.samples=a.samples.slice(0,1);const t=new StoryTimeline(a);expect(t.at(6).moving).toBe(false);expect(t.at(6).speed).toBe(0);});
});
