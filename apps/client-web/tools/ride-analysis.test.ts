import {describe,expect,it} from 'vitest';
import {deviationFromRaw,distanceToPolyline,durationReport,insidePolygon,sharpTurns,trackStats,turnAngleDeg,zigzags,pathLength} from './ride-analysis';

// 1 degree of latitude is about 111,195 m on the spherical model the app uses.
const metresToLat=(m:number)=>m/111194.93;

describe('ride analysis maths (synthetic tracks only)',()=>{
  it('measures a straight 1 km track at constant speed',()=>{
    const fixes=Array.from({length:101},(_,i)=>({lng:10,lat:metresToLat(i*10),timestampMs:i*2000,accuracyM:4}));
    const stats=trackStats(fixes);
    expect(stats.distanceM).toBeCloseTo(1000,0);
    expect(stats.spanMs).toBe(200000);
    expect(stats.averageSpeedMps).toBeCloseTo(5,2);
    expect(stats.speedMaxMps).toBeCloseTo(5,2);
    expect(stats.gaps).toEqual([]);
  });
  it('reports fix gaps and ignores non-increasing timestamps',()=>{
    const stats=trackStats([{lng:0,lat:0,timestampMs:0},{lng:0,lat:metresToLat(10),timestampMs:1000},
      {lng:0,lat:metresToLat(10),timestampMs:1000},{lng:0,lat:metresToLat(40),timestampMs:11000}]);
    expect(stats.gaps).toEqual([{index:3,seconds:10}]);
    expect(stats.distanceM).toBeCloseTo(40,0);
  });
  it('measures turn angles and treats tiny segments as undefined',()=>{
    expect(turnAngleDeg({x:0,y:0},{x:10,y:0},{x:10,y:10})).toBeCloseTo(90,5);
    expect(turnAngleDeg({x:0,y:0},{x:10,y:0},{x:20,y:0})).toBeCloseTo(0,5);
    expect(turnAngleDeg({x:0,y:0},{x:.01,y:0},{x:10,y:10})).toBe(0);
  });
  it('separates a single corner from a zigzag',()=>{
    const corner=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:10,y:20}];
    expect(sharpTurns(corner)).toEqual([1]);
    expect(zigzags(corner)).toBe(0);
    const zig=Array.from({length:12},(_,i)=>({x:i*3,y:i%2?1.5:-1.5}));
    expect(zigzags(zig,30)).toBeGreaterThan(8);
    const straight=Array.from({length:12},(_,i)=>({x:i*3,y:0}));
    expect(zigzags(straight)).toBe(0);
    expect(pathLength(straight)).toBe(33);
  });
  it('computes distance to a polyline and deviation from the raw path',()=>{
    const raw=[{x:0,y:0},{x:100,y:0}];
    expect(distanceToPolyline({x:50,y:3},raw)).toBe(3);
    expect(distanceToPolyline({x:-4,y:3},raw)).toBe(5);
    const dev=deviationFromRaw([{x:10,y:1},{x:20,y:4},{x:30,y:2}],raw);
    expect(dev.maxM).toBe(4);expect(dev.maxIndex).toBe(1);expect(dev.meanM).toBeCloseTo(7/3,5);
    expect(deviationFromRaw([],raw).maxIndex).toBe(-1);
  });
  it('detects solid building area and respects courtyards',()=>{
    const square=[[0,0],[10,0],[10,10],[0,10],[0,0]],hole=[[4,4],[6,4],[6,6],[4,6],[4,4]];
    expect(insidePolygon({x:2,y:2},[square])).toBe(true);
    expect(insidePolygon({x:20,y:2},[square])).toBe(false);
    expect(insidePolygon({x:5,y:5},[square,hole])).toBe(false);
  });
  it('flags a duration that no accepted fix supports',()=>{
    const fixes=Array.from({length:101},(_,i)=>({lng:10,lat:metresToLat(i*10),timestampMs:i*2000}));
    const stats=trackStats(fixes);
    const report=durationReport({distanceM:1000,durationMs:260000},stats,200000);
    expect(report.unexplainedMs).toBe(60000);
    expect(report.distanceErrorM).toBeCloseTo(0,0);
    expect(report.paceSavedSecPerKm).toBeCloseTo(260,5);
    expect(report.paceFromFixesSecPerKm).toBeCloseTo(200,0);
  });
});
