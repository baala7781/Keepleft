import {describe,it,expect,vi} from 'vitest';
import {Box2,Vector2} from 'three';
import {RoutePresentation,routeLines} from './route-presentation';
import type {LocalFrame} from '../../../../packages/geo';
import type {WorldData,Ring} from '../geodata/osm';
import type {BuildingForm} from './buildings';
import {pathLength,zigzags} from '../../tools/ride-analysis';
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
  it('follows several split road sections around a building instead of cutting through it',()=>{
    const building:BuildingForm={id:'block',properties:{kind:'building',height:10},bounds:new Box2(new Vector2(3,3),new Vector2(17,17)),polygon:[[[3,3],[17,3],[17,17],[3,17],[3,3]]]};
    const p=new RoutePresentation(roads([[0,-10],[0,10]],[[0,10],[0,20],[10,20]],[[10,20],[30,20]]),frame,[building]);
    const input=route([1,0],[20,19]),before=structuredClone(input);
    expect(p.trail(input).map(p=>[p.lng,p.lat])).toEqual([[0,0],[0,10],[0,20],[10,20],[20,20]]);
    expect(input).toEqual(before);
  });
  it('breaks only the display connector when raw fallback would cross a building',()=>{
    const building:BuildingForm={id:'block',properties:{kind:'building',height:10},bounds:new Box2(new Vector2(-2,8),new Vector2(2,12)),polygon:[[[-2,8],[2,8],[2,12],[-2,12],[-2,8]]]};
    const p=new RoutePresentation(roads([[0,0],[0,20]]),frame,[building]);
    const input=route([0,7],[0,13]),before=structuredClone(input);
    expect(p.trail(input)[1].breakBefore).toBe(true);
    expect(routeLines(p.trail(input)).features).toEqual([]);
    expect(input).toEqual(before);
    expect(p.trail(input,false)).toEqual(input);
  });
  it('does not invent a multi-section connection across unmapped gaps',()=>{
    const p=new RoutePresentation(roads([[0,0],[0,10]],[[0,11],[0,20]],[[0,20],[20,20]]),frame);
    expect(p.trail(route([1,0],[20,19])).at(-1)).toMatchObject({lng:20,lat:19});
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
    // The dot is not snapped onto the road inside the building, and is moved just past the nearest wall.
    expect(p.position({lng:1,lat:10})).toEqual({lng:3.5,lat:10});
    const input=route([0,7],[0,13]);input[1].breakBefore=true;expect(p.gaps(input)).toEqual([]);
  });
  it('aligns to trunk roads unless foot access is explicitly refused',()=>{
    const data=roads([[0,-20],[0,100]]);data.features[0].properties.highway='trunk';
    expect(new RoutePresentation(data,frame).trail(route([2,0],[2,10])).map(p=>p.lng)).toEqual([0,0]);
    data.features[0].properties.foot='no';
    expect(new RoutePresentation(data,frame).trail(route([2,0],[2,10])).map(p=>p.lng)).toEqual([2,2]);
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
  it('passes straight through a junction instead of jumping onto the crossing street',()=>{
    // Main street x=0; crossing street y=50. A fix drifting 3 m towards the crossing
    // street near the junction must stay on the main street.
    const p=new RoutePresentation(roads([[0,-10],[0,50]],[[0,50],[0,120]],[[-60,50],[0,50],[60,50]]),frame);
    const out=p.trail(route([4,20],[4,30],[4,40],[5,46],[4,56],[4,66],[4,76]));
    expect(out.every(q=>Math.abs(q.lng)<1e-9),'every display point on the main street').toBe(true);
    // A real turn onto the crossing street is still followed.
    const turn=new RoutePresentation(roads([[0,-10],[0,50]],[[0,50],[0,120]],[[-60,50],[0,50],[60,50]]),frame).trail(route([2,20],[2,35],[2,47],[12,52],[24,52],[36,52]));
    expect(turn.at(-1)!.lat).toBeCloseTo(50,6);
  });
  it('drops a short backward spike from along-road jitter but keeps a real U-turn',()=>{
    const p=new RoutePresentation(roads([[0,-10],[0,100]]),frame);
    const out=p.trail(route([1,0],[1,10],[1,20],[1,18],[1,30],[1,40]));
    expect(out).toHaveLength(5);[0,10,20,30,40].forEach((y,i)=>expect(out[i].lat).toBeCloseTo(y,6));
    const uTurn=new RoutePresentation(roads([[0,-10],[0,100]]),frame).trail(route([1,0],[1,10],[1,20],[1,12],[1,4]));
    expect(uTurn).toHaveLength(5);[0,10,20,12,4].forEach((y,i)=>expect(uTurn[i].lat).toBeCloseTo(y,6));
  });
  it('keeps line data continuous at duplicate samples and exact U-turns',()=>{
    const lines=routeLines(route([0,0],[0,10],[0,10],[0,0]));expect(lines.features[0].geometry.coordinates).toEqual([[0,0],[0,10],[0,0]]);
  });
  describe('straight street with offset map centreline and buildings close to the lane',()=>{
    // Measured on a real 1 Hz ride (2-6 m accuracy): median 4.5 m and p90 9.3 m between
    // the fix and the nearest OSM centreline. Synthetic geometry reproduces that offset.
    const random=(seed:number)=>()=>{seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
    const block=(id:string,x0:number,x1:number,y0:number,y1:number):BuildingForm=>({id,properties:{kind:'building',height:9},
      bounds:new Box2(new Vector2(x0,y0),new Vector2(x1,y1)),polygon:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]});
    const buildings:BuildingForm[]=[];
    for(let y=-40;y<360;y+=12){buildings.push(block(`r${y}`,9,21,y,y+10),block(`l${y}`,-21,-6,y,y+10));}
    const street=roads([[0,-60],[0,420]]);
    const ride=(seed:number,lane=5.5)=>{const next=random(seed);
      return Array.from({length:61},(_,i)=>({lng:lane+(next()-.5)*6,lat:i*5+(next()-.5)*2,accuracyM:4,sampleKey:i,breakBefore:i===0}));};
    const solid=(p:{lng:number;lat:number})=>buildings.some(b=>p.lng>b.bounds.min.x&&p.lng<b.bounds.max.x&&p.lat>b.bounds.min.y&&p.lat<b.bounds.max.y);
    for(const seed of [1,2,3]){
      it(`draws a steady line without zigzags or building entry (seed ${seed})`,()=>{
        const input=ride(seed),before=structuredClone(input),out=new RoutePresentation(street,frame,buildings).trail(input);
        const xy=out.map(p=>({x:p.lng,y:p.lat}));
        expect(zigzags(xy,30),'sign-alternating sharp turns').toBeLessThanOrEqual(1);
        expect(out.filter(solid),'display points inside a mapped building').toEqual([]);
        expect(out.slice(1).filter(p=>p.breakBefore),'display-only breaks').toEqual([]);
        expect(pathLength(xy),'display length vs 300 m street').toBeLessThan(300*1.04);
        expect(input).toEqual(before);
      });
    }
    it('keeps the raw view free of building entry without wall-to-wall jumps',()=>{
      // Lane drifts up to 1.5 m into the right-hand footprints, as weak fixes do.
      const input=ride(4,7.5),out=new RoutePresentation(street,frame,buildings).trail(input,false);
      expect(input.some(solid),'synthetic ride must enter a footprint').toBe(true);
      expect(out.filter(solid)).toEqual([]);
      const shifts=out.map((p,i)=>Math.hypot(p.lng-input[i].lng,p.lat-input[i].lat));
      expect(Math.max(...shifts),'largest display shift from the recorded fix').toBeLessThan(4.5);
      expect(out.map(({lng,lat,breakBefore})=>({lng,lat,breakBefore})).filter((p,i)=>!solid(input[i]))).toEqual(
        input.filter(p=>!solid(p)).map(({lng,lat,breakBefore})=>({lng,lat,breakBefore})));
    });
    it('stays on the street through a long, steady 9-10 m map offset',()=>{
      const input=Array.from({length:80},(_,i)=>({lng:9.5+(i%3-1)*.4,lat:i*5,accuracyM:4,sampleKey:i,breakBefore:i===0}));
      const out=new RoutePresentation(street,frame).trail(input);
      expect(out.slice(1).filter(p=>p.breakBefore)).toEqual([]);
      // The first fix of a segment has no direction yet, so only a normal 8 m match could move it.
      expect(out.slice(1).every(p=>Math.abs(p.lng)<1e-9),'every later display point on the mapped street').toBe(true);
    });
    it('still releases the road when the rider genuinely leaves it',()=>{
      const leave=[...Array.from({length:10},(_,i)=>({lng:2,lat:i*5})),...Array.from({length:10},(_,i)=>({lng:2+(i+1)*6,lat:45+(i+1)*.5}))]
        .map((p,i)=>({...p,accuracyM:4,breakBefore:i===0}));
      const out=new RoutePresentation(roads([[0,-60],[0,420]]),frame).trail(leave);
      expect(out.at(-1)!.lng).toBeCloseTo(62,5);
    });
  });
  it('invalidates a changed middle segment even when endpoints and point count match',()=>{
    const p=new RoutePresentation(roads([[0,0],[0,100]]),frame),input=route([2,0],[2,10],[2,20]);p.trail(input);
    input[1].breakBefore=true;expect(p.trail(input)[1].breakBefore).toBe(true);
  });
});
