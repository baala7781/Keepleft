import {it,expect} from 'vitest';
import * as THREE from 'three';
import {LocalENU} from '../../../../packages/geo';
import {normalizeOSM} from '../geodata/osm';
import {buildingForms} from './buildings';
import {createNearbyDetails,qualityBudget,pointInPolygon} from './details';
it('caps near detail, removes it at aerial distances and retains geometry across updates',()=>{
  const frame=new LocalENU({lng:0,lat:0}),data=normalizeOSM({elements:[{type:'way',id:1,tags:{building:'yes',height:'300'},geometry:[{lon:0,lat:0},{lon:.001,lat:0},{lon:.001,lat:.001},{lon:0,lat:.001},{lon:0,lat:0}]}]});
  const details=createNearbyDetails(buildingForms(data,frame),data,frame),meshes=details.group.children as THREE.InstancedMesh[];
  const ids=meshes.map(mesh=>mesh.geometry.uuid);
  details.update(0,0,22,'balanced');expect(meshes[0].count).toBeGreaterThan(0);expect(meshes[0].count).toBeLessThanOrEqual(qualityBudget.balanced.windows);
  details.update(0,0,22,'battery');expect(meshes.every(mesh=>mesh.count===0)).toBe(true);
  details.update(0,0,14,'high');expect(meshes.every(mesh=>mesh.count===0)).toBe(true);
  details.update(0,0,22,'high');expect(meshes[0].count).toBeLessThanOrEqual(qualityBudget.high.windows);expect(meshes.map(mesh=>mesh.geometry.uuid)).toEqual(ids);
  meshes.forEach(mesh=>{mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();mesh.dispose();});details.dispose();
});
it('keeps procedural vegetation out of polygon holes',()=>{
  const rings=[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]];
  expect(pointInPolygon(2,2,rings)).toBe(true);expect(pointInPolygon(5,5,rings)).toBe(false);expect(pointInPolygon(12,2,rings)).toBe(false);
});
it('uses denser high-tier facades and moves detail to the viewed neighborhood',()=>{
  const frame=new LocalENU({lng:0,lat:0}),data=normalizeOSM({elements:[{type:'way',id:1,tags:{building:'yes',height:'12'},geometry:[{lon:0,lat:0},{lon:.0002,lat:0},{lon:.0002,lat:.0002},{lon:0,lat:.0002},{lon:0,lat:0}]}]});
  const details=createNearbyDetails(buildingForms(data,frame),data,frame);
  details.update(0,0,18,'balanced');const balanced=details.getStats().windows;
  details.update(0,0,18,'high');expect(details.getStats().windows).toBeGreaterThan(balanced);
  details.update(1000,1000,18,'high');expect(details.getStats()).toMatchObject({windows:0,trees:0,detailed:true});
  details.update(0,0,14,'high');expect(details.getStats().detailed).toBe(false);
  details.update(0,0,18,'balanced');expect(details.getStats().windows).toBe(balanced);
  details.group.children.forEach(object=>{const mesh=object as THREE.InstancedMesh;mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();mesh.dispose();});details.dispose();
});
