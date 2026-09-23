import {expect,it} from 'vitest';
import {sameWorld} from './same-world';
import type {WorldData} from './osm';
it('recognizes corridor reordering without hiding real source changes',()=>{
  const a:WorldData={type:'FeatureCollection',features:[{type:'Feature',id:'a',properties:{kind:'road'},geometry:{type:'LineString',coordinates:[[0,0],[1,1]]}},{type:'Feature',id:'b',properties:{kind:'road'},geometry:{type:'LineString',coordinates:[[1,1],[2,2]]}}]};
  expect(sameWorld(a,{...a,features:[...a.features].reverse()})).toBe(true);
  expect(sameWorld(a,JSON.parse(JSON.stringify(a)))).toBe(true);
  expect(sameWorld(a,{...a,features:[a.features[0],a.features[0]]})).toBe(false);
  expect(sameWorld(a,{...a,features:[a.features[0],{...a.features[1],properties:{kind:'road',name:'Updated'}}]})).toBe(false);
});
