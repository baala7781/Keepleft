import {it,expect} from 'vitest';
import * as THREE from 'three';
import {createRunner,RUNNER_HEIGHT_M,FOLLOW_ZOOM,RunnerAnimationClock} from './runner';
import {buildBuildings} from './world';
import {LocalENU} from '../../../../packages/geo';
import {normalizeOSM} from '../geodata/osm';

it('keeps the gait clock steady across pauses, invalid deltas and background frame gaps',()=>{
  const clock=new RunnerAnimationClock();
  expect(clock.advance(.016,true)).toBe(16);
  expect(clock.advance(.1,false)).toBe(16);
  expect(clock.advance(NaN,true)).toBe(16);
  expect(clock.advance(-1,true)).toBe(16);
  expect(clock.advance(12,true)).toBe(116);
});

it('keeps the runner 1.8 metres tall beside a real-sized single-storey building',()=>{
  const material=new THREE.MeshStandardMaterial(),{runner}=createRunner(material);
  const bounds=new THREE.Box3().setFromObject(runner);
  expect(bounds.min.y).toBeCloseTo(0,5);expect(bounds.max.y).toBeCloseTo(RUNNER_HEIGHT_M,5);
  const geometry=buildBuildings(normalizeOSM({elements:[{type:'way',id:1,tags:{building:'house',height:'3.2'},geometry:[
    {lon:0,lat:0},{lon:.0001,lat:0},{lon:.0001,lat:.0001},{lon:0,lat:0},
  ]}]}),new LocalENU({lng:0,lat:0}));
  geometry.computeBoundingBox();expect(geometry.boundingBox!.max.y).toBeGreaterThan(bounds.max.y*1.7);
  expect(FOLLOW_ZOOM).toBe(18);geometry.dispose();
  runner.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();if(!Array.isArray(object.material))object.material.dispose();}});
});
it('has a repeatable jointed gait with ground contact and a neutral paused pose',()=>{
  const rig=createRunner(new THREE.MeshStandardMaterial());
  rig.animate(230,3.2,true);const pose=rig.left.rotation.x;
  expect(Math.abs(rig.left.rotation.x-rig.right.rotation.x)).toBeGreaterThan(.1);
  expect(rig.left.children.find(child=>child instanceof THREE.Group)!.rotation.x).toBeGreaterThan(0);
  for(let time=0;time<750;time+=25){rig.animate(time,3.2,true);const box=new THREE.Box3().setFromObject(rig.runner);expect(box.min.y).toBeGreaterThan(-.005);expect(box.max.y).toBeLessThan(1.9);}
  rig.animate(230,3.2,true);expect(rig.left.rotation.x).toBe(pose);
  rig.animate(230,0,false);expect(rig.left.rotation.x).toBe(0);expect(new THREE.Box3().setFromObject(rig.runner).max.y).toBeCloseTo(1.8);
  rig.runner.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();if(!Array.isArray(object.material))object.material.dispose();}});
});
