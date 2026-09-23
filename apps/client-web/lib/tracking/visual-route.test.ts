import {expect,it} from 'vitest';
import type {LocalFrame} from '../../../../packages/geo';
import {visualRoute} from './visual-route';

const frame:LocalFrame={origin:{lng:0,lat:0},project:p=>({x:p.lng,y:p.lat,z:0}),unproject:p=>({lng:p.x,lat:p.y})};

it('reduces short cycling jitter without changing raw points or endpoints',()=>{
  const raw=[{lng:0,lat:0},{lng:5,lat:3},{lng:10,lat:0},{lng:15,lat:3},{lng:20,lat:0}];
  const before=structuredClone(raw),shown=visualRoute(raw,frame,'cycle');
  expect(shown[0]).toEqual(raw[0]);expect(shown.at(-1)).toEqual(raw.at(-1));
  expect(shown[1].lat).toBeLessThan(raw[1].lat);
  expect(shown[2].lat).toBeGreaterThan(raw[2].lat);
  expect(raw).toEqual(before);
});

it('keeps a real turn and a recording break in place',()=>{
  const route=[{lng:0,lat:0},{lng:12,lat:0},{lng:12,lat:12},{lng:12,lat:20,breakBefore:true},{lng:20,lat:20}];
  const shown=visualRoute(route,frame,'cycle');
  expect(shown[1]).toEqual(route[1]);expect(shown[2]).toEqual(route[2]);
  expect(shown[3]).toEqual(route[3]);
});

it('does not erase a short out-and-back',()=>{
  const route=[{lng:0,lat:0},{lng:5,lat:0},{lng:0,lat:0},{lng:-5,lat:0}];
  expect(visualRoute(route,frame,'cycle')[1]).toEqual(route[1]);
});
