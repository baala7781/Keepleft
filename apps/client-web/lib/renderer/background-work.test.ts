import {expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {LocalENU} from '../../../../packages/geo';
import {LatestJob,localWorld,packForms,unpackForms,unpackGeometry,type PreparedBuildings,type WorldWork,type WorldJob,type WorldJobResult} from './background-work';
import {createWorldWorkHandler} from './world-work-handler';
import {buildingForms,buildBuildingGeometry} from './buildings';
import {createBuildingWorld} from './building-world';
import {createRoadWorld} from './roads';
import {createVegetationPlacement} from './vegetation-placement';
import {createVegetation} from './vegetation';
import {normalizeOSM} from '../geodata/osm';
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const frame=new LocalENU({lng:0,lat:0});
const data=normalizeOSM({elements:[
  {type:'way',id:1,tags:{building:'house',height:'12','roof:shape':'gabled','roof:height':'3'},geometry:[{lon:0,lat:0},{lon:.0001,lat:0},{lon:.0001,lat:.0001},{lon:0,lat:.0001},{lon:0,lat:0}]},
  {type:'way',id:2,tags:{highway:'residential'},geometry:[{lon:-.002,lat:-.0002},{lon:.002,lat:-.0002}]},
  {type:'way',id:3,tags:{natural:'wood'},geometry:[{lon:-.003,lat:-.003},{lon:.003,lat:-.003},{lon:.003,lat:.003},{lon:-.003,lat:.003},{lon:-.003,lat:-.003}]},
]});
const forms=buildingForms(data,frame);
it('prepares replacement footprints and far tiles without changing rendered geometry',()=>{
  const prepared=createWorldWorkHandler()({kind:'world',data:localWorld(data,frame)}) as PreparedBuildings;
  const direct=createBuildingWorld(forms),background=createBuildingWorld(unpackForms(prepared.forms),undefined,()=>{},prepared.far);
  const a=(direct.group.children[0] as THREE.Mesh).geometry,b=(background.group.children[0] as THREE.Mesh).geometry;
  for(const key of Object.keys(a.attributes))expect(b.attributes[key].array).toEqual(a.attributes[key].array);
  expect(b.index!.array).toEqual(a.index!.array);
  direct.dispose();background.dispose();
});
it('keeps nearby asphalt and markings independent of scene tone mapping',()=>{
  const roads=createRoadWorld(data,frame,forms);
  expect(((roads.group.children[0] as THREE.Mesh).material as THREE.Material).toneMapped).toBe(false);
  expect(((roads.group.children[3] as THREE.Mesh).material as THREE.Material).toneMapped).toBe(false);
  roads.dispose();
});
function delayedWork(){
  const handle=createWorldWorkHandler(),waiting:{job:WorldJob;resolve:(r:WorldJobResult)=>void}[]=[];
  const work:WorldWork={run:<T extends WorldJobResult>(job:WorldJob)=>new Promise<T>(resolve=>waiting.push({job,resolve:r=>resolve(r as T)})),dispose:()=>{}};
  return {work,waiting,finish(){const next=waiting.shift()!;next.resolve(handle(next.job));}};
}
it('coalesces camera requests, discards stale replies and cannot revive a disposed scene',async()=>{
  const waits:((n:number)=>void)[]=[],calls:number[]=[],accept=vi.fn();
  const job=new LatestJob<number,number>(n=>{calls.push(n);return new Promise(resolve=>waits.push(resolve));},accept);
  job.request(1);job.request(2);job.request(3);expect(calls).toEqual([1]);
  waits.shift()!(1);await settle();expect(calls).toEqual([1,3]);expect(accept).not.toHaveBeenCalled();
  waits.shift()!(3);await settle();expect(accept).toHaveBeenCalledWith(3);expect(job.pending).toBe(false);
  job.request(4);job.dispose();waits.shift()!(4);await settle();expect(accept).toHaveBeenCalledTimes(1);
});
it('continues with the latest destination after a failed obsolete request',async()=>{
  const fail=vi.fn(),accept=vi.fn();let reject!:()=>void;
  const job=new LatestJob<number,number>(n=>n===1?new Promise((_,r)=>{reject=r;}):Promise.resolve(n),accept,fail);
  job.request(1);job.request(2);reject();await settle();expect(accept).toHaveBeenCalledWith(2);expect(fail).not.toHaveBeenCalled();
});
it('worker preparation preserves exact building geometry and semantic tree placements',()=>{
  const handle=createWorldWorkHandler(),geometry=unpackGeometry(handle({kind:'building',forms:packForms(forms),lod:'near'}) as Parameters<typeof unpackGeometry>[0]);
  const direct=buildBuildingGeometry(forms,'near');
  for(const key of Object.keys(direct.attributes))expect(geometry.attributes[key].array).toEqual(direct.attributes[key].array);
  handle({kind:'vegetation-init',forms:packForms(forms),data:localWorld(data,frame)});
  expect(handle({kind:'vegetation',x:0,y:0,radius:500,limit:200})).toEqual(createVegetationPlacement(forms,data,frame).sample(0,0,500,200));
  geometry.dispose();direct.dispose();
});
it('keeps far buildings visible until a background detail tile is ready',async()=>{
  const delayed=delayedWork(),world=createBuildingWorld(forms,delayed.work),far=world.group.children[0] as THREE.Mesh;
  const count=far.geometry.drawRange.count;world.update(0,0,19,'high');
  expect(delayed.waiting).toHaveLength(1);expect(far.geometry.drawRange.count).toBe(count);expect(world.group.children).toHaveLength(1);
  delayed.finish();await settle();world.update(0,0,19,'high');
  expect(world.getStats().near).toBe(1);expect(far.geometry.drawRange.count).toBe(0);world.dispose();
});
it('drops a building result when the camera has moved to the far tier',async()=>{
  const delayed=delayedWork(),world=createBuildingWorld(forms,delayed.work);
  world.update(0,0,19,'high');delayed.finish();await settle();world.update(3000,3000,14,'balanced');
  expect(world.group.children).toHaveLength(1);expect(world.getStats().near).toBe(0);world.dispose();
});
it('retains the road patch while a replacement is being prepared',async()=>{
  const delayed=delayedWork(),world=createRoadWorld(data,frame,forms,delayed.work);
  world.update(0,0,18,'balanced');expect(world.getStats().triangles).toBe(0);
  delayed.finish();await settle();world.update(0,0,18,'balanced');expect(world.getStats().triangles).toBeGreaterThan(0);
  const geometries=world.group.children.map(m=>(m as THREE.Mesh).geometry);
  world.update(120,0,18,'balanced');expect(world.group.children.map(m=>(m as THREE.Mesh).geometry)).toEqual(geometries);
  world.dispose();delayed.finish();await settle();expect(world.group.children.map(m=>(m as THREE.Mesh).geometry)).toEqual(geometries);
});
it('preserves road geometry across a streamed world replacement until the new patch is ready',async()=>{
  const old=createRoadWorld(data,frame,forms);old.update(0,0,18,'balanced');
  const geometry=(old.group.children[0] as THREE.Mesh).geometry,dispose=vi.spyOn(geometry,'dispose');
  const delayed=delayedWork(),next=createRoadWorld(data,frame,forms,delayed.work);
  next.inheritPatch(old.group);old.dispose();
  expect(dispose).not.toHaveBeenCalled();expect((next.group.children[0] as THREE.Mesh).geometry).toBe(geometry);
  next.update(120,0,18,'balanced');expect(dispose).not.toHaveBeenCalled();
  delayed.finish();await settle();next.update(120,0,18,'balanced');
  expect(dispose).toHaveBeenCalledOnce();next.dispose();
});
it('stages tree uploads across frames, commits atomically, and clears them on battery mode',async()=>{
  const trees=Array.from({length:1000},(_,i)=>({key:String(i),x:i%40*12,y:Math.floor(i/40)*12,kind:'broadleaf' as const,scale:1.8,rotation:0,seed:i,distance:i}));
  const work:WorldWork={run:async<T extends WorldJobResult>(job:WorldJob)=>(job.kind==='vegetation'?job.limit?trees:[]:null) as T,dispose:()=>{}};
  const forest=createVegetation(forms,data,frame,work);
  forest.update(0,0,15,'balanced');await settle();
  let clock=0;const now=vi.spyOn(performance,'now').mockImplementation(()=>clock++);
  try{
    forest.update(0,0,15,'balanced');expect(forest.hasPending()).toBe(true);expect(forest.meshes.reduce((n,m)=>n+m.count,0)).toBe(0);
    for(let i=0;i<20&&forest.hasPending();i++)forest.update(0,0,15,'balanced');
    expect(forest.hasPending()).toBe(false);expect(forest.meshes.reduce((n,m)=>n+m.count,0)).toBe(1000);
    forest.update(0,0,15,'battery');expect(forest.meshes.every(m=>m.count===0)).toBe(true);
    await settle();for(let i=0;i<10;i++)forest.update(0,0,15,'battery');expect(forest.meshes.every(m=>m.count===0)).toBe(true);
  }finally{now.mockRestore();forest.dispose();for(const m of forest.meshes){m.geometry.dispose();(m.material as THREE.Material).dispose();m.dispose();}}
});
