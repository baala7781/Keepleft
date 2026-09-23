import {describe,it,expect} from 'vitest';
import {RouteSticker} from './route-sticker';
import type {SavedActivity} from '../tracking/storage';
const make=():SavedActivity=>({version:1,id:'synthetic',source:'gps',startedAtMs:1000,endedAtMs:41000,snapshot:{status:'complete',elapsedMs:40000,distanceM:100,speedMps:0,progress:1},samples:[0,1,2,1,0].map((v,i)=>({lng:0,lat:v*.0001,timestampMs:1000+i*10000,activeElapsedMs:i*10000,accuracyM:5,breakBefore:i===0}))});
describe('portable route sticker',()=>{
  it('preserves an out-and-back and leaves the source untouched',()=>{const a=make(),before=JSON.stringify(a),r=new RouteSticker(a);expect(r.points[0].y).toBeCloseTo(r.points[4].y);expect(r.points[1].y).toBeCloseTo(r.points[3].y);expect(JSON.stringify(a)).toBe(before);});
  it('fits the complete path inside transparent margins',()=>{const r=new RouteSticker(make());for(const p of r.points){expect(p.x).toBeGreaterThanOrEqual(49);expect(p.x).toBeLessThanOrEqual(431);expect(p.y).toBeGreaterThanOrEqual(49);expect(p.y).toBeLessThanOrEqual(431);}});
  it('is seek-safe, reaches the finish and holds across GPS gaps',()=>{const a=make();a.samples[2].breakBefore=true;const r=new RouteSticker(a);expect(r.at(5).gap).toBe(true);const frame=r.at(7);r.at(11);expect(r.at(7)).toEqual(frame);expect(r.at(12).y).toBeCloseTo(r.points[4].y);expect(r.at(0).x).toBeCloseTo(r.points[0].x);});
});
