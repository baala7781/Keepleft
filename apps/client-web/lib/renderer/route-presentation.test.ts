import {describe,it,expect,vi} from 'vitest';
import {Box2,Vector2} from 'three';
import {RoutePresentation,routeLines} from './route-presentation';
import type {LocalFrame} from '../../../../packages/geo';
import type {WorldData,Ring} from '../geodata/osm';
import type {BuildingForm} from './buildings';
const frame:LocalFrame={origin:{lng:0,lat:0},project:p=>({x:p.lng,y:p.lat,z:0}),unproject:p=>({lng:p.x,lat:p.y})};
const roads=(...lines:Ring[]):WorldData=>({type:'FeatureCollection',features:lines.map((coordinates,id)=>({type:'Feature',id,properties:{kind:'road',highway:'residential'},geometry:{type:'LineString',coordinates}}))});
const route=(...points:number[][])=>points.map(([lng,lat],i)=>({lng,lat,breakBefore:i===0}));
describe('conservative local route presentation',()=>{
  it('reuses matched history as a long replay window advances, including repeated visits',()=>{
    const data=roads([[0,-10],[0,5000]]),p=new RoutePresentation(data,frame);
    const samples=Array.from({length:4200},(_,i)=>({lng:2,lat:i<4100?i:8200-i,sampleKey:i,breakBefore:false}));
    const window=(start:number)=>samples.slice(start,start+4096).map((p,i)=>({...p,breakBefore:i===0}));
    p.trail(window(0));const project=vi.spyOn(frame,'project');
    const actual=p.trail(window(8));expect(project.mock.calls.length).toBe(8);project.mockRestore();
    expect(actual).toEqual(new RoutePresentation(data,frame).trail(window(8)));
    expect(p.trail(window(100))).toEqual(new RoutePresentation(data,frame).trail(window(100)));
    expect(p.trail(window(0))).toEqual(new RoutePresentation(data,frame).trail(window(0)));
  });
  it('invalidates accuracy changes and preserves breaks across a sliding window',()=>{
    const data=roads([[0,0],[0,100]]),p=new RoutePresentation(data,frame);
    const samples=[0,10,20,30,40].map((lat,i)=>({lng:12,lat,sampleKey:i,accuracyM:14,breakBefore:i===0||i===3}));
    p.trail(samples.slice(0,4));const next=samples.slice(1).map((s,i)=>({...s,breakBefore:i===0||s.breakBefore}));
    expect(p.trail(next)).toEqual(new RoutePresentation(data,frame).trail(next));
    next[2].accuracyM=4;expect(p.trail(next)).toEqual(new RoutePresentation(data,frame).trail(next));
  });
  it('aligns modest side-to-side jitter to a unique road without mutating GPS',()=>{
    const input=route([2,0],[-3,10],[2,20]),before=structuredClone(input),p=new RoutePresentation(roads([[0,-10],[0,100]]),frame);
    expect(p.trail(input).map(p=>p.lng)).toEqual([0,0,0]);expect(input).toEqual(before);
  });
  it('inserts a mapped corner instead of cutting diagonally through the block',()=>{
    const p=new RoutePresentation(roads([[0,0],[0,50],[50,50]]),frame),out=p.trail(route([2,40],[10,48]));
    expect(out.map(p=>[p.lng,p.lat])).toEqual([[0,40],[0,50],[10,50]]);
  });
  it('connects two roads only through an actual shared mapped junction',()=>{
    const p=new RoutePresentation(roads([[0,0],[0,50]],[[0,50],[60,50]]),frame);
    expect(p.trail(route([2,40],[10,48])).map(p=>[p.lng,p.lat])).toEqual([[0,40],[0,50],[10,50]]);
  });
  it('retains a genuine out-and-back rather than removing repeat visits',()=>{
    const p=new RoutePresentation(roads([[0,-10],[0,100]]),frame);
    const out=p.trail(route([1,0],[1,20],[1,40],[1,20],[1,0]));expect(out).toHaveLength(5);[0,20,40,20,0].forEach((y,i)=>expect(out[i].lat).toBeCloseTo(y));
  });
  it('does not pick between equally plausible parallel roads or move distant GPS',()=>{
    const p=new RoutePresentation(roads([[0,-20],[0,100]],[[10,-20],[10,100]]),frame);
    expect(p.trail(route([5,0],[5,10])).map(p=>p.lng)).toEqual([5,5]);expect(p.position({lng:50,lat:20})).toEqual({lng:50,lat:20});
  });
  it('uses bounded GPS accuracy to keep a unique road through moderate drift',()=>{
    const p=new RoutePresentation(roads([[0,-20],[0,100]]),frame);
    const input=[{lng:2,lat:0,accuracyM:14,breakBefore:true},{lng:12,lat:10,accuracyM:14},{lng:3,lat:20,accuracyM:14}];
    expect(p.trail(input).map(point=>point.lng)).toEqual([0,0,0]);
    expect(p.position({lng:12,lat:15,accuracyM:14}).lng).toBe(0);
  });
  it('does not fill true recording gaps with solid lines',()=>{
    const p=new RoutePresentation(roads([[0,-20],[0,100]]),frame),input=route([1,0],[1,10],[1,14],[1,24]);input[2].breakBefore=true;
    expect(routeLines(p.trail(input)).features).toHaveLength(2);
    const links=p.gaps(input);expect(links).toHaveLength(1);expect(links[0].properties?.gap).toBe(true);
    input[2].lat=60;expect(p.gaps(input)).toHaveLength(0);
  });
  it('never adds a dotted connector across disconnected nearby roads',()=>{
    const p=new RoutePresentation(roads([[0,-20],[0,0]],[[0,5],[0,30]]),frame),input=route([0,0],[0,5]);input[1].breakBefore=true;expect(p.gaps(input)).toEqual([]);
  });
  it('rejects mapped-road segments that cut through a ground-level building',()=>{
    const building:BuildingForm={id:'synthetic',properties:{kind:'building',height:10},bounds:new Box2(new Vector2(-2,8),new Vector2(2,12)),polygon:[[[-2,8],[2,8],[2,12],[-2,12],[-2,8]]]};
    const p=new RoutePresentation(roads([[0,0],[0,20]]),frame,[building]);
    expect(p.position({lng:1,lat:10})).toEqual({lng:1,lat:10});
    const input=route([0,7],[0,13]);input[1].breakBefore=true;expect(p.gaps(input)).toEqual([]);
  });
  it('ignores motorway, bridge and tunnel centre-lines for a flat running scene',()=>{
    const data=roads([[0,-20],[0,100]],[[5,-20],[5,100]],[[10,-20],[10,100]]);
    data.features[0].properties.highway='motorway';data.features[1].properties.bridge=true;data.features[2].properties.tunnel=true;
    const input=route([2,0],[2,10]);expect(new RoutePresentation(data,frame).trail(input)).toEqual(input);
  });
  it('supports replay seeks, moving-tip updates and an unaligned view',()=>{
    const p=new RoutePresentation(roads([[0,-10],[0,100]]),frame),input=route([2,0],[2,10],[2,20]);
    p.trail(input);expect(p.trail(input.slice(0,2)).at(-1)?.lat).toBe(10);
    expect(p.trail(route([2,0],[2,10],[2,25])).at(-1)?.lat).toBe(25);
    expect(p.trail(input,false)).toEqual(input);expect(p.trail(input).map(p=>p.lng)).toEqual([0,0,0]);
  });
  it('keeps line data continuous at duplicate samples and exact U-turns',()=>{
    const lines=routeLines(route([0,0],[0,10],[0,10],[0,0]));expect(lines.features[0].geometry.coordinates).toEqual([[0,0],[0,10],[0,0]]);
  });
  it('invalidates a changed middle segment even when endpoints and point count match',()=>{
    const p=new RoutePresentation(roads([[0,0],[0,100]]),frame),input=route([2,0],[2,10],[2,20]);p.trail(input);
    input[1].breakBefore=true;expect(p.trail(input)[1].breakBefore).toBe(true);
  });
});
