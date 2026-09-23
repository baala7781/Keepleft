import {expect,it} from 'vitest';
import {neighborhoodFor} from './osm';
import {predictedNeighborhoods} from './world-prediction';

it('preloads north rather than south for a northbound cyclist',()=>{
  const point={lng:78.5,lat:17.43},current=neighborhoodFor(point);
  const ahead=predictedNeighborhoods(point,null,0,6,'cycle');
  expect(ahead).toHaveLength(3);
  expect(ahead[0].y).toBe(current.y-1);
  expect(ahead[2].y).toBe(current.y-3);
});

it('uses actual movement first and avoids speculative loading while stationary',()=>{
  const point={lng:78.5,lat:17.43},current=neighborhoodFor(point);
  expect(predictedNeighborhoods(point,null,0,0,'cycle')).toEqual([]);
  const ahead=predictedNeighborhoods(point,{lng:point.lng-.0001,lat:point.lat},0,4,'walk');
  expect(ahead).toHaveLength(1);
  expect(ahead[0].x).toBe(current.x+1);
});
