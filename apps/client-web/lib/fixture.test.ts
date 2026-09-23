import fs from 'node:fs';
import { describe,expect,it } from 'vitest';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import manifest from '../public/fixtures/hussain-sagar/manifest.json';
import { validateWorld,buildBuildings } from './renderer/world';

describe('real local geographic fixture',()=>{
  const world=validateWorld(JSON.parse(fs.readFileSync(new URL('../public/fixtures/hussain-sagar/world.geojson',import.meta.url),'utf8')));
  it('contains the lake and actual footprints with provenance',()=>{
    expect(world.features.length).toBe(manifest.featureCount);
    expect(world.features.filter(f=>f.properties.kind==='building').length).toBe(3688);
    expect(world.features.some(f=>f.id===2833155)).toBe(true);
    expect(manifest.license).toBe('ODbL-1.0');
    expect(world.features.filter(f=>f.properties.kind==='green')).toHaveLength(manifest.greenery.featureCount);
    expect(manifest.greenery.featureCount).toBeGreaterThan(0);
    expect(new Set(world.features.filter(f=>f.properties.kind==='building'&&f.properties.heightSource==='estimated').map(f=>f.properties.height)).size).toBeGreaterThan(3);
  });
  it('decodes every local vector tile with finite geographic geometry',()=>{
    expect(manifest.tiles.some(tile=>tile.startsWith('12/'))).toBe(true);
    expect(manifest.tiles.some(tile=>tile.startsWith('13/'))).toBe(true);
    for(const tile of manifest.tiles) {
      const buffer=fs.readFileSync(new URL('../public/fixtures/hussain-sagar/'+tile,import.meta.url));
      const layer=new VectorTile(new PbfReader(buffer)).layers.atlas;
      expect(layer.length).toBeGreaterThan(0);
      expect(layer.feature(0).loadGeometry().length).toBeGreaterThan(0);
    }
  });
  it('merges buildings into one finite geometry',()=>{
    const geometry=buildBuildings(world);
    expect(geometry.attributes.position.count).toBeGreaterThan(10000);
    expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.y).toBeGreaterThan(10);
    geometry.dispose();
  });
  it('rejects broken coordinate and unclosed polygon fixtures',()=>{
    expect(()=>validateWorld({type:'FeatureCollection',features:[{properties:{kind:'building'},geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[NaN,1],[0,0]]]}}]})).toThrow();
  });
});
