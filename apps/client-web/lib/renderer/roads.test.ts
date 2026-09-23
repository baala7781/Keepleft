import {expect,it} from 'vitest';
import {roadProfile} from '../geodata/roads';
import {roadPatch,createRoadWorld,type RoadSegment} from './roads';
import {pointInPolygon} from './details';
import {LocalENU} from '../../../../packages/geo';
import type {WorldData} from '../geodata/osm';
import {readFileSync} from 'node:fs';
import {MercatorCoordinate} from 'maplibre-gl';
import {MapPlaneFrame} from './map-frame';
import {buildingForms} from './buildings';
import {sampleRoute} from '../tracking/activity';

const profile=roadProfile({kind:'road',highway:'residential'});
const segment=(a:[number,number],b:[number,number]):RoadSegment=>({a,b,profile,along:0});
it('resolves mapped widths, valid lanes and sidewalk sides conservatively',()=>{
  expect(roadProfile({kind:'road',width:'20 ft'}).width).toBeCloseTo(6.096);
  expect(roadProfile({kind:'road',lanes:'3'})).toMatchObject({width:9,widthSource:'lanes'});
  expect(roadProfile({kind:'road',lanes:'1.5',width:'900'})).toMatchObject({width:6,widthSource:'class'});
  expect(roadProfile({kind:'road',sidewalk:'left'})).toMatchObject({sidewalkLeft:1.4,sidewalkRight:0});
  expect(roadProfile({kind:'road',highway:'footway'})).toMatchObject({width:2,markings:false,sidewalkLeft:0});
});
it('unions a crossing and keeps sidewalks and markings out of its center',()=>{
  const patch=roadPatch([segment([-30,0],[0,0]),segment([0,0],[30,0]),segment([0,-30],[0,0]),segment([0,0],[0,30])]);
  expect(patch.surface.some(p=>pointInPolygon(0,0,p))).toBe(true);
  expect(patch.walks.some(p=>pointInPolygon(0,0,p))).toBe(false);
  expect(patch.markings.some(p=>pointInPolygon(0,0,p))).toBe(false);
  expect(patch.walks.some(p=>pointInPolygon(20,3.5,p))).toBe(true);
});
it('retains a roundabout island and is deterministic',()=>{
  const points=Array.from({length:17},(_,i)=>[20*Math.cos(i*Math.PI/8),20*Math.sin(i*Math.PI/8)] as [number,number]);
  const segments=points.slice(1).map((p,i)=>segment(points[i],p));
  const patch=roadPatch(segments);
  expect(patch.surface.some(p=>pointInPolygon(0,0,p))).toBe(false);
  expect(patch.surface.some(p=>pointInPolygon(20,0,p))).toBe(true);
  expect(roadPatch(segments)).toEqual(patch);
});
it('builds bounded reusable near geometry and excludes elevated roads',()=>{
  const data:WorldData={type:'FeatureCollection',features:[{type:'Feature',id:'street',properties:{kind:'road',highway:'residential'},geometry:{type:'LineString',coordinates:[[-.001,0],[0,0],[.001,0]]}},{type:'Feature',id:'bridge',properties:{kind:'road',bridge:true},geometry:{type:'LineString',coordinates:[[0,-.001],[0,.001]]}}]};
  const world=createRoadWorld(data,new LocalENU({lng:0,lat:0}),[]);
  expect(world.update(0,0,15,'balanced')).toBe(false);
  expect(world.update(0,0,18,'balanced')).toBe(true);
  expect(world.getStats()).toMatchObject({segments:2,failures:0});
  expect(world.getStats().triangles).toBeGreaterThan(0);
  expect(world.update(1,1,19,'balanced')).toBe(false);
  expect(world.group.children).toHaveLength(4);
  world.dispose();
});
it('builds fixture road patches within geometry budgets without clipping failures',()=>{
  const data=JSON.parse(readFileSync(new URL('../../public/fixtures/hussain-sagar/world.geojson',import.meta.url),'utf8')) as WorldData;
  const road=data.features.find(f=>f.properties.kind==='road'&&f.geometry.type==='LineString')!;
  const [lng,lat]=road.geometry.coordinates[0] as number[],world=createRoadWorld(data,new LocalENU({lng,lat}),[]);
  for(const quality of ['battery','balanced','high'] as const){
    world.update(0,0,18,quality);const stats=world.getStats();
    expect(stats.failures).toBe(0);expect(stats.triangles).toBeLessThan(100000);
    console.info('road fixture',quality,stats);
  }
  world.dispose();
});
it('keeps physical roads available along the rendered demo corridor including building exclusions',()=>{
  const data=JSON.parse(readFileSync(new URL('../../public/fixtures/hussain-sagar/world.geojson',import.meta.url),'utf8')) as WorldData;
  const frame=new MapPlaneFrame({lng:78.478,lat:17.421},MercatorCoordinate),world=createRoadWorld(data,frame,buildingForms(data,frame));
  for(const progress of [0,.002,.08,.25,.5,.75])for(const quality of ['battery','balanced','high'] as const){
    const p=frame.project(sampleRoute(progress));world.update(p.x,p.y,18,quality);
    expect(world.getStats().failures,`${progress} ${quality} ${world.getStats().lastFailure}`).toBe(0);
  }
  world.dispose();
});
