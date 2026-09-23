import {it,expect} from 'vitest';
import {MercatorCoordinate} from 'maplibre-gl';
import {Matrix4,Vector3} from 'three';
import {MapPlaneFrame} from './map-frame';
import {FloatingOrigin} from '../../../../packages/geo';
it.each([{lng:0,lat:17},{lng:-73,lat:45},{lng:179.999,lat:-33}])('aligns scene, map and camera across the neighborhood near %j',origin=>{
  const frame=new MapPlaneFrame(origin,MercatorCoordinate),p={lng:origin.lng-.018,lat:origin.lat+.019};
  const local=frame.project(p),actual=MercatorCoordinate.fromLngLat(p),roundTrip=frame.unproject(local);
  expect(frame.anchor.x+local.x*frame.scale).toBeCloseTo(actual.x,12);
  expect(frame.anchor.y-local.y*frame.scale).toBeCloseTo(actual.y,12);
  expect(roundTrip.lng).toBeCloseTo(p.lng,10);expect(roundTrip.lat).toBeCloseTo(p.lat,10);
  const floating=new FloatingOrigin(frame,600);floating.update(p);
  const scene=floating.toScene(p),offset=floating.offset;
  const matrix=new Matrix4().makeTranslation(frame.anchor.x,frame.anchor.y,0).scale(new Vector3(frame.scale,-frame.scale,frame.scale)).multiply(new Matrix4().makeRotationX(Math.PI/2)).multiply(new Matrix4().makeTranslation(offset.x,offset.y,offset.z));
  const rendered=new Vector3(scene.x,scene.y,scene.z).applyMatrix4(matrix);
  expect(rendered.x).toBeCloseTo(actual.x,12);expect(rendered.y).toBeCloseTo(actual.y,12);
});
it('keeps the nearby side of the dateline local',()=>{
  const frame=new MapPlaneFrame({lng:179.999,lat:0},MercatorCoordinate),p={lng:-179.999,lat:0};
  expect(frame.project(p).x).toBeLessThan(230);expect(frame.unproject(frame.project(p)).lng).toBeCloseTo(p.lng,10);
});
