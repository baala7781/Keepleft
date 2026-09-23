import {expect,it,vi} from 'vitest';
import {applyMapTheme,parseWorldTheme,worldThemes} from './world-theme';
import {createNearbyDetails} from './details';
import {LocalENU} from '../../../../packages/geo';
import {normalizeOSM} from '../geodata/osm';
import {buildingForms} from './buildings';
import * as THREE from 'three';

it('keeps a crimson route and defaults unsupported preferences to noir daylight',()=>{
  expect(parseWorldTheme('night')).toBe('night');
  for(const value of [null,'bad','',undefined])expect(parseWorldTheme(value)).toBe('day');
  expect(worldThemes.night.palette.route).toBe(worldThemes.day.palette.route);
  expect(worldThemes.night.sunIntensity).toBeLessThan(worldThemes.day.sunIntensity);
});
it('changes map paint only, tolerating absent layers',()=>{
  const map={getLayer:vi.fn((id:string)=>id==='ground'?{}:undefined),setPaintProperty:vi.fn()};
  applyMapTheme(map as unknown as Parameters<typeof applyMapTheme>[0],'night');
  expect(map.setPaintProperty.mock.calls).toEqual([
    ['ground','background-color-transition',{duration:0,delay:0}],
    ['ground','background-color',worldThemes.night.palette.ground],
  ]);
});
it('changes windows and tree materials without replacing geometry, instances or placement',()=>{
  const frame=new LocalENU({lng:0,lat:0});
  const data=normalizeOSM({elements:[{type:'way',id:1,tags:{natural:'wood'},geometry:[{lon:0,lat:0},{lon:.01,lat:0},{lon:.01,lat:.01},{lon:0,lat:.01},{lon:0,lat:0}]}]});
  const detail=createNearbyDetails(buildingForms(data,frame),data,frame);
  detail.update(300,300,17,'balanced');
  const meshes=detail.group.children as THREE.InstancedMesh[],ids=meshes.map(m=>m.geometry.uuid),matrices=meshes.map(m=>Array.from(m.instanceMatrix.array)),stats=detail.getStats();
  for(const theme of ['night','day','night'] as const){
    detail.setTheme(theme);
    expect(meshes.map(m=>m.geometry.uuid)).toEqual(ids);
    expect(meshes.map(m=>Array.from(m.instanceMatrix.array))).toEqual(matrices);
    expect(detail.getStats()).toEqual(stats);
    expect((meshes[0].material as THREE.MeshBasicMaterial).color.getHexString()).toBe(worldThemes[theme].palette.window.slice(1));
  }
  detail.dispose();const materials=new Set<THREE.Material>();
  meshes.forEach(m=>{m.geometry.dispose();materials.add(m.material as THREE.Material);m.dispose();});materials.forEach(m=>m.dispose());
});
