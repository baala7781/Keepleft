import {expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {LocalENU} from '../../../../packages/geo';
import {normalizeOSM,type WorldData} from '../geodata/osm';
import {buildingForms,buildBuildingGeometry} from './buildings';
import {buildingProfile,displayBuildingProperties} from './building-profile';
import {buildingLOD,createBuildingWorld,buildingBudgets} from './building-world';
import {readFileSync} from 'node:fs';

const frame=new LocalENU({lng:0,lat:0});
const square=(x=0,y=0)=>[{lon:x,lat:y},{lon:x+.00012,lat:y},{lon:x+.00012,lat:y+.00012},{lon:x,lat:y+.00012},{lon:x,lat:y}];
it('resolves useful types while preserving surveyed height and source properties',()=>{
  for(const [building,kind] of [['house','house'],['apartments','apartment'],['office','office'],['retail','commercial'],['school','institutional'],['warehouse','industrial'],['yes','fallback']])expect(buildingProfile({kind:'building',building}).kind).toBe(kind);
  const mapped={kind:'building',height:80,heightSource:'osm-height'};expect(displayBuildingProperties(mapped).height).toBe(80);expect(mapped.height).toBe(80);
  const estimated={kind:'building',building:'yes',height:30,heightSource:'estimated'};
  expect(displayBuildingProperties(estimated).height).toBeCloseTo(23.7);expect(displayBuildingProperties(estimated).sourceHeight).toBe(30);expect(estimated.height).toBe(30);
  expect(displayBuildingProperties({...estimated,buildingPart:true}).height).toBe(30);
  expect(displayBuildingProperties({kind:'building',height:Infinity,minHeight:Infinity})).toMatchObject({height:12,minHeight:0});
});
it.each(['round','dome'])('keeps a %s roof inside the source bounds with fewer middle-tier triangles',roofShape=>{
  const data=normalizeOSM({elements:[{type:'way',id:1,tags:{building:'yes',height:'12','roof:shape':roofShape,'roof:height':'3'},geometry:square()}]});
  const forms=buildingForms(data,frame),near=buildBuildingGeometry(forms,'near'),mid=buildBuildingGeometry(forms,'mid');near.computeBoundingBox();mid.computeBoundingBox();
  expect(near.boundingBox!.max.y).toBeCloseTo(12);expect(mid.boundingBox!.max.y).toBeCloseTo(12);
  expect(near.boundingBox!.max.x).toBeCloseTo(forms[0].bounds.max.x,3);
  expect([...near.attributes.position.array,...near.attributes.normal.array].every(Number.isFinite)).toBe(true);
  expect(mid.attributes.position.count).toBeLessThan(near.attributes.position.count);near.dispose();mid.dispose();
});
it('does not oscillate tiers at distance and zoom boundaries',()=>{
  expect(buildingLOD(195,18,'near')).toBe('near');expect(buildingLOD(195,18,'mid')).toBe('mid');
  expect(buildingLOD(300,15.8,'mid')).toBe('mid');expect(buildingLOD(300,15.8,'far')).toBe('far');
});
it('draws each building once, caps detail tiles, reuses stable buffers and releases demoted roofs',()=>{
  const data=normalizeOSM({elements:Array.from({length:40},(_,id)=>({type:'way',id,tags:{building:'house',height:'12','roof:shape':'gabled','roof:height':'3'},geometry:square((id%8-4)*.0019,(Math.floor(id/8)-2)*.0019)}))});
  const forms=buildingForms(data,frame),world=createBuildingWorld(forms),far=world.group.children[0] as THREE.Mesh;
  const source=JSON.stringify(data),index=far.geometry.index,fullCount=far.geometry.drawRange.count;
  for(let i=0;i<30;i++)world.update(0,0,19,'high');
  const stats=world.getStats();expect(stats.pending).toBe(false);expect(stats.failures).toBe(0);
  expect(stats.near).toBeLessThanOrEqual(buildingBudgets.high.near);expect(stats.mid).toBeLessThanOrEqual(buildingBudgets.high.mid);
  expect(far.geometry.drawRange.count).toBeLessThan(fullCount);expect(far.geometry.index).toBe(index);
  const used=Array.from(index!.array.slice(0,far.geometry.drawRange.count));expect(new Set(used).size).toBe(used.length);
  const detail=world.group.children[1] as THREE.Mesh,disposed=vi.spyOn(detail.geometry,'dispose');
  const uuids=world.group.children.map(m=>(m as THREE.Mesh).geometry.uuid);
  expect(world.update(1,1,19,'high')).toBe(false);world.setTheme('night');expect(world.group.children.map(m=>(m as THREE.Mesh).geometry.uuid)).toEqual(uuids);
  world.update(0,0,14,'battery');expect(world.group.children).toHaveLength(1);expect(far.geometry.drawRange.count).toBe(fullCount);expect(disposed).toHaveBeenCalledOnce();
  expect(JSON.stringify(data)).toBe(source);world.dispose();
});
it('measures fixture geometry and stays bounded across travel and quality changes',()=>{
  const data=JSON.parse(readFileSync(new URL('../../public/fixtures/hussain-sagar/world.geojson',import.meta.url),'utf8')) as WorldData;
  const forms=buildingForms(data,new LocalENU({lng:78.478,lat:17.421})),start=performance.now(),old=buildBuildingGeometry(forms,'mid'),before={triangles:old.attributes.position.count/3,bytes:Object.values(old.attributes).reduce((n,a)=>n+a.array.byteLength,0),buildMs:performance.now()-start};old.dispose();
  const world=createBuildingWorld(forms),center=forms[0].bounds.getCenter(new THREE.Vector2());let peak=0,worstBuildMs=0;
  for(const dx of [0,500,-500,0]){for(let i=0;i<30;i++){world.update(center.x+dx,center.y,19,'balanced');worstBuildMs=Math.max(worstBuildMs,world.getStats().buildMs);}const s=world.getStats();expect(s.pending).toBe(false);expect(s.failures).toBe(0);expect(s.calls).toBeLessThanOrEqual(15);peak=Math.max(peak,s.bytes);}
  expect(world.getStats().near).toBeGreaterThan(0);
  console.info('building fixture',{before,after:world.getStats(),peakBytes:peak,worstBuildMs});world.dispose();
});
