import {expect,it} from 'vitest';
import {LocalENU} from '../../../../packages/geo';
import {ribbonGeometry,routeWidthM,createRouteRibbon,RibbonBuffer} from './route-ribbon';
import type {Mesh,BufferAttribute} from 'three';

const frame=new LocalENU({lng:0,lat:0});
it('keeps explicit recording breaks instead of drawing false solid connections',()=>{
  const points=[{lng:0,lat:0},{lng:.001,lat:0}];
  const continuous=ribbonGeometry(points,frame),broken=ribbonGeometry([points[0],{...points[1],breakBefore:true}],frame);
  expect(continuous.attributes.position.count-broken.attributes.position.count).toBe(6);
  expect([...broken.attributes.position.array].every(Number.isFinite)).toBe(true);
  continuous.dispose();broken.dispose();
});
it('uploads only the moving tip of a long replay and preserves its GPU allocation',()=>{
  const points=Array.from({length:4000},(_,i)=>({lng:i*.00001,lat:0}));
  const buffer=new RibbonBuffer(frame);buffer.update(points);
  const position=buffer.geometry.getAttribute('position') as BufferAttribute,offset=buffer.geometry.getAttribute('offset') as BufferAttribute;
  position.clearUpdateRanges();offset.clearUpdateRanges();
  const prefix=position.array.slice(0,42*3);
  points[3999]={...points[3999],lat:.000001};buffer.update(points);
  expect(buffer.geometry.getAttribute('position')).toBe(position);
  expect(position.updateRanges).toEqual([{start:3999*42*3,count:42*3}]);
  expect(position.array.slice(0,42*3)).toEqual(prefix);
  buffer.update(points.slice(0,100));expect(buffer.geometry.drawRange.count).toBe(100*42);
  buffer.update([...points.slice(0,100),{lng:1,lat:1,breakBefore:true}]);
  const start=100*42*3;
  for(let i=1;i<6;i++)expect([...position.array.slice(start+i*3,start+i*3+3)]).toEqual([...position.array.slice(start,start+3)]);
  buffer.geometry.dispose();
});
it('changes zoom width without rebuilding and clamps close/far widths',()=>{
  const ribbon=createRouteRibbon(frame);ribbon.update([{lng:0,lat:0}],[]);
  const mesh=ribbon.group.children[0] as Mesh,geometry=mesh.geometry;
  ribbon.setView(18,0);ribbon.setView(19,0);expect(mesh.geometry).toBe(geometry);
  ribbon.update([{lng:0,lat:0}],[]);expect(mesh.geometry).toBe(geometry);
  expect(routeWidthM(24,0)).toBe(.18);expect(routeWidthM(8,0)).toBe(20);
  ribbon.setView(15,0);expect(ribbon.group.visible).toBe(false);ribbon.dispose();
});
