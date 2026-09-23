import {describe,it,expect} from 'vitest';
import {portraitPaths} from './route-portrait';

describe('local route portrait',()=>{
  it('never connects separate recordings or invalid coordinates',()=>{
    const points=[
      {lng:78,lat:17,breakBefore:true},{lng:78.001,lat:17.001,breakBefore:false},
      {lng:78.002,lat:17.002,breakBefore:true},{lng:NaN,lat:17,breakBefore:false},
      {lng:78.003,lat:17.003,breakBefore:false},
    ];
    const before=structuredClone(points);
    const paths=portraitPaths(points);
    expect(paths).toHaveLength(3);
    expect(paths[0]).toContain(' L');
    expect(paths[1]).not.toContain(' L');
    expect(points).toEqual(before);
    expect(paths.join('')).not.toMatch(/NaN|Infinity/);
  });
  it('normalizes a date-line crossing to a short local route',()=>{
    expect(portraitPaths([
      {lng:179.999,lat:0,breakBefore:true},
      {lng:-179.999,lat:0,breakBefore:false},
    ])).toEqual(['M40.00,140.00 L360.00,140.00']);
  });
  it('handles an empty or stationary activity without invented movement',()=>{
    expect(portraitPaths([])).toEqual([]);
    expect(portraitPaths([{lng:78,lat:17,breakBefore:true}])).toEqual(['M200.00,140.00']);
  });
});
