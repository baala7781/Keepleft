import {describe,it,expect} from 'vitest';
import {buildingHeight,normalizeOSM,neighborhoodFor,neighborhood,contains,overpassQuery,worldCoverage,type OSMElement} from './osm';
import {mapStyle} from './map-style';
import {LocalENU} from '../../../../packages/geo';
import {buildBuildings} from '../renderer/world';

const ring=(x=0,y=0,size=.001)=>[{lon:x,lat:y},{lon:x+size,lat:y},{lon:x+size,lat:y+size},{lon:x,lat:y+size},{lon:x,lat:y}];
describe('MVP map normalization',()=>{
  it('preserves walking restrictions for conservative route presentation',()=>{
    const data=normalizeOSM({elements:[{type:'way',id:1,tags:{highway:'service',foot:'no'},geometry:ring()}]});
    expect(data.features[0].properties.foot).toBe('no');
  });
  it('prefers real heights and levels, including feet, before stable varied estimates',()=>{
    expect(buildingHeight({height:'30 ft','building:levels':'20'},1)).toEqual({height:9.144,heightSource:'osm-height'});
    expect(buildingHeight({height:'unknown','building:levels':'5'},1)).toEqual({height:16,heightSource:'osm-levels'});
    expect(buildingHeight({building:'house'},23)).toEqual(buildingHeight({building:'house'},23));
    expect(new Set(Array.from({length:20},(_,i)=>buildingHeight({building:'yes'},i).height)).size).toBeGreaterThan(3);
    expect(buildingHeight({building:'shed'},23).height).toBeLessThan(buildingHeight({building:'apartments'},23).height);
    expect(buildingHeight({height:'99999'},1).height).toBe(300);
  });
  it('keeps parks, gardens and grass separate from roads, water and buildings',()=>{
    const tags:Record<string,string>[]=[{leisure:'park'},{leisure:'garden'},{landuse:'grass'},{natural:'water'},{building:'apartments'},{highway:'footway'}];
    const data=normalizeOSM({elements:tags.map((tags,i)=>({type:'way',id:i,tags,geometry:ring()}))});
    expect(data.features.map(f=>f.properties.kind)).toEqual(['green','green','green','water','building','road']);
    expect(data.features.at(-1)?.geometry.type).toBe('LineString');
  });
  it('includes agricultural and land-cover greenery in both the live query and normalized map',()=>{
    const tags:Record<string,string>[]=[{landuse:'farmland'},{landuse:'orchard'},{landuse:'vineyard'},{landcover:'trees'},{landcover:'grass'},{leisure:'pitch',surface:'grass'}];
    const data=normalizeOSM({elements:tags.map((tags,id)=>({type:'way',id,tags,geometry:ring()}))});
    expect(worldCoverage(data)).toEqual({building:0,green:6,road:0,water:0});
    const query=overpassQuery([0,0,.001,.001]);
    for(const word of ['farmland','orchard','vineyard','landcover','surface=grass'])expect(query).toContain(word);
    const hardCourt=normalizeOSM({elements:[{type:'way',id:99,tags:{leisure:'pitch',surface:'asphalt'},geometry:ring()}]});
    expect(worldCoverage(hardCourt).green).toBe(0);
  });
  it('uses live GeoJSON greenery without the fixture-only vector source-layer',()=>{
    const data=normalizeOSM({elements:[{type:'way',id:1,tags:{leisure:'garden'},geometry:ring()}]});
    const world={...neighborhood(16384,16384),data,fetchedAt:'test',source:'OpenStreetMap' as const};
    const style=mapStyle('http://localhost',world,data),parks=style.layers.find(layer=>layer.id==='parks')!;
    expect(style.sources.atlas).toMatchObject({type:'geojson',data});
    expect(parks).not.toHaveProperty('source-layer');expect(parks).toMatchObject({type:'fill',filter:['==',['get','kind'],'green']});
  });
  it('joins split relation boundaries, preserves holes and skips incomplete shapes',()=>{
    const outer=ring(0,0,.01),hole=ring(.002,.002,.002);
    const relation:OSMElement={type:'relation',id:1,tags:{leisure:'park',type:'multipolygon'},members:[
      {type:'way',ref:2,role:'outer',geometry:outer.slice(0,3)},
      {type:'way',ref:3,role:'outer',geometry:outer.slice(2)},
      {type:'way',ref:4,role:'inner',geometry:hole},
    ]};
    const data=normalizeOSM({elements:[relation,{type:'way',id:2,tags:{leisure:'garden'},geometry:outer.slice(0,3)}]});
    expect(data.features).toHaveLength(1);expect(data.features[0].geometry.coordinates).toHaveLength(2);
  });
  it('rejects truncated upstream results instead of claiming complete coverage',()=>{
    expect(()=>normalizeOSM({elements:[],remark:'runtime error: Query timed out'})).toThrow();
  });
  it('renders neighborhoods in their own local frame, including places without buildings',()=>{
    const origin={lng:-.12,lat:51.5};
    const world=normalizeOSM({elements:[{type:'way',id:1,tags:{building:'yes'},geometry:ring(origin.lng,origin.lat)}]});
    const geometry=buildBuildings(world,new LocalENU(origin));geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.x).toBeLessThan(100);expect(geometry.boundingBox!.min.x).toBeGreaterThan(-1);
    geometry.dispose();
    const empty=buildBuildings({type:'FeatureCollection',features:[]},new LocalENU(origin));
    expect(empty.attributes.position.count).toBe(0);empty.dispose();
  });
});
describe('bounded neighborhood requests',()=>{
  it.each([{lng:78.478,lat:17.421},{lng:-.12,lat:51.5},{lng:179.9999,lat:0},{lng:-180,lat:-70}])('covers the input position without requesting exact GPS samples',point=>{
    const area=neighborhoodFor(point);expect(contains(area.bounds,point)).toBe(true);
    expect(neighborhood(area.x,area.y)).toEqual(area);
    expect(overpassQuery(area.bounds)).toContain('out geom;');
    expect(area.bounds[2]-area.bounds[0]).toBeLessThan(.017);
  });
  it('rejects invalid tile IDs and unsupported polar coordinates',()=>{
    expect(()=>neighborhood(32768,0)).toThrow();expect(()=>neighborhood(2.5,2)).toThrow();
    expect(()=>neighborhoodFor({lat:90,lng:0})).toThrow();
  });
});
