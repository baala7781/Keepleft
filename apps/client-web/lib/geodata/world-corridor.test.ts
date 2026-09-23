import {expect,it} from 'vitest';
import {WorldCorridor} from './world-corridor';
import {neighborhood,type WorldFeature} from './osm';
import type {NeighborhoodWorld} from './service';

const road=(id:string):WorldFeature=>({type:'Feature',id,properties:{kind:'road'},geometry:{type:'LineString',coordinates:[[0,0],[.001,0]]}});
const building=(id:string,height:number):WorldFeature=>({type:'Feature',id,properties:{kind:'building',height},geometry:{type:'Polygon',coordinates:[[[0,0],[.001,0],[.001,.001],[0,0]]]}});
const tile=(x:number):NeighborhoodWorld=>({...neighborhood(x,15000),source:'OpenStreetMap',fetchedAt:'',
  data:{type:'FeatureCollection',features:[road(`road-${x}`),building(`home-${x}`,8),building(`landmark-${x}`,40)]}});

it('retains the start corridor while lowering old building detail and returning to start',()=>{
  const corridor=new WorldCorridor(),tiles=[17000,17001,17002,17003].map(tile);
  for(const world of tiles){corridor.visit(world.origin);corridor.add(world);}
  const latest=corridor.compose()!;
  expect(latest.data.features.some(feature=>feature.id==='road-17000')).toBe(true);
  expect(latest.data.features.some(feature=>feature.id==='landmark-17000')).toBe(true);
  expect(latest.data.features.some(feature=>feature.id==='home-17000')).toBe(false);
  expect(latest.data.features.some(feature=>feature.id==='home-17003')).toBe(true);
  corridor.visit(tiles[0].origin);corridor.add(tiles[0]);
  expect(corridor.compose()!.data.features.some(feature=>feature.id==='home-17000')).toBe(true);
});

it('keeps predicted geography ready without pinning it as part of the route',()=>{
  const corridor=new WorldCorridor(),start=tile(17000),ahead=tile(17001);
  corridor.visit(start.origin);corridor.add(start);corridor.add(ahead);
  expect(corridor.hasDetail(ahead.key)).toBe(true);
  corridor.visit(ahead.origin);
  expect(corridor.compose()!.data.features.some(feature=>feature.id==='home-17001')).toBe(true);
});

it('publishes a replacement area even when its feature count is unchanged',()=>{
  const corridor=new WorldCorridor(),first=tile(17000);
  corridor.visit(first.origin);corridor.add(first);
  const before=corridor.version;
  corridor.add({...first,data:{type:'FeatureCollection',features:[road('new-road'),building('new-home',8),building('new-landmark',40)]}});
  expect(corridor.version).toBeGreaterThan(before);
  expect(corridor.compose()!.data.features.some(feature=>feature.id==='new-road')).toBe(true);
  expect(corridor.compose()!.data.features.some(feature=>feature.id==='road-17000')).toBe(false);
});

it('keeps a twelve-area journey viewable from start to finish at lower old-area detail',()=>{
  const corridor=new WorldCorridor(),worlds=Array.from({length:12},(_,index)=>tile(17000+index));
  for(const world of worlds){corridor.visit(world.origin);corridor.add(world);}
  const overview=corridor.compose()!;
  expect(worlds.every(world=>overview.data.features.some(feature=>feature.id===`road-${world.x}`))).toBe(true);
  expect(overview.data.features.some(feature=>feature.id==='home-17000')).toBe(false);
  expect(overview.data.features.some(feature=>feature.id==='landmark-17000')).toBe(true);
  expect(overview.data.features.some(feature=>feature.id==='home-17011')).toBe(true);
  corridor.visit(worlds[0].origin);corridor.add(worlds[0]);
  expect(corridor.compose()!.data.features.some(feature=>feature.id==='home-17000')).toBe(true);
});

it('reserves geographic context for every old route area under a dense-world budget',()=>{
  const corridor=new WorldCorridor();
  for(let index=0;index<12;index++){
    const world=tile(17000+index);
    world.data.features=index<9?
      Array.from({length:500},(_,roadIndex)=>road(`road-${index}-${roadIndex}`)):
      Array.from({length:3400},(_,buildingIndex)=>building(`building-${index}-${buildingIndex}`,8));
    corridor.visit(world.origin);corridor.add(world);
  }
  const composed=corridor.compose()!;
  expect(composed.data.features.length).toBeLessThanOrEqual(14000);
  for(let index=0;index<9;index++)expect(composed.data.features.some(feature=>feature.id===`road-${index}-0`)).toBe(true);
});
