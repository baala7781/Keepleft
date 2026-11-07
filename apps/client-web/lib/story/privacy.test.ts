import {describe,expect,it} from 'vitest';
import {hideRouteEnds} from './privacy';

const sample=(index:number)=>({lng:index*.001,lat:0,timestampMs:index*1000,accuracyM:4,breakBefore:index===0});

describe('social route privacy',()=>{
  it('hides both route ends and starts the visible line as a new segment',()=>{
    const result=hideRouteEnds(Array.from({length:12},(_,index)=>sample(index)),200);
    expect(result.applied).toBe(true);
    expect(result.samples[0].lng).toBeGreaterThan(0);
    expect(result.samples.at(-1)!.lng).toBeLessThan(.011);
    expect(result.samples[0].breakBefore).toBe(true);
  });
  it('does not erase short routes',()=>{
    const samples=[sample(0),sample(1),sample(2)];
    expect(hideRouteEnds(samples,200)).toEqual({samples,applied:false,hiddenM:0});
  });
});
