import {it,expect} from 'vitest';
import {namedPlaces,polygonLabelPoint} from './labels';
import {pointInPolygon} from '../renderer/details';
import type {WorldData} from './osm';

it('places labels inside concave polygons and outside courtyard holes',()=>{
  for(const rings of [
    [[[0,0],[8,0],[8,2],[2,2],[2,8],[0,8],[0,0]]],
    [[[0,0],[10,0],[10,10],[0,10],[0,0]],[[2,2],[8,2],[8,8],[2,8],[2,2]]],
  ]){
    const p=polygonLabelPoint(rings)!;expect(pointInPolygon(p[0],p[1],rings)).toBe(true);
  }
  expect(polygonLabelPoint([])).toBeNull();
});
it('emits one sourced point per named polygon, not names on unnamed features or roads',()=>{
  const polygon={type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]]]} as const;
  const data={type:'FeatureCollection',features:[
    {type:'Feature',geometry:polygon,properties:{kind:'water',name:'Lake'}},
    {type:'Feature',geometry:polygon,properties:{kind:'building',name:'Library',amenity:'library'}},
    {type:'Feature',geometry:polygon,properties:{kind:'building',name:'Ordinary home'}},
    {type:'Feature',geometry:polygon,properties:{kind:'building',name:''}},
    {type:'Feature',geometry:{type:'LineString',coordinates:[[0,0],[10,0]]},properties:{kind:'road',name:'Road'}},
  ]} as unknown as WorldData;
  const labels=namedPlaces(data);expect(labels.features).toHaveLength(2);
  expect(labels.features.map(f=>f.properties?.name)).toEqual(['Lake','Library']);
  expect(labels.features.every(f=>f.geometry.type==='Point')).toBe(true);
  expect(labels.features.map(f=>f.properties?.minZoom)).toEqual([15,17]);
});
