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
  // Windows leave at aerial zoom; trees (incl. groves beside buildings) intentionally stay.
  details.update(0,0,14,'high');expect(meshes[0].count).toBe(0);
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
it('stands street lamps on the kerb of ground-level streets only, deterministically',async()=>{
  const {lampSites,placeLamps}=await import('./details');
  const frame=new LocalENU({lng:0,lat:0}),line=(id:number,tags:Record<string,string>,lat=0)=>({type:'way',id,tags,geometry:[{lon:0,lat},{lon:.004,lat}]});
  const data=normalizeOSM({elements:[line(1,{highway:'residential'}),line(2,{highway:'footway'},.002),line(3,{highway:'residential',bridge:'yes'},-.002)]});
  const sites=lampSites(data,frame);
  expect(sites.length).toBeGreaterThanOrEqual(5);
  // One kerb on a street, just beyond the 6 m carriageway.
  expect(sites.every(l=>l.y>3&&l.y<5)).toBe(true);
  expect(lampSites(data,frame)).toEqual(sites);
  const lamps=placeLamps(sites,200,0,400,700);
  expect(placeLamps(sites,200,0,400,3)).toHaveLength(3);
  expect(placeLamps(sites,200,0,400,3)).toEqual([...lamps].sort((a,b)=>Math.hypot(a.x-200,a.y)-Math.hypot(b.x-200,b.y)).slice(0,3));
  expect(placeLamps(sites,5000,5000,400,700)).toHaveLength(0);
});
it('pairs main-road lamps evenly across OSM vertices and keeps them off every road surface',async()=>{
  const {lampSites,LAMP_RULES}=await import('./details');
  const frame=new LocalENU({lng:0,lat:0});
  // A 450 m trunk road digitised with uneven short vertices, plus a parallel carriageway 12 m away.
  const vertices=[0,.0003,.00031,.0009,.0011,.0019,.0024,.00405].map(lon=>({lon,lat:0}));
  const parallel=[0,.00405].map(lon=>({lon,lat:12/111320}));
  const data=normalizeOSM({elements:[{type:'way',id:10,tags:{highway:'trunk'},geometry:vertices},{type:'way',id:11,tags:{highway:'trunk'},geometry:parallel}]});
  const sites=lampSites(data,frame);
  const south=sites.filter(l=>l.y<0).sort((a,b)=>a.x-b.x);
  expect(south.length).toBeGreaterThanOrEqual(8);
  const gaps=south.slice(1).map((l,i)=>l.x-south[i].x);
  expect(Math.max(...gaps)-Math.min(...gaps)).toBeLessThan(.5);
  expect(gaps[0]).toBeCloseTo(LAMP_RULES.main.spacing,0);
  // Lamps stand on the two outer kerbs only: none on either carriageway or in the 2 m median.
  expect(sites.every(l=>l.y<-5.4||l.y>17.4)).toBe(true);
  expect(sites.some(l=>l.y>17.4)).toBe(true);
  for(const a of sites)for(const b of sites)if(a!==b)expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeGreaterThanOrEqual(LAMP_RULES.minGap);
});
it('never stands a lamp inside a building footprint',async()=>{
  const {lampSites}=await import('./details');
  const frame=new LocalENU({lng:0,lat:0}),m=1/111320;
  const data=normalizeOSM({elements:[{type:'way',id:1,tags:{highway:'residential'},geometry:[{lon:0,lat:0},{lon:400*m,lat:0}]},
    {type:'way',id:2,tags:{building:'yes'},geometry:[{lon:0,lat:2*m},{lon:400*m,lat:2*m},{lon:400*m,lat:20*m},{lon:0,lat:20*m},{lon:0,lat:2*m}]}]});
  expect(lampSites(data,frame).length).toBeGreaterThan(0);
  expect(lampSites(data,frame,buildingForms(data,frame))).toHaveLength(0);
});
